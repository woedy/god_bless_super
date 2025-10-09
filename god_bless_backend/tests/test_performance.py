"""
Performance tests for high-volume operations
Tests Requirements: 6.1, 6.2, 6.3
"""
import pytest
import time
from django.contrib.auth import get_user_model
from phone_generator.models import PhoneNumber, PhoneGenerationTask
from sms_sender.models import SMSCampaign, SMSMessage
from projects.models import Project
from django.db import connection
from django.test.utils import override_settings

User = get_user_model()


@pytest.fixture
def large_project(user):
    """Create a project with many phone numbers"""
    project = Project.objects.create(
        user=user,
        name='Performance Test Project'
    )
    
    # Create 1000 phone numbers for performance testing
    phone_numbers = []
    for i in range(1000):
        phone_numbers.append(
            PhoneNumber(
                user=user,
                project=project,
                phone_number=f'555{i:07d}',
                carrier='Verizon' if i % 2 == 0 else 'AT&T',
                type='mobile',
                area_code='555',
                valid_number=True
            )
        )
    PhoneNumber.objects.bulk_create(phone_numbers)
    
    return project


@pytest.mark.performance
@pytest.mark.slow
class TestPhoneGenerationPerformance:
    """Test phone generation performance"""
    
    def test_bulk_phone_creation_performance(self, user):
        """Test bulk creation of phone numbers"""
        project = Project.objects.create(
            user=user,
            name='Bulk Test Project'
        )
        
        start_time = time.time()
        
        # Create 10,000 phone numbers
        phone_numbers = []
        for i in range(10000):
            phone_numbers.append(
                PhoneNumber(
                    user=user,
                    project=project,
                    phone_number=f'555{i:07d}',
                    carrier='Verizon',
                    type='mobile',
                    area_code='555'
                )
            )
        
        PhoneNumber.objects.bulk_create(phone_numbers, batch_size=1000)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete in under 10 seconds
        assert duration < 10.0
        assert PhoneNumber.objects.filter(project=project).count() == 10000
    
    def test_phone_query_performance(self, user, large_project):
        """Test query performance on large dataset"""
        start_time = time.time()
        
        # Query with filters
        results = PhoneNumber.objects.filter(
            project=large_project,
            carrier='Verizon',
            valid_number=True
        )[:100]
        
        # Force evaluation
        list(results)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete in under 1 second
        assert duration < 1.0
    
    def test_phone_aggregation_performance(self, user, large_project):
        """Test aggregation performance"""
        from django.db.models import Count
        
        start_time = time.time()
        
        # Aggregate by carrier
        stats = PhoneNumber.objects.filter(
            project=large_project
        ).values('carrier').annotate(
            count=Count('id')
        )
        
        # Force evaluation
        list(stats)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete in under 1 second
        assert duration < 1.0


@pytest.mark.performance
@pytest.mark.slow
class TestSMSCampaignPerformance:
    """Test SMS campaign performance"""
    
    def test_bulk_message_creation_performance(self, user):
        """Test bulk creation of SMS messages"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Performance Test Campaign',
            message_template='Test'
        )
        
        start_time = time.time()
        
        # Create 5,000 messages
        messages = []
        for i in range(5000):
            messages.append(
                SMSMessage(
                    campaign=campaign,
                    phone_number=f'555{i:07d}',
                    message_content='Test message',
                    carrier='Verizon'
                )
            )
        
        SMSMessage.objects.bulk_create(messages, batch_size=500)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete in under 5 seconds
        assert duration < 5.0
        assert SMSMessage.objects.filter(campaign=campaign).count() == 5000
    
    def test_campaign_status_update_performance(self, user):
        """Test performance of updating campaign status"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Status Test Campaign',
            message_template='Test'
        )
        
        # Create messages
        messages = []
        for i in range(1000):
            messages.append(
                SMSMessage(
                    campaign=campaign,
                    phone_number=f'555{i:07d}',
                    message_content='Test',
                    delivery_status='pending'
                )
            )
        SMSMessage.objects.bulk_create(messages)
        
        start_time = time.time()
        
        # Update all message statuses
        SMSMessage.objects.filter(campaign=campaign).update(
            delivery_status='sent'
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete in under 1 second
        assert duration < 1.0


@pytest.mark.performance
class TestDatabaseQueryPerformance:
    """Test database query optimization"""
    
    def test_query_count_for_phone_list(self, user, large_project):
        """Test number of queries for phone list"""
        # Reset query count
        connection.queries_log.clear()
        
        with override_settings(DEBUG=True):
            # Get phone numbers with related data
            phones = PhoneNumber.objects.filter(
                project=large_project
            ).select_related('user', 'project')[:50]
            
            # Force evaluation
            list(phones)
            
            # Should use minimal queries (ideally 1-2)
            query_count = len(connection.queries)
            assert query_count <= 3
    
    def test_query_count_for_campaign_with_messages(self, user):
        """Test query count for campaign with messages"""
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Query Test Campaign',
            message_template='Test'
        )
        
        # Create messages
        for i in range(10):
            SMSMessage.objects.create(
                campaign=campaign,
                phone_number=f'555000{i:04d}',
                message_content='Test'
            )
        
        connection.queries_log.clear()
        
        with override_settings(DEBUG=True):
            # Get campaign with messages
            campaign_data = SMSCampaign.objects.prefetch_related(
                'messages'
            ).get(id=campaign.id)
            
            # Access messages
            list(campaign_data.messages.all())
            
            # Should use minimal queries (ideally 2)
            query_count = len(connection.queries)
            assert query_count <= 3


@pytest.mark.performance
class TestPaginationPerformance:
    """Test pagination performance"""
    
    def test_paginated_phone_list_performance(self, user, large_project):
        """Test pagination performance for phone numbers"""
        page_size = 50
        
        start_time = time.time()
        
        # Get first page
        page1 = PhoneNumber.objects.filter(
            project=large_project
        ).order_by('-id')[:page_size]
        list(page1)
        
        # Get second page
        page2 = PhoneNumber.objects.filter(
            project=large_project
        ).order_by('-id')[page_size:page_size*2]
        list(page2)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete in under 1 second
        assert duration < 1.0
    
    def test_count_query_performance(self, user, large_project):
        """Test count query performance"""
        start_time = time.time()
        
        # Count with filters
        count = PhoneNumber.objects.filter(
            project=large_project,
            carrier='Verizon'
        ).count()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete in under 0.5 seconds
        assert duration < 0.5
        assert count > 0


@pytest.mark.performance
class TestConcurrentOperations:
    """Test concurrent operation performance"""
    
    def test_concurrent_phone_creation(self, user):
        """Test concurrent phone number creation"""
        project = Project.objects.create(
            user=user,
            name='Concurrent Test Project'
        )
        
        start_time = time.time()
        
        # Simulate concurrent creation by creating multiple batches
        for batch in range(10):
            phone_numbers = []
            for i in range(100):
                phone_numbers.append(
                    PhoneNumber(
                        user=user,
                        project=project,
                        phone_number=f'555{batch:02d}{i:05d}',
                        carrier='Verizon'
                    )
                )
            PhoneNumber.objects.bulk_create(phone_numbers)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete in under 5 seconds
        assert duration < 5.0
        assert PhoneNumber.objects.filter(project=project).count() == 1000

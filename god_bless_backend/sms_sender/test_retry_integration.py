"""
Integration test for the retry management system.

This test verifies that all components of the retry management system
work together correctly in a realistic scenario.
"""

import time
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock

from .models import SMSCampaign, SMSMessage, RetryAttempt
from .retry_service import RetryManagementService
from .tasks import retry_sms_message_task
from smtps.models import SmtpManager

User = get_user_model()


class RetryManagementIntegrationTest(TestCase):
    """Integration tests for retry management system"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.smtp_server = SmtpManager.objects.create(
            user=self.user,
            host='smtp.test.com',
            port=587,
            username='test@smtp.com',
            password='testpass',
            active=True
        )
        
        self.campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Test Retry Campaign',
            message_template='Test message',
            status='in_progress'
        )
    
    def test_complete_retry_workflow(self):
        """Test the complete retry workflow from failure to retry scheduling"""
        
        # Create a failed message
        message = SMSMessage.objects.create(
            campaign=self.campaign,
            phone_number='1234567890',
            message_content='Test message',
            carrier='AT&T',
            delivery_status='failed',
            error_message='connection timeout'
        )
        
        # Initialize retry service
        retry_service = RetryManagementService(self.campaign)
        
        # Test error classification
        error_type = retry_service._classify_error('connection timeout')
        self.assertEqual(error_type, 'temporary')
        
        # Test retry decision
        should_retry = retry_service.should_retry(message, 'connection timeout')
        self.assertTrue(should_retry)
        
        # Test retry scheduling
        scheduled = retry_service.schedule_retry(message, 'connection timeout', 'temporary')
        self.assertTrue(scheduled)
        
        # Verify retry attempt was created
        retry_attempt = message.retry_attempts.first()
        self.assertIsNotNone(retry_attempt)
        self.assertEqual(retry_attempt.attempt_number, 1)
        self.assertEqual(retry_attempt.error_type, 'temporary')
        self.assertFalse(retry_attempt.completed)
        
        # Test retry statistics
        stats = retry_service.get_retry_stats()
        self.assertEqual(stats['messages_with_retries'], 1)
        self.assertEqual(stats['total_retry_attempts'], 1)
        self.assertEqual(stats['pending_retries'], 1)
    
    def test_carrier_specific_configuration(self):
        """Test carrier-specific retry configurations"""
        retry_service = RetryManagementService(self.campaign)
        
        # Test AT&T configuration
        att_config = retry_service._get_carrier_config('AT&T')
        self.assertEqual(att_config['max_attempts'], 3)
        self.assertEqual(att_config['base_delay'], 60)
        
        # Test Verizon configuration
        verizon_config = retry_service._get_carrier_config('Verizon')
        self.assertEqual(verizon_config['max_attempts'], 4)
        self.assertEqual(verizon_config['base_delay'], 45)
        
        # Test unknown carrier (should use default)
        unknown_config = retry_service._get_carrier_config('Unknown Carrier')
        self.assertEqual(unknown_config['max_attempts'], 3)
        self.assertEqual(unknown_config['base_delay'], 60)
    
    def test_exponential_backoff_calculation(self):
        """Test exponential backoff delay calculation"""
        message = SMSMessage.objects.create(
            campaign=self.campaign,
            phone_number='1234567890',
            message_content='Test message',
            carrier='AT&T',
            delivery_status='failed',
            error_message='server error'
        )
        
        retry_service = RetryManagementService(self.campaign)
        
        # Test first attempt delay
        delay1 = retry_service.calculate_retry_delay(message, 'server error')
        self.assertGreater(delay1, 0)
        
        # Create first retry attempt
        RetryAttempt.objects.create(
            message=message,
            attempt_number=1,
            error_type='server',
            error_message='server error',
            retry_delay=delay1,
            scheduled_retry_time=timezone.now() + timedelta(seconds=delay1)
        )
        
        # Test second attempt delay (should be higher due to exponential backoff)
        delay2 = retry_service.calculate_retry_delay(message, 'server error')
        self.assertGreater(delay2, delay1)
    
    def test_rate_limit_special_handling(self):
        """Test special handling for rate limit errors"""
        message = SMSMessage.objects.create(
            campaign=self.campaign,
            phone_number='1234567890',
            message_content='Test message',
            carrier='Sprint',
            delivery_status='failed',
            error_message='rate limit exceeded'
        )
        
        retry_service = RetryManagementService(self.campaign)
        
        # Rate limit errors should use carrier-specific rate limit delay
        delay = retry_service.calculate_retry_delay(message, 'rate limit exceeded')
        sprint_config = retry_service._get_carrier_config('Sprint')
        self.assertEqual(delay, sprint_config['rate_limit_delay'])
    
    def test_permanent_error_no_retry(self):
        """Test that permanent errors are not retried"""
        message = SMSMessage.objects.create(
            campaign=self.campaign,
            phone_number='1234567890',
            message_content='Test message',
            carrier='AT&T',
            delivery_status='failed',
            error_message='invalid recipient'
        )
        
        retry_service = RetryManagementService(self.campaign)
        
        # Permanent errors should not be retried
        should_retry = retry_service.should_retry(message, 'invalid recipient')
        self.assertFalse(should_retry)
        
        # Scheduling should fail
        scheduled = retry_service.schedule_retry(message, 'invalid recipient', 'permanent')
        self.assertFalse(scheduled)
    
    def test_max_attempts_limit(self):
        """Test that retry attempts are limited by max_attempts"""
        message = SMSMessage.objects.create(
            campaign=self.campaign,
            phone_number='1234567890',
            message_content='Test message',
            carrier='AT&T',
            delivery_status='failed',
            error_message='connection timeout'
        )
        
        retry_service = RetryManagementService(self.campaign)
        att_config = retry_service._get_carrier_config('AT&T')
        max_attempts = att_config['max_attempts']
        
        # Create max number of retry attempts
        for i in range(max_attempts):
            RetryAttempt.objects.create(
                message=message,
                attempt_number=i + 1,
                error_type='temporary',
                error_message='connection timeout',
                retry_delay=60,
                scheduled_retry_time=timezone.now() + timedelta(seconds=60)
            )
        
        # Should not retry after max attempts
        should_retry = retry_service.should_retry(message, 'connection timeout')
        self.assertFalse(should_retry)
    
    def test_retry_cancellation(self):
        """Test cancelling pending retry attempts"""
        message = SMSMessage.objects.create(
            campaign=self.campaign,
            phone_number='1234567890',
            message_content='Test message',
            carrier='AT&T',
            delivery_status='failed',
            error_message='connection timeout'
        )
        
        # Create pending retry attempts
        retry1 = RetryAttempt.objects.create(
            message=message,
            attempt_number=1,
            error_type='temporary',
            error_message='connection timeout',
            retry_delay=60,
            scheduled_retry_time=timezone.now() + timedelta(seconds=60),
            completed=False
        )
        
        retry2 = RetryAttempt.objects.create(
            message=message,
            attempt_number=2,
            error_type='temporary',
            error_message='connection timeout',
            retry_delay=120,
            scheduled_retry_time=timezone.now() + timedelta(seconds=120),
            completed=False
        )
        
        retry_service = RetryManagementService(self.campaign)
        
        # Cancel pending retries
        cancelled_count = retry_service.cancel_pending_retries(message)
        self.assertEqual(cancelled_count, 2)
        
        # Verify retries are marked as completed but not successful
        retry1.refresh_from_db()
        retry2.refresh_from_db()
        
        self.assertTrue(retry1.completed)
        self.assertFalse(retry1.success)
        self.assertTrue(retry2.completed)
        self.assertFalse(retry2.success)
    
    def test_global_retry_statistics(self):
        """Test global retry statistics across multiple campaigns"""
        
        # Create another campaign
        campaign2 = SMSCampaign.objects.create(
            user=self.user,
            name='Test Campaign 2',
            message_template='Test message 2',
            status='completed'
        )
        
        # Create messages with retries in both campaigns
        message1 = SMSMessage.objects.create(
            campaign=self.campaign,
            phone_number='1111111111',
            message_content='Test message 1',
            delivery_status='failed'
        )
        
        message2 = SMSMessage.objects.create(
            campaign=campaign2,
            phone_number='2222222222',
            message_content='Test message 2',
            delivery_status='failed'
        )
        
        # Create retry attempts
        RetryAttempt.objects.create(
            message=message1,
            attempt_number=1,
            error_type='temporary',
            error_message='timeout',
            retry_delay=60,
            scheduled_retry_time=timezone.now() + timedelta(seconds=60)
        )
        
        RetryAttempt.objects.create(
            message=message2,
            attempt_number=1,
            error_type='auth',
            error_message='auth failed',
            retry_delay=45,
            scheduled_retry_time=timezone.now() + timedelta(seconds=45)
        )
        
        # Test global statistics
        global_stats = RetryManagementService.get_global_retry_stats(self.user)
        
        self.assertEqual(global_stats['total_messages'], 2)
        self.assertEqual(global_stats['messages_with_retries'], 2)
        self.assertEqual(global_stats['retry_rate'], 100.0)
        self.assertEqual(global_stats['total_retry_attempts'], 2)


if __name__ == '__main__':
    import django
    import os
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
    django.setup()
    
    import unittest
    unittest.main()
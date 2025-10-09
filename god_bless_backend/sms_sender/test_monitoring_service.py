"""
Unit tests for SMS campaign monitoring service
"""
import json
from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from channels.layers import InMemoryChannelLayer

from .models import (
    SMSCampaign, SMSMessage, ServerUsageLog, 
    CarrierPerformanceLog, RetryAttempt
)
from .monitoring_service import CampaignMonitoringService, GlobalMonitoringService
from proxy_server.models import ProxyServer
from smtps.models import SmtpManager

User = get_user_model()


class CampaignMonitoringServiceTest(TestCase):
    """Test cases for CampaignMonitoringService"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Test Campaign',
            message_template='Hello {name}!',
            status='in_progress',
            total_recipients=100,
            messages_sent=50,
            messages_delivered=45,
            messages_failed=5,
            started_at=timezone.now() - timedelta(hours=1)
        )
        
        # Create test messages
        for i in range(10):
            SMSMessage.objects.create(
                campaign=self.campaign,
                phone_number=f'555000{i:04d}',
                message_content=f'Hello User{i}!',
                delivery_status='delivered' if i < 8 else 'failed',
                carrier='AT&T' if i % 2 == 0 else 'Verizon',
                total_processing_time=2.5 + (i * 0.1),
                proxy_response_time=0.5,
                smtp_response_time=1.0,
                delivery_delay_applied=1.0
            )
        
        # Create proxy and SMTP servers
        self.proxy_server = ProxyServer.objects.create(
            user=self.user,
            host='proxy1.example.com',
            port=8080,
            username='proxyuser',
            password='proxypass'
        )
        
        self.smtp_server = SmtpManager.objects.create(
            user=self.user,
            host='smtp.example.com',
            port=587,
            username='smtpuser',
            password='smtppass'
        )
        
        # Create server usage logs
        ServerUsageLog.objects.create(
            campaign=self.campaign,
            server_type='proxy',
            server_id=self.proxy_server.id,
            messages_processed=50,
            successful_messages=45,
            failed_messages=5,
            average_response_time=0.5
        )
        
        ServerUsageLog.objects.create(
            campaign=self.campaign,
            server_type='smtp',
            server_id=self.smtp_server.id,
            messages_processed=50,
            successful_messages=45,
            failed_messages=5,
            average_response_time=1.0
        )
    
    def test_campaign_monitoring_service_initialization(self):
        """Test monitoring service initialization"""
        service = CampaignMonitoringService(self.campaign.id)
        
        self.assertEqual(service.campaign_id, self.campaign.id)
        self.assertEqual(service.campaign, self.campaign)
        self.assertIsNotNone(service.channel_layer)
    
    def test_get_campaign_group_name(self):
        """Test campaign group name generation"""
        service = CampaignMonitoringService(self.campaign.id)
        
        group_name = service.get_campaign_group_name()
        self.assertEqual(group_name, f'campaign_{self.campaign.id}')
    
    def test_get_user_group_name(self):
        """Test user group name generation"""
        service = CampaignMonitoringService(self.campaign.id)
        
        group_name = service.get_user_group_name()
        self.assertEqual(group_name, f'user_{self.user.id}_campaigns')
    
    @patch('sms_sender.monitoring_service.get_channel_layer')
    def test_send_progress_update(self, mock_get_channel_layer):
        """Test sending progress updates"""
        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        service = CampaignMonitoringService(self.campaign.id)
        service.channel_layer = mock_channel_layer
        
        test_data = {
            'progress': 75,
            'messages_sent': 75,
            'messages_failed': 5
        }
        
        service.send_progress_update(test_data)
        
        # Verify channel layer was called
        self.assertTrue(mock_channel_layer.group_send.called)
        
        # Check the call arguments
        call_args = mock_channel_layer.group_send.call_args_list
        self.assertEqual(len(call_args), 2)  # Should send to both groups
        
        # Verify message structure
        for call in call_args:
            group_name, message_data = call[0]
            self.assertIn('campaign_message', message_data['type'])
            self.assertIn('campaign_id', message_data['message'])
            self.assertIn('timestamp', message_data['message'])
    
    @patch('sms_sender.monitoring_service.get_channel_layer')
    def test_send_server_status_update(self, mock_get_channel_layer):
        """Test sending server status updates"""
        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        service = CampaignMonitoringService(self.campaign.id)
        service.channel_layer = mock_channel_layer
        
        service.send_server_status_update(
            'smtp', 
            self.smtp_server.id, 
            'success',
            {'response_time': 1.5}
        )
        
        # Verify channel layer was called
        self.assertTrue(mock_channel_layer.group_send.called)
        
        # Check message content
        call_args = mock_channel_layer.group_send.call_args_list[0]
        message_data = call_args[0][1]['message']
        
        self.assertEqual(message_data['type'], 'server_status')
        self.assertEqual(message_data['server_type'], 'smtp')
        self.assertEqual(message_data['server_id'], self.smtp_server.id)
        self.assertEqual(message_data['status'], 'success')
    
    @patch('sms_sender.monitoring_service.get_channel_layer')
    def test_send_error_notification(self, mock_get_channel_layer):
        """Test sending error notifications"""
        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        service = CampaignMonitoringService(self.campaign.id)
        service.channel_layer = mock_channel_layer
        
        service.send_error_notification(
            'smtp_authentication_failed',
            'SMTP authentication failed for server',
            {'server_id': self.smtp_server.id}
        )
        
        # Verify channel layer was called
        self.assertTrue(mock_channel_layer.group_send.called)
        
        # Check message content
        call_args = mock_channel_layer.group_send.call_args_list[0]
        message_data = call_args[0][1]['message']
        
        self.assertEqual(message_data['type'], 'error_notification')
        self.assertEqual(message_data['error_type'], 'smtp_authentication_failed')
        self.assertEqual(message_data['severity'], 'high')  # Should be high for auth failures
    
    def test_get_campaign_stats(self):
        """Test getting comprehensive campaign statistics"""
        service = CampaignMonitoringService(self.campaign.id)
        
        stats = service.get_campaign_stats()
        
        # Verify basic structure
        self.assertIn('campaign_id', stats)
        self.assertIn('campaign_name', stats)
        self.assertIn('status', stats)
        self.assertIn('total_messages', stats)
        self.assertIn('status_breakdown', stats)
        self.assertIn('server_usage', stats)
        self.assertIn('performance_metrics', stats)
        self.assertIn('carrier_performance', stats)
        
        # Verify data accuracy
        self.assertEqual(stats['campaign_id'], self.campaign.id)
        self.assertEqual(stats['campaign_name'], self.campaign.name)
        self.assertEqual(stats['total_messages'], 10)  # We created 10 test messages
        
        # Check status breakdown
        status_breakdown = stats['status_breakdown']
        self.assertEqual(status_breakdown.get('delivered', 0), 8)
        self.assertEqual(status_breakdown.get('failed', 0), 2)
        
        # Check server usage
        server_usage = stats['server_usage']
        self.assertEqual(server_usage['total_proxy_servers'], 1)
        self.assertEqual(server_usage['total_smtp_servers'], 1)
    
    def test_get_server_usage_stats(self):
        """Test server usage statistics calculation"""
        service = CampaignMonitoringService(self.campaign.id)
        
        server_stats = service._get_server_usage_stats()
        
        self.assertIn('proxy_servers', server_stats)
        self.assertIn('smtp_servers', server_stats)
        self.assertIn('total_proxy_servers', server_stats)
        self.assertIn('total_smtp_servers', server_stats)
        
        # Verify proxy server stats
        proxy_servers = server_stats['proxy_servers']
        self.assertEqual(len(proxy_servers), 1)
        
        proxy_server = proxy_servers[0]
        self.assertEqual(proxy_server['server_id'], self.proxy_server.id)
        self.assertEqual(proxy_server['messages_processed'], 50)
        
        # Verify SMTP server stats
        smtp_servers = server_stats['smtp_servers']
        self.assertEqual(len(smtp_servers), 1)
        
        smtp_server = smtp_servers[0]
        self.assertEqual(smtp_server['server_id'], self.smtp_server.id)
        self.assertEqual(smtp_server['messages_processed'], 50)
    
    def test_get_performance_metrics(self):
        """Test performance metrics calculation"""
        service = CampaignMonitoringService(self.campaign.id)
        
        performance = service._get_performance_metrics()
        
        self.assertIn('avg_proxy_response_time', performance)
        self.assertIn('avg_smtp_response_time', performance)
        self.assertIn('avg_total_processing_time', performance)
        self.assertIn('avg_delivery_delay', performance)
        
        # Verify calculated averages
        self.assertEqual(performance['avg_proxy_response_time'], 0.5)
        self.assertEqual(performance['avg_smtp_response_time'], 1.0)
        self.assertEqual(performance['avg_delivery_delay'], 1.0)
    
    def test_get_carrier_performance(self):
        """Test carrier performance analysis"""
        service = CampaignMonitoringService(self.campaign.id)
        
        carrier_stats = service._get_carrier_performance()
        
        self.assertIn('carrier_breakdown', carrier_stats)
        self.assertIn('total_carriers', carrier_stats)
        
        carrier_breakdown = carrier_stats['carrier_breakdown']
        self.assertEqual(len(carrier_breakdown), 2)  # AT&T and Verizon
        
        # Find AT&T stats
        att_stats = next((c for c in carrier_breakdown if c['carrier'] == 'AT&T'), None)
        self.assertIsNotNone(att_stats)
        self.assertEqual(att_stats['total_messages'], 5)  # Half of our test messages
        
        # Find Verizon stats
        verizon_stats = next((c for c in carrier_breakdown if c['carrier'] == 'Verizon'), None)
        self.assertIsNotNone(verizon_stats)
        self.assertEqual(verizon_stats['total_messages'], 5)
    
    def test_nonexistent_campaign(self):
        """Test handling of nonexistent campaign"""
        service = CampaignMonitoringService(99999)  # Non-existent ID
        
        self.assertIsNone(service.campaign)
        
        # Should handle gracefully without errors
        stats = service.get_campaign_stats()
        self.assertEqual(stats, {})


class GlobalMonitoringServiceTest(TestCase):
    """Test cases for GlobalMonitoringService"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test campaigns
        self.active_campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Active Campaign',
            message_template='Hello!',
            status='in_progress',
            total_recipients=100,
            started_at=timezone.now()
        )
        
        self.completed_campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Completed Campaign',
            message_template='Hello!',
            status='completed',
            total_recipients=50,
            completed_at=timezone.now() - timedelta(hours=1)
        )
        
        # Create recent messages
        for i in range(20):
            SMSMessage.objects.create(
                campaign=self.active_campaign if i < 15 else self.completed_campaign,
                phone_number=f'555000{i:04d}',
                message_content='Hello!',
                delivery_status='delivered' if i % 4 != 0 else 'failed',
                created_at=timezone.now() - timedelta(hours=2)
            )
    
    def test_global_monitoring_service_initialization(self):
        """Test global monitoring service initialization"""
        service = GlobalMonitoringService(self.user.id)
        
        self.assertEqual(service.user_id, self.user.id)
        self.assertIsNotNone(service.channel_layer)
    
    def test_get_system_health_stats(self):
        """Test system health statistics"""
        service = GlobalMonitoringService(self.user.id)
        
        stats = service.get_system_health_stats()
        
        self.assertIn('active_campaigns', stats)
        self.assertIn('total_messages_24h', stats)
        self.assertIn('successful_messages_24h', stats)
        self.assertIn('failed_messages_24h', stats)
        self.assertIn('server_health', stats)
        self.assertIn('timestamp', stats)
        
        # Verify active campaigns count
        self.assertEqual(stats['active_campaigns'], 1)  # Only one in_progress campaign
        
        # Verify message counts (all messages are within 24h due to our test setup)
        self.assertEqual(stats['total_messages_24h'], 20)
        self.assertEqual(stats['successful_messages_24h'], 15)  # 75% success rate
        self.assertEqual(stats['failed_messages_24h'], 5)
    
    @patch('sms_sender.monitoring_service.get_channel_layer')
    def test_send_system_health_update(self, mock_get_channel_layer):
        """Test sending system health updates"""
        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        service = GlobalMonitoringService(self.user.id)
        service.channel_layer = mock_channel_layer
        
        service.send_system_health_update()
        
        # Verify channel layer was called
        self.assertTrue(mock_channel_layer.group_send.called)
        
        # Check message structure
        call_args = mock_channel_layer.group_send.call_args_list[0]
        group_name, message_data = call_args[0]
        
        self.assertEqual(group_name, f'user_{self.user.id}_system')
        self.assertEqual(message_data['type'], 'system_message')
        self.assertIn('message', message_data)
    
    def test_get_server_health_summary(self):
        """Test server health summary calculation"""
        service = GlobalMonitoringService(self.user.id)
        
        # Create some server usage logs
        proxy_server = ProxyServer.objects.create(
            user=self.user,
            host='proxy1.example.com',
            port=8080,
            username='proxyuser',
            password='proxypass'
        )
        
        ServerUsageLog.objects.create(
            campaign=self.active_campaign,
            server_type='proxy',
            server_id=proxy_server.id,
            messages_processed=100,
            successful_messages=95,
            failed_messages=5,
            last_used=timezone.now()
        )
        
        health_summary = service._get_server_health_summary()
        
        self.assertIn('proxy_servers', health_summary)
        self.assertIn('smtp_servers', health_summary)
        
        proxy_health = health_summary['proxy_servers']
        self.assertEqual(proxy_health['total'], 1)
        self.assertEqual(proxy_health['avg_success_rate'], 95.0)


class MonitoringIntegrationTest(TestCase):
    """Integration tests for monitoring service with WebSocket consumers"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Test Campaign',
            message_template='Hello!',
            status='in_progress'
        )
    
    @patch('sms_sender.monitoring_service.get_channel_layer')
    def test_monitoring_with_mock_channel_layer(self, mock_get_channel_layer):
        """Test monitoring service with mocked channel layer"""
        # Create a mock channel layer
        mock_channel_layer = Mock()
        mock_get_channel_layer.return_value = mock_channel_layer
        
        service = CampaignMonitoringService(self.campaign.id)
        
        # Test various notification types
        service.send_progress_update({'progress': 50})
        service.send_server_status_update('smtp', 1, 'success')
        service.send_error_notification('test_error', 'Test error message')
        
        # Verify all calls were made
        self.assertEqual(mock_channel_layer.group_send.call_count, 6)  # 2 groups × 3 notifications
    
    def test_error_severity_determination(self):
        """Test error severity determination logic"""
        service = CampaignMonitoringService(self.campaign.id)
        
        # Test high severity errors
        high_severity_errors = [
            'smtp_authentication_failed',
            'proxy_authentication_failed',
            'all_servers_failed'
        ]
        
        for error_type in high_severity_errors:
            severity = service._determine_error_severity(error_type)
            self.assertEqual(severity, 'high')
        
        # Test medium severity errors
        medium_severity_errors = [
            'server_timeout',
            'rate_limit_exceeded',
            'carrier_rejection'
        ]
        
        for error_type in medium_severity_errors:
            severity = service._determine_error_severity(error_type)
            self.assertEqual(severity, 'medium')
        
        # Test unknown errors (should default to low)
        unknown_severity = service._determine_error_severity('unknown_error_type')
        self.assertEqual(unknown_severity, 'low')
    
    def test_time_metrics_calculation(self):
        """Test time-based metrics calculation"""
        # Set specific start time
        start_time = timezone.now() - timedelta(hours=2)
        self.campaign.started_at = start_time
        self.campaign.messages_sent = 50
        self.campaign.total_recipients = 100
        self.campaign.save()
        
        service = CampaignMonitoringService(self.campaign.id)
        time_metrics = service._get_time_metrics()
        
        self.assertIn('duration_seconds', time_metrics)
        self.assertIn('messages_per_minute', time_metrics)
        self.assertIn('estimated_completion', time_metrics)
        
        # Verify duration calculation
        expected_duration = 2 * 3600  # 2 hours in seconds
        self.assertAlmostEqual(time_metrics['duration_seconds'], expected_duration, delta=60)
        
        # Verify messages per minute calculation
        expected_rate = 50 / 120  # 50 messages in 120 minutes
        self.assertAlmostEqual(time_metrics['messages_per_minute'], expected_rate, places=2)
    
    def test_campaign_stats_with_no_messages(self):
        """Test campaign statistics when no messages exist"""
        service = CampaignMonitoringService(self.campaign.id)
        
        stats = service.get_campaign_stats()
        
        # Should handle empty campaign gracefully
        self.assertEqual(stats['total_messages'], 0)
        self.assertEqual(stats['status_breakdown'], {})
        self.assertIsNotNone(stats['server_usage'])
        self.assertIsNotNone(stats['performance_metrics'])
    
    def test_retry_statistics_calculation(self):
        """Test retry statistics calculation"""
        # Create test message and retry attempts
        message = SMSMessage.objects.create(
            campaign=self.campaign,
            phone_number='5551234567',
            message_content='Test message',
            delivery_status='failed'
        )
        
        # Create retry attempts
        RetryAttempt.objects.create(
            message=message,
            attempt_number=1,
            error_type='timeout',
            error_message='Connection timeout',
            retry_delay=30,
            scheduled_retry_time=timezone.now() + timedelta(seconds=30),
            completed=True,
            success=False
        )
        
        RetryAttempt.objects.create(
            message=message,
            attempt_number=2,
            error_type='timeout',
            error_message='Connection timeout',
            retry_delay=60,
            scheduled_retry_time=timezone.now() + timedelta(seconds=60),
            completed=True,
            success=True
        )
        
        service = CampaignMonitoringService(self.campaign.id)
        retry_stats = service._get_retry_statistics()
        
        self.assertEqual(retry_stats['total_retries'], 2)
        self.assertEqual(retry_stats['successful_retries'], 1)
        self.assertEqual(retry_stats['retry_success_rate'], 50.0)
        
        # Check retry by error type
        retry_by_error = retry_stats['retry_by_error_type']
        timeout_stats = next((r for r in retry_by_error if r['error_type'] == 'timeout'), None)
        self.assertIsNotNone(timeout_stats)
        self.assertEqual(timeout_stats['count'], 2)
        self.assertEqual(timeout_stats['success_count'], 1)
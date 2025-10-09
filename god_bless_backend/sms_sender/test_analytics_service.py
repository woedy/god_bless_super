"""
Unit tests for Predictive Analytics Service
"""

from datetime import datetime, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from unittest.mock import Mock, patch

from .analytics_service import PredictiveAnalyticsService
from .models import (
    SMSCampaign, SMSMessage, ServerUsageLog, CarrierPerformanceLog,
    RetryAttempt, CampaignDeliverySettings
)
from proxy_server.models import ProxyServer
from smtps.models import SmtpManager

User = get_user_model()


class PredictiveAnalyticsServiceTest(TestCase):
    """Test cases for PredictiveAnalyticsService"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test campaign
        self.campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Test Campaign',
            message_template='Hello {name}!',
            total_recipients=100,
            messages_sent=80,
            messages_delivered=75,
            messages_failed=5,
            status='completed',
            started_at=timezone.now() - timedelta(hours=2),
            completed_at=timezone.now() - timedelta(hours=1)
        )
        
        # Create delivery settings
        self.delivery_settings = CampaignDeliverySettings.objects.create(
            campaign=self.campaign,
            proxy_rotation_strategy='round_robin',
            smtp_rotation_strategy='best_performance'
        )
        
        # Create analytics service
        self.analytics_service = PredictiveAnalyticsService(self.user)
    
    def test_predict_server_failure_insufficient_data(self):
        """Test server failure prediction with insufficient data"""
        failure_prob = self.analytics_service.predict_server_failure(1, 'proxy')
        self.assertEqual(failure_prob, 0.5)  # Default moderate risk
    
    def test_predict_server_failure_with_data(self):
        """Test server failure prediction with sufficient data"""
        # Create server usage logs with varying failure rates
        for i in range(15):  # More than min_data_points
            ServerUsageLog.objects.create(
                campaign=self.campaign,
                server_type='proxy',
                server_id=1,
                messages_processed=100,
                successful_messages=90 - i,  # Decreasing success rate
                failed_messages=10 + i,      # Increasing failure rate
                average_response_time=1.0 + (i * 0.1),  # Increasing response time
                last_used=timezone.now() - timedelta(days=i)
            )
        
        failure_prob = self.analytics_service.predict_server_failure(1, 'proxy')
        self.assertGreater(failure_prob, 0.5)  # Should be higher than default
        self.assertLessEqual(failure_prob, 1.0)
    
    def test_recommend_server_configuration_no_data(self):
        """Test recommendations with no historical data"""
        recommendations = self.analytics_service.recommend_server_configuration()
        
        self.assertEqual(recommendations['proxy_strategy'], 'round_robin')
        self.assertEqual(recommendations['smtp_strategy'], 'round_robin')
        self.assertIn("No historical data available", recommendations['reasoning'])
    
    def test_recommend_server_configuration_with_data(self):
        """Test recommendations with historical campaign data"""
        # Create additional successful campaigns with different strategies
        for strategy in ['round_robin', 'best_performance', 'random']:
            campaign = SMSCampaign.objects.create(
                user=self.user,
                name=f'Campaign {strategy}',
                message_template='Test',
                total_recipients=100,
                messages_sent=100,
                messages_delivered=95,  # High success rate
                messages_failed=5,
                status='completed',
                created_at=timezone.now() - timedelta(days=5)
            )
            
            CampaignDeliverySettings.objects.create(
                campaign=campaign,
                proxy_rotation_strategy=strategy,
                smtp_rotation_strategy=strategy
            )
        
        recommendations = self.analytics_service.recommend_server_configuration()
        
        # Should recommend one of the strategies based on performance
        self.assertIn(recommendations['proxy_strategy'], ['round_robin', 'best_performance', 'random'])
        self.assertGreater(recommendations['confidence_score'], 0)
    
    def test_generate_optimization_suggestions(self):
        """Test generation of optimization suggestions"""
        suggestions = self.analytics_service.generate_optimization_suggestions()
        
        self.assertIsInstance(suggestions, list)
        # Should return empty list or valid suggestions
        for suggestion in suggestions:
            self.assertIn('type', suggestion)
            self.assertIn('priority', suggestion)
            self.assertIn('title', suggestion)
            self.assertIn('description', suggestion)
    
    def test_detect_anomalies_no_campaigns(self):
        """Test anomaly detection with no campaigns"""
        anomalies = self.analytics_service.detect_anomalies()
        self.assertEqual(len(anomalies), 0)
    
    def test_detect_anomalies_with_high_failure_rate(self):
        """Test anomaly detection with high failure rate"""
        # Create campaign with high failure rate
        high_failure_campaign = SMSCampaign.objects.create(
            user=self.user,
            name='High Failure Campaign',
            message_template='Test',
            total_recipients=100,
            messages_sent=100,
            messages_delivered=50,  # Low success rate
            messages_failed=50,     # High failure rate
            status='completed',
            created_at=timezone.now() - timedelta(days=1)
        )
        
        # Create messages with failed status
        for i in range(50):
            SMSMessage.objects.create(
                campaign=high_failure_campaign,
                phone_number=f'555000{i:04d}',
                message_content='Test message',
                delivery_status='failed'
            )
        
        anomalies = self.analytics_service.detect_anomalies(high_failure_campaign.id)
        
        # Should detect high failure rate anomaly
        failure_anomalies = [a for a in anomalies if a['type'] == 'high_failure_rate']
        self.assertGreater(len(failure_anomalies), 0)
    
    def test_forecast_completion_time_inactive_campaign(self):
        """Test completion time forecast for inactive campaign"""
        self.campaign.status = 'completed'
        self.campaign.save()
        
        forecast = self.analytics_service.forecast_completion_time(self.campaign.id)
        self.assertIn('error', forecast)
        self.assertEqual(forecast['error'], 'Campaign is not active')
    
    def test_forecast_completion_time_no_messages_sent(self):
        """Test completion time forecast with no messages sent"""
        active_campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Active Campaign',
            message_template='Test',
            total_recipients=100,
            messages_sent=0,  # No messages sent yet
            status='in_progress',
            started_at=timezone.now()
        )
        
        forecast = self.analytics_service.forecast_completion_time(active_campaign.id)
        self.assertIn('error', forecast)
        self.assertEqual(forecast['error'], 'No messages sent yet, cannot forecast')
    
    def test_forecast_completion_time_active_campaign(self):
        """Test completion time forecast for active campaign"""
        active_campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Active Campaign',
            message_template='Test',
            total_recipients=100,
            messages_sent=50,
            status='in_progress',
            started_at=timezone.now() - timedelta(minutes=30)  # 30 minutes ago
        )
        
        forecast = self.analytics_service.forecast_completion_time(active_campaign.id)
        
        if 'error' not in forecast:
            self.assertIn('current_rate', forecast)
            self.assertIn('messages_remaining', forecast)
            self.assertIn('basic_forecast', forecast)
            self.assertIn('adjusted_forecast', forecast)
            self.assertEqual(forecast['messages_remaining'], 50)
    
    def test_analyze_campaign_performance(self):
        """Test campaign performance analysis"""
        # Create server usage logs
        ServerUsageLog.objects.create(
            campaign=self.campaign,
            server_type='proxy',
            server_id=1,
            messages_processed=50,
            successful_messages=45,
            failed_messages=5,
            average_response_time=2.5
        )
        
        analysis = self.analytics_service.analyze_campaign_performance(self.campaign.id)
        
        self.assertNotIn('error', analysis)
        self.assertEqual(analysis['campaign_id'], self.campaign.id)
        self.assertIn('performance_score', analysis)
        self.assertIn('server_performance', analysis)
        self.assertIn('bottlenecks', analysis)
        self.assertIn('optimization_opportunities', analysis)
    
    def test_analyze_campaign_performance_nonexistent(self):
        """Test campaign performance analysis for nonexistent campaign"""
        analysis = self.analytics_service.analyze_campaign_performance(99999)
        self.assertIn('error', analysis)
        self.assertEqual(analysis['error'], 'Campaign not found')
    
    def test_get_recent_server_logs(self):
        """Test getting recent server logs"""
        # Create logs within and outside the time window
        recent_log = ServerUsageLog.objects.create(
            campaign=self.campaign,
            server_type='proxy',
            server_id=1,
            messages_processed=10,
            successful_messages=9,
            failed_messages=1,
            last_used=timezone.now() - timedelta(days=3)
        )
        
        old_log = ServerUsageLog.objects.create(
            campaign=self.campaign,
            server_type='proxy',
            server_id=1,
            messages_processed=10,
            successful_messages=8,
            failed_messages=2,
            last_used=timezone.now() - timedelta(days=10)  # Outside window
        )
        
        logs = self.analytics_service._get_recent_server_logs(1, 'proxy')
        
        # Should only include recent logs
        self.assertIn(recent_log, logs)
        self.assertNotIn(old_log, logs)
    
    def test_calculate_speed_score(self):
        """Test speed score calculation"""
        # Test with completed campaign
        speed_score = self.analytics_service._calculate_speed_score(self.campaign)
        self.assertGreaterEqual(speed_score, 0.0)
        self.assertLessEqual(speed_score, 1.0)
        
        # Test with incomplete campaign
        incomplete_campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Incomplete Campaign',
            message_template='Test',
            total_recipients=100,
            messages_sent=50,
            status='in_progress'
        )
        
        speed_score = self.analytics_service._calculate_speed_score(incomplete_campaign)
        self.assertEqual(speed_score, 0.5)  # Default for incomplete campaigns
    
    def test_identify_bottlenecks(self):
        """Test bottleneck identification"""
        # Create slow server log
        ServerUsageLog.objects.create(
            campaign=self.campaign,
            server_type='smtp',
            server_id=1,
            messages_processed=10,
            successful_messages=8,
            failed_messages=2,
            average_response_time=6.0  # Slow response time
        )
        
        # Create high failure rate server log
        ServerUsageLog.objects.create(
            campaign=self.campaign,
            server_type='proxy',
            server_id=2,
            messages_processed=100,
            successful_messages=70,
            failed_messages=30  # 30% failure rate
        )
        
        bottlenecks = self.analytics_service._identify_bottlenecks(self.campaign)
        
        # Should identify both bottlenecks
        slow_server_found = any('Slow smtp server 1' in b for b in bottlenecks)
        high_failure_found = any('High failure rate on proxy server 2' in b for b in bottlenecks)
        
        self.assertTrue(slow_server_found)
        self.assertTrue(high_failure_found)


class PredictiveAnalyticsAPITest(TestCase):
    """Test cases for Analytics API endpoints"""
    
    def setUp(self):
        """Set up test data for API tests"""
        self.user = User.objects.create_user(
            username='apiuser',
            email='api@example.com',
            password='testpass123'
        )
        
        self.campaign = SMSCampaign.objects.create(
            user=self.user,
            name='API Test Campaign',
            message_template='Hello!',
            total_recipients=50,
            messages_sent=25,
            status='in_progress',
            started_at=timezone.now() - timedelta(minutes=15)
        )
    
    def test_analytics_service_initialization(self):
        """Test that analytics service initializes correctly"""
        service = PredictiveAnalyticsService(self.user)
        
        self.assertEqual(service.user, self.user)
        self.assertEqual(service.failure_threshold, 0.3)
        self.assertEqual(service.performance_window_days, 7)
        self.assertEqual(service.min_data_points, 10)
    
    def test_user_average_failure_rate_no_campaigns(self):
        """Test user average failure rate calculation with no campaigns"""
        service = PredictiveAnalyticsService(self.user)
        avg_rate = service._get_user_average_failure_rate()
        self.assertEqual(avg_rate, 0.1)  # Default 10%
    
    def test_user_average_failure_rate_with_campaigns(self):
        """Test user average failure rate calculation with campaigns"""
        # Mark campaign as completed
        self.campaign.status = 'completed'
        self.campaign.messages_failed = 5
        self.campaign.save()
        
        service = PredictiveAnalyticsService(self.user)
        avg_rate = service._get_user_average_failure_rate()
        
        expected_rate = 5 / 50  # 5 failed out of 50 total
        self.assertEqual(avg_rate, expected_rate)
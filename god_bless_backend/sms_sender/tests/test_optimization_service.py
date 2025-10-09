"""
Tests for the optimization service.
"""

import pytest
from unittest.mock import Mock, patch
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.cache import cache

from ..optimization_service import OptimizationService
from ..models import SMSCampaign, CampaignDeliverySettings
from proxy_server.models import ProxyServer
from smtps.models import SmtpManager


class OptimizationServiceTest(TestCase):
    """Test cases for OptimizationService."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Test Campaign',
            message='Test message'
        )
        
        # Create test servers
        self.proxy_server = ProxyServer.objects.create(
            user=self.user,
            host='proxy.example.com',
            port=8080,
            username='proxy_user',
            password='proxy_pass',
            is_active=True
        )
        
        self.smtp_server = SmtpManager.objects.create(
            user=self.user,
            host='smtp.example.com',
            port=587,
            username='smtp_user',
            password='smtp_pass',
            use_tls=True,
            is_active=True
        )
        
        self.optimization_service = OptimizationService(self.user)
    
    def tearDown(self):
        """Clean up after tests."""
        cache.clear()
    
    def test_auto_optimize_campaign_success(self):
        """Test successful campaign optimization."""
        result = self.optimization_service.auto_optimize_campaign(self.campaign)
        
        self.assertTrue(result['success'])
        self.assertTrue(result['optimization_applied'])
        self.assertIn('config', result)
        self.assertIn('analysis', result)
        self.assertIn('performance_improvement', result)
        
        # Check that settings were created
        settings = CampaignDeliverySettings.objects.filter(campaign=self.campaign).first()
        self.assertIsNotNone(settings)
    
    def test_get_optimization_recommendations(self):
        """Test getting optimization recommendations."""
        recommendations = self.optimization_service.get_optimization_recommendations()
        
        self.assertIsInstance(recommendations, list)
        # Should have recommendations since we only have 1 proxy and 1 SMTP server
        self.assertGreater(len(recommendations), 0)
        
        # Check recommendation structure
        if recommendations:
            rec = recommendations[0]
            self.assertIn('type', rec)
            self.assertIn('priority', rec)
            self.assertIn('title', rec)
            self.assertIn('description', rec)
    
    def test_get_real_time_guidance_campaign_setup(self):
        """Test getting real-time guidance for campaign setup."""
        campaign_data = {
            'message_count': 15000,  # Large campaign
            'target_audience_size': 14500
        }
        
        guidance = self.optimization_service.get_real_time_guidance(
            'campaign_setup', 
            campaign_data
        )
        
        self.assertIn('tips', guidance)
        self.assertIn('warnings', guidance)
        self.assertIn('suggestions', guidance)
        self.assertEqual(guidance['context'], 'campaign_setup')
        
        # Should have warnings for large campaign
        self.assertGreater(len(guidance['warnings']), 0)
    
    def test_enable_maintenance_mode(self):
        """Test enabling maintenance mode for a server."""
        result = self.optimization_service.enable_maintenance_mode(
            'proxy', 
            self.proxy_server.id, 
            30
        )
        
        self.assertTrue(result['success'])
        self.assertTrue(result['maintenance_enabled'])
        self.assertEqual(result['server_type'], 'proxy')
        self.assertEqual(result['server_id'], self.proxy_server.id)
        self.assertEqual(result['duration_minutes'], 30)
        
        # Check that server is marked as inactive
        self.proxy_server.refresh_from_db()
        self.assertFalse(self.proxy_server.is_active)
        
        # Check that maintenance status is cached
        self.assertTrue(
            self.optimization_service.is_server_in_maintenance('proxy', self.proxy_server.id)
        )
    
    def test_disable_maintenance_mode(self):
        """Test disabling maintenance mode for a server."""
        # First enable maintenance mode
        self.optimization_service.enable_maintenance_mode('smtp', self.smtp_server.id, 30)
        
        # Then disable it
        result = self.optimization_service.disable_maintenance_mode('smtp', self.smtp_server.id)
        
        self.assertTrue(result['success'])
        self.assertFalse(result['maintenance_enabled'])
        
        # Check that server is restored to active
        self.smtp_server.refresh_from_db()
        self.assertTrue(self.smtp_server.is_active)
        
        # Check that maintenance status is cleared
        self.assertFalse(
            self.optimization_service.is_server_in_maintenance('smtp', self.smtp_server.id)
        )
    
    def test_infrastructure_analysis(self):
        """Test infrastructure analysis."""
        analysis = self.optimization_service._analyze_infrastructure()
        
        self.assertEqual(analysis['proxy_count'], 1)
        self.assertEqual(analysis['smtp_count'], 1)
        self.assertEqual(analysis['total_servers'], 2)
        self.assertIn('avg_success_rate', analysis)
        self.assertIn('health_status', analysis)
    
    def test_generate_optimal_config(self):
        """Test optimal configuration generation."""
        infrastructure = {
            'proxy_count': 2,
            'smtp_count': 2,
            'avg_success_rate': 0.85
        }
        
        performance = {
            'success_rate': 0.85,
            'total_messages': 1000
        }
        
        config = self.optimization_service._generate_optimal_config(
            infrastructure, 
            performance, 
            self.campaign
        )
        
        self.assertIn('proxy_rotation_enabled', config)
        self.assertIn('smtp_rotation_enabled', config)
        self.assertIn('delivery_delay_enabled', config)
        self.assertIn('proxy_rotation_strategy', config)
        self.assertIn('smtp_rotation_strategy', config)
        
        # With 2 servers, rotation should be enabled
        self.assertTrue(config['proxy_rotation_enabled'])
        self.assertTrue(config['smtp_rotation_enabled'])
    
    @patch('sms_sender.optimization_service.OptimizationService._get_historical_performance')
    def test_optimization_with_poor_performance(self, mock_performance):
        """Test optimization recommendations with poor performance."""
        # Mock poor performance data
        mock_performance.return_value = {
            'total_messages': 1000,
            'success_rate': 0.6,  # Poor success rate
            'avg_delivery_time': 5.0,
            'peak_hours': [9, 10, 11],
            'carrier_performance': {'verizon': 0.5, 'att': 0.6}
        }
        
        result = self.optimization_service.auto_optimize_campaign(self.campaign)
        
        self.assertTrue(result['success'])
        
        # Should recommend longer delays for poor performance
        config = result['config']
        self.assertGreaterEqual(config['delivery_delay_min'], 3)
        self.assertGreaterEqual(config['delivery_delay_max'], 8)
    
    def test_maintenance_mode_invalid_server(self):
        """Test maintenance mode with invalid server ID."""
        result = self.optimization_service.enable_maintenance_mode('proxy', 99999, 30)
        
        # Should still succeed but server won't be found
        self.assertTrue(result['success'])
        self.assertTrue(result['maintenance_enabled'])
    
    def test_guidance_for_different_contexts(self):
        """Test guidance for different contexts."""
        contexts = ['campaign_setup', 'server_config', 'performance_review']
        
        for context in contexts:
            guidance = self.optimization_service.get_real_time_guidance(context)
            
            self.assertIn('tips', guidance)
            self.assertIn('warnings', guidance)
            self.assertIn('suggestions', guidance)
            self.assertEqual(guidance['context'], context)


@pytest.mark.django_db
class OptimizationServiceIntegrationTest:
    """Integration tests for OptimizationService."""
    
    def test_full_optimization_workflow(self):
        """Test complete optimization workflow."""
        # Create user and campaign
        user = User.objects.create_user(
            username='integrationuser',
            email='integration@example.com',
            password='testpass123'
        )
        
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Integration Test Campaign',
            message='Integration test message'
        )
        
        # Create multiple servers for better optimization
        for i in range(3):
            ProxyServer.objects.create(
                user=user,
                host=f'proxy{i}.example.com',
                port=8080 + i,
                username=f'proxy_user{i}',
                password=f'proxy_pass{i}',
                is_active=True
            )
            
            SmtpManager.objects.create(
                user=user,
                host=f'smtp{i}.example.com',
                port=587,
                username=f'smtp_user{i}',
                password=f'smtp_pass{i}',
                use_tls=True,
                is_active=True
            )
        
        # Run optimization
        service = OptimizationService(user)
        result = service.auto_optimize_campaign(campaign)
        
        # Verify optimization results
        assert result['success']
        assert result['optimization_applied']
        
        # Check that optimal strategies were selected
        config = result['config']
        assert config['proxy_rotation_enabled']
        assert config['smtp_rotation_enabled']
        assert config['proxy_rotation_strategy'] in ['round_robin', 'best_performance']
        assert config['smtp_rotation_strategy'] in ['round_robin', 'best_performance']
        
        # Verify settings were persisted
        settings = CampaignDeliverySettings.objects.filter(campaign=campaign).first()
        assert settings is not None
        assert settings.proxy_rotation_enabled == config['proxy_rotation_enabled']
        assert settings.smtp_rotation_enabled == config['smtp_rotation_enabled']
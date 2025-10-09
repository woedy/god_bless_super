"""
Test suite for configuration management API endpoints
"""
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from sms_sender.models import SMSCampaign, CampaignDeliverySettings
from proxy_server.models import ProxyServer, RotationSettings
from smtps.models import SmtpManager

User = get_user_model()


class ConfigurationAPITestCase(TestCase):
    """Test case for configuration management API"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create test proxy server
        self.proxy_server = ProxyServer.objects.create(
            user=self.user,
            host='proxy.example.com',
            port=8080,
            protocol='http',
            is_active=True,
            is_healthy=True
        )
        
        # Create test SMTP server
        self.smtp_server = SmtpManager.objects.create(
            user=self.user,
            host='smtp.example.com',
            port='587',
            username='test@example.com',
            password='password',
            ssl=False,
            tls=True,
            active=True,
            is_healthy=True
        )
        
        # Create test campaign
        self.campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Test Campaign',
            message_template='Hello {name}!',
            status='draft'
        )
    
    def test_rotation_settings_get_or_create(self):
        """Test getting or creating rotation settings"""
        url = '/api/sms-sender/api/rotation-settings/'
        
        # First request should create default settings
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertTrue(data['proxy_rotation_enabled'])
        self.assertEqual(data['proxy_rotation_strategy'], 'round_robin')
        self.assertTrue(data['smtp_rotation_enabled'])
        self.assertEqual(data['smtp_rotation_strategy'], 'round_robin')
        
        # Verify settings were created in database
        settings = RotationSettings.objects.get(user=self.user)
        self.assertTrue(settings.proxy_rotation_enabled)
    
    def test_rotation_settings_update(self):
        """Test updating rotation settings"""
        url = '/api/sms-sender/api/rotation-settings/'
        
        # Create initial settings
        self.client.get(url)
        
        # Update settings
        update_data = {
            'proxy_rotation_strategy': 'random',
            'smtp_rotation_strategy': 'best_performance',
            'delivery_delay_min': 2,
            'delivery_delay_max': 10
        }
        
        response = self.client.post(url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify updates
        settings = RotationSettings.objects.get(user=self.user)
        self.assertEqual(settings.proxy_rotation_strategy, 'random')
        self.assertEqual(settings.smtp_rotation_strategy, 'best_performance')
        self.assertEqual(settings.delivery_delay_min, 2)
        self.assertEqual(settings.delivery_delay_max, 10)
    
    def test_rotation_settings_validation(self):
        """Test rotation settings validation"""
        url = '/api/sms-sender/api/rotation-settings/validate_settings/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertTrue(data['is_valid'])
        self.assertEqual(data['server_counts']['active_proxies'], 1)
        self.assertEqual(data['server_counts']['active_smtp_servers'], 1)
    
    def test_campaign_delivery_settings_by_campaign(self):
        """Test getting delivery settings for a specific campaign"""
        url = '/api/sms-sender/api/campaign-delivery-settings/by_campaign/'
        
        response = self.client.get(url, {'campaign_id': self.campaign.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(data['campaign'], self.campaign.id)
        self.assertTrue(data['use_proxy_rotation'])
        self.assertTrue(data['use_smtp_rotation'])
    
    def test_campaign_delivery_settings_update(self):
        """Test updating campaign delivery settings"""
        url = '/api/sms-sender/api/campaign-delivery-settings/update_by_campaign/'
        
        update_data = {
            'campaign_id': self.campaign.id,
            'use_proxy_rotation': False,
            'proxy_rotation_strategy': 'random',
            'custom_delay_enabled': True,
            'custom_delay_min': 3,
            'custom_delay_max': 8
        }
        
        response = self.client.post(url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify settings were updated
        settings = CampaignDeliverySettings.objects.get(campaign=self.campaign)
        self.assertFalse(settings.use_proxy_rotation)
        self.assertEqual(settings.proxy_rotation_strategy, 'random')
        self.assertTrue(settings.custom_delay_enabled)
        self.assertEqual(settings.custom_delay_min, 3)
        self.assertEqual(settings.custom_delay_max, 8)
    
    def test_server_health_list(self):
        """Test getting server health information"""
        url = '/api/sms-sender/api/server-health/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(len(data), 2)  # 1 proxy + 1 SMTP server
        
        # Check proxy server data
        proxy_data = next(server for server in data if server['type'] == 'proxy')
        self.assertEqual(proxy_data['host'], 'proxy.example.com')
        self.assertEqual(proxy_data['port'], '8080')
        self.assertTrue(proxy_data['is_healthy'])
        self.assertTrue(proxy_data['is_active'])
        
        # Check SMTP server data
        smtp_data = next(server for server in data if server['type'] == 'smtp')
        self.assertEqual(smtp_data['host'], 'smtp.example.com')
        self.assertEqual(smtp_data['port'], '587')
        self.assertTrue(smtp_data['is_healthy'])
        self.assertTrue(smtp_data['is_active'])
    
    def test_server_health_summary(self):
        """Test getting server health summary"""
        url = '/api/sms-sender/api/server-health/summary/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(data['proxy_servers']['total'], 1)
        self.assertEqual(data['proxy_servers']['healthy'], 1)
        self.assertEqual(data['smtp_servers']['total'], 1)
        self.assertEqual(data['smtp_servers']['healthy'], 1)
        self.assertEqual(data['overall_health']['total_servers'], 2)
        self.assertEqual(data['overall_health']['healthy_servers'], 2)
        self.assertEqual(data['overall_health']['health_percentage'], 100.0)
    
    def test_server_health_filter_by_type(self):
        """Test filtering server health by type"""
        # Test proxy servers only
        url = '/api/sms-sender/api/server-health/?type=proxy'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['type'], 'proxy')
        
        # Test SMTP servers only
        url = '/api/sms-sender/api/server-health/?type=smtp'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['type'], 'smtp')
    
    def test_bulk_configuration_export(self):
        """Test exporting configuration"""
        url = '/api/sms-sender/api/bulk-configuration/export/'
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/json')
        
        # Parse response content
        data = json.loads(response.content)
        self.assertIn('export_timestamp', data)
        self.assertIn('user_id', data)
        self.assertIn('proxy_servers', data)
        self.assertIn('smtp_servers', data)
        
        # Verify server data is included (without sensitive info)
        self.assertEqual(len(data['proxy_servers']), 1)
        self.assertEqual(len(data['smtp_servers']), 1)
        
        proxy_data = data['proxy_servers'][0]
        self.assertEqual(proxy_data['host'], 'proxy.example.com')
        self.assertEqual(proxy_data['port'], 8080)
        self.assertNotIn('username', proxy_data)  # Sensitive data excluded
        self.assertNotIn('password', proxy_data)
    
    def test_bulk_configuration_export_csv(self):
        """Test exporting configuration as CSV"""
        url = '/api/sms-sender/api/bulk-configuration/export/'
        
        response = self.client.get(url, {'format': 'csv'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
        
        # Verify CSV content contains expected headers
        content = response.content.decode('utf-8')
        self.assertIn('Proxy Servers', content)
        self.assertIn('SMTP Servers', content)
        self.assertIn('Host', content)
        self.assertIn('Port', content)
    
    def test_bulk_configuration_validate_import(self):
        """Test validating import data"""
        url = '/api/sms-sender/api/bulk-configuration/validate_import/'
        
        # Create valid import data
        import_data = {
            'rotation_settings': {
                'proxy_rotation_enabled': True,
                'proxy_rotation_strategy': 'round_robin',
                'smtp_rotation_enabled': True,
                'smtp_rotation_strategy': 'random',
                'delivery_delay_enabled': True,
                'delivery_delay_min': 1,
                'delivery_delay_max': 5
            },
            'proxy_servers': [
                {
                    'host': 'new-proxy.example.com',
                    'port': 8080,
                    'protocol': 'http',
                    'is_active': True
                }
            ]
        }
        
        response = self.client.post(url, import_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertTrue(data['is_valid'])
        self.assertIn('rotation_settings', data['summary']['sections_found'])
        self.assertEqual(data['summary']['counts']['proxy_servers'], 1)
    
    def test_force_health_check(self):
        """Test forcing health check for servers"""
        url = '/api/sms-sender/api/server-health/force_health_check/'
        
        request_data = {
            'server_ids': [self.proxy_server.id, self.smtp_server.id],
            'server_type': 'all'
        }
        
        response = self.client.post(url, request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(len(data['results']), 2)
        
        # Verify both servers were checked
        statuses = [result['status'] for result in data['results']]
        self.assertEqual(statuses.count('checked'), 2)
    
    def test_campaign_delivery_settings_copy_from_template(self):
        """Test copying settings from template"""
        url = '/api/sms-sender/api/campaign-delivery-settings/copy_from_template/'
        
        template_settings = {
            'use_proxy_rotation': False,
            'proxy_rotation_strategy': 'best_performance',
            'use_smtp_rotation': True,
            'smtp_rotation_strategy': 'least_used',
            'custom_delay_enabled': True,
            'custom_delay_min': 2,
            'custom_delay_max': 6
        }
        
        request_data = {
            'campaign_id': self.campaign.id,
            'template_settings': template_settings
        }
        
        response = self.client.post(url, request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify settings were applied
        settings = CampaignDeliverySettings.objects.get(campaign=self.campaign)
        self.assertFalse(settings.use_proxy_rotation)
        self.assertEqual(settings.proxy_rotation_strategy, 'best_performance')
        self.assertEqual(settings.smtp_rotation_strategy, 'least_used')
        self.assertTrue(settings.custom_delay_enabled)
        self.assertEqual(settings.custom_delay_min, 2)
        self.assertEqual(settings.custom_delay_max, 6)


if __name__ == '__main__':
    import django
    from django.conf import settings
    from django.test.utils import get_runner
    
    django.setup()
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(['sms_sender.test_configuration_api'])
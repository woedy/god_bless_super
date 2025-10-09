"""
Unit tests for SMS WebSocket consumers
"""
import json
from unittest.mock import Mock, patch, AsyncMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from channels.layers import InMemoryChannelLayer

from .models import SMSCampaign, SMSMessage
from .consumers import (
    CampaignMonitoringConsumer, 
    SystemMonitoringConsumer, 
    UserCampaignsConsumer
)

User = get_user_model()


class CampaignMonitoringConsumerTest(TestCase):
    """Test cases for CampaignMonitoringConsumer"""
    
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
            status='in_progress',
            total_recipients=100,
            messages_sent=50
        )
        
        # Create test messages
        for i in range(5):
            SMSMessage.objects.create(
                campaign=self.campaign,
                phone_number=f'555000{i:04d}',
                message_content='Hello!',
                delivery_status='delivered' if i < 4 else 'failed'
            )
    
    async def test_campaign_monitoring_consumer_connect(self):
        """Test WebSocket connection for campaign monitoring"""
        # Create communicator with proper URL routing
        communicator = WebsocketCommunicator(
            CampaignMonitoringConsumer.as_asgi(),
            f"/ws/sms/campaign/{self.campaign.id}/"
        )
        
        # Set user and URL route in scope
        communicator.scope['user'] = self.user
        communicator.scope['url_route'] = {
            'kwargs': {'campaign_id': str(self.campaign.id)}
        }
        
        # Test connection
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Test receiving initial stats
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'initial_stats')
        self.assertIn('stats', response)
        
        # Disconnect
        await communicator.disconnect()
    
    async def test_campaign_monitoring_consumer_unauthorized(self):
        """Test WebSocket connection with unauthorized user"""
        # Create another user
        other_user = await database_sync_to_async(User.objects.create_user)(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        # Create communicator with wrong user
        communicator = WebsocketCommunicator(
            CampaignMonitoringConsumer.as_asgi(),
            f"/ws/sms/campaign/{self.campaign.id}/"
        )
        
        # Set wrong user and URL route in scope
        communicator.scope['user'] = other_user
        communicator.scope['url_route'] = {
            'kwargs': {'campaign_id': str(self.campaign.id)}
        }
        
        # Test connection should fail
        connected, subprotocol = await communicator.connect()
        self.assertFalse(connected)
    
    async def test_campaign_monitoring_consumer_receive_messages(self):
        """Test receiving messages from WebSocket"""
        communicator = WebsocketCommunicator(
            CampaignMonitoringConsumer.as_asgi(),
            f"/ws/sms/campaign/{self.campaign.id}/"
        )
        
        communicator.scope['user'] = self.user
        communicator.scope['url_route'] = {
            'kwargs': {'campaign_id': str(self.campaign.id)}
        }
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Skip initial stats message
        await communicator.receive_json_from()
        
        # Test ping message
        await communicator.send_json_to({
            'type': 'ping',
            'timestamp': '2023-01-01T00:00:00Z'
        })
        
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'pong')
        self.assertEqual(response['timestamp'], '2023-01-01T00:00:00Z')
        
        # Test get_stats message
        await communicator.send_json_to({
            'type': 'get_stats'
        })
        
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'stats_update')
        self.assertIn('stats', response)
        
        await communicator.disconnect()
    
    async def test_campaign_monitoring_consumer_group_messages(self):
        """Test receiving group messages"""
        communicator = WebsocketCommunicator(
            CampaignMonitoringConsumer.as_asgi(),
            f"/ws/sms/campaign/{self.campaign.id}/"
        )
        
        communicator.scope['user'] = self.user
        communicator.scope['url_route'] = {
            'kwargs': {'campaign_id': str(self.campaign.id)}
        }
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Skip initial stats message
        await communicator.receive_json_from()
        
        # Simulate group message
        channel_layer = InMemoryChannelLayer()
        await channel_layer.group_add(
            f'campaign_{self.campaign.id}',
            communicator.channel_name
        )
        
        test_message = {
            'type': 'campaign_message',
            'message': {
                'type': 'progress_update',
                'progress': 75,
                'messages_sent': 75
            }
        }
        
        await channel_layer.group_send(
            f'campaign_{self.campaign.id}',
            test_message
        )
        
        # Should receive the group message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'progress_update')
        self.assertEqual(response['progress'], 75)
        
        await communicator.disconnect()


class SystemMonitoringConsumerTest(TestCase):
    """Test cases for SystemMonitoringConsumer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    async def test_system_monitoring_consumer_connect(self):
        """Test WebSocket connection for system monitoring"""
        communicator = WebsocketCommunicator(
            SystemMonitoringConsumer.as_asgi(),
            "/ws/sms/system/"
        )
        
        communicator.scope['user'] = self.user
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Test receiving initial system health
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'initial_system_health')
        self.assertIn('stats', response)
        
        await communicator.disconnect()
    
    async def test_system_monitoring_consumer_unauthenticated(self):
        """Test WebSocket connection without authentication"""
        communicator = WebsocketCommunicator(
            SystemMonitoringConsumer.as_asgi(),
            "/ws/sms/system/"
        )
        
        # No user in scope
        communicator.scope['user'] = None
        
        connected, subprotocol = await communicator.connect()
        self.assertFalse(connected)
    
    async def test_system_monitoring_consumer_messages(self):
        """Test system monitoring consumer message handling"""
        communicator = WebsocketCommunicator(
            SystemMonitoringConsumer.as_asgi(),
            "/ws/sms/system/"
        )
        
        communicator.scope['user'] = self.user
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Skip initial message
        await communicator.receive_json_from()
        
        # Test get_system_health message
        await communicator.send_json_to({
            'type': 'get_system_health'
        })
        
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'system_health_update')
        self.assertIn('stats', response)
        
        await communicator.disconnect()


class UserCampaignsConsumerTest(TestCase):
    """Test cases for UserCampaignsConsumer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test campaigns
        for i in range(3):
            SMSCampaign.objects.create(
                user=self.user,
                name=f'Campaign {i+1}',
                message_template='Hello!',
                status='completed' if i < 2 else 'in_progress',
                total_recipients=100,
                messages_sent=50 if i == 2 else 100
            )
    
    async def test_user_campaigns_consumer_connect(self):
        """Test WebSocket connection for user campaigns"""
        communicator = WebsocketCommunicator(
            UserCampaignsConsumer.as_asgi(),
            "/ws/sms/campaigns/"
        )
        
        communicator.scope['user'] = self.user
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Test receiving campaigns overview
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'campaigns_overview')
        self.assertIn('campaigns', response)
        
        campaigns = response['campaigns']
        self.assertEqual(len(campaigns), 3)
        
        # Verify campaign data structure
        campaign = campaigns[0]
        self.assertIn('id', campaign)
        self.assertIn('name', campaign)
        self.assertIn('status', campaign)
        self.assertIn('progress', campaign)
        
        await communicator.disconnect()
    
    async def test_user_campaigns_consumer_messages(self):
        """Test user campaigns consumer message handling"""
        communicator = WebsocketCommunicator(
            UserCampaignsConsumer.as_asgi(),
            "/ws/sms/campaigns/"
        )
        
        communicator.scope['user'] = self.user
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Skip initial message
        await communicator.receive_json_from()
        
        # Test get_campaigns_overview message
        await communicator.send_json_to({
            'type': 'get_campaigns_overview'
        })
        
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'campaigns_overview')
        self.assertIn('campaigns', response)
        
        await communicator.disconnect()


class ConsumerIntegrationTest(TestCase):
    """Integration tests for WebSocket consumers"""
    
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
    
    @patch('sms_sender.consumers.CampaignMonitoringService')
    async def test_consumer_with_mocked_monitoring_service(self, mock_monitoring_service):
        """Test consumer with mocked monitoring service"""
        # Mock the monitoring service
        mock_service_instance = Mock()
        mock_service_instance.get_campaign_stats.return_value = {
            'campaign_id': self.campaign.id,
            'total_messages': 100,
            'messages_sent': 50
        }
        mock_monitoring_service.return_value = mock_service_instance
        
        communicator = WebsocketCommunicator(
            CampaignMonitoringConsumer.as_asgi(),
            f"/ws/sms/campaign/{self.campaign.id}/"
        )
        
        communicator.scope['user'] = self.user
        communicator.scope['url_route'] = {
            'kwargs': {'campaign_id': str(self.campaign.id)}
        }
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Verify monitoring service was called
        mock_monitoring_service.assert_called_with(self.campaign.id)
        
        await communicator.disconnect()
    
    async def test_consumer_error_handling(self):
        """Test consumer error handling"""
        # Test with non-existent campaign
        communicator = WebsocketCommunicator(
            CampaignMonitoringConsumer.as_asgi(),
            "/ws/sms/campaign/99999/"
        )
        
        communicator.scope['user'] = self.user
        communicator.scope['url_route'] = {
            'kwargs': {'campaign_id': '99999'}
        }
        
        connected, subprotocol = await communicator.connect()
        # Should still connect but won't have access to campaign
        self.assertFalse(connected)
    
    async def test_consumer_json_error_handling(self):
        """Test consumer handling of invalid JSON"""
        communicator = WebsocketCommunicator(
            CampaignMonitoringConsumer.as_asgi(),
            f"/ws/sms/campaign/{self.campaign.id}/"
        )
        
        communicator.scope['user'] = self.user
        communicator.scope['url_route'] = {
            'kwargs': {'campaign_id': str(self.campaign.id)}
        }
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Skip initial message
        await communicator.receive_json_from()
        
        # Send invalid JSON (this will be handled by the framework)
        # The consumer should handle JSON decode errors gracefully
        await communicator.send_to(text_data="invalid json")
        
        # Consumer should still be responsive
        await communicator.send_json_to({'type': 'ping'})
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'pong')
        
        await communicator.disconnect()
    
    async def test_multiple_consumers_same_campaign(self):
        """Test multiple consumers connected to same campaign"""
        # Create two communicators for the same campaign
        communicator1 = WebsocketCommunicator(
            CampaignMonitoringConsumer.as_asgi(),
            f"/ws/sms/campaign/{self.campaign.id}/"
        )
        
        communicator2 = WebsocketCommunicator(
            CampaignMonitoringConsumer.as_asgi(),
            f"/ws/sms/campaign/{self.campaign.id}/"
        )
        
        communicator1.scope['user'] = self.user
        communicator1.scope['url_route'] = {
            'kwargs': {'campaign_id': str(self.campaign.id)}
        }
        communicator2.scope['user'] = self.user
        communicator2.scope['url_route'] = {
            'kwargs': {'campaign_id': str(self.campaign.id)}
        }
        
        # Connect both
        connected1, _ = await communicator1.connect()
        connected2, _ = await communicator2.connect()
        
        self.assertTrue(connected1)
        self.assertTrue(connected2)
        
        # Skip initial messages
        await communicator1.receive_json_from()
        await communicator2.receive_json_from()
        
        # Both should be able to receive messages independently
        await communicator1.send_json_to({'type': 'ping', 'id': 1})
        await communicator2.send_json_to({'type': 'ping', 'id': 2})
        
        response1 = await communicator1.receive_json_from()
        response2 = await communicator2.receive_json_from()
        
        self.assertEqual(response1['type'], 'pong')
        self.assertEqual(response2['type'], 'pong')
        
        await communicator1.disconnect()
        await communicator2.disconnect()
    
    async def test_consumer_group_isolation(self):
        """Test that consumers are properly isolated by user"""
        # Create another user and campaign
        other_user = await database_sync_to_async(User.objects.create_user)(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        other_campaign = await database_sync_to_async(SMSCampaign.objects.create)(
            user=other_user,
            name='Other Campaign',
            message_template='Hello!',
            status='in_progress'
        )
        
        # Create communicators for different users/campaigns
        communicator1 = WebsocketCommunicator(
            CampaignMonitoringConsumer.as_asgi(),
            f"/ws/sms/campaign/{self.campaign.id}/"
        )
        
        communicator2 = WebsocketCommunicator(
            CampaignMonitoringConsumer.as_asgi(),
            f"/ws/sms/campaign/{other_campaign.id}/"
        )
        
        communicator1.scope['user'] = self.user
        communicator1.scope['url_route'] = {
            'kwargs': {'campaign_id': str(self.campaign.id)}
        }
        communicator2.scope['user'] = other_user
        communicator2.scope['url_route'] = {
            'kwargs': {'campaign_id': str(other_campaign.id)}
        }
        
        connected1, _ = await communicator1.connect()
        connected2, _ = await communicator2.connect()
        
        self.assertTrue(connected1)
        self.assertTrue(connected2)
        
        # Each should receive their own campaign stats
        response1 = await communicator1.receive_json_from()
        response2 = await communicator2.receive_json_from()
        
        self.assertEqual(response1['type'], 'initial_stats')
        self.assertEqual(response2['type'], 'initial_stats')
        
        # Verify they get different campaign data
        self.assertEqual(response1['stats']['campaign_id'], self.campaign.id)
        self.assertEqual(response2['stats']['campaign_id'], other_campaign.id)
        
        await communicator1.disconnect()
        await communicator2.disconnect()
"""
WebSocket consumers for SMS campaign real-time monitoring
Provides real-time updates for campaign progress, server status, and error notifications
"""
import asyncio
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from celery.result import AsyncResult
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model
from .models import SMSCampaign
from .monitoring_service import CampaignMonitoringService, GlobalMonitoringService

logger = logging.getLogger(__name__)
User = get_user_model()


class TaskProgressConsumer(AsyncWebsocketConsumer):
    """Legacy task progress consumer - kept for backward compatibility"""
    
    async def connect(self):
        # Get the task_id from the URL
        self.task_id = self.scope['url_route']['kwargs']['task_id']
        
        # Accept the WebSocket connection
        await self.accept()

        # Start the task progress update loop
        await self.send_task_progress()

    async def disconnect(self, close_code):
        # Disconnect the WebSocket connection
        pass

    async def send_task_progress(self):
        # Get the task status using AsyncResult
        task = AsyncResult(self.task_id)
        
        while not task.ready():
            # Check if the task has completed
            await self.send(text_data=json.dumps({
                'state': task.state,
                'progress': task.info.get('progress', 0),
            }))
            
            # Wait before checking again
            await asyncio.sleep(1)
        
        # Task is completed, send final status
        await self.send(text_data=json.dumps({
            'state': task.state,
            'result': task.result,
        }))


class CampaignMonitoringConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time campaign monitoring"""
    
    async def connect(self):
        # Get campaign_id from URL
        self.campaign_id = self.scope['url_route']['kwargs']['campaign_id']
        self.campaign_group_name = f'campaign_{self.campaign_id}'
        
        # Get user from scope (set by authentication middleware)
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        
        # Verify user has access to this campaign
        has_access = await self.check_campaign_access()
        if not has_access:
            await self.close()
            return
        
        # Join campaign group
        await self.channel_layer.group_add(
            self.campaign_group_name,
            self.channel_name
        )
        
        # Also join user's campaigns group for cross-campaign updates
        self.user_group_name = f'user_{self.user.id}_campaigns'
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial campaign stats
        await self.send_initial_stats()
        
        logger.info(f"User {self.user.id} connected to campaign {self.campaign_id} monitoring")

    async def disconnect(self, close_code):
        # Leave campaign group
        if hasattr(self, 'campaign_group_name'):
            await self.channel_layer.group_discard(
                self.campaign_group_name,
                self.channel_name
            )
        
        # Leave user group
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
        
        logger.info(f"User {getattr(self.user, 'id', 'unknown')} disconnected from campaign {self.campaign_id} monitoring")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'get_stats':
                await self.send_campaign_stats()
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received from WebSocket")
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")

    async def campaign_message(self, event):
        """Handle campaign-related messages from group"""
        message = event['message']
        await self.send(text_data=json.dumps(message))

    @database_sync_to_async
    def check_campaign_access(self):
        """Check if user has access to the campaign"""
        try:
            campaign = SMSCampaign.objects.get(id=self.campaign_id, user=self.user)
            return True
        except SMSCampaign.DoesNotExist:
            return False

    async def send_initial_stats(self):
        """Send initial campaign statistics"""
        try:
            monitoring_service = await sync_to_async(CampaignMonitoringService)(self.campaign_id)
            stats = await sync_to_async(monitoring_service.get_campaign_stats)()
            
            await self.send(text_data=json.dumps({
                'type': 'initial_stats',
                'stats': stats
            }))
        except Exception as e:
            logger.error(f"Error sending initial stats: {e}")

    async def send_campaign_stats(self):
        """Send current campaign statistics"""
        try:
            monitoring_service = await sync_to_async(CampaignMonitoringService)(self.campaign_id)
            stats = await sync_to_async(monitoring_service.get_campaign_stats)()
            
            await self.send(text_data=json.dumps({
                'type': 'stats_update',
                'stats': stats
            }))
        except Exception as e:
            logger.error(f"Error sending campaign stats: {e}")


class SystemMonitoringConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for system-wide monitoring"""
    
    async def connect(self):
        # Get user from scope
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        
        # Join user's system monitoring group
        self.system_group_name = f'user_{self.user.id}_system'
        await self.channel_layer.group_add(
            self.system_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial system health stats
        await self.send_initial_system_stats()
        
        logger.info(f"User {self.user.id} connected to system monitoring")

    async def disconnect(self, close_code):
        # Leave system group
        if hasattr(self, 'system_group_name'):
            await self.channel_layer.group_discard(
                self.system_group_name,
                self.channel_name
            )
        
        logger.info(f"User {getattr(self.user, 'id', 'unknown')} disconnected from system monitoring")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'get_system_health':
                await self.send_system_health()
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received from WebSocket")
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")

    async def system_message(self, event):
        """Handle system-related messages from group"""
        message = event['message']
        await self.send(text_data=json.dumps(message))

    async def send_initial_system_stats(self):
        """Send initial system health statistics"""
        try:
            monitoring_service = await sync_to_async(GlobalMonitoringService)(self.user.id)
            stats = await sync_to_async(monitoring_service.get_system_health_stats)()
            
            await self.send(text_data=json.dumps({
                'type': 'initial_system_health',
                'stats': stats
            }))
        except Exception as e:
            logger.error(f"Error sending initial system stats: {e}")

    async def send_system_health(self):
        """Send current system health statistics"""
        try:
            monitoring_service = await sync_to_async(GlobalMonitoringService)(self.user.id)
            stats = await sync_to_async(monitoring_service.get_system_health_stats)()
            
            await self.send(text_data=json.dumps({
                'type': 'system_health_update',
                'stats': stats
            }))
        except Exception as e:
            logger.error(f"Error sending system health stats: {e}")


class UserCampaignsConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for user's campaigns overview"""
    
    async def connect(self):
        # Get user from scope
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        
        # Join user's campaigns group
        self.user_campaigns_group = f'user_{self.user.id}_campaigns'
        await self.channel_layer.group_add(
            self.user_campaigns_group,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial campaigns overview
        await self.send_campaigns_overview()
        
        logger.info(f"User {self.user.id} connected to campaigns overview")

    async def disconnect(self, close_code):
        # Leave user campaigns group
        if hasattr(self, 'user_campaigns_group'):
            await self.channel_layer.group_discard(
                self.user_campaigns_group,
                self.channel_name
            )
        
        logger.info(f"User {getattr(self.user, 'id', 'unknown')} disconnected from campaigns overview")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'get_campaigns_overview':
                await self.send_campaigns_overview()
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received from WebSocket")
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")

    async def campaign_message(self, event):
        """Handle campaign-related messages from group"""
        message = event['message']
        await self.send(text_data=json.dumps(message))

    async def send_campaigns_overview(self):
        """Send overview of user's campaigns"""
        try:
            campaigns_data = await self.get_user_campaigns_overview()
            
            await self.send(text_data=json.dumps({
                'type': 'campaigns_overview',
                'campaigns': campaigns_data
            }))
        except Exception as e:
            logger.error(f"Error sending campaigns overview: {e}")

    @database_sync_to_async
    def get_user_campaigns_overview(self):
        """Get overview data for user's campaigns"""
        campaigns = SMSCampaign.objects.filter(user=self.user).order_by('-created_at')[:10]
        
        campaigns_data = []
        for campaign in campaigns:
            campaigns_data.append({
                'id': campaign.id,
                'name': campaign.name,
                'status': campaign.status,
                'progress': campaign.progress,
                'total_recipients': campaign.total_recipients,
                'messages_sent': campaign.messages_sent,
                'messages_delivered': campaign.messages_delivered,
                'messages_failed': campaign.messages_failed,
                'created_at': campaign.created_at.isoformat(),
                'started_at': campaign.started_at.isoformat() if campaign.started_at else None,
                'completed_at': campaign.completed_at.isoformat() if campaign.completed_at else None
            })
        
        return campaigns_data

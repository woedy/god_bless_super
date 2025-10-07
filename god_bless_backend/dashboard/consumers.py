"""
Dashboard WebSocket Consumers
Handles real-time dashboard updates and notifications
"""
import json
import asyncio
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()
logger = logging.getLogger(__name__)


class DashboardConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for dashboard real-time updates
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        try:
            self.user = self.scope.get('user')
            logger.info(f"WebSocket connection attempt for user: {self.user}")
            
            if not self.user or not self.user.is_authenticated:
                logger.warning("WebSocket connection rejected: User not authenticated")
                await self.close()
                return
            
            # Accept the connection first
            await self.accept()
            logger.info(f"WebSocket connection accepted for user: {self.user.username}")
            
            # Join user-specific dashboard group (only if channel layer is available)
            if hasattr(self, 'channel_layer') and self.channel_layer:
                self.dashboard_group_name = f'dashboard_user_{self.user.id}'
                await self.channel_layer.group_add(
                    self.dashboard_group_name,
                    self.channel_name
                )
                logger.info(f"Added user {self.user.username} to dashboard group")
            
            # Send initial connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_status',
                'status': 'connected',
                'message': 'Dashboard WebSocket connected successfully',
                'timestamp': timezone.now().isoformat(),
                'user': self.user.username
            }))
            
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {e}")
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        try:
            logger.info(f"WebSocket disconnecting for user: {getattr(self, 'user', 'Unknown')} with code: {close_code}")
            
            if (hasattr(self, 'dashboard_group_name') and 
                hasattr(self, 'channel_layer') and 
                self.channel_layer):
                await self.channel_layer.group_discard(
                    self.dashboard_group_name,
                    self.channel_name
                )
                logger.info(f"Removed user from dashboard group")
        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {e}")
    
    async def receive(self, text_data):
        """Handle messages from WebSocket"""
        try:
            logger.info(f"WebSocket received message: {text_data}")
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'subscribe_project':
                project_id = data.get('project_id')
                await self.handle_project_subscription(project_id)
            elif message_type == 'request_metrics':
                await self.send_dashboard_metrics()
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': timezone.now().isoformat()
                }))
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))
    
    async def handle_project_subscription(self, project_id):
        """Handle project-specific subscriptions"""
        try:
            if project_id and hasattr(self, 'channel_layer') and self.channel_layer:
                # Join project-specific group
                project_group_name = f'dashboard_project_{project_id}'
                await self.channel_layer.group_add(
                    project_group_name,
                    self.channel_name
                )
                logger.info(f"User {self.user.username} subscribed to project {project_id}")
                
                await self.send(text_data=json.dumps({
                    'type': 'subscription_confirmed',
                    'project_id': project_id,
                    'message': f'Subscribed to project {project_id} updates'
                }))
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Invalid project ID or channel layer not available'
                }))
        except Exception as e:
            logger.error(f"Error in project subscription: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to subscribe to project updates'
            }))
    
    async def send_dashboard_metrics(self):
        """Send current dashboard metrics"""
        try:
            metrics = await self.get_dashboard_metrics()
            await self.send(text_data=json.dumps({
                'type': 'dashboard_update',
                'data': metrics,
                'timestamp': timezone.now().isoformat()
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Failed to get metrics: {str(e)}'
            }))
    
    # Removed periodic updates to simplify the consumer
    # Can be added back later if needed
    
    @database_sync_to_async
    def get_dashboard_metrics(self):
        """Get dashboard metrics from database"""
        from phone_generator.models import PhoneNumber
        from projects.models import Project
        from tasks.models import TaskProgress, TaskStatus
        
        user = self.user
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        
        # Get basic metrics
        metrics = {
            'overview': {
                'totalProjects': Project.objects.filter(user=user, is_archived=False).count(),
                'activeProjects': Project.objects.filter(user=user, is_archived=False, active=True).count(),
                'totalPhoneNumbers': PhoneNumber.objects.filter(user=user, is_archived=False).count(),
                'validPhoneNumbers': PhoneNumber.objects.filter(user=user, is_archived=False, valid_number=True).count(),
                'activeTasks': TaskProgress.objects.filter(
                    user=user, 
                    status__in=[TaskStatus.STARTED, TaskStatus.PROGRESS]
                ).count(),
                'completedTasks24h': TaskProgress.objects.filter(
                    user=user, 
                    status=TaskStatus.SUCCESS,
                    completed_at__gte=last_24h
                ).count(),
            },
            'lastUpdated': now.isoformat()
        }
        
        return metrics
    
    # Group message handlers
    async def dashboard_update(self, event):
        """Handle dashboard update messages from group"""
        await self.send(text_data=json.dumps({
            'type': 'dashboard_update',
            'data': event['data'],
            'timestamp': event.get('timestamp', timezone.now().isoformat())
        }))
    
    async def task_update(self, event):
        """Handle task update messages"""
        await self.send(text_data=json.dumps({
            'type': 'task_update',
            'data': event['data'],
            'timestamp': event.get('timestamp', timezone.now().isoformat())
        }))
    
    async def system_notification(self, event):
        """Handle system notification messages"""
        await self.send(text_data=json.dumps({
            'type': 'system_notification',
            'data': event['data'],
            'timestamp': event.get('timestamp', timezone.now().isoformat())
        }))


class TaskProgressConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for task progress updates
    Maintains compatibility with existing task system
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        
        # Join user-specific task group
        self.task_group_name = f'task_user_{self.user.id}'
        
        await self.channel_layer.group_add(
            self.task_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_status',
            'status': 'connected',
            'message': 'Task progress WebSocket connected'
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'task_group_name'):
            await self.channel_layer.group_discard(
                self.task_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle messages from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': timezone.now().isoformat()
                }))
        except json.JSONDecodeError:
            pass
    
    # Group message handlers
    async def task_progress(self, event):
        """Handle task progress messages"""
        await self.send(text_data=json.dumps({
            'type': 'task_progress',
            'data': event['data']
        }))
    
    async def task_complete(self, event):
        """Handle task completion messages"""
        await self.send(text_data=json.dumps({
            'type': 'task_complete',
            'data': event['data']
        }))
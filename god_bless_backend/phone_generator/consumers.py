"""
WebSocket consumers for real-time phone generation progress updates
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()


class PhoneGenerationProgressConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for phone generation progress updates"""
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f"user_{self.user_id}"
        
        # Verify user exists and is authenticated
        user = await self.get_user(self.user_id)
        if not user:
            await self.close()
            return
        
        # Join user group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to phone generation progress updates'
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Leave user group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle messages from WebSocket"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp')
                }))
            elif message_type == 'subscribe_task':
                task_id = text_data_json.get('task_id')
                await self.send(text_data=json.dumps({
                    'type': 'subscription_confirmed',
                    'task_id': task_id,
                    'message': f'Subscribed to task {task_id} updates'
                }))
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
    
    # Handler for task progress updates
    async def task_progress(self, event):
        """Send task progress update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'task_progress',
            'task_id': event['task_id'],
            'status': event['status'],
            'progress': event['progress'],
            'current_step': event['current_step'],
            'processed_items': event['processed_items'],
            'total_items': event['total_items'],
            'timestamp': event.get('timestamp')
        }))
    
    # Handler for task completion
    async def task_completed(self, event):
        """Send task completion notification to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'task_completed',
            'task_id': event['task_id'],
            'status': event['status'],
            'result_data': event.get('result_data', {}),
            'error_message': event.get('error_message'),
            'timestamp': event.get('timestamp')
        }))
    
    # Handler for task started
    async def task_started(self, event):
        """Send task started notification to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'task_started',
            'task_id': event['task_id'],
            'task_name': event.get('task_name'),
            'timestamp': event.get('timestamp')
        }))
    
    @database_sync_to_async
    def get_user(self, user_id):
        """Get user from database"""
        try:
            return User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return None


class TaskProgressConsumer(AsyncWebsocketConsumer):
    """Generic WebSocket consumer for all task progress updates"""
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f"user_{self.user_id}"
        
        # Verify user exists
        user = await self.get_user(self.user_id)
        if not user:
            await self.close()
            return
        
        # Join user group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to task progress updates',
            'user_id': self.user_id
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle messages from WebSocket"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp')
                }))
            elif message_type == 'get_active_tasks':
                # Send list of active tasks for this user
                active_tasks = await self.get_active_tasks(self.user_id)
                await self.send(text_data=json.dumps({
                    'type': 'active_tasks',
                    'tasks': active_tasks
                }))
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
    
    # Generic handlers for all task types
    async def task_progress(self, event):
        """Send task progress update"""
        await self.send(text_data=json.dumps(event))
    
    async def task_completed(self, event):
        """Send task completion notification"""
        await self.send(text_data=json.dumps(event))
    
    async def task_started(self, event):
        """Send task started notification"""
        await self.send(text_data=json.dumps(event))
    
    async def task_failed(self, event):
        """Send task failure notification"""
        await self.send(text_data=json.dumps(event))
    
    @database_sync_to_async
    def get_user(self, user_id):
        """Get user from database"""
        try:
            return User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return None
    
    @database_sync_to_async
    def get_active_tasks(self, user_id):
        """Get active tasks for user"""
        from tasks.models import TaskProgress, TaskStatus
        
        try:
            active_tasks = TaskProgress.objects.filter(
                user_id=user_id,
                status__in=[TaskStatus.PENDING, TaskStatus.STARTED, TaskStatus.PROGRESS]
            ).values(
                'task_id', 'task_name', 'status', 'progress', 
                'current_step', 'processed_items', 'total_items'
            )
            return list(active_tasks)
        except Exception:
            return []

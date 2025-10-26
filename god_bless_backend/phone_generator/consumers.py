"""
WebSocket consumers for real-time phone generation progress updates
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone

User = get_user_model()


class PhoneGenerationProgressConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for phone generation progress updates"""
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.user_identifier = self.scope['url_route']['kwargs']['user_id']

        # Verify user exists and is authenticated
        user = await self.get_user(self.user_identifier)
        if not user:
            await self.close()
            return

        self.user_pk = user.pk
        self.group_name = f"user_{self.user_pk}"

        # Join user group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'channel': 'connection_status',
            'data': {
                'message': 'Connected to phone generation progress updates',
                'userId': getattr(user, 'user_id', None) or str(self.user_pk),
                'timestamp': timezone.now().isoformat(),
            },
            'timestamp': timezone.now().isoformat()
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
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_progress')))
    
    # Handler for task completion
    async def task_completed(self, event):
        """Send task completion notification to WebSocket"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_complete')))
    
    # Handler for task started
    async def task_started(self, event):
        """Send task started notification to WebSocket"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_progress')))

    async def task_failed(self, event):
        """Send task failure notification to WebSocket"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_error')))
    
    @database_sync_to_async
    def get_user(self, user_id):
        """Get user from database"""
        try:
            return User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return None

    def _normalize_event(self, event, default_channel):
        """Normalize event payload for frontend consumption"""
        channel = event.get('channel') or default_channel
        timestamp = event.get('timestamp') or timezone.now().isoformat()
        data = event.get('data', {}).copy()

        if not data:
            data = {
                'taskId': event.get('task_id'),
                'task_id': event.get('task_id'),
                'type': event.get('task_type') or event.get('type'),
                'status': event.get('status'),
                'progress': event.get('progress'),
                'currentStep': event.get('current_step'),
                'progressMessage': event.get('current_step'),
                'processedItems': event.get('processed_items'),
                'totalItems': event.get('total_items'),
                'result': event.get('result_data'),
                'error': event.get('error_message'),
            }

        data.setdefault('taskId', data.get('task_id') or event.get('task_id'))
        data.setdefault('task_id', data.get('taskId'))
        data.setdefault('type', data.get('type') or event.get('task_type') or event.get('type'))
        data.setdefault('status', event.get('status'))
        data.setdefault('progress', event.get('progress'))
        data.setdefault('currentStep', event.get('current_step'))
        data.setdefault('progressMessage', data.get('currentStep'))
        data.setdefault('processedItems', event.get('processed_items'))
        data.setdefault('totalItems', event.get('total_items'))
        data.setdefault('result', event.get('result_data'))
        data.setdefault('error', event.get('error_message'))
        data.setdefault('timestamp', timestamp)
        data.setdefault('userId', getattr(self, 'user_identifier', None))

        return {
            'type': event.get('type'),
            'channel': channel,
            'data': data,
            'task_id': data.get('task_id'),
            'status': data.get('status'),
            'timestamp': timestamp,
        }


class TaskProgressConsumer(AsyncWebsocketConsumer):
    """Generic WebSocket consumer for all task progress updates"""
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.user_identifier = self.scope['url_route']['kwargs']['user_id']

        # Verify user exists
        user = await self.get_user(self.user_identifier)
        if not user:
            await self.close()
            return

        self.user_pk = user.pk
        self.group_name = f"user_{self.user_pk}"

        # Join user group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'channel': 'connection_status',
            'data': {
                'message': 'Connected to task progress updates',
                'userId': getattr(user, 'user_id', None) or str(self.user_pk),
                'timestamp': timezone.now().isoformat(),
            },
            'timestamp': timezone.now().isoformat()
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
                active_tasks = await self.get_active_tasks(self.user_identifier)
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
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_progress')))

    async def task_completed(self, event):
        """Send task completion notification"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_complete')))

    async def task_started(self, event):
        """Send task started notification"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_progress')))

    async def task_failed(self, event):
        """Send task failure notification"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_error')))
    
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
                user__user_id=user_id,
                status__in=[TaskStatus.PENDING, TaskStatus.STARTED, TaskStatus.PROGRESS]
            ).values(
                'task_id', 'task_name', 'status', 'progress',
                'current_step', 'processed_items', 'total_items'
            )
            return list(active_tasks)
        except Exception:
            return []

    def _normalize_event(self, event, default_channel):
        channel = event.get('channel') or default_channel
        timestamp = event.get('timestamp') or timezone.now().isoformat()
        data = event.get('data', {}).copy()

        if not data:
            data = {
                'taskId': event.get('task_id'),
                'task_id': event.get('task_id'),
                'type': event.get('task_type') or event.get('type'),
                'status': event.get('status'),
                'progress': event.get('progress'),
                'currentStep': event.get('current_step'),
                'progressMessage': event.get('current_step'),
                'processedItems': event.get('processed_items'),
                'totalItems': event.get('total_items'),
                'result': event.get('result_data'),
                'error': event.get('error_message'),
            }

        data.setdefault('taskId', data.get('task_id') or event.get('task_id'))
        data.setdefault('task_id', data.get('taskId'))
        data.setdefault('type', data.get('type') or event.get('task_type') or event.get('type'))
        data.setdefault('status', event.get('status'))
        data.setdefault('progress', event.get('progress'))
        data.setdefault('currentStep', event.get('current_step'))
        data.setdefault('progressMessage', data.get('currentStep'))
        data.setdefault('processedItems', event.get('processed_items'))
        data.setdefault('totalItems', event.get('total_items'))
        data.setdefault('result', event.get('result_data'))
        data.setdefault('error', event.get('error_message'))
        data.setdefault('timestamp', timestamp)
        data.setdefault('userId', getattr(self, 'user_identifier', None))

        return {
            'type': event.get('type'),
            'channel': channel,
            'data': data,
            'task_id': data.get('task_id'),
            'status': data.get('status'),
            'timestamp': timestamp,
        }

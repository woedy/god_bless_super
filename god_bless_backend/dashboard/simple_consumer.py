"""
Simple Dashboard WebSocket Consumer
Minimal implementation for testing WebSocket connectivity
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

logger = logging.getLogger(__name__)


class SimpleDashboardConsumer(AsyncWebsocketConsumer):
    """
    Simple WebSocket consumer for basic dashboard connectivity
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        try:
            # Get user from scope (set by authentication middleware)
            self.user = self.scope.get('user')

            if not self.user or not self.user.is_authenticated:
                logger.warning("WebSocket connection rejected: User not authenticated")
                await self.close(code=4001)
                return

            self.user_group_name = f"user_{self.user.pk}"
            self.user_identifier = getattr(self.user, 'user_id', None) or str(self.user.pk)

            # Join the per-user task group so we receive task updates
            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name
            )

            # Accept the connection
            await self.accept()
            logger.info(f"WebSocket connection accepted for user: {self.user.username}")

            # Send welcome message
            await self.send(text_data=json.dumps({
                'type': 'connection_status',
                'channel': 'connection_status',
                'data': {
                    'status': 'connected',
                    'message': f'Welcome {self.user.username}! Dashboard WebSocket is ready.',
                    'userId': self.user_identifier,
                    'timestamp': timezone.now().isoformat(),
                },
                'timestamp': timezone.now().isoformat()
            }))

        except Exception as e:
            logger.error(f"Error in WebSocket connect: {e}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        try:
            user_name = getattr(self.user, 'username', 'Unknown') if hasattr(self, 'user') else 'Unknown'
            logger.info(f"WebSocket disconnected for user: {user_name}, code: {close_code}")
            if hasattr(self, 'user_group_name'):
                await self.channel_layer.group_discard(
                    self.user_group_name,
                    self.channel_name
                )
        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {e}")
    
    async def receive(self, text_data):
        """Handle messages from WebSocket"""
        try:
            logger.info(f"WebSocket received: {text_data}")
            
            # Parse the message
            try:
                data = json.loads(text_data)
            except json.JSONDecodeError:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Invalid JSON format'
                }))
                return
            
            message_type = data.get('type', 'unknown')
            
            # Handle different message types
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': timezone.now().isoformat()
                }))
            
            elif message_type == 'get_status':
                await self.send(text_data=json.dumps({
                    'type': 'status_response',
                    'user': self.user.username,
                    'connected': True,
                    'timestamp': timezone.now().isoformat()
                }))
            
            elif message_type == 'echo':
                # Echo back the message
                await self.send(text_data=json.dumps({
                    'type': 'echo_response',
                    'original_message': data,
                    'timestamp': timezone.now().isoformat()
                }))
            
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))

        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))

    async def task_progress(self, event):
        """Forward task progress updates"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_progress')))

    async def task_started(self, event):
        """Forward task started notification"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_progress')))

    async def task_completed(self, event):
        """Forward task completion notification"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_complete')))

    async def task_failed(self, event):
        """Forward task failure notification"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_error')))

    async def task_cancelled(self, event):
        """Forward task cancellation notification"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_cancelled')))

    def _normalize_event(self, event, default_channel):
        """Ensure outgoing messages follow the frontend schema"""
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
        data.setdefault('userId', getattr(self, 'user_identifier', None))
        data.setdefault('timestamp', timestamp)

        return {
            'type': event.get('type'),
            'channel': channel,
            'data': data,
            'task_id': data.get('task_id'),
            'status': data.get('status'),
            'timestamp': timestamp,
        }
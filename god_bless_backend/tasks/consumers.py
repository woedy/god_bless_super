import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import TaskProgress


class TaskProgressConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time task progress updates"""
    
    async def connect(self):
        """Handle WebSocket connection"""
        print(f"[Consumer] Connect called")
        self.user = self.scope["user"]
        print(f"[Consumer] User: {self.user.username if not self.user.is_anonymous else 'Anonymous'}")
        
        if self.user.is_anonymous:
            print(f"[Consumer] Rejecting anonymous user")
            await self.close()
            return
        
        try:
            # Join user-specific group
            self.group_name = f"user_{self.user.id}"
            print(f"[Consumer] Adding to group: {self.group_name}")
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            
            print(f"[Consumer] Accepting connection")
            await self.accept()
            
            # Send current active tasks on connection
            print(f"[Consumer] Fetching active tasks")
            active_tasks = await self.get_active_tasks()
            print(f"[Consumer] Sending {len(active_tasks)} active tasks")
            await self.send(text_data=json.dumps({
                'type': 'active_tasks',
                'tasks': active_tasks
            }))
            print(f"[Consumer] Connection established successfully")
        except Exception as e:
            print(f"[Consumer] ERROR during connect: {e}")
            import traceback
            traceback.print_exc()
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle messages from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'get_task_status':
                task_id = data.get('task_id')
                if task_id:
                    task_status = await self.get_task_status(task_id)
                    await self.send(text_data=json.dumps({
                        'type': 'task_status',
                        'task_id': task_id,
                        'status': task_status
                    }))
            
            elif message_type == 'cancel_task':
                task_id = data.get('task_id')
                if task_id:
                    success = await self.cancel_task(task_id)
                    await self.send(text_data=json.dumps({
                        'type': 'task_cancelled',
                        'task_id': task_id,
                        'success': success
                    }))
            
            elif message_type == 'get_active_tasks':
                active_tasks = await self.get_active_tasks()
                await self.send(text_data=json.dumps({
                    'type': 'active_tasks',
                    'tasks': active_tasks
                }))
        
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))
    
    async def task_progress(self, event):
        """Handle task progress updates from group"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_progress')))

    async def task_completed(self, event):
        """Handle task completion notifications"""
        await self.send(text_data=json.dumps(self._normalize_event(event, 'task_complete')))
    
    @database_sync_to_async
    def get_active_tasks(self):
        """Get active tasks for the user"""
        tasks = TaskProgress.objects.filter(
            user=self.user,
            status__in=['PENDING', 'STARTED', 'PROGRESS', 'RETRY']
        ).order_by('-created_at')[:20]
        
        return [
            {
                'task_id': task.task_id,
                'task_name': task.task_name,
                'category': task.category,
                'status': task.status,
                'progress': task.progress,
                'current_step': task.current_step,
                'total_items': task.total_items,
                'processed_items': task.processed_items,
                'created_at': task.created_at.isoformat(),
                'started_at': task.started_at.isoformat() if task.started_at else None,
                'estimated_completion': task.estimated_completion.isoformat() if task.estimated_completion else None,
            }
            for task in tasks
        ]
    
    @database_sync_to_async
    def get_task_status(self, task_id):
        """Get status for a specific task"""
        try:
            task = TaskProgress.objects.get(task_id=task_id, user=self.user)
            return {
                'task_id': task.task_id,
                'task_name': task.task_name,
                'category': task.category,
                'status': task.status,
                'progress': task.progress,
                'current_step': task.current_step,
                'total_items': task.total_items,
                'processed_items': task.processed_items,
                'result_data': task.result_data,
                'error_message': task.error_message,
                'created_at': task.created_at.isoformat(),
                'started_at': task.started_at.isoformat() if task.started_at else None,
                'completed_at': task.completed_at.isoformat() if task.completed_at else None,
                'estimated_completion': task.estimated_completion.isoformat() if task.estimated_completion else None,
                'duration': task.duration,
            }
        except TaskProgress.DoesNotExist:
            return None
    
    @database_sync_to_async
    def cancel_task(self, task_id):
        """Cancel a task"""
        try:
            from .utils import TaskManager
            return TaskManager.cancel_task(task_id)
        except Exception:
            return False

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
        data.setdefault('userId', getattr(self.user, 'user_id', None))

        return {
            'type': event.get('type'),
            'channel': channel,
            'data': data,
            'task_id': data.get('task_id'),
            'status': data.get('status'),
            'timestamp': timestamp,
        }
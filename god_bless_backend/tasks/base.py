from celery import Task
from celery.utils.log import get_task_logger
from django.utils import timezone
from datetime import timedelta
from .models import TaskProgress, TaskStatus, TaskCategory

logger = get_task_logger(__name__)


class ProgressTrackingTask(Task):
    """Base task class with progress tracking capabilities"""
    
    def __init__(self):
        super().__init__()
        self.task_progress = None
    
    def before_start(self, task_id, args, kwargs):
        """Called before task execution"""
        user_id = kwargs.get('user_id')
        category = kwargs.get('category', TaskCategory.GENERAL)
        
        if user_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            try:
                user = User.objects.get(user_id=user_id)
                self.task_progress = TaskProgress.objects.create(
                    task_id=task_id,
                    user=user,
                    category=category,
                    task_name=self.name,
                    task_args=kwargs,
                    status=TaskStatus.PENDING
                )
                logger.info(f"Task {task_id} created for user {user_id}")
            except User.DoesNotExist:
                logger.error(f"User {user_id} not found for task {task_id}")
    
    def on_success(self, retval, task_id, args, kwargs):
        """Called when task succeeds"""
        if self.task_progress:
            self.task_progress.mark_success(result_data=retval)
            logger.info(f"Task {task_id} completed successfully")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called when task fails"""
        if self.task_progress:
            self.task_progress.mark_failure(str(exc))
            logger.error(f"Task {task_id} failed: {exc}")
        else:
            # Try to find and update the task progress
            try:
                task_progress = TaskProgress.objects.get(task_id=task_id)
                task_progress.mark_failure(str(exc))
            except TaskProgress.DoesNotExist:
                logger.error(f"TaskProgress not found for failed task {task_id}")
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Called when task is retried"""
        try:
            task_progress = TaskProgress.objects.get(task_id=task_id)
            task_progress.status = TaskStatus.RETRY
            task_progress.error_message = str(exc)
            task_progress.save(update_fields=['status', 'error_message'])
            logger.warning(f"Task {task_id} is being retried: {exc}")
        except TaskProgress.DoesNotExist:
            pass
    
    def update_progress(self, progress, current_step=None, processed_items=None, total_items=None):
        """Update task progress"""
        if self.task_progress:
            self.task_progress.progress = min(100, max(0, progress))
            
            if current_step:
                self.task_progress.current_step = current_step
            
            if processed_items is not None:
                self.task_progress.processed_items = processed_items
            
            if total_items is not None:
                self.task_progress.total_items = total_items
            
            # Estimate completion time
            if self.task_progress.started_at and progress > 0:
                elapsed = (timezone.now() - self.task_progress.started_at).total_seconds()
                estimated_total = (elapsed / progress) * 100
                remaining = estimated_total - elapsed
                self.task_progress.estimated_completion = timezone.now() + timedelta(seconds=remaining)
            
            self.task_progress.save()
            
            # Send WebSocket notification
            self._send_progress_notification()
    
    def mark_started(self):
        """Mark task as started"""
        if self.task_progress:
            self.task_progress.mark_started()
            self._send_progress_notification()
    
    def _send_progress_notification(self):
        """Send progress update via WebSocket"""
        if self.task_progress:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"user_{self.task_progress.user_id}",
                        {
                            "type": "task_progress",
                            "task_id": self.task_progress.task_id,
                            "status": self.task_progress.status,
                            "progress": self.task_progress.progress,
                            "current_step": self.task_progress.current_step,
                            "processed_items": self.task_progress.processed_items,
                            "total_items": self.task_progress.total_items,
                        }
                    )
                except Exception as e:
                    logger.error(f"Failed to send WebSocket notification: {e}")
    
    def _send_task_notification(self, notification_type, data):
        """Send WebSocket notification for task events"""
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            if channel_layer and self.task_progress:
                async_to_sync(channel_layer.group_send)(
                    f"user_{self.task_progress.user_id}",
                    {
                        "type": notification_type,
                        **data
                    }
                )
        except Exception as e:
            logger.error(f"Failed to send WebSocket notification: {e}")


class BatchProcessingTask(ProgressTrackingTask):
    """Base task for batch processing operations"""
    
    def process_batch(self, items, batch_size=100, process_func=None):
        """Process items in batches with progress tracking"""
        total = len(items)
        processed = 0
        
        for i in range(0, total, batch_size):
            batch = items[i:i + batch_size]
            
            if process_func:
                process_func(batch)
            
            processed += len(batch)
            progress = int((processed / total) * 100)
            
            self.update_progress(
                progress=progress,
                processed_items=processed,
                total_items=total,
                current_step=f"Processing batch {i // batch_size + 1}"
            )
        
        return processed


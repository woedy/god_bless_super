from celery import current_app
from celery.result import AsyncResult
from .models import TaskProgress, TaskStatus
from django.utils import timezone
from datetime import timedelta


class TaskManager:
    """Utility class for managing Celery tasks"""
    
    @staticmethod
    def get_task_status(task_id):
        """Get detailed task status"""
        try:
            task_progress = TaskProgress.objects.get(task_id=task_id)
            celery_result = AsyncResult(task_id, app=current_app)
            
            return {
                'task_id': task_id,
                'status': task_progress.status,
                'progress': task_progress.progress,
                'current_step': task_progress.current_step,
                'total_items': task_progress.total_items,
                'processed_items': task_progress.processed_items,
                'created_at': task_progress.created_at.isoformat(),
                'started_at': task_progress.started_at.isoformat() if task_progress.started_at else None,
                'completed_at': task_progress.completed_at.isoformat() if task_progress.completed_at else None,
                'estimated_completion': task_progress.estimated_completion.isoformat() if task_progress.estimated_completion else None,
                'duration': task_progress.duration,
                'result_data': task_progress.result_data,
                'error_message': task_progress.error_message,
                'celery_state': celery_result.state,
            }
        except TaskProgress.DoesNotExist:
            # Fallback to Celery result only
            celery_result = AsyncResult(task_id, app=current_app)
            return {
                'task_id': task_id,
                'status': celery_result.state,
                'celery_state': celery_result.state,
                'result': celery_result.result if celery_result.ready() else None,
            }
    
    @staticmethod
    def cancel_task(task_id):
        """Cancel a running task"""
        try:
            task_progress = TaskProgress.objects.get(task_id=task_id)
            
            # Revoke the Celery task
            current_app.control.revoke(task_id, terminate=True)
            
            # Update task progress
            task_progress.status = TaskStatus.REVOKED
            task_progress.completed_at = timezone.now()
            task_progress.error_message = "Task cancelled by user"
            task_progress.save()
            
            return True
        except TaskProgress.DoesNotExist:
            # Try to revoke anyway
            current_app.control.revoke(task_id, terminate=True)
            return True
        except Exception as e:
            return False
    
    @staticmethod
    def get_user_tasks(user, status=None, category=None, limit=50):
        """Get tasks for a specific user"""
        queryset = TaskProgress.objects.filter(user=user)
        
        if status:
            queryset = queryset.filter(status=status)
        
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset.order_by('-created_at')[:limit]
    
    @staticmethod
    def get_active_tasks(user):
        """Get all active (non-terminal) tasks for a user"""
        return TaskProgress.objects.filter(
            user=user,
            status__in=[TaskStatus.PENDING, TaskStatus.STARTED, TaskStatus.PROGRESS, TaskStatus.RETRY]
        ).order_by('-created_at')
    
    @staticmethod
    def cleanup_old_tasks(days=7):
        """Clean up old completed tasks"""
        cutoff_date = timezone.now() - timedelta(days=days)
        deleted_count = TaskProgress.objects.filter(
            completed_at__lt=cutoff_date,
            status__in=[TaskStatus.SUCCESS, TaskStatus.FAILURE, TaskStatus.REVOKED]
        ).delete()[0]
        
        return deleted_count
    
    @staticmethod
    def retry_failed_task(task_id):
        """Retry a failed task"""
        try:
            task_progress = TaskProgress.objects.get(task_id=task_id)
            
            if task_progress.status != TaskStatus.FAILURE:
                return False
            
            # Get the original task
            celery_result = AsyncResult(task_id, app=current_app)
            
            # Create a new task with the same parameters
            # This would need to be implemented based on the specific task
            # For now, we just mark it for retry
            task_progress.status = TaskStatus.RETRY
            task_progress.error_message = ""
            task_progress.save()
            
            return True
        except TaskProgress.DoesNotExist:
            return False


class TaskResultStorage:
    """Utility for storing and retrieving task results"""
    
    @staticmethod
    def store_result(task_id, result_data):
        """Store task result"""
        try:
            task_progress = TaskProgress.objects.get(task_id=task_id)
            task_progress.result_data = result_data
            task_progress.save(update_fields=['result_data'])
            return True
        except TaskProgress.DoesNotExist:
            return False
    
    @staticmethod
    def get_result(task_id):
        """Get task result"""
        try:
            task_progress = TaskProgress.objects.get(task_id=task_id)
            return task_progress.result_data
        except TaskProgress.DoesNotExist:
            return None
    
    @staticmethod
    def clear_result(task_id):
        """Clear task result data"""
        try:
            task_progress = TaskProgress.objects.get(task_id=task_id)
            task_progress.result_data = {}
            task_progress.save(update_fields=['result_data'])
            return True
        except TaskProgress.DoesNotExist:
            return False


def create_task_progress(task_id, user, category, task_name, task_args=None):
    """Helper function to create a TaskProgress record"""
    return TaskProgress.objects.create(
        task_id=task_id,
        user=user,
        category=category,
        task_name=task_name,
        task_args=task_args or {},
        status=TaskStatus.PENDING
    )

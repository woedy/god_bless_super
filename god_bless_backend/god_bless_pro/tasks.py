"""
Base task classes with progress tracking capabilities
"""
from celery import Task
from celery.result import AsyncResult
from celery.exceptions import Retry
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json
import logging
import time
from functools import wraps

logger = logging.getLogger(__name__)


def exponential_backoff(max_retries=3, base_delay=1):
    """
    Decorator for automatic retry with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds (will be multiplied by 2^retry_count)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retry_count = 0
            last_exception = None
            
            while retry_count <= max_retries:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    retry_count += 1
                    
                    if retry_count > max_retries:
                        logger.error(f"Max retries ({max_retries}) exceeded for {func.__name__}: {str(e)}")
                        raise
                    
                    delay = base_delay * (2 ** (retry_count - 1))
                    logger.warning(
                        f"Retry {retry_count}/{max_retries} for {func.__name__} "
                        f"after {delay}s delay. Error: {str(e)}"
                    )
                    time.sleep(delay)
            
            raise last_exception
        
        return wrapper
    return decorator


class ProgressTrackingTask(Task):
    """
    Base task class with progress tracking and WebSocket notification support
    """
    
    # Retry configuration
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 3}
    retry_backoff = True
    retry_backoff_max = 600  # 10 minutes
    retry_jitter = True
    
    def __call__(self, *args, **kwargs):
        """Override to track task execution"""
        return super().__call__(*args, **kwargs)
    
    def update_progress(self, current, total, message='', metadata=None):
        """
        Update task progress and send WebSocket notification
        
        Args:
            current: Current progress value
            total: Total progress value
            message: Progress message
            metadata: Additional metadata dict
        """
        progress_data = {
            'current': current,
            'total': total,
            'percent': int((current / total) * 100) if total > 0 else 0,
            'message': message,
            'metadata': metadata or {}
        }
        
        # Update task state
        self.update_state(
            state='PROGRESS',
            meta=progress_data
        )
        
        # Send WebSocket notification
        self._send_websocket_update('progress', progress_data)
    
    def on_success(self, retval, task_id, args, kwargs):
        """Called when task succeeds"""
        self._send_websocket_update('success', {
            'result': retval,
            'task_id': task_id
        })
        return super().on_success(retval, task_id, args, kwargs)
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called when task fails"""
        error_message = str(exc)
        is_retryable = self.should_retry_error(exc)
        
        self._send_websocket_update('failure', {
            'error': error_message,
            'task_id': task_id,
            'is_retryable': is_retryable,
            'traceback': str(einfo)
        })
        
        logger.error(
            f"Task {task_id} failed: {error_message}",
            extra={
                'task_id': task_id,
                'error': error_message,
                'is_retryable': is_retryable,
                'args': args,
                'kwargs': kwargs
            }
        )
        
        return super().on_failure(exc, task_id, args, kwargs, einfo)
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Called when task is retried"""
        retry_count = self.request.retries
        
        self._send_websocket_update('retry', {
            'error': str(exc),
            'task_id': task_id,
            'retry_count': retry_count
        })
        
        logger.warning(
            f"Task {task_id} is being retried (attempt {retry_count}): {str(exc)}",
            extra={
                'task_id': task_id,
                'retry_count': retry_count,
                'error': str(exc)
            }
        )
        
        return super().on_retry(exc, task_id, args, kwargs, einfo)
    
    def _send_websocket_update(self, event_type, data):
        """Send update via WebSocket"""
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f'task_{self.request.id}',
                    {
                        'type': 'task_update',
                        'event': event_type,
                        'task_id': self.request.id,
                        'data': data
                    }
                )
        except Exception as e:
            logger.error(f"Failed to send WebSocket update: {e}")
    
    def should_retry_error(self, exc):
        """
        Determine if an error should trigger a retry.
        
        Args:
            exc: The exception that was raised
            
        Returns:
            bool: True if the error is retryable
        """
        # Don't retry these errors
        non_retryable_errors = (
            TaskCancelledException,
            ValueError,
            TypeError,
            KeyError,
        )
        
        if isinstance(exc, non_retryable_errors):
            return False
        
        # Retry network and database errors
        retryable_error_messages = [
            'connection',
            'timeout',
            'network',
            'database',
            'unavailable',
        ]
        
        error_message = str(exc).lower()
        return any(msg in error_message for msg in retryable_error_messages)
    
    def handle_error_with_recovery(self, error, context=None):
        """
        Handle an error with automatic recovery strategies.
        
        Args:
            error: The exception that occurred
            context: Additional context about the error
            
        Returns:
            dict: Recovery information
        """
        recovery_info = {
            'error': str(error),
            'error_type': type(error).__name__,
            'context': context or {},
            'recovery_attempted': False,
            'recovery_successful': False
        }
        
        # Log the error
        logger.error(
            f"Error in task {self.request.id}: {str(error)}",
            extra={
                'task_id': self.request.id,
                'error_type': type(error).__name__,
                'context': context
            }
        )
        
        # Attempt recovery based on error type
        if self.should_retry_error(error):
            recovery_info['recovery_attempted'] = True
            try:
                # Retry the task
                raise self.retry(exc=error, countdown=self.get_retry_delay())
            except Retry:
                recovery_info['recovery_successful'] = True
                raise
        
        return recovery_info
    
    def get_retry_delay(self):
        """
        Calculate retry delay with exponential backoff.
        
        Returns:
            int: Delay in seconds
        """
        retry_count = self.request.retries
        base_delay = 2  # 2 seconds
        max_delay = 300  # 5 minutes
        
        delay = min(base_delay * (2 ** retry_count), max_delay)
        return delay


class CancellableTask(ProgressTrackingTask):
    """
    Task that can be cancelled and checks for cancellation during execution
    """
    
    def __call__(self, *args, **kwargs):
        """Check if task is cancelled before execution"""
        if self.is_cancelled():
            return {'status': 'cancelled', 'message': 'Task was cancelled'}
        return super().__call__(*args, **kwargs)
    
    def is_cancelled(self):
        """Check if task has been cancelled"""
        try:
            result = AsyncResult(self.request.id)
            # Check if task was revoked
            if result.state == 'REVOKED':
                return True
            
            # Check custom cancellation flag in backend
            from django.core.cache import cache
            cancel_key = f'task_cancel_{self.request.id}'
            return cache.get(cancel_key, False)
        except Exception as e:
            logger.error(f"Error checking cancellation status: {e}")
            return False
    
    def check_cancelled(self):
        """
        Check if task is cancelled and raise exception if so
        Call this periodically in long-running tasks
        """
        if self.is_cancelled():
            self._send_websocket_update('cancelled', {
                'task_id': self.request.id,
                'message': 'Task was cancelled'
            })
            raise TaskCancelledException(f'Task {self.request.id} was cancelled')


class TaskCancelledException(Exception):
    """Exception raised when a task is cancelled"""
    pass

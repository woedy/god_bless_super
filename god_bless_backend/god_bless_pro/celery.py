from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure, task_success
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')

app = Celery('god_bless_pro')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Apply performance optimizations
try:
    from .celery_performance import apply_performance_config
    app = apply_performance_config(app)
    logger.info("Applied Celery performance optimizations")
except ImportError:
    logger.warning("Celery performance optimizations not available")

app.autodiscover_tasks()


@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **extra):
    """Handle task start event"""
    try:
        from tasks.models import TaskProgress
        task_progress = TaskProgress.objects.filter(task_id=task_id).first()
        if task_progress:
            task_progress.mark_started()
            logger.info(f"Task {task_id} started")
    except Exception as e:
        logger.error(f"Error in task_prerun_handler: {e}")


@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, retval=None, state=None, **extra):
    """Handle task completion event"""
    try:
        from tasks.models import TaskProgress
        task_progress = TaskProgress.objects.filter(task_id=task_id).first()
        if task_progress and state == 'SUCCESS':
            task_progress.mark_success(result_data=retval)
            logger.info(f"Task {task_id} completed successfully")
            
            # Send WebSocket notification
            _send_task_completion_notification(task_progress, 'SUCCESS')
    except Exception as e:
        logger.error(f"Error in task_postrun_handler: {e}")


@task_success.connect
def task_success_handler(sender=None, result=None, **kwargs):
    """Handle task success event"""
    logger.info(f"Task {sender.request.id} succeeded with result: {result}")


@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, args=None, kwargs=None, traceback=None, einfo=None, **extra):
    """Handle task failure event"""
    try:
        from tasks.models import TaskProgress
        task_progress = TaskProgress.objects.filter(task_id=task_id).first()
        if task_progress:
            task_progress.mark_failure(str(exception))
            logger.error(f"Task {task_id} failed: {exception}")
            
            # Send WebSocket notification
            _send_task_completion_notification(task_progress, 'FAILURE', str(exception))
    except Exception as e:
        logger.error(f"Error in task_failure_handler: {e}")


def _send_task_completion_notification(task_progress, status, error_message=None):
    """Send task completion notification via WebSocket"""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"user_{task_progress.user_id}",
                {
                    "type": "task_completed",
                    "task_id": task_progress.task_id,
                    "status": status,
                    "result_data": task_progress.result_data,
                    "error_message": error_message or task_progress.error_message,
                }
            )
    except Exception as e:
        logger.error(f"Failed to send task completion notification: {e}")


# Periodic task for cleanup
from celery.schedules import crontab

app.conf.beat_schedule = {
    'cleanup-old-tasks': {
        'task': 'tasks.tasks.cleanup_old_tasks_periodic',
        'schedule': crontab(hour=2, minute=0),  # Run daily at 2 AM
    },
    # SMTP health monitoring tasks
    'smtp-health-check-all-users': {
        'task': 'smtps.tasks.check_smtp_health_for_all_users',
        'schedule': crontab(minute='*/10'),  # Run every 10 minutes
    },
    'cleanup-unhealthy-smtp-servers': {
        'task': 'smtps.tasks.cleanup_unhealthy_smtp_servers',
        'schedule': crontab(hour=3, minute=0),  # Run daily at 3 AM
    },
    'generate-smtp-performance-report': {
        'task': 'smtps.tasks.generate_smtp_performance_report',
        'schedule': crontab(hour=1, minute=0),  # Run daily at 1 AM
    },
    # SMS retry management tasks
    'cleanup-old-retry-attempts': {
        'task': 'sms_sender.tasks.cleanup_old_retry_attempts',
        'schedule': crontab(hour=4, minute=0),  # Run daily at 4 AM
    },
}
app.conf.timezone = 'UTC'

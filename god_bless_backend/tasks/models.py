from django.db import models
from django.conf import settings
from django.utils import timezone


class TaskStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    STARTED = 'STARTED', 'Started'
    PROGRESS = 'PROGRESS', 'In Progress'
    SUCCESS = 'SUCCESS', 'Success'
    FAILURE = 'FAILURE', 'Failure'
    RETRY = 'RETRY', 'Retry'
    REVOKED = 'REVOKED', 'Revoked'


class TaskCategory(models.TextChoices):
    PHONE_GENERATION = 'phone_generation', 'Phone Generation'
    PHONE_VALIDATION = 'phone_validation', 'Phone Validation'
    SMS_SENDING = 'sms_sending', 'SMS Sending'
    DATA_EXPORT = 'data_export', 'Data Export'
    DATA_IMPORT = 'data_import', 'Data Import'
    GENERAL = 'general', 'General'


class TaskNotification(models.Model):
    """Store task completion notifications for users"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='task_notifications')
    task = models.ForeignKey('TaskProgress', on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(
        max_length=20,
        choices=[
            ('success', 'Success'),
            ('failure', 'Failure'),
            ('cancelled', 'Cancelled'),
        ]
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} - {self.task.task_name}"


class TaskProgress(models.Model):
    """Track progress and status of Celery tasks"""
    task_id = models.CharField(max_length=255, unique=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tasks')
    category = models.CharField(
        max_length=50,
        choices=TaskCategory.choices,
        default=TaskCategory.GENERAL
    )
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.PENDING,
        db_index=True
    )
    progress = models.IntegerField(default=0)  # 0-100
    current_step = models.CharField(max_length=255, blank=True)
    total_items = models.IntegerField(default=0)
    processed_items = models.IntegerField(default=0)
    
    # Metadata
    task_name = models.CharField(max_length=255)
    task_args = models.JSONField(default=dict, blank=True)
    result_data = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    estimated_completion = models.DateTimeField(null=True, blank=True)
    
    # Notification tracking
    notification_sent = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['category', 'status']),
        ]
    
    def __str__(self):
        return f"{self.task_name} - {self.status} ({self.progress}%)"
    
    @property
    def duration(self):
        """Calculate task duration"""
        if self.started_at:
            end_time = self.completed_at or timezone.now()
            return (end_time - self.started_at).total_seconds()
        return 0
    
    @property
    def is_complete(self):
        """Check if task is in a terminal state"""
        return self.status in [TaskStatus.SUCCESS, TaskStatus.FAILURE, TaskStatus.REVOKED]
    
    def update_progress(self, progress, current_step=None, processed_items=None):
        """Update task progress"""
        self.progress = min(100, max(0, progress))
        if current_step:
            self.current_step = current_step
        if processed_items is not None:
            self.processed_items = processed_items
        self.save(update_fields=['progress', 'current_step', 'processed_items'])
    
    def mark_started(self):
        """Mark task as started"""
        self.status = TaskStatus.STARTED
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at'])
    
    def mark_success(self, result_data=None):
        """Mark task as successful"""
        self.status = TaskStatus.SUCCESS
        self.progress = 100
        self.completed_at = timezone.now()
        if result_data:
            self.result_data = result_data
        self.save(update_fields=['status', 'progress', 'completed_at', 'result_data'])
        self._send_completion_notification()
    
    def mark_failure(self, error_message):
        """Mark task as failed"""
        self.status = TaskStatus.FAILURE
        self.error_message = str(error_message)
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'error_message', 'completed_at'])
        self._send_completion_notification()
    
    def _send_completion_notification(self):
        """Send WebSocket notification for task completion"""
        if not self.notification_sent:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            # Create persistent notification
            notification_type = 'success' if self.status == TaskStatus.SUCCESS else 'failure' if self.status == TaskStatus.FAILURE else 'cancelled'
            message = self.result_data.get('message', '') if self.status == TaskStatus.SUCCESS else self.error_message
            
            TaskNotification.objects.create(
                user=self.user,
                task=self,
                notification_type=notification_type,
                message=message or f"Task {self.task_name} {notification_type}"
            )
            
            # Send WebSocket notification
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"user_{self.user_id}",
                        {
                            "type": "task_completed",
                            "task_id": self.task_id,
                            "status": self.status,
                            "result_data": self.result_data,
                            "error_message": self.error_message,
                        }
                    )
                    self.notification_sent = True
                    self.save(update_fields=['notification_sent'])
                except Exception as e:
                    print(f"Failed to send completion notification: {e}")

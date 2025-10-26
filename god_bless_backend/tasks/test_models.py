"""
Unit tests for tasks models
Tests Requirements: 6.1, 6.2, 6.3
"""
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from tasks.base import ProgressTrackingTask
from tasks.models import TaskProgress, TaskNotification, TaskStatus, TaskCategory

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username='test-user',
        email='test@example.com',
        password='password123'
    )


@pytest.mark.unit
class TestTaskProgressModel:
    """Test TaskProgress model functionality"""

    class DummyLayer:
        def __init__(self):
            self.calls = []

        async def group_send(self, group, message):
            self.calls.append((group, message))
    
    def test_create_task_progress(self, user):
        """Test creating a task progress record"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            category=TaskCategory.PHONE_GENERATION,
            task_name='Generate Phone Numbers',
            status=TaskStatus.PENDING
        )
        assert task.task_id == 'test-task-123'
        assert task.user == user
        assert task.status == TaskStatus.PENDING
        assert task.progress == 0
    
    def test_task_progress_defaults(self, user):
        """Test task progress default values"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Test Task'
        )
        assert task.category == TaskCategory.GENERAL
        assert task.status == TaskStatus.PENDING
        assert task.progress == 0
        assert task.total_items == 0
        assert task.processed_items == 0
    
    def test_update_progress_method(self, user):
        """Test update_progress method"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Test Task',
            total_items=100
        )
        task.update_progress(50, 'Processing items', 50)
        task.refresh_from_db()
        
        assert task.progress == 50
        assert task.current_step == 'Processing items'
        assert task.processed_items == 50
    
    def test_mark_started_method(self, user):
        """Test mark_started method"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Test Task'
        )
        task.mark_started()
        task.refresh_from_db()
        
        assert task.status == TaskStatus.STARTED
        assert task.started_at is not None
    
    def test_mark_success_method(self, user):
        """Test mark_success method"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Test Task'
        )
        result_data = {'generated': 100, 'valid': 95}
        task.mark_success(result_data)
        task.refresh_from_db()
        
        assert task.status == TaskStatus.SUCCESS
        assert task.progress == 100
        assert task.completed_at is not None
        assert task.result_data == result_data
    
    def test_mark_failure_method(self, user):
        """Test mark_failure method"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Test Task'
        )
        task.mark_failure('Connection error')
        task.refresh_from_db()
        
        assert task.status == TaskStatus.FAILURE
        assert task.error_message == 'Connection error'
        assert task.completed_at is not None
    
    def test_duration_property(self, user):
        """Test duration property calculation"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Test Task',
            started_at=timezone.now(),
            completed_at=timezone.now() + timezone.timedelta(seconds=120)
        )
        assert task.duration == pytest.approx(120.0, abs=0.01)
    
    def test_duration_in_progress(self, user):
        """Test duration for in-progress task"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Test Task',
            started_at=timezone.now() - timezone.timedelta(seconds=30)
        )
        # Duration should be approximately 30 seconds
        assert task.duration >= 29 and task.duration <= 31

    def test_progress_notification_structure(self, user, monkeypatch):
        task_progress = TaskProgress.objects.create(
            task_id='progress-task',
            user=user,
            task_name='Progress Task',
            category=TaskCategory.PHONE_GENERATION,
            status=TaskStatus.PENDING
        )

        dummy_task = ProgressTrackingTask()
        dummy_task.task_progress = task_progress
        dummy_task._user_identifier = user.user_id or str(user.pk)

        dummy_layer = self.DummyLayer()
        monkeypatch.setattr('channels.layers.get_channel_layer', lambda: dummy_layer)

        dummy_task.update_progress(50, current_step='Processing batch 1', processed_items=50, total_items=100)

        task_progress.refresh_from_db()
        assert task_progress.status == TaskStatus.PROGRESS
        assert dummy_layer.calls

        group, message = dummy_layer.calls[0]
        assert group == f"user_{user.pk}"
        assert message['channel'] == 'task_progress'
        assert message['data']['status'] == 'running'
        assert message['data']['progress'] == 50
        assert message['data']['userId'] == (user.user_id or str(user.pk))

    def test_completion_notification_channels(self, user, monkeypatch):
        success_task = TaskProgress.objects.create(
            task_id='complete-task',
            user=user,
            task_name='Complete Task',
            status=TaskStatus.STARTED,
            category=TaskCategory.PHONE_GENERATION
        )

        failure_task = TaskProgress.objects.create(
            task_id='failed-task',
            user=user,
            task_name='Failed Task',
            status=TaskStatus.STARTED,
            category=TaskCategory.PHONE_GENERATION
        )

        dummy_layer = self.DummyLayer()
        monkeypatch.setattr('channels.layers.get_channel_layer', lambda: dummy_layer)

        success_task.mark_success({'message': 'done'})
        failure_task.mark_failure('boom')

        assert len(dummy_layer.calls) >= 2
        success_group, success_message = dummy_layer.calls[0]
        failure_group, failure_message = dummy_layer.calls[1]

        assert success_group == f"user_{user.pk}"
        assert success_message['channel'] == 'task_complete'
        assert success_message['data']['status'] == 'completed'

        assert failure_group == f"user_{user.pk}"
        assert failure_message['channel'] == 'task_error'
        assert failure_message['data']['status'] == 'failed'
        assert failure_message['data']['error'] == 'boom'
    
    def test_is_complete_property(self, user):
        """Test is_complete property"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Test Task',
            status=TaskStatus.SUCCESS
        )
        assert task.is_complete is True
        
        task.status = TaskStatus.PENDING
        task.save()
        assert task.is_complete is False
    
    def test_task_categories(self, user):
        """Test different task categories"""
        categories = [
            TaskCategory.PHONE_GENERATION,
            TaskCategory.PHONE_VALIDATION,
            TaskCategory.SMS_SENDING,
            TaskCategory.DATA_EXPORT,
            TaskCategory.DATA_IMPORT
        ]
        
        for i, category in enumerate(categories):
            task = TaskProgress.objects.create(
                task_id=f'test-task-{i}',
                user=user,
                task_name=f'Test Task {i}',
                category=category
            )
            assert task.category == category
    
    def test_task_str_representation(self, user):
        """Test task string representation"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Generate Numbers',
            status=TaskStatus.PROGRESS,
            progress=75
        )
        task_str = str(task)
        assert 'Generate Numbers' in task_str
        assert '75%' in task_str


@pytest.mark.unit
class TestTaskNotificationModel:
    """Test TaskNotification model functionality"""
    
    def test_create_notification(self, user):
        """Test creating a task notification"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Test Task'
        )
        notification = TaskNotification.objects.create(
            user=user,
            task=task,
            notification_type='success',
            message='Task completed successfully'
        )
        assert notification.user == user
        assert notification.task == task
        assert notification.notification_type == 'success'
        assert notification.is_read is False
    
    def test_notification_types(self, user):
        """Test different notification types"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Test Task'
        )
        
        types = ['success', 'failure', 'cancelled']
        for notification_type in types:
            notification = TaskNotification.objects.create(
                user=user,
                task=task,
                notification_type=notification_type,
                message=f'Task {notification_type}'
            )
            assert notification.notification_type == notification_type
    
    def test_notification_read_status(self, user):
        """Test notification read status"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Test Task'
        )
        notification = TaskNotification.objects.create(
            user=user,
            task=task,
            notification_type='success',
            message='Test'
        )
        
        assert notification.is_read is False
        notification.is_read = True
        notification.save()
        assert notification.is_read is True
    
    def test_notification_ordering(self, user):
        """Test notifications are ordered by creation date"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Test Task'
        )
        
        notif1 = TaskNotification.objects.create(
            user=user,
            task=task,
            notification_type='success',
            message='First'
        )
        notif2 = TaskNotification.objects.create(
            user=user,
            task=task,
            notification_type='success',
            message='Second'
        )
        
        notifications = TaskNotification.objects.all()
        assert notifications[0] == notif2  # Most recent first
        assert notifications[1] == notif1
    
    def test_notification_str_representation(self, user):
        """Test notification string representation"""
        task = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            task_name='Generate Numbers'
        )
        notification = TaskNotification.objects.create(
            user=user,
            task=task,
            notification_type='success',
            message='Task completed'
        )
        notif_str = str(notification)
        assert 'success' in notif_str
        assert 'Generate Numbers' in notif_str

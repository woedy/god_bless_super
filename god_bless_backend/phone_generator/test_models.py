"""
Unit tests for phone_generator models
Tests Requirements: 6.1, 6.2, 6.3
"""
import pytest
from django.contrib.auth import get_user_model
from phone_generator.models import PhoneNumber, PhoneGenerationTask
from projects.models import Project
from django.utils import timezone

User = get_user_model()


@pytest.fixture
def project(user):
    """Create a test project"""
    return Project.objects.create(
        user=user,
        name='Test Project',
        description='Test project description'
    )


@pytest.mark.unit
class TestPhoneNumberModel:
    """Test PhoneNumber model functionality"""
    
    def test_create_phone_number(self, user, project):
        """Test creating a phone number"""
        phone = PhoneNumber.objects.create(
            user=user,
            project=project,
            phone_number='1234567890',
            carrier='Verizon',
            type='mobile',
            area_code='123',
            valid_number=True
        )
        assert phone.phone_number == '1234567890'
        assert phone.carrier == 'Verizon'
        assert phone.type == 'mobile'
        assert phone.valid_number is True
    
    def test_phone_number_unique_constraint(self, user, project):
        """Test phone number uniqueness"""
        PhoneNumber.objects.create(
            user=user,
            project=project,
            phone_number='1234567890'
        )
        with pytest.raises(Exception):
            PhoneNumber.objects.create(
                user=user,
                project=project,
                phone_number='1234567890'
            )
    
    def test_phone_number_str_representation(self, user, project):
        """Test phone number string representation"""
        phone = PhoneNumber.objects.create(
            user=user,
            project=project,
            phone_number='1234567890'
        )
        assert str(phone) == '1234567890'
    
    def test_phone_number_validation_tracking(self, user, project):
        """Test validation tracking fields"""
        phone = PhoneNumber.objects.create(
            user=user,
            project=project,
            phone_number='1234567890',
            validation_attempted=True,
            validation_date=timezone.now(),
            validation_source='internal'
        )
        assert phone.validation_attempted is True
        assert phone.validation_date is not None
        assert phone.validation_source == 'internal'
    
    def test_phone_number_carrier_indexing(self, user, project):
        """Test that carrier field is indexed"""
        # Create multiple phone numbers with different carriers
        PhoneNumber.objects.create(
            user=user,
            project=project,
            phone_number='1111111111',
            carrier='Verizon'
        )
        PhoneNumber.objects.create(
            user=user,
            project=project,
            phone_number='2222222222',
            carrier='AT&T'
        )
        
        # Query by carrier should be efficient
        verizon_phones = PhoneNumber.objects.filter(carrier='Verizon')
        assert verizon_phones.count() == 1
    
    def test_phone_number_status_choices(self, user, project):
        """Test status field choices"""
        phone = PhoneNumber.objects.create(
            user=user,
            project=project,
            phone_number='1234567890',
            status='active'
        )
        assert phone.status == 'active'


@pytest.mark.unit
class TestPhoneGenerationTaskModel:
    """Test PhoneGenerationTask model functionality"""
    
    def test_create_generation_task(self, user, project):
        """Test creating a phone generation task"""
        task = PhoneGenerationTask.objects.create(
            user=user,
            project=project,
            area_code='123',
            quantity=1000,
            status='pending'
        )
        assert task.user == user
        assert task.area_code == '123'
        assert task.quantity == 1000
        assert task.status == 'pending'
        assert task.progress == 0
    
    def test_task_progress_tracking(self, user, project):
        """Test task progress tracking"""
        task = PhoneGenerationTask.objects.create(
            user=user,
            project=project,
            area_code='123',
            quantity=1000,
            total_items=1000,
            processed_items=500,
            progress=50
        )
        assert task.progress == 50
        assert task.processed_items == 500
        assert task.total_items == 1000
    
    def test_task_status_choices(self, user, project):
        """Test task status choices"""
        task = PhoneGenerationTask.objects.create(
            user=user,
            project=project,
            area_code='123',
            quantity=100
        )
        
        # Test all valid status choices
        valid_statuses = ['pending', 'in_progress', 'completed', 'failed', 'cancelled']
        for status in valid_statuses:
            task.status = status
            task.save()
            assert task.status == status
    
    def test_task_duration_property(self, user, project):
        """Test task duration calculation"""
        task = PhoneGenerationTask.objects.create(
            user=user,
            project=project,
            area_code='123',
            quantity=100,
            started_at=timezone.now(),
            completed_at=timezone.now() + timezone.timedelta(seconds=60)
        )
        assert task.duration == 60.0
    
    def test_task_duration_not_completed(self, user, project):
        """Test duration when task not completed"""
        task = PhoneGenerationTask.objects.create(
            user=user,
            project=project,
            area_code='123',
            quantity=100
        )
        assert task.duration is None
    
    def test_task_result_data(self, user, project):
        """Test task result data storage"""
        task = PhoneGenerationTask.objects.create(
            user=user,
            project=project,
            area_code='123',
            quantity=100,
            result_data={
                'generated': 100,
                'valid': 95,
                'invalid': 5
            }
        )
        assert task.result_data['generated'] == 100
        assert task.result_data['valid'] == 95
    
    def test_task_celery_id_unique(self, user, project):
        """Test celery task ID uniqueness"""
        task1 = PhoneGenerationTask.objects.create(
            user=user,
            project=project,
            area_code='123',
            quantity=100,
            celery_task_id='task-123'
        )
        
        with pytest.raises(Exception):
            PhoneGenerationTask.objects.create(
                user=user,
                project=project,
                area_code='456',
                quantity=100,
                celery_task_id='task-123'
            )
    
    def test_task_str_representation(self, user, project):
        """Test task string representation"""
        task = PhoneGenerationTask.objects.create(
            user=user,
            project=project,
            area_code='123',
            quantity=1000,
            status='in_progress'
        )
        task_str = str(task)
        assert '123' in task_str
        assert '1000' in task_str
        assert 'in_progress' in task_str
    
    def test_task_ordering(self, user, project):
        """Test tasks are ordered by creation date"""
        task1 = PhoneGenerationTask.objects.create(
            user=user,
            project=project,
            area_code='123',
            quantity=100
        )
        task2 = PhoneGenerationTask.objects.create(
            user=user,
            project=project,
            area_code='456',
            quantity=200
        )
        
        tasks = PhoneGenerationTask.objects.all()
        assert tasks[0] == task2  # Most recent first
        assert tasks[1] == task1

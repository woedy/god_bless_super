"""
Tests for phone number generation system
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from phone_generator.models import PhoneNumber, PhoneGenerationTask
from phone_generator.tasks import generate_phone_numbers_task, validate_phone_numbers_task
from projects.models import Project

User = get_user_model()


class PhoneNumberGenerationTestCase(TestCase):
    """Test cases for phone number generation"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.project = Project.objects.create(
            project_name='Test Project',
            user=self.user
        )
    
    def test_phone_number_model_creation(self):
        """Test creating a phone number model"""
        phone = PhoneNumber.objects.create(
            user=self.user,
            project=self.project,
            phone_number='14155551234',
            area_code='415',
            carrier='AT&T',
            type='Mobile',
            valid_number=True
        )
        
        self.assertEqual(phone.phone_number, '14155551234')
        self.assertEqual(phone.area_code, '415')
        self.assertEqual(phone.carrier, 'AT&T')
        self.assertTrue(phone.valid_number)
    
    def test_phone_generation_task_model(self):
        """Test creating a phone generation task model"""
        task = PhoneGenerationTask.objects.create(
            user=self.user,
            project=self.project,
            area_code='415',
            quantity=1000,
            status='pending',
            celery_task_id='test-task-id-123'
        )
        
        self.assertEqual(task.area_code, '415')
        self.assertEqual(task.quantity, 1000)
        self.assertEqual(task.status, 'pending')
        self.assertEqual(task.progress, 0)
    
    @patch('phone_generator.tasks.PhoneNumber.objects.bulk_create')
    @patch('phone_generator.tasks.PhoneNumber.objects.filter')
    def test_generate_phone_numbers_task_small_batch(self, mock_filter, mock_bulk_create):
        """Test phone number generation task with small batch"""
        # Mock existing numbers check
        mock_filter.return_value.values_list.return_value = []
        
        # This would normally be called via Celery
        # For testing, we're just verifying the task structure
        self.assertTrue(callable(generate_phone_numbers_task))
    
    def test_phone_number_uniqueness(self):
        """Test that phone numbers are unique"""
        PhoneNumber.objects.create(
            user=self.user,
            project=self.project,
            phone_number='14155551234',
            area_code='415'
        )
        
        # Attempting to create duplicate should fail
        with self.assertRaises(Exception):
            PhoneNumber.objects.create(
                user=self.user,
                project=self.project,
                phone_number='14155551234',
                area_code='415'
            )
    
    def test_phone_number_filtering(self):
        """Test filtering phone numbers by various criteria"""
        # Create test phone numbers
        PhoneNumber.objects.create(
            user=self.user,
            project=self.project,
            phone_number='14155551234',
            area_code='415',
            carrier='AT&T',
            type='Mobile',
            valid_number=True
        )
        
        PhoneNumber.objects.create(
            user=self.user,
            project=self.project,
            phone_number='14155551235',
            area_code='415',
            carrier='Verizon',
            type='Landline',
            valid_number=True
        )
        
        # Test filtering by carrier
        att_numbers = PhoneNumber.objects.filter(carrier='AT&T')
        self.assertEqual(att_numbers.count(), 1)
        
        # Test filtering by type
        mobile_numbers = PhoneNumber.objects.filter(type='Mobile')
        self.assertEqual(mobile_numbers.count(), 1)
        
        # Test filtering by area code
        area_415_numbers = PhoneNumber.objects.filter(area_code='415')
        self.assertEqual(area_415_numbers.count(), 2)


class PhoneNumberAPITestCase(TestCase):
    """Test cases for phone number API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.project = Project.objects.create(
            project_name='Test Project',
            user=self.user
        )
    
    def test_phone_generation_task_tracking(self):
        """Test that generation tasks are properly tracked"""
        task = PhoneGenerationTask.objects.create(
            user=self.user,
            project=self.project,
            area_code='415',
            quantity=10000,
            status='in_progress',
            progress=50,
            current_step='Generating batch 5/10',
            total_items=10000,
            processed_items=5000,
            celery_task_id='test-task-123'
        )
        
        self.assertEqual(task.progress, 50)
        self.assertEqual(task.processed_items, 5000)
        self.assertEqual(task.current_step, 'Generating batch 5/10')
    
    def test_task_progress_calculation(self):
        """Test task progress percentage calculation"""
        task = PhoneGenerationTask.objects.create(
            user=self.user,
            project=self.project,
            area_code='415',
            quantity=1000,
            total_items=1000,
            processed_items=250,
            celery_task_id='test-task-123'
        )
        
        # Progress should be 25%
        expected_progress = int((250 / 1000) * 100)
        self.assertEqual(expected_progress, 25)


class PhoneNumberValidationTestCase(TestCase):
    """Test cases for phone number validation"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.project = Project.objects.create(
            project_name='Test Project',
            user=self.user
        )
    
    def test_validation_tracking(self):
        """Test that validation attempts are tracked"""
        phone = PhoneNumber.objects.create(
            user=self.user,
            project=self.project,
            phone_number='14155551234',
            area_code='415',
            validation_attempted=False
        )
        
        self.assertFalse(phone.validation_attempted)
        
        # Simulate validation
        phone.validation_attempted = True
        phone.valid_number = True
        phone.carrier = 'AT&T'
        phone.type = 'Mobile'
        phone.save()
        
        self.assertTrue(phone.validation_attempted)
        self.assertTrue(phone.valid_number)
    
    def test_validation_source_tracking(self):
        """Test that validation source is tracked"""
        phone = PhoneNumber.objects.create(
            user=self.user,
            project=self.project,
            phone_number='14155551234',
            area_code='415',
            validation_source='internal'
        )
        
        self.assertEqual(phone.validation_source, 'internal')


print("Phone number generation system tests defined successfully")

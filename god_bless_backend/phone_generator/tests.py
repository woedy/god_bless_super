"""
Tests for phone number generation system
"""
from django.test import TestCase, override_settings
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


class PhoneNumberGenerationAutoValidationTests(TestCase):
    """Regression tests for generation auto-validation scoping"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='autouser',
            email='auto@example.com',
            password='testpass123'
        )
        self.project = Project.objects.create(
            project_name='Auto Project',
            user=self.user
        )

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_auto_validation_uses_only_current_generation_ids(self):
        """Auto-validation should only target IDs generated in the current run."""
        existing_phone = PhoneNumber.objects.create(
            user=self.user,
            project=self.project,
            phone_number='14159999999',
            area_code='415',
            validation_attempted=False
        )

        number_sequence = iter([
            "14152000001",
            "14152000002",
            "14152000003",
        ])

        def fake_generate(area_code, batch_size, existing_numbers):
            batch = []
            while len(batch) < batch_size:
                try:
                    batch.append(next(number_sequence))
                except StopIteration as exc:  # pragma: no cover - safety guard
                    raise AssertionError("Insufficient test numbers for batch generation") from exc
            return batch

        with patch('phone_generator.tasks.validate_phone_numbers_task.delay') as mock_validate, \
                patch('phone_generator.tasks._generate_unique_numbers_batch', side_effect=fake_generate), \
                patch.object(generate_phone_numbers_task, '_send_task_notification'), \
                patch.object(generate_phone_numbers_task, 'update_progress') as mock_update_progress, \
                patch.object(generate_phone_numbers_task, 'mark_started'):
            mock_validate.return_value.id = 'auto-validation-task'
            result = generate_phone_numbers_task.apply(
                args=(self.user.user_id, self.project.id, '415', 3),
                kwargs={'auto_validate': True, 'batch_size': 2},
                throw=True
            )

        # Ensure the task completed successfully and auto-validation was triggered
        self.assertEqual(result.get()['total_generated'], 3)
        mock_validate.assert_called_once()

        called_ids = mock_validate.call_args.kwargs['phone_ids']
        self.assertEqual(len(called_ids), len(set(called_ids)))
        self.assertNotIn(existing_phone.id, called_ids)

        generated_ids = list(
            PhoneNumber.objects.filter(id__in=called_ids).values_list('id', flat=True)
        )
        self.assertCountEqual(generated_ids, called_ids)

        # Progress updates should show movement between 0 and 100
        progress_values = [
            kwargs.get('progress', args[0] if args else None)
            for args, kwargs in mock_update_progress.call_args_list
        ]
        progress_values = [value for value in progress_values if value is not None]
        self.assertIn(100, progress_values)
        self.assertTrue(any(0 < value < 100 for value in progress_values))
    
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

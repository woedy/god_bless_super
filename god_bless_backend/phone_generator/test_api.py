"""
API endpoint tests for phone_generator
Tests Requirements: 6.1, 6.2, 6.3
"""
import pytest
from django.urls import reverse
from rest_framework import status
from phone_generator.models import PhoneNumber, PhoneGenerationTask
from projects.models import Project


@pytest.fixture
def project(user):
    """Create a test project"""
    return Project.objects.create(
        user=user,
        name='Test Project',
        description='Test project'
    )


@pytest.mark.api
class TestPhoneGenerationAPI:
    """Test phone generation API endpoints"""
    
    def test_generate_phone_numbers(self, authenticated_client, user, project):
        """Test phone number generation endpoint"""
        url = reverse('generate-phone-numbers')
        data = {
            'project_id': project.id,
            'area_code': '123',
            'quantity': 100,
            'carrier_filter': 'Verizon'
        }
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED, status.HTTP_202_ACCEPTED]
        assert 'task_id' in response.data or 'celery_task_id' in response.data
    
    def test_generate_large_batch(self, authenticated_client, user, project):
        """Test generating large batch of numbers"""
        url = reverse('generate-phone-numbers')
        data = {
            'project_id': project.id,
            'area_code': '456',
            'quantity': 10000
        }
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED, status.HTTP_202_ACCEPTED]
    
    def test_list_phone_numbers(self, authenticated_client, user, project):
        """Test listing phone numbers"""
        # Create some test phone numbers
        for i in range(5):
            PhoneNumber.objects.create(
                user=user,
                project=project,
                phone_number=f'123456789{i}',
                carrier='Verizon'
            )
        
        url = reverse('phone-numbers-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 5 or len(response.data) >= 5
    
    def test_filter_phone_numbers_by_carrier(self, authenticated_client, user, project):
        """Test filtering phone numbers by carrier"""
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
        
        url = reverse('phone-numbers-list')
        response = authenticated_client.get(url, {'carrier': 'Verizon'})
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_export_phone_numbers(self, authenticated_client, user, project):
        """Test exporting phone numbers"""
        for i in range(10):
            PhoneNumber.objects.create(
                user=user,
                project=project,
                phone_number=f'123456789{i}'
            )
        
        url = reverse('export-phone-numbers')
        response = authenticated_client.post(url, {'format': 'csv'}, format='json')
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_202_ACCEPTED]


@pytest.mark.api
class TestPhoneValidationAPI:
    """Test phone validation API endpoints"""
    
    def test_validate_phone_numbers(self, authenticated_client, user, project):
        """Test phone number validation endpoint"""
        # Create phone numbers to validate
        for i in range(5):
            PhoneNumber.objects.create(
                user=user,
                project=project,
                phone_number=f'123456789{i}',
                valid_number=None
            )
        
        url = reverse('validate-phone-numbers')
        data = {
            'project_id': project.id
        }
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_202_ACCEPTED]
    
    def test_bulk_validate(self, authenticated_client, user, project):
        """Test bulk validation"""
        phone_ids = []
        for i in range(10):
            phone = PhoneNumber.objects.create(
                user=user,
                project=project,
                phone_number=f'123456789{i}'
            )
            phone_ids.append(phone.id)
        
        url = reverse('bulk-validate-phone-numbers')
        data = {
            'phone_ids': phone_ids
        }
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_202_ACCEPTED]


@pytest.mark.api
class TestPhoneGenerationTaskAPI:
    """Test phone generation task API endpoints"""
    
    def test_get_task_status(self, authenticated_client, user, project):
        """Test getting task status"""
        task = PhoneGenerationTask.objects.create(
            user=user,
            project=project,
            area_code='123',
            quantity=1000,
            celery_task_id='test-task-123'
        )
        
        url = reverse('phone-generation-task-status', kwargs={'task_id': task.celery_task_id})
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['area_code'] == '123'
    
    def test_list_user_tasks(self, authenticated_client, user, project):
        """Test listing user's generation tasks"""
        for i in range(3):
            PhoneGenerationTask.objects.create(
                user=user,
                project=project,
                area_code=f'12{i}',
                quantity=100
            )
        
        url = reverse('phone-generation-tasks-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 3 or len(response.data) >= 3
    
    def test_cancel_task(self, authenticated_client, user, project):
        """Test canceling a generation task"""
        task = PhoneGenerationTask.objects.create(
            user=user,
            project=project,
            area_code='123',
            quantity=1000,
            status='in_progress',
            celery_task_id='test-task-123'
        )
        
        url = reverse('cancel-phone-generation-task', kwargs={'task_id': task.celery_task_id})
        response = authenticated_client.post(url)
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]

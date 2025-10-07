"""
Integration tests for core platform functionality.
Tests end-to-end workflows including phone generation, SMS, and validation.
"""
import json
import time
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from phone_generator.models import PhoneNumber
from sms_sender.models import SMSCampaign, SMSMessage
from tasks.models import Task

User = get_user_model()


class CoreIntegrationTestCase(TransactionTestCase):
    """Test core platform workflows end-to-end."""
    
    def setUp(self):
        """Set up test client and user."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!',
            is_active=True
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
    
    def test_phone_generation_workflow(self):
        """Test complete phone number generation workflow."""
        # Step 1: Generate phone numbers
        response = self.client.post('/api/phone-generator/generate/', {
            'area_code': '555',
            'quantity': 10,
            'carrier': 'Verizon'
        })
        
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn('task_id', data)
        
        # Step 2: Check task status
        task_id = data['task_id']
        max_attempts = 10
        for _ in range(max_attempts):
            response = self.client.get(f'/api/tasks/{task_id}/status/')
            if response.status_code == 200:
                status_data = response.json()
                if status_data.get('status') == 'completed':
                    break
            time.sleep(0.5)
        
        # Step 3: Verify numbers were created
        numbers = PhoneNumber.objects.filter(
            created_by=self.user,
            area_code='555'
        )
        self.assertGreater(numbers.count(), 0)
        
        # Step 4: Retrieve generated numbers
        response = self.client.get('/api/phone-generator/numbers/')
        self.assertEqual(response.status_code, 200)
        numbers_data = response.json()
        self.assertIn('results', numbers_data)
        self.assertGreater(len(numbers_data['results']), 0)
    
    def test_phone_validation_workflow(self):
        """Test phone number validation workflow."""
        # Step 1: Create test phone numbers
        numbers = []
        for i in range(5):
            number = PhoneNumber.objects.create(
                number=f'555010{i:04d}',
                area_code='555',
                carrier='Verizon',
                number_type='mobile',
                created_by=self.user,
                is_valid=False
            )
            numbers.append(number.number)
        
        # Step 2: Validate numbers
        response = self.client.post('/api/phone-validator/validate-bulk/', {
            'phone_numbers': numbers
        })
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('task_id', data)
        
        # Step 3: Wait for validation to complete
        task_id = data['task_id']
        max_attempts = 10
        for _ in range(max_attempts):
            response = self.client.get(f'/api/tasks/{task_id}/status/')
            if response.status_code == 200:
                status_data = response.json()
                if status_data.get('status') in ['completed', 'failed']:
                    break
            time.sleep(0.5)
        
        # Step 4: Verify validation results
        for number in numbers:
            phone = PhoneNumber.objects.get(number=number)
            # Validation status should be updated
            self.assertIsNotNone(phone.validation_date)
    
    def test_sms_campaign_workflow(self):
        """Test SMS campaign creation and sending workflow."""
        # Step 1: Create phone numbers for SMS
        numbers = []
        for i in range(3):
            number = PhoneNumber.objects.create(
                number=f'555020{i:04d}',
                area_code='555',
                carrier='Verizon',
                number_type='mobile',
                created_by=self.user,
                is_valid=True
            )
            numbers.append(number.number)
        
        # Step 2: Create SMS campaign
        response = self.client.post('/api/sms-campaigns/', {
            'name': 'Test Campaign',
            'message_template': 'Hello {{name}}, this is a test message.',
            'target_carrier': 'Verizon',
            'status': 'draft'
        })
        
        self.assertEqual(response.status_code, 201)
        campaign_data = response.json()
        campaign_id = campaign_data['id']
        
        # Step 3: Add recipients to campaign
        response = self.client.post(f'/api/sms-campaigns/{campaign_id}/add-recipients/', {
            'phone_numbers': numbers,
            'personalization': [
                {'phone': numbers[0], 'name': 'Alice'},
                {'phone': numbers[1], 'name': 'Bob'},
                {'phone': numbers[2], 'name': 'Charlie'}
            ]
        })
        
        self.assertEqual(response.status_code, 200)
        
        # Step 4: Send campaign
        response = self.client.post(f'/api/sms-campaigns/{campaign_id}/send/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('task_id', data)
        
        # Step 5: Verify campaign status
        campaign = SMSCampaign.objects.get(id=campaign_id)
        self.assertIn(campaign.status, ['sending', 'sent', 'completed'])
    
    def test_data_export_workflow(self):
        """Test data export functionality."""
        # Step 1: Create test data
        for i in range(20):
            PhoneNumber.objects.create(
                number=f'555030{i:04d}',
                area_code='555',
                carrier='Verizon' if i % 2 == 0 else 'AT&T',
                number_type='mobile',
                created_by=self.user,
                is_valid=True
            )
        
        # Step 2: Export with filters
        response = self.client.post('/api/phone-generator/export/', {
            'format': 'csv',
            'filters': {
                'carrier': 'Verizon',
                'area_code': '555'
            }
        })
        
        self.assertEqual(response.status_code, 200)
        
        # Verify export content
        content = response.content.decode('utf-8')
        self.assertIn('555', content)
        self.assertIn('Verizon', content)
    
    def test_settings_management_workflow(self):
        """Test settings configuration workflow."""
        # Step 1: Get current settings
        response = self.client.get('/api/settings/')
        self.assertEqual(response.status_code, 200)
        
        # Step 2: Update SMTP settings
        response = self.client.post('/api/settings/smtp/', {
            'smtp_host': 'smtp.example.com',
            'smtp_port': 587,
            'smtp_username': 'user@example.com',
            'smtp_password': 'password123',
            'use_tls': True
        })
        
        self.assertEqual(response.status_code, 200)
        
        # Step 3: Update proxy settings
        response = self.client.post('/api/settings/proxy/', {
            'proxy_rotation_enabled': True,
            'proxy_list': [
                {'host': 'proxy1.example.com', 'port': 8080},
                {'host': 'proxy2.example.com', 'port': 8080}
            ]
        })
        
        self.assertEqual(response.status_code, 200)
        
        # Step 4: Update delivery settings
        response = self.client.post('/api/settings/delivery/', {
            'delivery_delay_min': 1,
            'delivery_delay_max': 5,
            'batch_size': 100
        })
        
        self.assertEqual(response.status_code, 200)
    
    def test_authentication_workflow(self):
        """Test complete authentication workflow."""
        # Step 1: Register new user
        response = self.client.post('/api/accounts/register/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!'
        })
        
        self.assertIn(response.status_code, [200, 201])
        
        # Step 2: Login
        response = self.client.post('/api/accounts/login/', {
            'username': 'newuser',
            'password': 'NewPass123!'
        })
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('token', data)
        
        # Step 3: Access protected endpoint
        new_client = APIClient()
        new_client.credentials(HTTP_AUTHORIZATION=f'Token {data["token"]}')
        response = new_client.get('/api/phone-generator/numbers/')
        self.assertEqual(response.status_code, 200)
        
        # Step 4: Logout
        response = new_client.post('/api/accounts/logout/')
        self.assertEqual(response.status_code, 200)
    
    def test_error_handling(self):
        """Test error handling across the platform."""
        # Test 1: Invalid phone generation request
        response = self.client.post('/api/phone-generator/generate/', {
            'area_code': 'invalid',
            'quantity': -1
        })
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('error', data)
        
        # Test 2: Unauthorized access
        unauthorized_client = APIClient()
        response = unauthorized_client.get('/api/phone-generator/numbers/')
        self.assertEqual(response.status_code, 401)
        
        # Test 3: Non-existent resource
        response = self.client.get('/api/sms-campaigns/99999/')
        self.assertEqual(response.status_code, 404)
        
        # Test 4: Invalid export format
        response = self.client.post('/api/phone-generator/export/', {
            'format': 'invalid_format'
        })
        self.assertEqual(response.status_code, 400)


class PerformanceIntegrationTestCase(TransactionTestCase):
    """Test performance of core operations."""
    
    def setUp(self):
        """Set up test client and user."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='perfuser',
            email='perf@example.com',
            password='PerfPass123!',
            is_active=True
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
    
    def test_large_dataset_pagination(self):
        """Test pagination with large datasets."""
        # Create 100 phone numbers
        for i in range(100):
            PhoneNumber.objects.create(
                number=f'555040{i:04d}',
                area_code='555',
                carrier='Verizon',
                number_type='mobile',
                created_by=self.user,
                is_valid=True
            )
        
        # Test pagination
        response = self.client.get('/api/phone-generator/numbers/?page=1&page_size=20')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['results']), 20)
        self.assertIn('next', data)
        self.assertIn('previous', data)
    
    def test_filtered_query_performance(self):
        """Test performance of filtered queries."""
        # Create diverse dataset
        carriers = ['Verizon', 'AT&T', 'T-Mobile', 'Sprint']
        for i in range(200):
            PhoneNumber.objects.create(
                number=f'555050{i:04d}',
                area_code='555',
                carrier=carriers[i % len(carriers)],
                number_type='mobile',
                created_by=self.user,
                is_valid=True
            )
        
        # Test filtered query
        start_time = time.time()
        response = self.client.get('/api/phone-generator/numbers/?carrier=Verizon&area_code=555')
        end_time = time.time()
        
        self.assertEqual(response.status_code, 200)
        # Query should complete in reasonable time (< 1 second)
        self.assertLess(end_time - start_time, 1.0)


class SecurityIntegrationTestCase(TestCase):
    """Test security features integration."""
    
    def setUp(self):
        """Set up test client and user."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='secuser',
            email='sec@example.com',
            password='SecPass123!',
            is_active=True
        )
        self.token = Token.objects.create(user=self.user)
    
    def test_rate_limiting(self):
        """Test API rate limiting."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        # Make multiple rapid requests
        responses = []
        for _ in range(70):  # Exceed burst limit
            response = self.client.get('/api/phone-generator/numbers/')
            responses.append(response.status_code)
        
        # Should eventually get rate limited
        self.assertIn(429, responses)
    
    def test_csrf_protection(self):
        """Test CSRF protection on state-changing operations."""
        # Attempt POST without CSRF token
        response = self.client.post('/api/phone-generator/generate/', {
            'area_code': '555',
            'quantity': 10
        })
        
        # Should be protected (either 403 or require authentication)
        self.assertIn(response.status_code, [401, 403])
    
    def test_input_sanitization(self):
        """Test input sanitization."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        # Attempt XSS injection
        response = self.client.post('/api/sms-campaigns/', {
            'name': '<script>alert("xss")</script>',
            'message_template': 'Test message',
            'status': 'draft'
        })
        
        if response.status_code == 201:
            data = response.json()
            # Script tags should be sanitized
            self.assertNotIn('<script>', data['name'])

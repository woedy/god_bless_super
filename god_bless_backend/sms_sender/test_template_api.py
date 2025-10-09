"""
Tests for Campaign Template API Views
"""

import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from .models import CampaignTemplate, SMSCampaign, SMSMessage

User = get_user_model()


class CampaignTemplateAPITest(TestCase):
    """Test cases for Campaign Template API"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create test templates
        self.user_template = CampaignTemplate.objects.create(
            user=self.user,
            name='User Template',
            description='Test template for user',
            category='marketing',
            settings={
                'message_template': 'Hello @NAME, check out our sale!',
                'suggested_macros': ['NAME'],
                'use_case': 'Marketing campaigns'
            }
        )
        
        self.public_template = CampaignTemplate.objects.create(
            user=self.other_user,
            name='Public Template',
            description='Public template from other user',
            category='notifications',
            settings={
                'message_template': 'Your order @ORDER is ready!',
                'suggested_macros': ['ORDER'],
                'use_case': 'Order notifications'
            },
            is_public=True
        )
        
        # Create test campaign
        self.campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Test Campaign',
            message_template='Test message @NAME',
            status='completed',
            total_recipients=100,
            messages_sent=100,
            messages_delivered=85,
            messages_failed=15
        )
        
        # Create test messages for success rate calculation
        for i in range(10):
            SMSMessage.objects.create(
                campaign=self.campaign,
                phone_number=f'555000{i:04d}',
                message_content=f'Test message {i}',
                delivery_status='delivered' if i < 8 else 'failed'
            )
    
    def test_list_templates(self):
        """Test listing templates"""
        url = reverse('sms_sender:campaign-templates-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        
        # Should include user's template and public template
        template_names = [t['name'] for t in response.data['results']]
        self.assertIn('User Template', template_names)
        self.assertIn('Public Template', template_names)
    
    def test_list_templates_by_category(self):
        """Test listing templates filtered by category"""
        url = reverse('sms_sender:campaign-templates-list')
        response = self.client.get(url, {'category': 'marketing'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should only include marketing templates
        for template in response.data['results']:
            if template['source'] == 'database':
                self.assertEqual(template['category'], 'marketing')
    
    def test_list_templates_exclude_public(self):
        """Test listing templates excluding public ones"""
        url = reverse('sms_sender:campaign-templates-list')
        response = self.client.get(url, {'include_public': 'false'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        template_names = [t['name'] for t in response.data['results']]
        self.assertIn('User Template', template_names)
        self.assertNotIn('Public Template', template_names)
    
    def test_retrieve_template_database(self):
        """Test retrieving a database template"""
        template_id = f"db_{self.user_template.id}"
        url = reverse('sms_sender:campaign-templates-detail', kwargs={'pk': template_id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'User Template')
        self.assertEqual(response.data['source'], 'database')
        self.assertTrue(response.data['is_owner'])
    
    def test_retrieve_template_builtin(self):
        """Test retrieving a built-in template"""
        url = reverse('sms_sender:campaign-templates-detail', kwargs={'pk': 'flash_sale'})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Flash Sale Alert')
        self.assertEqual(response.data['source'], 'builtin')
        self.assertFalse(response.data['is_owner'])
    
    def test_retrieve_template_not_found(self):
        """Test retrieving non-existent template"""
        url = reverse('sms_sender:campaign-templates-detail', kwargs={'pk': 'nonexistent'})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_create_template(self):
        """Test creating a new template"""
        url = reverse('sms_sender:campaign-templates-list')
        data = {
            'name': 'New Template',
            'description': 'Test description',
            'category': 'custom',
            'settings': {
                'message_template': 'New template @MACRO',
                'suggested_macros': ['MACRO'],
                'use_case': 'Test use case'
            },
            'is_public': False
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Template')
        self.assertEqual(response.data['user'], self.user.id)
    
    def test_create_template_invalid_category(self):
        """Test creating template with invalid category"""
        url = reverse('sms_sender:campaign-templates-list')
        data = {
            'name': 'Invalid Template',
            'description': 'Test description',
            'category': 'invalid_category',
            'settings': {
                'message_template': 'Test message',
                'suggested_macros': [],
                'use_case': 'Test'
            }
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_create_template_missing_message_template(self):
        """Test creating template without message_template"""
        url = reverse('sms_sender:campaign-templates-list')
        data = {
            'name': 'Invalid Template',
            'description': 'Test description',
            'category': 'custom',
            'settings': {
                'suggested_macros': [],
                'use_case': 'Test'
            }
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_update_template(self):
        """Test updating a template"""
        template_id = f"db_{self.user_template.id}"
        url = reverse('sms_sender:campaign-templates-detail', kwargs={'pk': template_id})
        data = {
            'name': 'Updated Template',
            'description': 'Updated description'
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Template')
    
    def test_update_template_not_owner(self):
        """Test updating template not owned by user"""
        template_id = f"db_{self.public_template.id}"
        url = reverse('sms_sender:campaign-templates-detail', kwargs={'pk': template_id})
        data = {'name': 'Hacked Template'}
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_delete_template(self):
        """Test deleting a template"""
        template_id = f"db_{self.user_template.id}"
        url = reverse('sms_sender:campaign-templates-detail', kwargs={'pk': template_id})
        
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CampaignTemplate.objects.filter(id=self.user_template.id).exists())
    
    def test_delete_template_not_owner(self):
        """Test deleting template not owned by user"""
        template_id = f"db_{self.public_template.id}"
        url = reverse('sms_sender:campaign-templates-detail', kwargs={'pk': template_id})
        
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_use_template(self):
        """Test using a template"""
        template_id = f"db_{self.user_template.id}"
        url = reverse('sms_sender:campaign-templates-use-template', kwargs={'pk': template_id})
        data = {'name': 'Test Campaign'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('campaign_config', response.data)
        self.assertEqual(response.data['campaign_config']['name'], 'Test Campaign')
    
    def test_template_performance(self):
        """Test getting template performance statistics"""
        template_id = f"db_{self.user_template.id}"
        url = reverse('sms_sender:campaign-templates-performance', kwargs={'pk': template_id})
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('usage_count', response.data)
        self.assertIn('average_success_rate', response.data)
    
    def test_share_template(self):
        """Test sharing a template"""
        template_id = f"db_{self.user_template.id}"
        url = reverse('sms_sender:campaign-templates-share', kwargs={'pk': template_id})
        data = {'make_public': True}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        
        # Check that template is now public
        self.user_template.refresh_from_db()
        self.assertTrue(self.user_template.is_public)
    
    def test_public_library(self):
        """Test getting public template library"""
        url = reverse('sms_sender:campaign-templates-public-library')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        
        template_names = [t['name'] for t in response.data['results']]
        self.assertIn('Public Template', template_names)
    
    def test_categories(self):
        """Test getting template categories"""
        url = reverse('sms_sender:campaign-templates-categories')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        
        category_values = [cat['value'] for cat in response.data]
        self.assertIn('marketing', category_values)
        self.assertIn('alerts', category_values)
        self.assertIn('notifications', category_values)
        self.assertIn('custom', category_values)
    
    def test_create_template_from_campaign(self):
        """Test creating template from campaign"""
        url = reverse('sms_sender:create_template_from_campaign')
        data = {
            'campaign_id': self.campaign.id,
            'template_name': 'Campaign Template',
            'template_description': 'Template from campaign',
            'is_public': False
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('template', response.data)
        self.assertEqual(response.data['template']['name'], 'Campaign Template')
    
    def test_create_template_from_campaign_not_found(self):
        """Test creating template from non-existent campaign"""
        url = reverse('sms_sender:create_template_from_campaign')
        data = {
            'campaign_id': 99999,
            'template_name': 'Invalid Template'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_create_template_from_campaign_missing_data(self):
        """Test creating template from campaign with missing data"""
        url = reverse('sms_sender:create_template_from_campaign')
        data = {'campaign_id': self.campaign.id}  # Missing template_name
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_get_campaign_template_suggestions(self):
        """Test getting template suggestions for a campaign"""
        url = reverse('sms_sender:campaign_template_suggestions', kwargs={'campaign_id': self.campaign.id})
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('suggestions', response.data)
        self.assertEqual(response.data['campaign_id'], self.campaign.id)
    
    def test_get_campaign_template_suggestions_not_found(self):
        """Test getting template suggestions for non-existent campaign"""
        url = reverse('sms_sender:campaign_template_suggestions', kwargs={'campaign_id': 99999})
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_bulk_template_operations_delete(self):
        """Test bulk delete operation"""
        url = reverse('sms_sender:bulk_template_operations')
        data = {
            'operation': 'delete',
            'template_ids': [f"db_{self.user_template.id}"]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success_count'], 1)
        self.assertEqual(response.data['error_count'], 0)
        
        # Check that template was deleted
        self.assertFalse(CampaignTemplate.objects.filter(id=self.user_template.id).exists())
    
    def test_bulk_template_operations_make_public(self):
        """Test bulk make public operation"""
        url = reverse('sms_sender:bulk_template_operations')
        data = {
            'operation': 'make_public',
            'template_ids': [f"db_{self.user_template.id}"]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success_count'], 1)
        
        # Check that template is now public
        self.user_template.refresh_from_db()
        self.assertTrue(self.user_template.is_public)
    
    def test_bulk_template_operations_invalid_operation(self):
        """Test bulk operation with invalid operation"""
        url = reverse('sms_sender:bulk_template_operations')
        data = {
            'operation': 'invalid_operation',
            'template_ids': [f"db_{self.user_template.id}"]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success_count'], 0)
        self.assertEqual(response.data['error_count'], 1)
    
    def test_bulk_template_operations_missing_data(self):
        """Test bulk operation with missing data"""
        url = reverse('sms_sender:bulk_template_operations')
        data = {'operation': 'delete'}  # Missing template_ids
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_unauthenticated_access(self):
        """Test that unauthenticated users cannot access template API"""
        self.client.force_authenticate(user=None)
        
        url = reverse('sms_sender:campaign-templates-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
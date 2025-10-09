"""
Tests for Campaign Template Service
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from unittest.mock import patch, MagicMock

from .models import CampaignTemplate, SMSCampaign, SMSMessage
from .template_service import CampaignTemplateService

User = get_user_model()


class CampaignTemplateServiceTest(TestCase):
    """Test cases for CampaignTemplateService"""
    
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
        
        self.service = CampaignTemplateService(self.user)
        
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
        
        self.private_template = CampaignTemplate.objects.create(
            user=self.other_user,
            name='Private Template',
            description='Private template from other user',
            category='alerts',
            settings={
                'message_template': 'Alert: @MESSAGE',
                'suggested_macros': ['MESSAGE'],
                'use_case': 'Alert messages'
            },
            is_public=False
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
        
        # Create test messages
        for i in range(10):
            SMSMessage.objects.create(
                campaign=self.campaign,
                phone_number=f'555000{i:04d}',
                message_content=f'Test message {i}',
                delivery_status='delivered' if i < 8 else 'failed'
            )
    
    def test_get_available_templates_user_only(self):
        """Test getting templates for user only"""
        templates = self.service.get_available_templates(include_public=False)
        
        # Should only include user's own templates
        template_names = [t['name'] for t in templates]
        self.assertIn('User Template', template_names)
        self.assertNotIn('Public Template', template_names)
        self.assertNotIn('Private Template', template_names)
    
    def test_get_available_templates_with_public(self):
        """Test getting templates including public ones"""
        templates = self.service.get_available_templates(include_public=True)
        
        template_names = [t['name'] for t in templates]
        self.assertIn('User Template', template_names)
        self.assertIn('Public Template', template_names)
        self.assertNotIn('Private Template', template_names)  # Private should not be included
    
    def test_get_available_templates_by_category(self):
        """Test filtering templates by category"""
        templates = self.service.get_available_templates(category='marketing')
        
        # Should only include marketing templates
        for template in templates:
            if template['source'] == 'database':
                self.assertEqual(template['category'], 'marketing')
    
    def test_get_template_by_id_database(self):
        """Test getting database template by ID"""
        template_id = f"db_{self.user_template.id}"
        template = self.service.get_template_by_id(template_id)
        
        self.assertIsNotNone(template)
        self.assertEqual(template['name'], 'User Template')
        self.assertEqual(template['source'], 'database')
        self.assertTrue(template['is_owner'])
    
    def test_get_template_by_id_builtin(self):
        """Test getting built-in template by ID"""
        template = self.service.get_template_by_id('flash_sale')
        
        self.assertIsNotNone(template)
        self.assertEqual(template['name'], 'Flash Sale Alert')
        self.assertEqual(template['source'], 'builtin')
        self.assertFalse(template['is_owner'])
    
    def test_get_template_by_id_not_found(self):
        """Test getting non-existent template"""
        template = self.service.get_template_by_id('nonexistent')
        self.assertIsNone(template)
    
    def test_create_template_success(self):
        """Test creating a new template"""
        settings = {
            'message_template': 'New template @MACRO',
            'suggested_macros': ['MACRO'],
            'use_case': 'Test use case'
        }
        
        template = self.service.create_template(
            name='New Template',
            description='Test description',
            category='custom',
            settings=settings
        )
        
        self.assertEqual(template.name, 'New Template')
        self.assertEqual(template.user, self.user)
        self.assertEqual(template.category, 'custom')
        self.assertEqual(template.settings, settings)
        self.assertFalse(template.is_public)
    
    def test_create_template_invalid_category(self):
        """Test creating template with invalid category"""
        settings = {
            'message_template': 'Test message',
            'suggested_macros': [],
            'use_case': 'Test'
        }
        
        with self.assertRaises(ValidationError):
            self.service.create_template(
                name='Invalid Template',
                description='Test',
                category='invalid_category',
                settings=settings
            )
    
    def test_create_template_missing_message_template(self):
        """Test creating template without message_template"""
        settings = {
            'suggested_macros': [],
            'use_case': 'Test'
        }
        
        with self.assertRaises(ValidationError):
            self.service.create_template(
                name='Invalid Template',
                description='Test',
                category='custom',
                settings=settings
            )
    
    def test_create_template_from_campaign_success(self):
        """Test creating template from successful campaign"""
        template = self.service.create_template_from_campaign(
            campaign_id=self.campaign.id,
            template_name='Campaign Template',
            template_description='Template from campaign'
        )
        
        self.assertEqual(template.name, 'Campaign Template')
        self.assertEqual(template.user, self.user)
        self.assertEqual(template.settings['message_template'], self.campaign.message_template)
        self.assertIsNotNone(template.average_success_rate)
    
    def test_create_template_from_campaign_not_found(self):
        """Test creating template from non-existent campaign"""
        with self.assertRaises(ValidationError):
            self.service.create_template_from_campaign(
                campaign_id=99999,
                template_name='Invalid Template'
            )
    
    def test_create_template_from_campaign_not_completed(self):
        """Test creating template from non-completed campaign"""
        incomplete_campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Incomplete Campaign',
            message_template='Test message',
            status='draft'
        )
        
        with self.assertRaises(ValidationError):
            self.service.create_template_from_campaign(
                campaign_id=incomplete_campaign.id,
                template_name='Invalid Template'
            )
    
    def test_create_template_from_campaign_low_success_rate(self):
        """Test creating template from campaign with low success rate"""
        # Create campaign with low success rate
        low_success_campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Low Success Campaign',
            message_template='Test message',
            status='completed',
            total_recipients=100,
            messages_sent=100,
            messages_delivered=30,  # Only 30% success rate
            messages_failed=70
        )
        
        with self.assertRaises(ValidationError):
            self.service.create_template_from_campaign(
                campaign_id=low_success_campaign.id,
                template_name='Low Success Template'
            )
    
    def test_update_template_success(self):
        """Test updating a template"""
        template_id = f"db_{self.user_template.id}"
        
        updated_template = self.service.update_template(
            template_id,
            name='Updated Template',
            description='Updated description'
        )
        
        self.assertEqual(updated_template.name, 'Updated Template')
        self.assertEqual(updated_template.description, 'Updated description')
    
    def test_update_template_not_owner(self):
        """Test updating template not owned by user"""
        template_id = f"db_{self.public_template.id}"
        
        with self.assertRaises(ValidationError):
            self.service.update_template(template_id, name='Hacked Template')
    
    def test_update_template_builtin(self):
        """Test updating built-in template (should fail)"""
        with self.assertRaises(ValidationError):
            self.service.update_template('flash_sale', name='Hacked Template')
    
    def test_delete_template_success(self):
        """Test deleting a template"""
        template_id = f"db_{self.user_template.id}"
        
        result = self.service.delete_template(template_id)
        
        self.assertTrue(result)
        self.assertFalse(CampaignTemplate.objects.filter(id=self.user_template.id).exists())
    
    def test_delete_template_not_owner(self):
        """Test deleting template not owned by user"""
        template_id = f"db_{self.public_template.id}"
        
        with self.assertRaises(ValidationError):
            self.service.delete_template(template_id)
    
    def test_use_template_database(self):
        """Test using a database template"""
        template_id = f"db_{self.user_template.id}"
        campaign_data = {'name': 'Test Campaign'}
        
        config = self.service.use_template(template_id, campaign_data)
        
        self.assertEqual(config['message_template'], self.user_template.settings['message_template'])
        self.assertEqual(config['name'], 'Test Campaign')
    
    def test_use_template_builtin(self):
        """Test using a built-in template"""
        config = self.service.use_template('flash_sale', {'name': 'Flash Sale Campaign'})
        
        self.assertIn('message_template', config)
        self.assertEqual(config['name'], 'Flash Sale Campaign')
    
    def test_use_template_increments_usage(self):
        """Test that using a template increments usage count"""
        template_id = f"db_{self.user_template.id}"
        initial_usage = self.user_template.usage_count
        
        self.service.use_template(template_id, {})
        
        self.user_template.refresh_from_db()
        self.assertEqual(self.user_template.usage_count, initial_usage + 1)
    
    def test_get_template_performance_stats(self):
        """Test getting template performance statistics"""
        template_id = f"db_{self.user_template.id}"
        
        stats = self.service.get_template_performance_stats(template_id)
        
        self.assertIn('usage_count', stats)
        self.assertIn('average_success_rate', stats)
        self.assertIn('campaigns_created', stats)
    
    def test_get_public_template_library(self):
        """Test getting public template library"""
        templates = self.service.get_public_template_library()
        
        template_names = [t['name'] for t in templates]
        self.assertIn('Public Template', template_names)
        self.assertNotIn('Private Template', template_names)
    
    def test_share_template_make_public(self):
        """Test sharing a template by making it public"""
        template_id = f"db_{self.user_template.id}"
        
        template = self.service.share_template(template_id, True)
        
        self.assertTrue(template.is_public)
    
    def test_share_template_make_private(self):
        """Test making a public template private"""
        # First make it public
        self.user_template.is_public = True
        self.user_template.save()
        
        template_id = f"db_{self.user_template.id}"
        template = self.service.share_template(template_id, False)
        
        self.assertFalse(template.is_public)
    
    def test_share_template_not_owner(self):
        """Test sharing template not owned by user"""
        template_id = f"db_{self.public_template.id}"
        
        with self.assertRaises(ValidationError):
            self.service.share_template(template_id, True)
    
    def test_calculate_campaign_success_rate(self):
        """Test calculating campaign success rate"""
        success_rate = self.service._calculate_campaign_success_rate(self.campaign)
        
        # 8 out of 10 messages delivered = 80%
        self.assertEqual(success_rate, 80.0)
    
    def test_determine_template_category_marketing(self):
        """Test determining template category for marketing"""
        marketing_campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Marketing Campaign',
            message_template='Flash sale! 50% discount on all items!',
            status='completed'
        )
        
        category = self.service._determine_template_category(marketing_campaign)
        self.assertEqual(category, 'marketing')
    
    def test_determine_template_category_alerts(self):
        """Test determining template category for alerts"""
        alert_campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Alert Campaign',
            message_template='Urgent: Your account requires immediate attention',
            status='completed'
        )
        
        category = self.service._determine_template_category(alert_campaign)
        self.assertEqual(category, 'alerts')
    
    def test_determine_template_category_notifications(self):
        """Test determining template category for notifications"""
        notification_campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Notification Campaign',
            message_template='Thank you for your order confirmation',
            status='completed'
        )
        
        category = self.service._determine_template_category(notification_campaign)
        self.assertEqual(category, 'notifications')
    
    def test_determine_template_category_custom(self):
        """Test determining template category defaults to custom"""
        custom_campaign = SMSCampaign.objects.create(
            user=self.user,
            name='Custom Campaign',
            message_template='This is a custom message without keywords',
            status='completed'
        )
        
        category = self.service._determine_template_category(custom_campaign)
        self.assertEqual(category, 'custom')


class CampaignTemplateModelTest(TestCase):
    """Test cases for CampaignTemplate model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.template = CampaignTemplate.objects.create(
            user=self.user,
            name='Test Template',
            description='Test description',
            category='marketing',
            settings={
                'message_template': 'Test message @NAME',
                'suggested_macros': ['NAME']
            }
        )
    
    def test_template_str_representation(self):
        """Test template string representation"""
        expected = 'Test Template (marketing)'
        self.assertEqual(str(self.template), expected)
    
    def test_increment_usage(self):
        """Test incrementing template usage count"""
        initial_count = self.template.usage_count
        
        self.template.increment_usage()
        
        self.assertEqual(self.template.usage_count, initial_count + 1)
    
    def test_update_success_rate_first_time(self):
        """Test updating success rate for the first time"""
        self.template.update_success_rate(85.5)
        
        self.assertEqual(self.template.average_success_rate, 85.5)
    
    def test_update_success_rate_weighted_average(self):
        """Test updating success rate with weighted average"""
        self.template.average_success_rate = 80.0
        self.template.save()
        
        self.template.update_success_rate(90.0)
        
        # Should be average of 80.0 and 90.0 = 85.0
        self.assertEqual(self.template.average_success_rate, 85.0)
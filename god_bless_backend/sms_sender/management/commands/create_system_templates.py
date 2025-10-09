"""
Management command to create system templates
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from sms_sender.models import CampaignTemplate

User = get_user_model()


class Command(BaseCommand):
    help = 'Create system-provided campaign templates'
    
    def handle(self, *args, **options):
        # Get or create a system user for templates
        system_user, created = User.objects.get_or_create(
            username='system_templates',
            defaults={
                'email': 'system@templates.local',
                'is_active': False,  # System user should not be able to login
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS('Created system user for templates')
            )
        
        # Define system templates
        system_templates = [
            {
                'name': 'Flash Sale Alert',
                'description': 'High-converting flash sale template with urgency and clear CTA',
                'category': 'marketing',
                'settings': {
                    'message_template': '🔥 FLASH SALE! @DISCOUNT% OFF @PRODUCT! Use code @CODE at checkout. Valid until @TIME today. Shop now: @LINK',
                    'suggested_macros': ['DISCOUNT', 'PRODUCT', 'CODE', 'TIME', 'LINK'],
                    'use_case': 'E-commerce flash sales and limited-time offers',
                    'campaign_settings': {
                        'batch_size': 200,
                        'rate_limit': 15,
                        'use_proxy_rotation': True,
                        'use_smtp_rotation': True
                    }
                }
            },
            {
                'name': 'Order Confirmation',
                'description': 'Professional order confirmation with tracking information',
                'category': 'notifications',
                'settings': {
                    'message_template': 'Thank you @FIRSTNAME! Your order #@ORDERID has been confirmed. Total: $@AMOUNT. Track your order: @LINK',
                    'suggested_macros': ['FIRSTNAME', 'ORDERID', 'AMOUNT', 'LINK'],
                    'use_case': 'E-commerce order confirmations',
                    'campaign_settings': {
                        'batch_size': 500,
                        'rate_limit': 25,
                        'use_proxy_rotation': True,
                        'use_smtp_rotation': True
                    }
                }
            },
            {
                'name': 'Appointment Reminder',
                'description': 'Professional appointment reminder with confirmation option',
                'category': 'alerts',
                'settings': {
                    'message_template': 'Reminder: You have an appointment with @BUSINESS on @DATE at @TIME. Location: @ADDRESS. Reply C to confirm.',
                    'suggested_macros': ['BUSINESS', 'DATE', 'TIME', 'ADDRESS'],
                    'use_case': 'Appointment reminders for service businesses',
                    'campaign_settings': {
                        'batch_size': 100,
                        'rate_limit': 10,
                        'use_proxy_rotation': True,
                        'use_smtp_rotation': True
                    }
                }
            },
            {
                'name': 'Verification Code',
                'description': 'Secure verification code template for 2FA',
                'category': 'alerts',
                'settings': {
                    'message_template': 'Your @COMPANY verification code is: @CODE. Valid for @MINUTES minutes. Do not share this code.',
                    'suggested_macros': ['COMPANY', 'CODE', 'MINUTES'],
                    'use_case': 'Two-factor authentication and account verification',
                    'campaign_settings': {
                        'batch_size': 1000,
                        'rate_limit': 50,
                        'use_proxy_rotation': True,
                        'use_smtp_rotation': True
                    }
                }
            },
            {
                'name': 'Cart Abandonment Recovery',
                'description': 'Effective cart abandonment template with incentive',
                'category': 'marketing',
                'settings': {
                    'message_template': 'You left @ITEMS in your cart! Complete your order now and save @DISCOUNT%. @LINK',
                    'suggested_macros': ['ITEMS', 'DISCOUNT', 'LINK'],
                    'use_case': 'E-commerce cart recovery campaigns',
                    'campaign_settings': {
                        'batch_size': 150,
                        'rate_limit': 12,
                        'use_proxy_rotation': True,
                        'use_smtp_rotation': True
                    }
                }
            },
            {
                'name': 'Event Reminder',
                'description': 'Event reminder with ticket information',
                'category': 'notifications',
                'settings': {
                    'message_template': '🎫 @EVENT is tomorrow! @DATE at @TIME. Location: @VENUE. Your ticket: @TICKET. See you there!',
                    'suggested_macros': ['EVENT', 'DATE', 'TIME', 'VENUE', 'TICKET'],
                    'use_case': 'Event reminders and ticket confirmations',
                    'campaign_settings': {
                        'batch_size': 300,
                        'rate_limit': 20,
                        'use_proxy_rotation': True,
                        'use_smtp_rotation': True
                    }
                }
            },
            {
                'name': 'Shipping Notification',
                'description': 'Shipping update with tracking information',
                'category': 'notifications',
                'settings': {
                    'message_template': '📦 Your order #@ORDERID has shipped! Track: @TRACKINGURL. Expected delivery: @DELIVERYDATE',
                    'suggested_macros': ['ORDERID', 'TRACKINGURL', 'DELIVERYDATE'],
                    'use_case': 'Shipping and delivery notifications',
                    'campaign_settings': {
                        'batch_size': 400,
                        'rate_limit': 30,
                        'use_proxy_rotation': True,
                        'use_smtp_rotation': True
                    }
                }
            },
            {
                'name': 'Loyalty Reward',
                'description': 'Loyalty program reward notification',
                'category': 'marketing',
                'settings': {
                    'message_template': '🎁 @FIRSTNAME, you\'ve earned @POINTS points! Redeem for @REWARD. Check your rewards: @LINK',
                    'suggested_macros': ['FIRSTNAME', 'POINTS', 'REWARD', 'LINK'],
                    'use_case': 'Loyalty programs and customer rewards',
                    'campaign_settings': {
                        'batch_size': 250,
                        'rate_limit': 18,
                        'use_proxy_rotation': True,
                        'use_smtp_rotation': True
                    }
                }
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for template_data in system_templates:
            template, created = CampaignTemplate.objects.get_or_create(
                name=template_data['name'],
                user=system_user,
                defaults={
                    'description': template_data['description'],
                    'category': template_data['category'],
                    'settings': template_data['settings'],
                    'is_public': True,
                    'is_system_template': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created system template: {template.name}')
                )
            else:
                # Update existing template
                template.description = template_data['description']
                template.category = template_data['category']
                template.settings = template_data['settings']
                template.is_public = True
                template.is_system_template = True
                template.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated system template: {template.name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'System templates setup complete: {created_count} created, {updated_count} updated'
            )
        )
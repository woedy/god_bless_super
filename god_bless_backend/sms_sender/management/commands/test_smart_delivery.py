"""
Management command to test smart delivery engine functionality
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from sms_sender.models import SMSCampaign, CampaignDeliverySettings
from sms_sender.smart_delivery_engine import SmartDeliveryEngine
from sms_sender.rotation_manager import RotationManager

User = get_user_model()


class Command(BaseCommand):
    help = 'Test smart delivery engine functionality'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='User ID to test with',
            required=True
        )
        parser.add_argument(
            '--phone-number',
            type=str,
            default='+1234567890',
            help='Phone number to test carrier detection'
        )
        parser.add_argument(
            '--create-test-campaign',
            action='store_true',
            help='Create a test campaign for testing'
        )
    
    def handle(self, *args, **options):
        user_id = options['user_id']
        phone_number = options['phone_number']
        create_campaign = options['create_test_campaign']
        
        try:
            user = User.objects.get(id=user_id)
            self.stdout.write(f"Testing smart delivery engine for user: {user.username}")
            
            # Get or create a test campaign
            if create_campaign:
                campaign = SMSCampaign.objects.create(
                    user=user,
                    name="Smart Delivery Test Campaign",
                    description="Test campaign for smart delivery engine",
                    message_template="Test message for smart delivery optimization",
                    rate_limit=10
                )
                self.stdout.write(f"Created test campaign: {campaign.name}")
            else:
                campaign = SMSCampaign.objects.filter(user=user).first()
                if not campaign:
                    self.stdout.write(
                        self.style.ERROR("No campaigns found. Use --create-test-campaign to create one.")
                    )
                    return
            
            # Initialize smart delivery engine
            engine = SmartDeliveryEngine(user, campaign)
            rotation_manager = RotationManager(user, campaign)
            
            self.stdout.write("\n=== Testing Carrier Detection ===")
            carrier = engine.detect_carrier_from_phone(phone_number)
            timezone_name = engine.get_timezone_from_phone(phone_number)
            self.stdout.write(f"Phone: {phone_number}")
            self.stdout.write(f"Detected Carrier: {carrier}")
            self.stdout.write(f"Detected Timezone: {timezone_name}")
            
            self.stdout.write("\n=== Testing Optimal Send Time ===")
            optimal_time = engine.predict_optimal_send_time(phone_number)
            self.stdout.write(f"Current Time: {timezone.now()}")
            self.stdout.write(f"Optimal Send Time: {optimal_time}")
            
            self.stdout.write("\n=== Testing Adaptive Rate Limiting ===")
            base_rate = campaign.rate_limit
            adaptive_rate = engine.calculate_adaptive_rate_limit(carrier)
            self.stdout.write(f"Base Rate Limit: {base_rate} messages/minute")
            self.stdout.write(f"Adaptive Rate Limit for {carrier}: {adaptive_rate} messages/minute")
            
            self.stdout.write("\n=== Testing Server Optimization ===")
            proxy, smtp = engine.get_optimal_server_combination(carrier, phone_number)
            if proxy and smtp:
                self.stdout.write(f"Optimal Proxy: {proxy.host}:{proxy.port} (Success Rate: {proxy.success_rate}%)")
                self.stdout.write(f"Optimal SMTP: {smtp.host}:{smtp.port} (Success Rate: {smtp.success_rate}%)")
            else:
                self.stdout.write("No optimal server combination found")
            
            self.stdout.write("\n=== Testing Delivery Analytics ===")
            analytics = engine.analyze_delivery_patterns()
            self.stdout.write(f"Total Messages: {analytics['total_messages']}")
            self.stdout.write(f"Carrier Breakdown: {len(analytics['carrier_breakdown'])} carriers")
            self.stdout.write(f"Timezone Breakdown: {len(analytics['timezone_breakdown'])} timezones")
            
            if analytics['performance_insights']:
                self.stdout.write("\nPerformance Insights:")
                for insight in analytics['performance_insights']:
                    self.stdout.write(f"  - {insight}")
            
            self.stdout.write("\n=== Testing Delivery Recommendations ===")
            recommendations = engine.get_delivery_recommendations()
            if recommendations:
                self.stdout.write(f"Found {len(recommendations)} recommendations:")
                for rec in recommendations:
                    self.stdout.write(f"  [{rec['type'].upper()}] {rec['title']}: {rec['message']}")
            else:
                self.stdout.write("No recommendations available")
            
            self.stdout.write("\n=== Testing Rotation Manager Integration ===")
            rotation_stats = rotation_manager.get_rotation_stats()
            self.stdout.write(f"Campaign: {rotation_stats['campaign_name']}")
            self.stdout.write(f"Proxy Rotation Enabled: {rotation_stats['delivery_settings']['use_proxy_rotation']}")
            self.stdout.write(f"SMTP Rotation Enabled: {rotation_stats['delivery_settings']['use_smtp_rotation']}")
            self.stdout.write(f"Carrier Optimization: {rotation_stats['delivery_settings']['carrier_optimization_enabled']}")
            self.stdout.write(f"Adaptive Optimization: {rotation_stats['delivery_settings']['adaptive_optimization_enabled']}")
            
            self.stdout.write(
                self.style.SUCCESS("\n✅ Smart delivery engine test completed successfully!")
            )
            
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"User with ID {user_id} not found")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error during testing: {str(e)}")
            )
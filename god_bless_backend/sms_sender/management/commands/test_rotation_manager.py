"""
Django management command to test RotationManager functionality
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from sms_sender.models import SMSCampaign
from sms_sender.rotation_manager import RotationManager
from proxy_server.models import ProxyServer
from smtps.models import SmtpManager

User = get_user_model()


class Command(BaseCommand):
    help = 'Test RotationManager functionality in Django environment'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-test-data',
            action='store_true',
            help='Create test data for testing',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Testing RotationManager in Django environment'))
        
        if options['create_test_data']:
            self.create_test_data()
        
        self.test_rotation_manager()

    def create_test_data(self):
        """Create test data for RotationManager testing"""
        self.stdout.write('Creating test data...')
        
        # Create test user
        user, created = User.objects.get_or_create(
            username='rotation_test_user',
            defaults={
                'email': 'rotation_test@example.com'
            }
        )
        
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write(f'✓ Created test user: {user.username}')
        else:
            self.stdout.write(f'✓ Using existing test user: {user.username}')
        
        # Create test proxy server
        proxy, created = ProxyServer.objects.get_or_create(
            user=user,
            host='127.0.0.1',
            port=8080,
            defaults={
                'protocol': 'http',
                'is_active': True,
                'is_healthy': True
            }
        )
        
        if created:
            self.stdout.write(f'✓ Created test proxy: {proxy}')
        else:
            self.stdout.write(f'✓ Using existing test proxy: {proxy}')
        
        # Create test SMTP server
        smtp, created = SmtpManager.objects.get_or_create(
            user=user,
            host='smtp.test.com',
            port=587,
            defaults={
                'username': 'test@test.com',
                'password': 'testpass',
                'active': True,
                'is_healthy': True
            }
        )
        
        if created:
            self.stdout.write(f'✓ Created test SMTP: {smtp}')
        else:
            self.stdout.write(f'✓ Using existing test SMTP: {smtp}')
        
        # Create test campaign
        campaign, created = SMSCampaign.objects.get_or_create(
            user=user,
            name='RotationManager Test Campaign',
            defaults={
                'message_template': 'Test message for rotation manager',
                'status': 'draft'
            }
        )
        
        if created:
            self.stdout.write(f'✓ Created test campaign: {campaign.name}')
        else:
            self.stdout.write(f'✓ Using existing test campaign: {campaign.name}')
        
        return user, campaign

    def test_rotation_manager(self):
        """Test RotationManager functionality"""
        self.stdout.write('\nTesting RotationManager functionality...')
        
        # Get or create test data
        user = User.objects.filter(username='rotation_test_user').first()
        if not user:
            self.stdout.write(self.style.WARNING('No test user found. Run with --create-test-data'))
            return
        
        campaign = SMSCampaign.objects.filter(user=user, name='RotationManager Test Campaign').first()
        if not campaign:
            self.stdout.write(self.style.WARNING('No test campaign found. Run with --create-test-data'))
            return
        
        try:
            # Test RotationManager instantiation
            with RotationManager(user, campaign) as manager:
                self.stdout.write('✓ RotationManager instantiated successfully')
                
                # Test proxy selection
                proxy = manager.get_next_proxy()
                if proxy:
                    self.stdout.write(f'✓ Proxy selection: {proxy}')
                else:
                    self.stdout.write('! No proxy selected (may be disabled or no healthy proxies)')
                
                # Test SMTP selection
                smtp = manager.get_next_smtp()
                if smtp:
                    self.stdout.write(f'✓ SMTP selection: {smtp}')
                else:
                    self.stdout.write('! No SMTP selected (may be disabled or no healthy SMTPs)')
                
                # Test delay application
                delay = manager.apply_delivery_delay()
                self.stdout.write(f'✓ Delay applied: {delay:.3f}s')
                
                # Test optimal server combination
                opt_proxy, opt_smtp = manager.get_optimal_server_combination()
                self.stdout.write(f'✓ Optimal combination: Proxy={opt_proxy}, SMTP={opt_smtp}')
                
                # Test success recording
                if proxy:
                    manager.record_success('proxy', proxy.id, 0.5)
                    self.stdout.write('✓ Proxy success recorded')
                
                if smtp:
                    manager.record_success('smtp', smtp.id, 1.2)
                    self.stdout.write('✓ SMTP success recorded')
                
                # Test failure recording
                if proxy:
                    manager.record_failure('proxy', proxy.id, 'Test error')
                    self.stdout.write('✓ Proxy failure recorded')
                
                # Test stats retrieval
                stats = manager.get_rotation_stats()
                self.stdout.write(f'✓ Stats retrieved: {len(stats)} keys')
                
                # Display some key stats
                campaign_stats = stats.get('campaign_stats', {})
                self.stdout.write(f'  - Messages processed: {campaign_stats.get("total_messages_processed", 0)}')
                self.stdout.write(f'  - Success rate: {campaign_stats.get("success_rate", 0)}%')
                
                # Test health check
                health = manager.health_check_all_servers()
                summary = health.get('summary', {})
                self.stdout.write(f'✓ Health check completed:')
                self.stdout.write(f'  - Healthy proxies: {summary.get("healthy_proxy_servers", 0)}/{summary.get("total_proxy_servers", 0)}')
                self.stdout.write(f'  - Healthy SMTPs: {summary.get("healthy_smtp_servers", 0)}/{summary.get("total_smtp_servers", 0)}')
            
            self.stdout.write(self.style.SUCCESS('\n✓ All RotationManager tests completed successfully!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n✗ RotationManager test failed: {e}'))
            import traceback
            self.stdout.write(traceback.format_exc())
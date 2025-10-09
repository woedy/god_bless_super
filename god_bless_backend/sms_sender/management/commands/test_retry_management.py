"""
Management command to test the retry management system.

This command creates test scenarios to verify that the retry management
system works correctly with different error types and configurations.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from sms_sender.models import SMSCampaign, SMSMessage, RetryAttempt
from sms_sender.retry_service import RetryManagementService
from smtps.models import SmtpManager

User = get_user_model()


class Command(BaseCommand):
    help = 'Test the retry management system'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='User ID to use for testing (will use first user if not specified)'
        )
        
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Clean up test data after running tests'
        )
    
    def handle(self, *args, **options):
        user_id = options.get('user_id')
        cleanup = options['cleanup']
        
        # Get test user
        if user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'User with ID {user_id} not found')
                )
                return
        else:
            user = User.objects.first()
            if not user:
                self.stdout.write(
                    self.style.ERROR('No users found in database')
                )
                return
        
        self.stdout.write(f'Testing retry management for user: {user.username}')
        
        # Create test campaign
        campaign = SMSCampaign.objects.create(
            user=user,
            name='Retry Management Test Campaign',
            description='Test campaign for retry management system',
            message_template='Test message for retry management',
            status='in_progress'
        )
        
        self.stdout.write(f'Created test campaign: {campaign.name}')
        
        # Test scenarios
        test_scenarios = [
            {
                'phone': '1234567890',
                'carrier': 'AT&T',
                'error': 'connection timeout',
                'expected_retry': True,
                'expected_error_type': 'temporary'
            },
            {
                'phone': '1234567891',
                'carrier': 'Verizon',
                'error': 'authentication failed',
                'expected_retry': True,
                'expected_error_type': 'auth'
            },
            {
                'phone': '1234567892',
                'carrier': 'T-Mobile',
                'error': 'invalid recipient',
                'expected_retry': False,
                'expected_error_type': 'permanent'
            },
            {
                'phone': '1234567893',
                'carrier': 'Sprint',
                'error': 'rate limit exceeded',
                'expected_retry': True,
                'expected_error_type': 'temporary'
            },
            {
                'phone': '1234567894',
                'carrier': 'AT&T',
                'error': 'internal server error',
                'expected_retry': True,
                'expected_error_type': 'server'
            }
        ]
        
        # Create test messages and test retry logic
        retry_service = RetryManagementService(campaign)
        
        for i, scenario in enumerate(test_scenarios, 1):
            self.stdout.write(f'\n--- Test Scenario {i} ---')
            self.stdout.write(f'Phone: {scenario["phone"]}')
            self.stdout.write(f'Carrier: {scenario["carrier"]}')
            self.stdout.write(f'Error: {scenario["error"]}')
            
            # Create test message
            message = SMSMessage.objects.create(
                campaign=campaign,
                phone_number=scenario['phone'],
                message_content='Test message',
                carrier=scenario['carrier'],
                delivery_status='failed',
                error_message=scenario['error']
            )
            
            # Test error classification
            error_type = retry_service._classify_error(scenario['error'].lower())
            self.stdout.write(f'Classified error type: {error_type}')
            
            if error_type == scenario['expected_error_type']:
                self.stdout.write(
                    self.style.SUCCESS('✓ Error classification correct')
                )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f'✗ Error classification incorrect. '
                        f'Expected: {scenario["expected_error_type"]}, '
                        f'Got: {error_type}'
                    )
                )
            
            # Test retry decision
            should_retry = retry_service.should_retry(message, scenario['error'])
            self.stdout.write(f'Should retry: {should_retry}')
            
            if should_retry == scenario['expected_retry']:
                self.stdout.write(
                    self.style.SUCCESS('✓ Retry decision correct')
                )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f'✗ Retry decision incorrect. '
                        f'Expected: {scenario["expected_retry"]}, '
                        f'Got: {should_retry}'
                    )
                )
            
            # Test retry delay calculation
            if should_retry:
                delay = retry_service.calculate_retry_delay(message, scenario['error'])
                self.stdout.write(f'Calculated retry delay: {delay} seconds')
                
                # Test retry scheduling
                scheduled = retry_service.schedule_retry(
                    message, scenario['error'], error_type
                )
                
                if scheduled:
                    self.stdout.write(
                        self.style.SUCCESS('✓ Retry scheduled successfully')
                    )
                    
                    # Verify retry attempt was created
                    retry_attempt = message.retry_attempts.first()
                    if retry_attempt:
                        self.stdout.write(
                            f'  Attempt number: {retry_attempt.attempt_number}'
                        )
                        self.stdout.write(
                            f'  Scheduled time: {retry_attempt.scheduled_retry_time}'
                        )
                        self.stdout.write(
                            f'  Error type: {retry_attempt.error_type}'
                        )
                    else:
                        self.stdout.write(
                            self.style.ERROR('✗ Retry attempt not created')
                        )
                else:
                    self.stdout.write(
                        self.style.ERROR('✗ Failed to schedule retry')
                    )
        
        # Test retry statistics
        self.stdout.write('\n--- Retry Statistics ---')
        stats = retry_service.get_retry_stats()
        
        self.stdout.write(f'Messages with retries: {stats["messages_with_retries"]}')
        self.stdout.write(f'Total retry attempts: {stats["total_retry_attempts"]}')
        self.stdout.write(f'Pending retries: {stats["pending_retries"]}')
        self.stdout.write(f'Retry by error type: {stats["retry_by_error_type"]}')
        
        # Test global statistics
        self.stdout.write('\n--- Global Statistics ---')
        global_stats = RetryManagementService.get_global_retry_stats(user)
        
        self.stdout.write(f'Total messages: {global_stats["total_messages"]}')
        self.stdout.write(f'Messages with retries: {global_stats["messages_with_retries"]}')
        self.stdout.write(f'Retry rate: {global_stats["retry_rate"]}%')
        
        # Test carrier-specific configuration
        self.stdout.write('\n--- Carrier Configuration Test ---')
        for carrier in ['AT&T', 'Verizon', 'T-Mobile', 'Sprint', 'Unknown']:
            config = retry_service._get_carrier_config(carrier)
            self.stdout.write(f'{carrier}: {config}')
        
        # Cleanup if requested
        if cleanup:
            self.stdout.write('\n--- Cleanup ---')
            
            # Delete retry attempts
            retry_count = RetryAttempt.objects.filter(
                message__campaign=campaign
            ).count()
            RetryAttempt.objects.filter(message__campaign=campaign).delete()
            
            # Delete messages
            message_count = campaign.messages.count()
            campaign.messages.all().delete()
            
            # Delete campaign
            campaign.delete()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Cleaned up: {retry_count} retry attempts, '
                    f'{message_count} messages, 1 campaign'
                )
            )
        else:
            self.stdout.write(
                f'\nTest campaign ID: {campaign.id} '
                '(use --cleanup to remove test data)'
            )
        
        self.stdout.write(
            self.style.SUCCESS('\nRetry management system test completed!')
        )
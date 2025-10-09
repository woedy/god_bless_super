"""
Management command to check SMTP server health for all users
Can be run periodically via cron or Celery beat
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from smtps.rotation_service import SMTPRotationService
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Check SMTP server health for all users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=int,
            help='Check health for specific user ID only',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose output',
        )

    def handle(self, *args, **options):
        user_id = options.get('user_id')
        verbose = options.get('verbose')
        
        if verbose:
            logging.basicConfig(level=logging.INFO)
        
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                users = [user]
                self.stdout.write(f"Checking SMTP health for user: {user.username}")
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'User with ID {user_id} does not exist')
                )
                return
        else:
            users = User.objects.filter(is_active=True)
            self.stdout.write(f"Checking SMTP health for {users.count()} active users")
        
        total_servers = 0
        healthy_servers = 0
        
        for user in users:
            rotation_service = SMTPRotationService(user)
            results = rotation_service.check_all_smtp_health()
            
            user_healthy = sum(1 for r in results if r['is_healthy'])
            user_total = len(results)
            
            total_servers += user_total
            healthy_servers += user_healthy
            
            if verbose or user_id:
                self.stdout.write(
                    f"User {user.username}: {user_healthy}/{user_total} servers healthy"
                )
                
                for result in results:
                    status = "✓" if result['is_healthy'] else "✗"
                    self.stdout.write(f"  {status} {result['smtp']}")
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Health check completed: {healthy_servers}/{total_servers} servers healthy"
            )
        )
        
        if total_servers > 0:
            health_percentage = (healthy_servers / total_servers) * 100
            if health_percentage < 80:
                self.stdout.write(
                    self.style.WARNING(
                        f"Warning: Only {health_percentage:.1f}% of SMTP servers are healthy"
                    )
                )
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from tasks.utils import TaskManager


class Command(BaseCommand):
    help = 'Clean up old completed tasks'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to keep completed tasks (default: 7)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        self.stdout.write(
            self.style.SUCCESS(f'Cleaning up tasks older than {days} days...')
        )
        
        if dry_run:
            from tasks.models import TaskProgress, TaskStatus
            cutoff_date = timezone.now() - timedelta(days=days)
            count = TaskProgress.objects.filter(
                completed_at__lt=cutoff_date,
                status__in=[TaskStatus.SUCCESS, TaskStatus.FAILURE, TaskStatus.REVOKED]
            ).count()
            
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: Would delete {count} tasks')
            )
        else:
            deleted_count = TaskManager.cleanup_old_tasks(days)
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {deleted_count} old tasks')
            )
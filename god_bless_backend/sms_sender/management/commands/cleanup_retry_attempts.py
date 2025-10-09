"""
Management command to clean up old retry attempts.

This command removes completed retry attempts older than a specified number of days
to keep the database clean while preserving recent data for analysis.
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db import models
from datetime import timedelta
from sms_sender.models import RetryAttempt


class Command(BaseCommand):
    help = 'Clean up old completed retry attempts'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to keep retry attempts (default: 30)'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        
        parser.add_argument(
            '--force',
            action='store_true',
            help='Skip confirmation prompt'
        )
    
    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        force = options['force']
        
        if days < 1:
            raise CommandError('Days must be a positive integer')
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Find old completed retry attempts
        old_attempts = RetryAttempt.objects.filter(
            completed=True,
            completion_time__lt=cutoff_date
        )
        
        count = old_attempts.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'No retry attempts older than {days} days found.'
                )
            )
            return
        
        # Show what will be deleted
        self.stdout.write(
            f'Found {count} completed retry attempts older than {days} days '
            f'(before {cutoff_date.strftime("%Y-%m-%d %H:%M:%S")})'
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN: No data will be deleted.')
            )
            
            # Show breakdown by error type
            error_breakdown = old_attempts.values('error_type').annotate(
                count=models.Count('id')
            ).order_by('-count')
            
            if error_breakdown:
                self.stdout.write('\nBreakdown by error type:')
                for item in error_breakdown:
                    self.stdout.write(f"  {item['error_type']}: {item['count']}")
            
            return
        
        # Confirm deletion unless force is used
        if not force:
            confirm = input(
                f'Are you sure you want to delete {count} retry attempts? '
                'This action cannot be undone. [y/N]: '
            )
            if confirm.lower() not in ['y', 'yes']:
                self.stdout.write('Operation cancelled.')
                return
        
        # Perform deletion
        try:
            deleted_count, _ = old_attempts.delete()
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully deleted {deleted_count} old retry attempts.'
                )
            )
        except Exception as e:
            raise CommandError(f'Error deleting retry attempts: {e}')
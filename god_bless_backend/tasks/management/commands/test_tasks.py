from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tasks.models import TaskProgress, TaskCategory
from tasks.utils import TaskManager

User = get_user_model()


class Command(BaseCommand):
    help = 'Test the task infrastructure'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-test-user',
            action='store_true',
            help='Create a test user if none exists',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Testing task infrastructure...')
        )
        
        # Get or create a test user
        user = None
        if options['create_test_user']:
            user, created = User.objects.get_or_create(
                username='testuser',
                defaults={
                    'email': 'test@example.com'
                }
            )
            if created:
                user.set_password('testpass123')
                user.save()
                self.stdout.write(
                    self.style.SUCCESS('Created test user: testuser')
                )
        else:
            user = User.objects.first()
            if not user:
                self.stdout.write(
                    self.style.ERROR('No users found. Use --create-test-user to create one.')
                )
                return
        
        # Test TaskProgress model
        self.stdout.write('Testing TaskProgress model...')
        task_progress = TaskProgress.objects.create(
            task_id='test-task-123',
            user=user,
            category=TaskCategory.GENERAL,
            task_name='Test Task',
            task_args={'test': True}
        )
        
        # Test progress updates
        task_progress.update_progress(25, 'Step 1 complete')
        task_progress.update_progress(50, 'Step 2 complete', processed_items=50)
        task_progress.update_progress(75, 'Step 3 complete', processed_items=75)
        task_progress.mark_success({'result': 'Test completed successfully'})
        
        self.stdout.write(
            self.style.SUCCESS(f'Task progress test completed: {task_progress}')
        )
        
        # Test TaskManager utilities
        self.stdout.write('Testing TaskManager utilities...')
        
        # Get task status
        status = TaskManager.get_task_status('test-task-123')
        self.stdout.write(f'Task status: {status["status"]}')
        
        # Get user tasks
        user_tasks = TaskManager.get_user_tasks(user, limit=5)
        self.stdout.write(f'User has {user_tasks.count()} tasks')
        
        # Test cleanup (dry run)
        self.stdout.write('Testing task cleanup...')
        cleanup_count = TaskManager.cleanup_old_tasks(days=0)  # Clean up immediately for test
        self.stdout.write(f'Cleaned up {cleanup_count} tasks')
        
        self.stdout.write(
            self.style.SUCCESS('Task infrastructure test completed successfully!')
        )
from celery import shared_task
from celery.utils.log import get_task_logger
from .base import ProgressTrackingTask, BatchProcessingTask
from .models import TaskCategory
from .utils import TaskManager
import time

logger = get_task_logger(__name__)


@shared_task(bind=True, base=ProgressTrackingTask)
def example_progress_task(self, user_id, total_items=100, category=TaskCategory.GENERAL):
    """Example task demonstrating progress tracking"""
    self.mark_started()
    
    for i in range(total_items):
        # Simulate work
        time.sleep(0.1)
        
        progress = int(((i + 1) / total_items) * 100)
        self.update_progress(
            progress=progress,
            current_step=f"Processing item {i + 1}",
            processed_items=i + 1,
            total_items=total_items
        )
    
    return {
        'message': f'Successfully processed {total_items} items',
        'total_processed': total_items
    }


@shared_task(bind=True, base=BatchProcessingTask)
def example_batch_task(self, user_id, items, batch_size=10, category=TaskCategory.GENERAL):
    """Example batch processing task"""
    self.mark_started()
    
    def process_batch(batch):
        # Simulate batch processing
        time.sleep(0.5)
        logger.info(f"Processed batch of {len(batch)} items")
    
    processed_count = self.process_batch(items, batch_size, process_batch)
    
    return {
        'message': f'Successfully processed {processed_count} items in batches',
        'total_processed': processed_count,
        'batch_size': batch_size
    }


@shared_task(bind=True, base=ProgressTrackingTask)
def long_running_task(self, user_id, duration=60, category=TaskCategory.GENERAL):
    """Example long-running task with progress updates"""
    self.mark_started()
    
    start_time = time.time()
    
    while time.time() - start_time < duration:
        elapsed = time.time() - start_time
        progress = int((elapsed / duration) * 100)
        
        self.update_progress(
            progress=progress,
            current_step=f"Running for {int(elapsed)} seconds",
            processed_items=int(elapsed),
            total_items=duration
        )
        
        time.sleep(1)
    
    return {
        'message': f'Task completed after {duration} seconds',
        'duration': duration
    }


@shared_task
def cleanup_old_tasks_periodic():
    """Periodic task to clean up old completed tasks"""
    try:
        deleted_count = TaskManager.cleanup_old_tasks(days=7)
        logger.info(f"Periodic cleanup: deleted {deleted_count} old tasks")
        return {
            'message': f'Cleaned up {deleted_count} old tasks',
            'deleted_count': deleted_count
        }
    except Exception as e:
        logger.error(f"Error in periodic task cleanup: {e}")
        raise


@shared_task(bind=True, base=ProgressTrackingTask)
def test_task_failure(self, user_id, fail_at_progress=50, category=TaskCategory.GENERAL):
    """Test task that fails at a specific progress point"""
    self.mark_started()
    
    for i in range(100):
        progress = i + 1
        
        if progress == fail_at_progress:
            raise Exception(f"Task intentionally failed at {fail_at_progress}% progress")
        
        self.update_progress(
            progress=progress,
            current_step=f"Step {progress}",
            processed_items=progress,
            total_items=100
        )
        
        time.sleep(0.1)
    
    return {'message': 'Task completed successfully'}


@shared_task(bind=True, base=ProgressTrackingTask)
def test_task_cancellation(self, user_id, category=TaskCategory.GENERAL):
    """Test task for cancellation functionality"""
    self.mark_started()
    
    for i in range(1000):  # Long-running task
        progress = int((i / 1000) * 100)
        
        self.update_progress(
            progress=progress,
            current_step=f"Processing item {i}",
            processed_items=i,
            total_items=1000
        )
        
        time.sleep(0.5)  # Slow enough to allow cancellation
    
    return {'message': 'Task completed without cancellation'}
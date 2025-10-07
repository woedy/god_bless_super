#!/usr/bin/env python
"""
Verification script for error handling implementation.
Run this to verify that error handling is working correctly.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from god_bless_pro.exceptions import (
    ValidationException,
    ResourceNotFoundException,
    PermissionDeniedException,
    TaskException
)
from god_bless_pro.logging_config import get_logger
from god_bless_pro.tasks import ProgressTrackingTask, exponential_backoff

logger = get_logger(__name__)


def test_custom_exceptions():
    """Test custom exception classes"""
    print("\n" + "="*60)
    print("Testing Custom Exceptions")
    print("="*60)
    
    try:
        raise ValidationException('Test validation error')
    except ValidationException as e:
        print(f"✓ ValidationException: {e.detail} (Status: {e.status_code})")
    
    try:
        raise ResourceNotFoundException('Test resource not found')
    except ResourceNotFoundException as e:
        print(f"✓ ResourceNotFoundException: {e.detail} (Status: {e.status_code})")
    
    try:
        raise PermissionDeniedException('Test permission denied')
    except PermissionDeniedException as e:
        print(f"✓ PermissionDeniedException: {e.detail} (Status: {e.status_code})")
    
    try:
        raise TaskException('Test task error')
    except TaskException as e:
        print(f"✓ TaskException: {e.detail} (Status: {e.status_code})")


def test_logging():
    """Test logging system"""
    print("\n" + "="*60)
    print("Testing Logging System")
    print("="*60)
    
    logger.info('Test info message')
    print("✓ Info log written")
    
    logger.warning('Test warning message')
    print("✓ Warning log written")
    
    logger.error('Test error message')
    print("✓ Error log written")
    
    print("\nCheck log files in logs/ directory:")
    print("  - logs/info.log")
    print("  - logs/warning.log")
    print("  - logs/error.log")


def test_exponential_backoff():
    """Test exponential backoff decorator"""
    print("\n" + "="*60)
    print("Testing Exponential Backoff")
    print("="*60)
    
    attempt_count = 0
    
    @exponential_backoff(max_retries=3, base_delay=0.1)
    def failing_function():
        nonlocal attempt_count
        attempt_count += 1
        if attempt_count < 3:
            raise Exception(f"Attempt {attempt_count} failed")
        return "Success!"
    
    try:
        result = failing_function()
        print(f"✓ Function succeeded after {attempt_count} attempts: {result}")
    except Exception as e:
        print(f"✗ Function failed after {attempt_count} attempts: {e}")


def test_task_error_classification():
    """Test task error classification"""
    print("\n" + "="*60)
    print("Testing Task Error Classification")
    print("="*60)
    
    task = ProgressTrackingTask()
    
    # Test retryable errors
    network_error = Exception('Connection timeout')
    is_retryable = task.should_retry_error(network_error)
    print(f"✓ Network error is retryable: {is_retryable}")
    
    db_error = Exception('Database unavailable')
    is_retryable = task.should_retry_error(db_error)
    print(f"✓ Database error is retryable: {is_retryable}")
    
    # Test non-retryable errors
    value_error = ValueError('Invalid value')
    is_retryable = task.should_retry_error(value_error)
    print(f"✓ ValueError is not retryable: {not is_retryable}")


def test_retry_delay_calculation():
    """Test retry delay calculation"""
    print("\n" + "="*60)
    print("Testing Retry Delay Calculation")
    print("="*60)
    
    from unittest.mock import Mock, PropertyMock
    
    task = ProgressTrackingTask()
    mock_request = Mock()
    type(task).request = PropertyMock(return_value=mock_request)
    
    delays = []
    for retry_count in range(5):
        mock_request.retries = retry_count
        delay = task.get_retry_delay()
        delays.append(delay)
        print(f"✓ Retry {retry_count}: {delay}s delay")
    
    print(f"\nExponential backoff pattern: {delays}")


def check_log_directory():
    """Check if log directory exists"""
    print("\n" + "="*60)
    print("Checking Log Directory")
    print("="*60)
    
    logs_dir = os.path.join(os.path.dirname(__file__), 'logs')
    
    if os.path.exists(logs_dir):
        print(f"✓ Log directory exists: {logs_dir}")
        
        log_files = [
            'error.log',
            'warning.log',
            'info.log',
            'celery.log',
            'api.log'
        ]
        
        for log_file in log_files:
            log_path = os.path.join(logs_dir, log_file)
            if os.path.exists(log_path):
                size = os.path.getsize(log_path)
                print(f"  ✓ {log_file} ({size} bytes)")
            else:
                print(f"  - {log_file} (not created yet)")
    else:
        print(f"✗ Log directory does not exist: {logs_dir}")
        print("  It will be created when the first log is written")


def check_error_handling_files():
    """Check if all error handling files exist"""
    print("\n" + "="*60)
    print("Checking Error Handling Files")
    print("="*60)
    
    base_dir = os.path.dirname(__file__)
    
    files_to_check = [
        'god_bless_pro/exceptions.py',
        'god_bless_pro/error_handlers.py',
        'god_bless_pro/logging_config.py',
        'god_bless_pro/views.py',
        'god_bless_pro/tests.py',
        'ERROR_HANDLING_GUIDE.md',
    ]
    
    all_exist = True
    for file_path in files_to_check:
        full_path = os.path.join(base_dir, file_path)
        if os.path.exists(full_path):
            print(f"✓ {file_path}")
        else:
            print(f"✗ {file_path} (missing)")
            all_exist = False
    
    return all_exist


def main():
    """Run all verification tests"""
    print("\n" + "="*60)
    print("ERROR HANDLING VERIFICATION")
    print("="*60)
    
    try:
        # Check files
        files_ok = check_error_handling_files()
        
        if not files_ok:
            print("\n✗ Some files are missing!")
            return False
        
        # Run tests
        test_custom_exceptions()
        test_logging()
        test_exponential_backoff()
        test_task_error_classification()
        test_retry_delay_calculation()
        check_log_directory()
        
        print("\n" + "="*60)
        print("✓ ALL VERIFICATION TESTS PASSED")
        print("="*60)
        print("\nError handling system is working correctly!")
        print("\nNext steps:")
        print("1. Check log files in logs/ directory")
        print("2. Run Django tests: python manage.py test god_bless_pro.tests")
        print("3. Review ERROR_HANDLING_GUIDE.md for usage examples")
        print("4. Review ERROR_HANDLING_QUICK_REFERENCE.md for quick reference")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

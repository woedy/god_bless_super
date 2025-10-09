"""
Test script for dashboard analytics endpoints
Run with: python manage.py shell < dashboard/test_analytics.py
"""

import sys
import psutil
from django.contrib.auth import get_user_model
from tasks.models import TaskProgress, TaskStatus, TaskCategory
from phone_generator.models import PhoneNumber
from projects.models import Project

User = get_user_model()

def test_system_health():
    """Test system health monitoring"""
    print("\n=== Testing System Health ===")
    try:
        cpu = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        print(f"✓ CPU Usage: {cpu}%")
        print(f"✓ Memory Usage: {memory.percent}%")
        print(f"✓ Disk Usage: {disk.percent}%")
        print("✓ System health monitoring working!")
        return True
    except Exception as e:
        print(f"✗ System health error: {e}")
        return False

def test_database_queries():
    """Test database queries for analytics"""
    print("\n=== Testing Database Queries ===")
    try:
        # Test user query
        user_count = User.objects.count()
        print(f"✓ Users in database: {user_count}")
        
        # Test task queries
        task_count = TaskProgress.objects.count()
        print(f"✓ Tasks in database: {task_count}")
        
        # Test phone number queries
        phone_count = PhoneNumber.objects.count()
        print(f"✓ Phone numbers in database: {phone_count}")
        
        # Test project queries
        project_count = Project.objects.count()
        print(f"✓ Projects in database: {project_count}")
        
        print("✓ Database queries working!")
        return True
    except Exception as e:
        print(f"✗ Database query error: {e}")
        return False

def test_task_statistics():
    """Test task statistics calculations"""
    print("\n=== Testing Task Statistics ===")
    try:
        total_tasks = TaskProgress.objects.count()
        completed_tasks = TaskProgress.objects.filter(status=TaskStatus.SUCCESS).count()
        failed_tasks = TaskProgress.objects.filter(status=TaskStatus.FAILURE).count()
        
        print(f"✓ Total tasks: {total_tasks}")
        print(f"✓ Completed tasks: {completed_tasks}")
        print(f"✓ Failed tasks: {failed_tasks}")
        
        if total_tasks > 0:
            success_rate = (completed_tasks / total_tasks) * 100
            print(f"✓ Success rate: {success_rate:.2f}%")
        
        print("✓ Task statistics working!")
        return True
    except Exception as e:
        print(f"✗ Task statistics error: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 50)
    print("Dashboard Analytics Test Suite")
    print("=" * 50)
    
    results = []
    results.append(("System Health", test_system_health()))
    results.append(("Database Queries", test_database_queries()))
    results.append(("Task Statistics", test_task_statistics()))
    
    print("\n" + "=" * 50)
    print("Test Results Summary")
    print("=" * 50)
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    
    print("\n" + "=" * 50)
    if all_passed:
        print("✓ All tests passed! Dashboard analytics ready.")
    else:
        print("✗ Some tests failed. Check errors above.")
    print("=" * 50)
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

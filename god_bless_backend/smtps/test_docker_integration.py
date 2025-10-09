#!/usr/bin/env python
"""
Test script for SMTP rotation service Docker integration
Run this script to verify the service works correctly in containerized environment
"""
import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.contrib.auth import get_user_model
from smtps.models import SmtpManager
from smtps.rotation_service import SMTPRotationService
from smtps.health_check import check_smtp_service_readiness
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


def test_basic_functionality():
    """Test basic SMTP rotation service functionality"""
    print("🔧 Testing basic SMTP rotation service functionality...")
    
    try:
        # Test database connectivity
        user_count = User.objects.count()
        smtp_count = SmtpManager.objects.count()
        print(f"✅ Database connection: {user_count} users, {smtp_count} SMTP servers")
        
        # Test cache connectivity
        from django.core.cache import cache
        cache.set('test_key', 'test_value', timeout=10)
        cached_value = cache.get('test_key')
        if cached_value == 'test_value':
            print("✅ Cache connection: Working")
        else:
            print("❌ Cache connection: Failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Basic functionality test failed: {e}")
        return False


def test_rotation_service():
    """Test SMTP rotation service with a test user"""
    print("\n🔄 Testing SMTP rotation service...")
    
    try:
        # Get or create a test user
        test_user, created = User.objects.get_or_create(
            username='smtp_test_user',
            defaults={
                'email': 'test@example.com',
                'is_active': True
            }
        )
        
        if created:
            print("✅ Created test user")
        else:
            print("✅ Using existing test user")
        
        # Initialize rotation service
        rotation_service = SMTPRotationService(test_user)
        print("✅ SMTP rotation service initialized")
        
        # Test getting rotation stats
        stats = rotation_service.get_rotation_stats()
        print(f"✅ Rotation stats: {stats['total_smtp_servers']} servers, "
              f"{stats['healthy_smtp_servers']} healthy")
        
        # Test getting next SMTP server
        next_smtp = rotation_service.get_next_smtp()
        if next_smtp:
            print(f"✅ Next SMTP server: {next_smtp}")
        else:
            print("ℹ️  No SMTP servers available for test user")
        
        return True
        
    except Exception as e:
        print(f"❌ Rotation service test failed: {e}")
        return False


def test_health_checks():
    """Test health check functionality"""
    print("\n🏥 Testing health check functionality...")
    
    try:
        # Test service readiness
        is_ready, message = check_smtp_service_readiness()
        if is_ready:
            print(f"✅ Service readiness: {message}")
        else:
            print(f"❌ Service readiness: {message}")
            return False
        
        # Test health check for users with SMTP servers
        users_with_smtp = User.objects.filter(
            user_smtps__isnull=False,
            is_active=True
        ).distinct()[:3]  # Test with first 3 users
        
        for user in users_with_smtp:
            rotation_service = SMTPRotationService(user)
            results = rotation_service.check_all_smtp_health()
            healthy_count = sum(1 for r in results if r['is_healthy'])
            total_count = len(results)
            print(f"✅ User {user.username}: {healthy_count}/{total_count} servers healthy")
        
        return True
        
    except Exception as e:
        print(f"❌ Health check test failed: {e}")
        return False


def test_docker_configuration():
    """Test Docker-specific configuration"""
    print("\n🐳 Testing Docker configuration...")
    
    try:
        from smtps.docker_config import (
            is_docker_environment, 
            get_smtp_health_check_settings,
            get_redis_cache_settings
        )
        
        # Test Docker environment detection
        is_docker = is_docker_environment()
        print(f"✅ Docker environment detected: {is_docker}")
        
        # Test configuration loading
        health_settings = get_smtp_health_check_settings()
        print(f"✅ Health check settings: {health_settings}")
        
        redis_settings = get_redis_cache_settings()
        print(f"✅ Redis cache settings: {redis_settings}")
        
        return True
        
    except Exception as e:
        print(f"❌ Docker configuration test failed: {e}")
        return False


def test_celery_tasks():
    """Test Celery task availability"""
    print("\n⚙️  Testing Celery task availability...")
    
    try:
        from smtps.tasks import (
            check_smtp_health_for_all_users,
            cleanup_unhealthy_smtp_servers,
            generate_smtp_performance_report
        )
        
        print("✅ SMTP health check task: Available")
        print("✅ Cleanup task: Available")
        print("✅ Performance report task: Available")
        
        # Test task registration with Celery
        from celery import current_app
        registered_tasks = current_app.tasks
        
        smtp_tasks = [
            'smtps.tasks.check_smtp_health_for_all_users',
            'smtps.tasks.cleanup_unhealthy_smtp_servers',
            'smtps.tasks.generate_smtp_performance_report'
        ]
        
        for task_name in smtp_tasks:
            if task_name in registered_tasks:
                print(f"✅ Task registered: {task_name}")
            else:
                print(f"❌ Task not registered: {task_name}")
        
        return True
        
    except Exception as e:
        print(f"❌ Celery task test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("🚀 Starting SMTP Rotation Service Docker Integration Tests\n")
    
    tests = [
        ("Basic Functionality", test_basic_functionality),
        ("Rotation Service", test_rotation_service),
        ("Health Checks", test_health_checks),
        ("Docker Configuration", test_docker_configuration),
        ("Celery Tasks", test_celery_tasks),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {e}")
        
        print("-" * 50)
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! SMTP rotation service is ready for Docker deployment.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Please check the configuration.")
        sys.exit(1)


if __name__ == "__main__":
    main()
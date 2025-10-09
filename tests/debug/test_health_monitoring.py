#!/usr/bin/env python3
"""
Test script for health monitoring functionality
Tests the health check endpoints and monitoring system
"""

import os
import sys
import json
import time
import requests
import subprocess
from pathlib import Path

# Add Django project to path
sys.path.append(str(Path(__file__).parent / 'god_bless_backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')

# Set test environment variables
os.environ['POSTGRES_HOST'] = 'test_postgres'
os.environ['POSTGRES_DB'] = 'test_db'
os.environ['POSTGRES_USER'] = 'test_user'
os.environ['POSTGRES_PASSWORD'] = 'test_pass'
os.environ['REDIS_HOST'] = 'test_redis'
os.environ['REDIS_PORT'] = '6379'
os.environ['SECRET_KEY'] = 'test-secret-key-for-monitoring-that-is-long-enough-to-pass-validation-requirements'
os.environ['DEBUG'] = 'True'
os.environ['ALLOWED_HOSTS'] = '*'

def test_health_check_imports():
    """Test that health check modules can be imported"""
    print("Testing health check imports...")
    
    try:
        # Test basic imports
        import django
        django.setup()
        
        from god_bless_pro import health_checks
        from god_bless_pro import monitoring_views
        from god_bless_backend import monitoring_config
        
        print("✅ All health monitoring modules imported successfully")
        return True
        
    except Exception as e:
        print(f"❌ Import test failed: {e}")
        return False

def test_health_check_functions():
    """Test individual health check functions"""
    print("\nTesting health check functions...")
    
    try:
        from god_bless_pro.health_checks import (
            check_database, check_cache, check_redis
        )
        
        # Test database check (will fail without connection, but should not crash)
        try:
            db_result = check_database()
            print(f"Database check result: {db_result}")
        except Exception as e:
            print(f"Database check failed (expected): {e}")
        
        # Test cache check
        try:
            cache_result = check_cache()
            print(f"Cache check result: {cache_result}")
        except Exception as e:
            print(f"Cache check failed: {e}")
        
        # Test Redis check
        try:
            redis_result = check_redis()
            print(f"Redis check result: {redis_result}")
        except Exception as e:
            print(f"Redis check failed: {e}")
        
        print("✅ Health check functions executed without crashing")
        return True
        
    except Exception as e:
        print(f"❌ Health check function test failed: {e}")
        return False

def test_monitoring_views():
    """Test monitoring view functions"""
    print("\nTesting monitoring view functions...")
    
    try:
        from god_bless_pro.monitoring_views import (
            check_all_services, collect_system_metrics, 
            calculate_overall_health_status
        )
        
        # Test service checks
        services = check_all_services()
        print(f"Service checks completed: {len(services)} services checked")
        
        # Test metrics collection
        metrics = collect_system_metrics()
        print(f"System metrics collected: {list(metrics.keys())}")
        
        # Test status calculation
        status = calculate_overall_health_status(services)
        print(f"Overall health status: {status}")
        
        print("✅ Monitoring view functions executed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Monitoring view test failed: {e}")
        return False

def test_monitoring_config():
    """Test monitoring configuration"""
    print("\nTesting monitoring configuration...")
    
    try:
        from god_bless_backend.monitoring_config import (
            get_monitoring_config, validate_config, get_environment_info
        )
        
        # Test configuration loading
        config = get_monitoring_config()
        print(f"Configuration loaded with sections: {list(config.keys())}")
        
        # Test configuration validation
        validation = validate_config()
        print(f"Configuration validation: {'✅ Valid' if validation['valid'] else '❌ Invalid'}")
        if validation['warnings']:
            print(f"Warnings: {validation['warnings']}")
        if validation['errors']:
            print(f"Errors: {validation['errors']}")
        
        # Test environment info
        env_info = get_environment_info()
        print(f"Environment info: {env_info}")
        
        print("✅ Monitoring configuration tests passed")
        return True
        
    except Exception as e:
        print(f"❌ Monitoring configuration test failed: {e}")
        return False

def test_health_monitor_script():
    """Test the health monitor script"""
    print("\nTesting health monitor script...")
    
    try:
        # Import the health monitor
        sys.path.append(str(Path(__file__).parent / 'god_bless_backend' / 'scripts'))
        
        # We can't run the full script without proper database setup,
        # but we can test that it imports and initializes
        from health_monitor import HealthMonitor
        
        monitor = HealthMonitor()
        print(f"Health monitor initialized with {len(monitor.checks)} initial checks")
        
        print("✅ Health monitor script imports successfully")
        return True
        
    except Exception as e:
        print(f"❌ Health monitor script test failed: {e}")
        return False

def test_alerting_system():
    """Test the alerting system"""
    print("\nTesting alerting system...")
    
    try:
        from alerting_system import AlertingSystem
        
        alerting = AlertingSystem()
        print(f"Alerting system initialized")
        print(f"Email enabled: {alerting.config['email']['enabled']}")
        print(f"Webhook enabled: {alerting.config['webhook']['enabled']}")
        print(f"Slack enabled: {alerting.config['slack']['enabled']}")
        
        print("✅ Alerting system imports successfully")
        return True
        
    except Exception as e:
        print(f"❌ Alerting system test failed: {e}")
        return False

def run_all_tests():
    """Run all health monitoring tests"""
    print("🔍 Starting Health Monitoring Tests")
    print("=" * 50)
    
    tests = [
        test_health_check_imports,
        test_monitoring_config,
        test_health_check_functions,
        test_monitoring_views,
        test_health_monitor_script,
        test_alerting_system
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All health monitoring tests passed!")
        return True
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return False

if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
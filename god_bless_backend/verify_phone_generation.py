#!/usr/bin/env python
"""
Verification script for phone number generation system
This script verifies that all components are properly configured
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from phone_generator.models import PhoneNumber, PhoneGenerationTask
from phone_generator.tasks import generate_phone_numbers_task, validate_phone_numbers_task
from tasks.models import TaskProgress
from django.contrib.auth import get_user_model

User = get_user_model()

def verify_models():
    """Verify that models are properly configured"""
    print("✓ Verifying models...")
    
    # Check PhoneNumber model
    assert hasattr(PhoneNumber, 'phone_number'), "PhoneNumber model missing phone_number field"
    assert hasattr(PhoneNumber, 'carrier'), "PhoneNumber model missing carrier field"
    assert hasattr(PhoneNumber, 'type'), "PhoneNumber model missing type field"
    assert hasattr(PhoneNumber, 'area_code'), "PhoneNumber model missing area_code field"
    assert hasattr(PhoneNumber, 'valid_number'), "PhoneNumber model missing valid_number field"
    assert hasattr(PhoneNumber, 'validation_attempted'), "PhoneNumber model missing validation_attempted field"
    
    # Check PhoneGenerationTask model
    assert hasattr(PhoneGenerationTask, 'area_code'), "PhoneGenerationTask missing area_code field"
    assert hasattr(PhoneGenerationTask, 'quantity'), "PhoneGenerationTask missing quantity field"
    assert hasattr(PhoneGenerationTask, 'status'), "PhoneGenerationTask missing status field"
    assert hasattr(PhoneGenerationTask, 'progress'), "PhoneGenerationTask missing progress field"
    assert hasattr(PhoneGenerationTask, 'celery_task_id'), "PhoneGenerationTask missing celery_task_id field"
    
    print("  ✓ PhoneNumber model configured correctly")
    print("  ✓ PhoneGenerationTask model configured correctly")
    return True

def verify_tasks():
    """Verify that Celery tasks are properly configured"""
    print("\n✓ Verifying Celery tasks...")
    
    # Check that tasks are callable
    assert callable(generate_phone_numbers_task), "generate_phone_numbers_task is not callable"
    assert callable(validate_phone_numbers_task), "validate_phone_numbers_task is not callable"
    
    # Check task names
    assert generate_phone_numbers_task.name, "generate_phone_numbers_task has no name"
    assert validate_phone_numbers_task.name, "validate_phone_numbers_task has no name"
    
    print(f"  ✓ generate_phone_numbers_task: {generate_phone_numbers_task.name}")
    print(f"  ✓ validate_phone_numbers_task: {validate_phone_numbers_task.name}")
    return True

def verify_api_endpoints():
    """Verify that API endpoints are properly configured"""
    print("\n✓ Verifying API endpoints...")
    
    from phone_generator.api import views
    
    # Check that view functions exist
    assert hasattr(views, 'generate_numbers_enhanced_view'), "Missing generate_numbers_enhanced_view"
    assert hasattr(views, 'validate_numbers_enhanced_view'), "Missing validate_numbers_enhanced_view"
    assert hasattr(views, 'get_generation_tasks_view'), "Missing get_generation_tasks_view"
    assert hasattr(views, 'get_task_progress_view'), "Missing get_task_progress_view"
    assert hasattr(views, 'cancel_task_view'), "Missing cancel_task_view"
    assert hasattr(views, 'bulk_validate_numbers_view'), "Missing bulk_validate_numbers_view"
    assert hasattr(views, 'get_phone_statistics_view'), "Missing get_phone_statistics_view"
    assert hasattr(views, 'get_active_tasks_view'), "Missing get_active_tasks_view"
    assert hasattr(views, 'generate_numbers_with_config_view'), "Missing generate_numbers_with_config_view"
    
    print("  ✓ generate_numbers_enhanced_view")
    print("  ✓ validate_numbers_enhanced_view")
    print("  ✓ get_generation_tasks_view")
    print("  ✓ get_task_progress_view")
    print("  ✓ cancel_task_view")
    print("  ✓ bulk_validate_numbers_view")
    print("  ✓ get_phone_statistics_view")
    print("  ✓ get_active_tasks_view")
    print("  ✓ generate_numbers_with_config_view")
    return True

def verify_websocket_consumers():
    """Verify that WebSocket consumers are properly configured"""
    print("\n✓ Verifying WebSocket consumers...")
    
    from phone_generator import consumers
    
    # Check that consumer classes exist
    assert hasattr(consumers, 'PhoneGenerationProgressConsumer'), "Missing PhoneGenerationProgressConsumer"
    assert hasattr(consumers, 'TaskProgressConsumer'), "Missing TaskProgressConsumer"
    
    print("  ✓ PhoneGenerationProgressConsumer configured")
    print("  ✓ TaskProgressConsumer configured")
    return True

def verify_routing():
    """Verify that routing is properly configured"""
    print("\n✓ Verifying routing...")
    
    from phone_generator import routing
    
    # Check that websocket_urlpatterns exists
    assert hasattr(routing, 'websocket_urlpatterns'), "Missing websocket_urlpatterns"
    assert len(routing.websocket_urlpatterns) > 0, "websocket_urlpatterns is empty"
    
    print(f"  ✓ WebSocket URL patterns configured ({len(routing.websocket_urlpatterns)} patterns)")
    return True

def verify_serializers():
    """Verify that serializers are properly configured"""
    print("\n✓ Verifying serializers...")
    
    from phone_generator.api import serializers
    
    # Check that serializer classes exist
    assert hasattr(serializers, 'AllPhoneNumbersSerializer'), "Missing AllPhoneNumbersSerializer"
    assert hasattr(serializers, 'PhoneGenerationTaskSerializer'), "Missing PhoneGenerationTaskSerializer"
    
    print("  ✓ AllPhoneNumbersSerializer configured")
    print("  ✓ PhoneGenerationTaskSerializer configured")
    return True

def main():
    """Run all verification checks"""
    print("=" * 60)
    print("Phone Number Generation System Verification")
    print("=" * 60)
    
    try:
        verify_models()
        verify_tasks()
        verify_api_endpoints()
        verify_websocket_consumers()
        verify_routing()
        verify_serializers()
        
        print("\n" + "=" * 60)
        print("✓ ALL VERIFICATIONS PASSED!")
        print("=" * 60)
        print("\nThe phone number generation system is properly configured.")
        print("\nKey Features:")
        print("  • Large-scale generation (up to 1M numbers)")
        print("  • Background processing with Celery")
        print("  • Real-time progress tracking via WebSocket")
        print("  • Batch processing with configurable chunk sizes")
        print("  • Internal database validation")
        print("  • Comprehensive API endpoints")
        print("\nNext Steps:")
        print("  1. Ensure Redis is running for Celery broker")
        print("  2. Start Celery worker: celery -A god_bless_pro worker -l DEBUG")
        print("  3. Start Celery beat: celery -A god_bless_pro beat -l DEBUG")
        print("  4. Test API endpoints with your frontend")
        
        return 0
        
    except AssertionError as e:
        print(f"\n✗ VERIFICATION FAILED: {e}")
        return 1
    except Exception as e:
        print(f"\n✗ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())

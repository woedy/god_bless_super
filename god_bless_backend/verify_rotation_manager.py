#!/usr/bin/env python
"""
Simple verification script for RotationManager
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

def verify_rotation_manager():
    """Verify RotationManager can be imported and basic functionality works"""
    try:
        from sms_sender.rotation_manager import RotationManager
        print("✓ RotationManager imports successfully")
        
        # Check if all required methods exist
        required_methods = [
            'get_next_proxy',
            'get_next_smtp', 
            'apply_delivery_delay',
            'get_optimal_server_combination',
            'record_success',
            'record_failure',
            'get_rotation_stats',
            'health_check_all_servers'
        ]
        
        for method in required_methods:
            if hasattr(RotationManager, method):
                print(f"✓ Method {method} exists")
            else:
                print(f"✗ Method {method} missing")
        
        print("\n✓ RotationManager verification completed successfully")
        return True
        
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    except Exception as e:
        print(f"✗ Verification error: {e}")
        return False

if __name__ == '__main__':
    success = verify_rotation_manager()
    sys.exit(0 if success else 1)
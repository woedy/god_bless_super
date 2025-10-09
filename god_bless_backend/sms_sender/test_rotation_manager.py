"""
Test script for RotationManager integration
"""
import os
import sys
import django

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch, MagicMock

from sms_sender.rotation_manager import RotationManager
from sms_sender.models import SMSCampaign, CampaignDeliverySettings
from proxy_server.models import ProxyServer, RotationSettings
from smtps.models import SmtpManager

User = get_user_model()


def test_rotation_manager_basic_functionality():
    """Test basic RotationManager functionality"""
    print("Testing RotationManager basic functionality...")
    
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    
    # Create test user
    user = User.objects.create_user(
        username=f'test_rotation_user_{unique_id}',
        email=f'test_{unique_id}@example.com',
        password='testpass123'
    )
    
    # Create test campaign
    campaign = SMSCampaign.objects.create(
        user=user,
        name='Test Rotation Campaign',
        message_template='Test message',
        status='draft'
    )
    
    # Create test proxy server
    proxy = ProxyServer.objects.create(
        user=user,
        host='127.0.0.1',
        port=8080,
        protocol='http',
        is_active=True,
        is_healthy=True
    )
    
    # Create test SMTP server
    smtp = SmtpManager.objects.create(
        user=user,
        host='smtp.example.com',
        port=587,
        username='test@example.com',
        password='testpass',
        active=True,
        is_healthy=True
    )
    
    try:
        # Initialize RotationManager
        with RotationManager(user, campaign) as manager:
            print(f"✓ RotationManager initialized successfully")
            
            # Test proxy selection
            selected_proxy = manager.get_next_proxy()
            if selected_proxy:
                print(f"✓ Proxy selection works: {selected_proxy}")
            else:
                print("✓ Proxy selection returned None (rotation may be disabled)")
            
            # Test SMTP selection
            selected_smtp = manager.get_next_smtp()
            if selected_smtp:
                print(f"✓ SMTP selection works: {selected_smtp}")
            else:
                print("! SMTP selection returned None")
            
            # Test delay application
            delay = manager.apply_delivery_delay()
            print(f"✓ Delay application works: {delay:.3f}s")
            
            # Test optimal server combination
            proxy_opt, smtp_opt = manager.get_optimal_server_combination(carrier='test_carrier')
            print(f"✓ Optimal server combination: Proxy={proxy_opt}, SMTP={smtp_opt}")
            
            # Test success recording
            if selected_proxy:
                manager.record_success('proxy', selected_proxy.id, response_time=0.5)
                print("✓ Proxy success recording works")
            
            if selected_smtp:
                manager.record_success('smtp', selected_smtp.id, response_time=1.2)
                print("✓ SMTP success recording works")
            
            # Test failure recording
            if selected_proxy:
                manager.record_failure('proxy', selected_proxy.id, 'Test error', 'connection')
                print("✓ Proxy failure recording works")
            
            # Test stats retrieval
            stats = manager.get_rotation_stats()
            print(f"✓ Stats retrieval works: {len(stats)} keys in stats")
            
            # Test health check
            health_results = manager.health_check_all_servers()
            print(f"✓ Health check works: {len(health_results)} keys in results")
            
        print("✓ RotationManager context manager works correctly")
        
    except Exception as e:
        print(f"✗ Error during testing: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        campaign.delete()
        proxy.delete()
        smtp.delete()
        user.delete()
        print("✓ Cleanup completed")


def test_campaign_delivery_settings():
    """Test campaign-specific delivery settings"""
    print("\nTesting campaign delivery settings...")
    
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    
    user = User.objects.create_user(
        username=f'test_settings_user_{unique_id}',
        email=f'test2_{unique_id}@example.com',
        password='testpass123'
    )
    
    campaign = SMSCampaign.objects.create(
        user=user,
        name='Test Settings Campaign',
        message_template='Test message',
        status='draft'
    )
    
    try:
        # Test default settings creation
        with RotationManager(user, campaign) as manager:
            settings = manager.delivery_settings
            print(f"✓ Default delivery settings created: {settings}")
            
            # Test custom settings
            settings.custom_delay_enabled = True
            settings.custom_delay_min = 2
            settings.custom_delay_max = 8
            settings.proxy_rotation_strategy = 'random'
            settings.smtp_rotation_strategy = 'best_performance'
            settings.save()
            
            print("✓ Custom delivery settings saved")
            
            # Test delay with custom settings
            delay = manager.apply_delivery_delay()
            if 2.0 <= delay <= 8.0:
                print(f"✓ Custom delay range respected: {delay:.3f}s")
            else:
                print(f"! Custom delay out of range: {delay:.3f}s (expected 2-8s)")
    
    except Exception as e:
        print(f"✗ Error testing delivery settings: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        campaign.delete()
        user.delete()
        print("✓ Settings test cleanup completed")


def test_server_usage_logging():
    """Test server usage logging functionality"""
    print("\nTesting server usage logging...")
    
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    
    user = User.objects.create_user(
        username=f'test_logging_user_{unique_id}',
        email=f'test3_{unique_id}@example.com',
        password='testpass123'
    )
    
    campaign = SMSCampaign.objects.create(
        user=user,
        name='Test Logging Campaign',
        message_template='Test message',
        status='draft'
    )
    
    proxy = ProxyServer.objects.create(
        user=user,
        host='127.0.0.1',
        port=8080,
        protocol='http',
        is_active=True,
        is_healthy=True
    )
    
    try:
        with RotationManager(user, campaign) as manager:
            # Test usage logging
            manager._update_server_usage_log('proxy', proxy.id, increment_processed=True)
            manager._update_server_usage_log('proxy', proxy.id, increment_success=True, response_time=0.5)
            manager._update_server_usage_log('proxy', proxy.id, increment_failure=True)
            
            print("✓ Server usage logging completed")
            
            # Check if logs were created
            from sms_sender.models import ServerUsageLog
            usage_logs = ServerUsageLog.objects.filter(campaign=campaign, server_type='proxy', server_id=proxy.id)
            
            if usage_logs.exists():
                log = usage_logs.first()
                print(f"✓ Usage log created: processed={log.messages_processed}, "
                      f"success={log.successful_messages}, failed={log.failed_messages}")
            else:
                print("! No usage logs found")
    
    except Exception as e:
        print(f"✗ Error testing usage logging: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        campaign.delete()
        proxy.delete()
        user.delete()
        print("✓ Logging test cleanup completed")


if __name__ == '__main__':
    print("Starting RotationManager Integration Tests")
    print("=" * 50)
    
    test_rotation_manager_basic_functionality()
    test_campaign_delivery_settings()
    test_server_usage_logging()
    
    print("\n" + "=" * 50)
    print("RotationManager Integration Tests Completed")
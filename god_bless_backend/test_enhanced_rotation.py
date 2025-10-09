#!/usr/bin/env python
"""
Test script for enhanced SMS rotation functionality
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.contrib.auth import get_user_model
from sms_sender.models import SMSCampaign, SMSMessage, CampaignDeliverySettings
from sms_sender.rotation_manager import RotationManager
from proxy_server.models import ProxyServer, RotationSettings
from smtps.models import SmtpManager

User = get_user_model()

def test_rotation_manager():
    """Test the rotation manager functionality"""
    print("Testing Enhanced SMS Rotation Manager...")
    
    # Get or create a test user
    try:
        user = User.objects.get(username='test_rotation_user')
        created = False
    except User.DoesNotExist:
        user = User.objects.create_user(
            username='test_rotation_user',
            email='test_rotation@example.com',
            password='testpass123'
        )
        created = True
    
    if created:
        print(f"Created test user: {user.username}")
    else:
        print(f"Using existing test user: {user.username}")
    
    # Create a test campaign
    campaign, created = SMSCampaign.objects.get_or_create(
        user=user,
        name='Test Enhanced Rotation Campaign',
        defaults={
            'message_template': 'Test message with rotation',
            'use_proxy_rotation': True,
            'use_smtp_rotation': True,
            'batch_size': 10
        }
    )
    
    if created:
        print(f"Created test campaign: {campaign.name}")
    else:
        print(f"Using existing test campaign: {campaign.name}")
    
    # Initialize rotation manager
    try:
        rotation_manager = RotationManager(user, campaign)
        print("✓ RotationManager initialized successfully")
        
        # Test delivery settings
        delivery_settings = rotation_manager.delivery_settings
        print(f"✓ Delivery settings loaded: proxy_rotation={delivery_settings.use_proxy_rotation}, smtp_rotation={delivery_settings.use_smtp_rotation}")
        
        # Test proxy selection
        proxy = rotation_manager.get_next_proxy()
        if proxy:
            print(f"✓ Proxy selected: {proxy}")
        else:
            print("⚠ No proxy available (this is normal if no proxies are configured)")
        
        # Test SMTP selection
        smtp = rotation_manager.get_next_smtp()
        if smtp:
            print(f"✓ SMTP selected: {smtp}")
        else:
            print("⚠ No SMTP server available (this is normal if no SMTP servers are configured)")
        
        # Test delay application
        delay = rotation_manager.apply_delivery_delay()
        print(f"✓ Delivery delay applied: {delay:.2f}s")
        
        # Test rotation stats
        stats = rotation_manager.get_rotation_stats()
        print(f"✓ Rotation stats retrieved: {len(stats)} keys")
        
        # Test optimal server combination
        if proxy and smtp:
            optimal_proxy, optimal_smtp = rotation_manager.get_optimal_server_combination('AT&T')
            print(f"✓ Optimal server combination for AT&T: proxy={optimal_proxy}, smtp={optimal_smtp}")
        
        print("\n✅ All rotation manager tests passed!")
        
    except Exception as e:
        print(f"❌ Error testing rotation manager: {e}")
        import traceback
        traceback.print_exc()

def test_enhanced_task_import():
    """Test that enhanced tasks can be imported"""
    print("\nTesting Enhanced Task Imports...")
    
    try:
        from sms_sender.enhanced_tasks import process_enhanced_sms_campaign_task, send_enhanced_sms_message
        print("✓ Enhanced tasks imported successfully")
        
        from sms_sender.tasks import process_sms_campaign_task, send_enhanced_sms_message_simple
        print("✓ Updated main tasks imported successfully")
        
        print("✅ All task imports successful!")
        
    except Exception as e:
        print(f"❌ Error importing tasks: {e}")
        import traceback
        traceback.print_exc()

def test_model_enhancements():
    """Test enhanced model functionality"""
    print("\nTesting Enhanced Models...")
    
    try:
        # Test CampaignDeliverySettings
        user = User.objects.first()
        if user:
            campaign = SMSCampaign.objects.filter(user=user).first()
            if campaign:
                settings, created = CampaignDeliverySettings.objects.get_or_create(
                    campaign=campaign,
                    defaults={
                        'use_proxy_rotation': True,
                        'proxy_rotation_strategy': 'round_robin',
                        'use_smtp_rotation': True,
                        'smtp_rotation_strategy': 'best_performance',
                        'custom_delay_enabled': True,
                        'custom_delay_min': 2,
                        'custom_delay_max': 8
                    }
                )
                print(f"✓ CampaignDeliverySettings {'created' if created else 'retrieved'}: {settings}")
                
                # Test SMSMessage enhancements
                message, created = SMSMessage.objects.get_or_create(
                    campaign=campaign,
                    phone_number='1234567890',
                    defaults={
                        'message_content': 'Test enhanced message',
                        'delivery_delay_applied': 3.5,
                        'proxy_response_time': 0.25,
                        'smtp_response_time': 1.2,
                        'total_processing_time': 2.1
                    }
                )
                print(f"✓ Enhanced SMSMessage {'created' if created else 'retrieved'}: {message.phone_number}")
                
        print("✅ All model enhancement tests passed!")
        
    except Exception as e:
        print(f"❌ Error testing model enhancements: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("🚀 Starting Enhanced SMS Rotation Tests\n")
    
    test_enhanced_task_import()
    test_model_enhancements()
    test_rotation_manager()
    
    print("\n🎉 Enhanced SMS Rotation Testing Complete!")
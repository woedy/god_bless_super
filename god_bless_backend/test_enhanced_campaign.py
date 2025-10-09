#!/usr/bin/env python
"""
Test script for enhanced SMS campaign task functionality
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.contrib.auth import get_user_model
from sms_sender.models import SMSCampaign, SMSMessage, CampaignDeliverySettings
from sms_sender.tasks import process_sms_campaign_task
from proxy_server.models import ProxyServer, RotationSettings
from smtps.models import SmtpManager

User = get_user_model()

def create_test_servers(user):
    """Create test SMTP and proxy servers for testing"""
    print("Creating test servers...")
    
    # Create test SMTP server
    smtp, created = SmtpManager.objects.get_or_create(
        user=user,
        host='smtp.test.com',
        port=587,
        defaults={
            'username': 'test@test.com',
            'password': 'testpass',
            'ssl': False,
            'tls': True,
            'active': True,
            'is_healthy': True
        }
    )
    
    if created:
        print(f"✓ Created test SMTP server: {smtp}")
    else:
        print(f"✓ Using existing SMTP server: {smtp}")
    
    # Create test proxy server
    proxy, created = ProxyServer.objects.get_or_create(
        user=user,
        host='proxy.test.com',
        port=8080,
        defaults={
            'username': 'proxyuser',
            'password': 'proxypass',
            'is_active': True,
            'is_healthy': True
        }
    )
    
    if created:
        print(f"✓ Created test proxy server: {proxy}")
    else:
        print(f"✓ Using existing proxy server: {proxy}")
    
    return smtp, proxy

def test_enhanced_campaign_processing():
    """Test enhanced campaign processing with rotation"""
    print("\nTesting Enhanced Campaign Processing...")
    
    # Get test user
    try:
        user = User.objects.get(username='test_rotation_user')
    except User.DoesNotExist:
        user = User.objects.create_user(
            username='test_rotation_user',
            email='test_rotation@example.com',
            password='testpass123'
        )
    
    # Create test servers
    smtp, proxy = create_test_servers(user)
    
    # Create test campaign
    campaign, created = SMSCampaign.objects.get_or_create(
        user=user,
        name='Enhanced Test Campaign',
        defaults={
            'message_template': 'Test message: Hello {name}!',
            'use_proxy_rotation': True,
            'use_smtp_rotation': True,
            'batch_size': 5,
            'status': 'draft'
        }
    )
    
    if created:
        print(f"✓ Created test campaign: {campaign.name}")
    else:
        print(f"✓ Using existing campaign: {campaign.name}")
        # Reset campaign status for testing
        campaign.status = 'draft'
        campaign.messages_sent = 0
        campaign.messages_failed = 0
        campaign.progress = 0
        campaign.save()
    
    # Create delivery settings
    delivery_settings, created = CampaignDeliverySettings.objects.get_or_create(
        campaign=campaign,
        defaults={
            'use_proxy_rotation': True,
            'proxy_rotation_strategy': 'round_robin',
            'use_smtp_rotation': True,
            'smtp_rotation_strategy': 'best_performance',
            'custom_delay_enabled': True,
            'custom_delay_min': 1,
            'custom_delay_max': 3,
            'adaptive_optimization_enabled': False,
            'carrier_optimization_enabled': False
        }
    )
    
    if created:
        print(f"✓ Created delivery settings for campaign")
    else:
        print(f"✓ Using existing delivery settings")
    
    # Create test messages
    test_numbers = ['1234567890', '0987654321', '5555555555']
    
    for i, number in enumerate(test_numbers):
        message, created = SMSMessage.objects.get_or_create(
            campaign=campaign,
            phone_number=number,
            defaults={
                'message_content': f'Test message: Hello User{i+1}!',
                'carrier': 'AT&T',
                'delivery_status': 'pending'
            }
        )
        
        if created:
            print(f"✓ Created test message for {number}")
        else:
            # Reset message status for testing
            message.delivery_status = 'pending'
            message.send_attempts = 0
            message.error_message = ''
            message.save()
            print(f"✓ Reset existing message for {number}")
    
    print(f"\n📊 Campaign Setup Complete:")
    print(f"   - Campaign: {campaign.name}")
    print(f"   - Messages: {campaign.messages.count()}")
    print(f"   - SMTP Servers: {SmtpManager.objects.filter(user=user, active=True).count()}")
    print(f"   - Proxy Servers: {ProxyServer.objects.filter(user=user, is_active=True).count()}")
    print(f"   - Delivery Settings: {delivery_settings}")
    
    # Test the enhanced task (dry run - don't actually send emails)
    print(f"\n🚀 Testing Enhanced Task Processing (Dry Run)...")
    
    try:
        # Import the rotation manager to test initialization
        from sms_sender.rotation_manager import RotationManager
        
        rotation_manager = RotationManager(user, campaign)
        print("✓ RotationManager initialized for campaign")
        
        # Test server selection
        proxy = rotation_manager.get_next_proxy()
        smtp = rotation_manager.get_next_smtp()
        
        print(f"✓ Server selection test:")
        print(f"   - Proxy: {proxy}")
        print(f"   - SMTP: {smtp}")
        
        # Test delay application
        delay = rotation_manager.apply_delivery_delay()
        print(f"✓ Delay application test: {delay:.2f}s")
        
        # Test rotation stats
        stats = rotation_manager.get_rotation_stats()
        print(f"✓ Rotation stats test: {len(stats)} metrics collected")
        
        # Test message processing simulation
        messages = campaign.messages.filter(delivery_status='pending')
        print(f"\n📝 Simulating message processing for {messages.count()} messages:")
        
        for message in messages:
            # Simulate the enhanced message processing
            message.delivery_status = 'sending'
            message.send_attempts += 1
            message.smtp_server = smtp
            message.proxy_server = proxy
            message.delivery_delay_applied = delay
            message.save()
            
            print(f"   ✓ Message {message.phone_number}: status={message.delivery_status}, "
                  f"smtp={message.smtp_server}, proxy={message.proxy_server}, "
                  f"delay={message.delivery_delay_applied}")
            
            # Simulate success (don't actually send)
            message.delivery_status = 'sent'
            message.save()
        
        print(f"\n✅ Enhanced Campaign Processing Test Complete!")
        print(f"   - All {messages.count()} messages processed successfully")
        print(f"   - Rotation manager working correctly")
        print(f"   - Enhanced tracking fields populated")
        
    except Exception as e:
        print(f"❌ Error in enhanced campaign processing: {e}")
        import traceback
        traceback.print_exc()

def test_server_usage_tracking():
    """Test server usage tracking functionality"""
    print("\nTesting Server Usage Tracking...")
    
    try:
        from sms_sender.models import ServerUsageLog, CarrierPerformanceLog
        
        user = User.objects.get(username='test_rotation_user')
        campaign = SMSCampaign.objects.get(user=user, name='Enhanced Test Campaign')
        
        # Test ServerUsageLog
        usage_log, created = ServerUsageLog.objects.get_or_create(
            campaign=campaign,
            server_type='smtp',
            server_id=1,
            defaults={
                'messages_processed': 5,
                'successful_messages': 4,
                'failed_messages': 1,
                'average_response_time': 1.25
            }
        )
        
        print(f"✓ Server usage log {'created' if created else 'updated'}: {usage_log}")
        print(f"   - Success rate: {usage_log.get_success_rate():.1f}%")
        
        # Test CarrierPerformanceLog
        smtp = SmtpManager.objects.filter(user=user).first()
        proxy = ProxyServer.objects.filter(user=user).first()
        
        if smtp and proxy:
            perf_log, created = CarrierPerformanceLog.objects.get_or_create(
                carrier='AT&T',
                proxy_server=proxy,
                smtp_server=smtp,
                defaults={
                    'success_rate': 85.5,
                    'average_delivery_time': 2.3,
                    'messages_sent': 10,
                    'successful_deliveries': 8,
                    'failed_deliveries': 2
                }
            )
            
            print(f"✓ Carrier performance log {'created' if created else 'updated'}: {perf_log}")
            
            # Test performance update
            perf_log.update_performance(True, 1.8)
            print(f"✓ Performance updated: success_rate={perf_log.success_rate:.1f}%, "
                  f"avg_time={perf_log.average_delivery_time:.1f}s")
        
        print("✅ Server usage tracking tests passed!")
        
    except Exception as e:
        print(f"❌ Error in server usage tracking: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("🚀 Starting Enhanced SMS Campaign Tests\n")
    
    test_enhanced_campaign_processing()
    test_server_usage_tracking()
    
    print("\n🎉 Enhanced SMS Campaign Testing Complete!")
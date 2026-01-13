"""
Test script for proxy rotation feature
Tests sending SMS through proxies with SMTP credentials
"""

import os
import django
import sys
import time

# Setup Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.contrib.auth import get_user_model
from smtps.models import SmtpManager
from proxy_server.models import ProxyServer
from sms_sender.models import SMSCampaign, SMSMessage
from sms_sender.tasks import send_enhanced_sms_message_simple

User = get_user_model()

def test_proxy_rotation(user_email, test_phone_number):
    """Test proxy rotation with actual SMTP sending"""
    print("=" * 60)
    print("PROXY ROTATION TEST")
    print("=" * 60)
    
    try:
        # Get user
        user = User.objects.get(email=user_email)
        print(f"\n✅ User found: {user.email}")
        
        # Get SMTP accounts
        smtp_accounts = SmtpManager.objects.filter(user=user, active=True, is_archived=False)
        if not smtp_accounts.exists():
            print("\n❌ No active SMTP accounts found!")
            print("Please add an SMTP account first.")
            return False
        
        smtp = smtp_accounts.first()
        print(f"✅ Using SMTP: {smtp.host}:{smtp.port}")
        
        # Get active proxies
        proxies = ProxyServer.objects.filter(user=user, is_active=True, is_archived=False)
        if not proxies.exists():
            print("\n❌ No active proxies found!")
            print("Run: python scripts/add_test_proxies.py <your-email>")
            return False
        
        print(f"✅ Found {proxies.count()} active proxies")
        
        # Create a test campaign
        campaign = SMSCampaign.objects.create(
            user=user,
            name="Proxy Rotation Test",
            message_template="Test message for proxy rotation feature. Time: {TIME}",
            custom_macros={"TIME": time.strftime("%H:%M:%S")},
            sender_name="Test",
            email_subject="Proxy Test",
            target_carrier="Verizon",
            status='active'
        )
        print(f"✅ Created test campaign: {campaign.name}")
        
        # Test with multiple proxies
        print(f"\n{'='*60}")
        print("TESTING PROXY ROTATION")
        print(f"{'='*60}\n")
        
        test_results = []
        
        for i, proxy in enumerate(proxies[:3], 1):  # Test with first 3 proxies
            print(f"\n--- Test {i}/3: Using proxy {proxy.host}:{proxy.port} ---")
            
            # Create test message
            message = SMSMessage.objects.create(
                campaign=campaign,
                phone_number=test_phone_number,
                carrier="Verizon",
                delivery_status='pending'
            )
            
            print(f"📱 Sending to: {test_phone_number}")
            print(f"🌐 Via proxy: {proxy.get_proxy_url()}")
            print(f"📧 Via SMTP: {smtp.host}:{smtp.port}")
            
            # Create rotation manager
            from sms_sender.rotation_manager import RotationManager
            rotation_manager = RotationManager(user, campaign)
            
            # Attempt to send
            start_time = time.time()
            try:
                success = send_enhanced_sms_message_simple(
                    message=message,
                    smtp=smtp,
                    proxy=proxy,
                    campaign=campaign,
                    rotation_manager=rotation_manager,
                    delay_applied=0.0
                )
                
                elapsed = time.time() - start_time
                
                # Refresh message from DB
                message.refresh_from_db()
                
                if success:
                    print(f"✅ SUCCESS! Delivered in {elapsed:.2f}s")
                    print(f"   Status: {message.delivery_status}")
                    test_results.append({
                        'proxy': f"{proxy.host}:{proxy.port}",
                        'success': True,
                        'time': elapsed,
                        'status': message.delivery_status
                    })
                else:
                    print(f"❌ FAILED after {elapsed:.2f}s")
                    print(f"   Status: {message.delivery_status}")
                    print(f"   Error: {message.error_message}")
                    test_results.append({
                        'proxy': f"{proxy.host}:{proxy.port}",
                        'success': False,
                        'time': elapsed,
                        'error': message.error_message
                    })
                    
            except Exception as e:
                elapsed = time.time() - start_time
                print(f"❌ EXCEPTION after {elapsed:.2f}s: {str(e)}")
                test_results.append({
                    'proxy': f"{proxy.host}:{proxy.port}",
                    'success': False,
                    'time': elapsed,
                    'error': str(e)
                })
            
            # Small delay between tests
            if i < 3:
                print("\n⏳ Waiting 2 seconds before next test...")
                time.sleep(2)
        
        # Print summary
        print(f"\n{'='*60}")
        print("TEST SUMMARY")
        print(f"{'='*60}\n")
        
        successful = sum(1 for r in test_results if r['success'])
        total = len(test_results)
        
        print(f"Total tests: {total}")
        print(f"Successful: {successful}")
        print(f"Failed: {total - successful}")
        print(f"Success rate: {(successful/total*100):.1f}%\n")
        
        print("Detailed Results:")
        for i, result in enumerate(test_results, 1):
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            print(f"\n{i}. {status}")
            print(f"   Proxy: {result['proxy']}")
            print(f"   Time: {result['time']:.2f}s")
            if result['success']:
                print(f"   Status: {result.get('status', 'sent')}")
            else:
                print(f"   Error: {result.get('error', 'Unknown')}")
        
        # Update campaign stats
        campaign.refresh_from_db()
        print(f"\n{'='*60}")
        print("CAMPAIGN STATS")
        print(f"{'='*60}")
        print(f"Messages sent: {campaign.messages_sent or 0}")
        print(f"Messages failed: {campaign.messages_failed or 0}")
        
        print(f"\n{'='*60}")
        print("TEST COMPLETE!")
        print(f"{'='*60}\n")
        
        return successful > 0
        
    except User.DoesNotExist:
        print(f"\n❌ User '{user_email}' not found!")
        return False
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python test_proxy_rotation.py <user_email> <test_phone_number>")
        print("\nExample: python test_proxy_rotation.py admin@example.com +1234567890")
        sys.exit(1)
    
    user_email = sys.argv[1]
    test_phone = sys.argv[2]
    
    success = test_proxy_rotation(user_email, test_phone)
    sys.exit(0 if success else 1)

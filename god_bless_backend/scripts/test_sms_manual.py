
import os
import sys
import django
from django.conf import settings
from django.db import models

# Setup Django environment
# We assume we are running inside the container where /app is the python path root
if '/app' not in sys.path:
    sys.path.append('/app')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.contrib.auth import get_user_model
from sms_sender.simple_sender import SimpleSMSSender
from smtps.models import SmtpManager
from proxy_server.models import ProxyServer

def test_manual_send():
    User = get_user_model()
    try:
        # Try finding 'admin' by username or email
        user = User.objects.filter(models.Q(username='admin') | models.Q(email='admin@example.com')).first()
        
        if not user:
             print("No admin user found. Creating 'admin'...")
             user = User.objects.create_superuser('admin@example.com', 'admin', 'admin')
        
        # Ensure admin flag is set (fix for potential bug in User manager)
        if not user.admin:
            print("Fixing admin flag for user...")
            user.admin = True
            user.save()
            
        print(f"Using user: {user.email or user.username}")
    except Exception as e:
        print(f"Error finding user: {e}")
```python

import os
import sys
import django
from django.conf import settings
from django.db import models

# Setup Django environment
# We assume we are running inside the container where /app is the python path root
if '/app' not in sys.path:
    sys.path.append('/app')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.contrib.auth import get_user_model
from sms_sender.simple_sender import SimpleSMSSender
from smtps.models import SmtpManager
from proxy_server.models import ProxyServer

def test_manual_send():
    User = get_user_model()
    try:
        # Try finding 'admin' by username or email
        user = User.objects.filter(models.Q(username='admin') | models.Q(email='admin@example.com')).first()
        
        if not user:
             print("No admin user found. Creating 'admin'...")
             user = User.objects.create_superuser('admin@example.com', 'admin', 'admin')
        
        # Ensure admin flag is set (fix for potential bug in User manager)
        if not user.admin:
            print("Fixing admin flag for user...")
            user.admin = True
            user.save()
            
        print(f"Using user: {user.email or user.username}")
    except Exception as e:
        print(f"Error finding user: {e}")
        return

    # Check for servers
    smtps = SmtpManager.objects.filter(user=user, active=True)
    proxies = ProxyServer.objects.filter(user=user, is_active=True)

    # Create or update SMTP with dummy credentials
    smtp, created = SmtpManager.objects.get_or_create(
        user=user,
        username='dummy@example.com',
        defaults={
            'host': 'smtp.example.com',
            'password': 'dummy_password',
            'port': 587,
            'active': True,
            'is_healthy': True
        }
    )
    if not created:
        # Reset to dummy if needed
        # smtp.host = 'smtp.example.com' 
        # smtp.save()
        pass
    
    print(f"Using SMTP: {smtp.host}:{smtp.port}")

    if not proxies.exists():
         print("No active Proxy servers found. Creating a DUMMY one.")
         ProxyServer.objects.create(
            user=user,
            host='127.0.0.1',
            port=8080,
            username='dummy',
            password='dummy',
            is_active=True
         )
    else:
        print(f"Found {proxies.count()} active Proxy servers.")
    
    sender = SimpleSMSSender(user)
    
    # Test 1: With Proxy
    payload_with_proxy = {
        "recipient": {
            "phone_number": "+15550109999", 
            "carrier": "Verizon"
        },
        "message_template": "Test message WITH PROXY {name}",
        "custom_macros": {"name": "Tester"},
        "delivery_settings": {
            "use_proxy_rotation": True,
            "use_smtp_rotation": True
        },
        "provider": "Verizon"
    }

    try:
        print(f"\nAttempting to send single SMS (WITH PROXY) to {payload_with_proxy['recipient']['phone_number']}...")
        result = sender.send_single(payload_with_proxy)
        print("Result:", result)
    except Exception as e:
        print(f"Send failed: {e}")

    # Test 2: SMTP Only (No Proxy)
    payload_smtp_only = {
        "recipient": {
            "phone_number": "+15550109999", 
            "carrier": "Verizon"
        },
        "message_template": "Test message SMTP ONLY {name}",
        "custom_macros": {"name": "Tester"},
        "delivery_settings": {
            "use_proxy_rotation": False, # DISABLED
            "use_smtp_rotation": True
        },
        "provider": "Verizon"
    }

    try:
        print(f"\nAttempting to send single SMS (SMTP ONLY) to {payload_smtp_only['recipient']['phone_number']}...")
        result = sender.send_single(payload_smtp_only)
        print("Result:", result)
        if result.get('delivery_status') == 'failed':
             print("FAILURE REASON: Check logs above for 'Recorded failure' warning.")
    except Exception as e:
        print(f"Send failed exception: {e}")

if __name__ == "__main__":
    test_manual_send()
```

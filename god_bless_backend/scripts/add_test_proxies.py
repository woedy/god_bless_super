"""
Script to add free test proxies to the database
Run this to populate your proxy server list for testing proxy rotation
"""

import os
import django
import sys

# Setup Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.contrib.auth import get_user_model
from proxy_server.models import ProxyServer

User = get_user_model()

# Free proxies from ProxyScrape (updated frequently)
FREE_PROXIES = [
    "188.42.89.101:80",
    "185.238.228.21:80",
    "185.176.26.131:80",
    "185.176.24.44:80",
    "185.162.229.103:80",
    "185.176.24.25:80",
    "195.245.221.77:80",
    "188.42.88.18:80",
    "185.148.104.68:80",
    "185.238.228.246:80",
]

def add_test_proxies(user_email):
    """Add free test proxies for a specific user"""
    try:
        user = User.objects.get(email=user_email)
        print(f"Adding proxies for user: {user.email}")
        
        added_count = 0
        for proxy_address in FREE_PROXIES:
            host, port = proxy_address.split(':')
            
            # Check if proxy already exists for this user
            existing = ProxyServer.objects.filter(
                user=user,
                host=host,
                port=int(port)
            ).first()
            
            if existing:
                print(f"  ⏭️  Skipping {proxy_address} (already exists)")
                continue
            
            # Create new proxy
            proxy = ProxyServer.objects.create(
                user=user,
                host=host,
                port=int(port),
                protocol='http',
                is_active=True,
                username='',
                password=''
            )
            print(f"  ✅ Added {proxy_address}")
            added_count += 1
        
        print(f"\n✨ Successfully added {added_count} new proxies!")
        print(f"📊 Total proxies for {user.email}: {ProxyServer.objects.filter(user=user).count()}")
        
    except User.DoesNotExist:
        print(f"❌ User with email '{user_email}' not found!")
        print("\nAvailable users:")
        for u in User.objects.all():
            print(f"  - {u.email}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python add_test_proxies.py <user_email>")
        print("\nExample: python add_test_proxies.py admin@example.com")
        sys.exit(1)
    
    user_email = sys.argv[1]
    add_test_proxies(user_email)

"""
Script to add free SOCKS5 proxies for testing
SOCKS5 proxies support SMTP connections unlike HTTP proxies
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

# Free SOCKS5 proxies from ProxyScrape (updated frequently)
FREE_SOCKS5_PROXIES = [
    "117.74.65.207:443",
    "91.142.78.8:20801",
    "67.43.228.252:3733",
    "72.10.160.174:18035",
    "117.74.65.207:80",
    "150.227.4.147:1081",
]

def add_socks5_proxies(user_email):
    """Add free SOCKS5 proxies for a specific user"""
    try:
        user = User.objects.get(email=user_email)
        print(f"Adding SOCKS5 proxies for user: {user.email}")
        
        # First, deactivate old HTTP proxies
        old_http = ProxyServer.objects.filter(user=user, protocol='http')
        if old_http.exists():
            count = old_http.update(is_active=False)
            print(f"  ℹ️  Deactivated {count} old HTTP proxies")
        
        added_count = 0
        for proxy_address in FREE_SOCKS5_PROXIES:
            host, port = proxy_address.split(':')
            
            # Check if proxy already exists for this user
            existing = ProxyServer.objects.filter(
                user=user,
                host=host,
                port=int(port)
            ).first()
            
            if existing:
                # Update to SOCKS5 if it exists
                existing.protocol = 'socks5'
                existing.is_active = True
                existing.save()
                print(f"  🔄 Updated {proxy_address} to SOCKS5")
                continue
            
            # Create new SOCKS5 proxy
            proxy = ProxyServer.objects.create(
                user=user,
                host=host,
                port=int(port),
                protocol='socks5',
                is_active=True,
                username='',
                password=''
            )
            print(f"  ✅ Added SOCKS5 proxy {proxy_address}")
            added_count += 1
        
        active_socks5 = ProxyServer.objects.filter(user=user, protocol='socks5', is_active=True).count()
        print(f"\n✨ Successfully added {added_count} new SOCKS5 proxies!")
        print(f"📊 Total active SOCKS5 proxies: {active_socks5}")
        
    except User.DoesNotExist:
        print(f"❌ User with email '{user_email}' not found!")
        print("\nAvailable users:")
        for u in User.objects.all():
            print(f"  - {u.email}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python add_socks5_proxies.py <user_email>")
        print("\nExample: python add_socks5_proxies.py admin@example.com")
        sys.exit(1)
    
    user_email = sys.argv[1]
    add_socks5_proxies(user_email)

#!/usr/bin/env python3
"""
Proxy Fetcher Script
Fetches free proxies from GeoNode and adds them to the database for testing
"""

import os
import sys
import django
import requests
import time
from datetime import datetime

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.contrib.auth import get_user_model
from proxy_server.models import ProxyServer

User = get_user_model()


class ProxyFetcher:
    """Fetches and manages proxy servers from GeoNode"""
    
    GEONODE_API_URL = "https://proxylist.geonode.com/api/proxy-list"
    
    def __init__(self, user_id=None):
        """Initialize with a specific user or use first available user"""
        if user_id:
            self.user = User.objects.get(id=user_id)
        else:
            # Use the first user (or create one for testing)
            self.user = User.objects.first()
            if not self.user:
                self.user = User.objects.create_user(
                    username='proxy_test_user',
                    email='test@example.com',
                    password='test123'
                )
                print(f"Created test user: {self.user.username}")
    
    def fetch_proxies(self, limit=500, protocols=None, countries=None, page=1):
        """Fetch proxies from GeoNode API using the specific URL"""
        # Use the exact URL you specified
        url = f"https://proxylist.geonode.com/api/proxy-list?limit=500&page=1&sort_by=lastChecked&sort_type=desc"
        
        # Add protocol filter if specified
        if protocols:
            url += f"&protocols={','.join(protocols)}"
        
        # Add country filter if specified
        if countries:
            url += f"&countries={','.join(countries)}"
        
        try:
            print(f"Fetching proxies from GeoNode...")
            print(f"Using URL: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            proxies = data.get('data', [])
            
            print(f"Fetched {len(proxies)} proxies from GeoNode")
            return proxies
            
        except requests.RequestException as e:
            print(f"Error fetching proxies: {e}")
            return []
    
    def add_proxy_to_database(self, proxy_data):
        """Add a single proxy to the database"""
        try:
            # Check if proxy already exists for this user
            existing = ProxyServer.objects.filter(
                user=self.user,
                host=proxy_data['ip'],
                port=proxy_data['port']
            ).first()
            
            if existing:
                print(f"Proxy {proxy_data['ip']}:{proxy_data['port']} already exists - skipping")
                return existing
            
            # Create new proxy
            proxy = ProxyServer.objects.create(
                user=self.user,
                host=proxy_data['ip'],
                port=proxy_data['port'],
                protocol=proxy_data.get('protocol', 'http').lower(),
                username=proxy_data.get('username'),
                password=proxy_data.get('password'),
                is_active=True,
                is_healthy=True  # Assume healthy until tested
            )
            
            print(f"Added proxy: {proxy.protocol}://{proxy.host}:{proxy.port}")
            return proxy
            
        except Exception as e:
            print(f"Error adding proxy {proxy_data.get('ip', 'unknown')}: {e}")
            return None
    
    def fetch_and_add_proxies(self, limit=20, protocols=['http', 'socks5'], countries=None, page=1):
        """Fetch proxies and add them to database"""
        print(f"Starting proxy fetch for user: {self.user.username}")
        print(f"Parameters: limit={limit}, protocols={protocols}, countries={countries}, page={page}")
        
        proxies_data = self.fetch_proxies(limit, protocols, countries, page)
        
        if not proxies_data:
            print("No proxies fetched")
            return []
        
        added_proxies = []
        for proxy_data in proxies_data:
            proxy = self.add_proxy_to_database(proxy_data)
            if proxy:
                added_proxies.append(proxy)
                # Small delay to avoid overwhelming the database
                time.sleep(0.1)
        
        print(f"\nSummary:")
        print(f"- Fetched: {len(proxies_data)} proxies")
        print(f"- Added: {len(added_proxies)} proxies")
        print(f"- User: {self.user.username}")
        
        return added_proxies
    
    def test_proxy_health(self, proxy):
        """Test health of a specific proxy"""
        from proxy_server.rotation_service import ProxyRotationService
        
        rotation_service = ProxyRotationService(self.user)
        is_healthy = rotation_service.check_proxy_health(proxy)
        
        print(f"Health check for {proxy.host}:{proxy.port} - {'Healthy' if is_healthy else 'Unhealthy'}")
        return is_healthy
    
    def test_all_proxies(self):
        """Test health of all user's proxies"""
        proxies = ProxyServer.objects.filter(user=self.user, is_active=True)
        print(f"Testing health for {len(proxies)} proxies...")
        
        healthy_count = 0
        for proxy in proxies:
            if self.test_proxy_health(proxy):
                healthy_count += 1
        
        print(f"Health test complete: {healthy_count}/{len(proxies)} proxies are healthy")


def main():
    """Main function to run the proxy fetcher"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Fetch proxies from GeoNode')
    parser.add_argument('--limit', type=int, default=20, help='Number of proxies to fetch')
    parser.add_argument('--protocols', nargs='+', default=['http', 'socks5'], 
                       help='Protocols to fetch (http, socks4, socks5)')
    parser.add_argument('--countries', nargs='+', help='Specific countries to fetch from')
    parser.add_argument('--user-id', type=int, help='User ID to assign proxies to')
    parser.add_argument('--test-health', action='store_true', help='Test proxy health after adding')
    parser.add_argument('--page', type=int, default=1, help='Page number for pagination')
    
    args = parser.parse_args()
    
    # Create fetcher
    fetcher = ProxyFetcher(user_id=args.user_id)
    
    # Fetch and add proxies
    proxies = fetcher.fetch_and_add_proxies(
        limit=args.limit,
        protocols=args.protocols,
        countries=args.countries,
        page=args.page
    )
    
    # Test health if requested
    if args.test_health and proxies:
        print("\nTesting proxy health...")
        fetcher.test_all_proxies()
    
    print("\nDone!")


if __name__ == '__main__':
    main()

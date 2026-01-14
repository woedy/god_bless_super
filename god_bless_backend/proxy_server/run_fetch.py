#!/usr/bin/env python3
"""
Simple script to run the proxy fetcher with common configurations
"""

import os
import sys

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from proxy_server.fetch_proxies import ProxyFetcher

def quick_fetch():
    """Quick fetch of 10 HTTP proxies"""
    print("=== Quick Proxy Fetch ===")
    fetcher = ProxyFetcher()
    proxies = fetcher.fetch_and_add_proxies(limit=10, protocols=['http'], page=1)
    return proxies

def fetch_socks5():
    """Fetch SOCKS5 proxies"""
    print("=== SOCKS5 Proxy Fetch ===")
    fetcher = ProxyFetcher()
    proxies = fetcher.fetch_and_add_proxies(limit=15, protocols=['socks5'], page=1)
    return proxies

def fetch_mixed():
    """Fetch mixed HTTP and SOCKS5 proxies"""
    print("=== Mixed Proxy Fetch ===")
    fetcher = ProxyFetcher()
    proxies = fetcher.fetch_and_add_proxies(limit=25, protocols=['http', 'socks5'], page=1)
    return proxies

def fetch_us_only():
    """Fetch proxies from US only"""
    print("=== US Only Proxy Fetch ===")
    fetcher = ProxyFetcher()
    proxies = fetcher.fetch_and_add_proxies(
        limit=20, 
        protocols=['http'], 
        countries=['US'],
        page=1
    )
    return proxies

def fetch_large_batch():
    """Fetch large batch of recently checked proxies"""
    print("=== Large Batch Fetch (500 proxies) ===")
    fetcher = ProxyFetcher()
    proxies = fetcher.fetch_and_add_proxies(limit=500, protocols=['http', 'socks5'], page=1)
    return proxies

if __name__ == '__main__':
    print("Proxy Fetcher - Choose an option:")
    print("1. Quick fetch (10 HTTP proxies)")
    print("2. SOCKS5 proxies (15)")
    print("3. Mixed HTTP/SOCKS5 (25)")
    print("4. US only (20)")
    print("5. Large batch (500 proxies)")
    
    try:
        choice = input("Enter choice (1-5): ").strip()
        
        if choice == '1':
            quick_fetch()
        elif choice == '2':
            fetch_socks5()
        elif choice == '3':
            fetch_mixed()
        elif choice == '4':
            fetch_us_only()
        elif choice == '5':
            fetch_large_batch()
        else:
            print("Invalid choice. Running quick fetch...")
            quick_fetch()
            
    except KeyboardInterrupt:
        print("\nCancelled by user")
    except Exception as e:
        print(f"Error: {e}")
        # Run quick fetch as fallback
        quick_fetch()

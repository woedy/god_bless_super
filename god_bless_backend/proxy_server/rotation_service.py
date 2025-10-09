"""
Proxy Rotation Service
Handles intelligent proxy server rotation with health checking
"""
import random
import requests
from typing import Optional
from django.utils import timezone
from django.core.cache import cache
from .models import ProxyServer, RotationSettings


class ProxyRotationService:
    """Service for managing proxy rotation"""
    
    HEALTH_CHECK_URL = "https://httpbin.org/ip"
    HEALTH_CHECK_TIMEOUT = 10
    
    def __init__(self, user):
        self.user = user
        self.settings = self._get_or_create_settings()
    
    def _get_or_create_settings(self):
        """Get or create rotation settings for user"""
        settings, created = RotationSettings.objects.get_or_create(
            user=self.user,
            defaults={
                'proxy_rotation_enabled': True,
                'proxy_rotation_strategy': 'round_robin',
                'proxy_health_check_interval': 300,
                'proxy_max_failures': 3
            }
        )
        return settings
    
    def get_next_proxy(self) -> Optional[ProxyServer]:
        """Get next proxy based on rotation strategy"""
        if not self.settings.proxy_rotation_enabled:
            return None
        
        # Get all active and healthy proxies
        proxies = ProxyServer.objects.filter(
            user=self.user,
            is_active=True,
            is_healthy=True,
            is_archived=False
        )
        
        if not proxies.exists():
            return None
        
        strategy = self.settings.proxy_rotation_strategy
        
        if strategy == 'round_robin':
            return self._round_robin_selection(proxies)
        elif strategy == 'random':
            return self._random_selection(proxies)
        elif strategy == 'least_used':
            return self._least_used_selection(proxies)
        elif strategy == 'best_performance':
            return self._best_performance_selection(proxies)
        
        return proxies.first()
    
    def _round_robin_selection(self, proxies):
        """Round-robin proxy selection"""
        cache_key = f'proxy_rotation_index_{self.user.id}'
        current_index = cache.get(cache_key, 0)
        
        proxy_list = list(proxies)
        if not proxy_list:
            return None
        
        proxy = proxy_list[current_index % len(proxy_list)]
        cache.set(cache_key, (current_index + 1) % len(proxy_list), timeout=3600)
        
        return proxy
    
    def _random_selection(self, proxies):
        """Random proxy selection"""
        proxy_list = list(proxies)
        return random.choice(proxy_list) if proxy_list else None
    
    def _least_used_selection(self, proxies):
        """Select proxy with least usage"""
        return proxies.order_by('total_requests').first()
    
    def _best_performance_selection(self, proxies):
        """Select proxy with best success rate"""
        best_proxy = None
        best_rate = 0
        
        for proxy in proxies:
            if proxy.total_requests > 0:
                success_rate = proxy.successful_requests / proxy.total_requests
                if success_rate > best_rate:
                    best_rate = success_rate
                    best_proxy = proxy
        
        return best_proxy or proxies.first()
    
    def check_proxy_health(self, proxy: ProxyServer) -> bool:
        """Check if proxy is healthy"""
        try:
            proxies = {
                'http': proxy.get_proxy_url(),
                'https': proxy.get_proxy_url()
            }
            
            response = requests.get(
                self.HEALTH_CHECK_URL,
                proxies=proxies,
                timeout=self.HEALTH_CHECK_TIMEOUT
            )
            
            if response.status_code == 200:
                proxy.is_healthy = True
                proxy.health_check_failures = 0
                proxy.last_health_check = timezone.now()
                proxy.save()
                return True
            else:
                proxy.mark_failure()
                return False
                
        except Exception as e:
            proxy.mark_failure()
            proxy.last_health_check = timezone.now()
            proxy.save()
            return False
    
    def check_all_proxies_health(self):
        """Check health of all user's proxies"""
        proxies = ProxyServer.objects.filter(
            user=self.user,
            is_active=True,
            is_archived=False
        )
        
        results = []
        for proxy in proxies:
            is_healthy = self.check_proxy_health(proxy)
            results.append({
                'proxy_id': proxy.id,
                'proxy': str(proxy),
                'is_healthy': is_healthy
            })
        
        return results
    
    def record_success(self, proxy: ProxyServer, response_time: float = None):
        """Record successful proxy usage"""
        # The proxy.mark_success() is already called in the RotationManager
        # This method is for consistency with SMTP service interface
        pass
    
    def record_failure(self, proxy: ProxyServer, error: str, error_type: str = None):
        """Record proxy failure"""
        # The proxy.mark_failure() is already called in the RotationManager
        # This method is for consistency with SMTP service interface
        pass
    
    def get_rotation_stats(self):
        """Get rotation statistics"""
        proxies = ProxyServer.objects.filter(
            user=self.user,
            is_archived=False
        )
        
        total_proxies = proxies.count()
        active_proxies = proxies.filter(is_active=True).count()
        healthy_proxies = proxies.filter(is_healthy=True, is_active=True).count()
        
        total_requests = sum(p.total_requests for p in proxies)
        successful_requests = sum(p.successful_requests for p in proxies)
        failed_requests = sum(p.failed_requests for p in proxies)
        
        success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'total_proxies': total_proxies,
            'active_proxies': active_proxies,
            'healthy_proxies': healthy_proxies,
            'total_requests': total_requests,
            'successful_requests': successful_requests,
            'failed_requests': failed_requests,
            'success_rate': round(success_rate, 2),
            'rotation_enabled': self.settings.proxy_rotation_enabled,
            'rotation_strategy': self.settings.proxy_rotation_strategy
        }

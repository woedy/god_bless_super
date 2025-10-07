"""
Rate limiting implementation for API endpoints.
Prevents abuse and ensures fair usage of the platform.
"""

import time
from typing import Optional, Tuple
from django.core.cache import cache
from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.exceptions import Throttled


class BaseRateLimiter:
    """Base rate limiter using Redis/cache backend"""
    
    def __init__(self, key_prefix: str, rate: int, period: int):
        """
        Initialize rate limiter
        
        Args:
            key_prefix: Prefix for cache keys
            rate: Number of allowed requests
            period: Time period in seconds
        """
        self.key_prefix = key_prefix
        self.rate = rate
        self.period = period
    
    def get_cache_key(self, identifier: str) -> str:
        """Generate cache key for identifier"""
        return f"rate_limit:{self.key_prefix}:{identifier}"
    
    def is_allowed(self, identifier: str) -> Tuple[bool, Optional[int]]:
        """
        Check if request is allowed
        
        Returns:
            Tuple of (is_allowed, retry_after_seconds)
        """
        cache_key = self.get_cache_key(identifier)
        
        # Get current request data
        request_data = cache.get(cache_key)
        current_time = time.time()
        
        if request_data is None:
            # First request
            cache.set(cache_key, {
                'count': 1,
                'reset_time': current_time + self.period
            }, self.period)
            return True, None
        
        # Check if period has expired
        if current_time >= request_data['reset_time']:
            # Reset counter
            cache.set(cache_key, {
                'count': 1,
                'reset_time': current_time + self.period
            }, self.period)
            return True, None
        
        # Check if rate limit exceeded
        if request_data['count'] >= self.rate:
            retry_after = int(request_data['reset_time'] - current_time)
            return False, retry_after
        
        # Increment counter
        request_data['count'] += 1
        remaining_time = int(request_data['reset_time'] - current_time)
        cache.set(cache_key, request_data, remaining_time)
        
        return True, None
    
    def get_usage(self, identifier: str) -> dict:
        """Get current usage statistics"""
        cache_key = self.get_cache_key(identifier)
        request_data = cache.get(cache_key)
        
        if request_data is None:
            return {
                'count': 0,
                'limit': self.rate,
                'remaining': self.rate,
                'reset_time': None
            }
        
        return {
            'count': request_data['count'],
            'limit': self.rate,
            'remaining': max(0, self.rate - request_data['count']),
            'reset_time': request_data['reset_time']
        }


class UserRateLimiter(BaseRateLimiter):
    """Rate limiter for authenticated users"""
    
    def __init__(self, rate: int = 1000, period: int = 3600):
        """Default: 1000 requests per hour"""
        super().__init__('user', rate, period)


class IPRateLimiter(BaseRateLimiter):
    """Rate limiter for IP addresses"""
    
    def __init__(self, rate: int = 100, period: int = 3600):
        """Default: 100 requests per hour"""
        super().__init__('ip', rate, period)


class EndpointRateLimiter(BaseRateLimiter):
    """Rate limiter for specific endpoints"""
    
    def __init__(self, endpoint: str, rate: int = 60, period: int = 60):
        """Default: 60 requests per minute"""
        super().__init__(f'endpoint:{endpoint}', rate, period)


# DRF Throttle Classes

class UserRateThrottle(SimpleRateThrottle):
    """DRF throttle for authenticated users"""
    scope = 'user'
    
    def allow_request(self, request, view):
        """
        Override to check user's individual rate limit
        """
        # Check if rate limiting is globally disabled
        from django.conf import settings
        if not getattr(settings, 'RATE_LIMIT_ENABLE', True):
            return True
            
        if request.user and request.user.is_authenticated:
            # Check if user has unlimited rate limit (0 means unlimited)
            user_rate_limit = getattr(request.user, 'api_rate_limit', 1000)
            if user_rate_limit == 0:
                return True
        
        # Use default throttling logic
        return super().allow_request(request, view)
    
    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class AnonRateThrottle(SimpleRateThrottle):
    """DRF throttle for anonymous users"""
    scope = 'anon'
    
    def allow_request(self, request, view):
        """Override to check global rate limiting setting"""
        from django.conf import settings
        if not getattr(settings, 'RATE_LIMIT_ENABLE', True):
            return True
        return super().allow_request(request, view)
    
    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return None  # Only throttle unauthenticated requests
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class BurstRateThrottle(SimpleRateThrottle):
    """DRF throttle for burst protection"""
    scope = 'burst'
    
    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class SustainedRateThrottle(SimpleRateThrottle):
    """DRF throttle for sustained usage"""
    scope = 'sustained'
    
    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


# Endpoint-specific rate limiters

class AuthenticationRateThrottle(SimpleRateThrottle):
    """Rate limiter for authentication endpoints"""
    scope = 'auth'
    
    def get_cache_key(self, request, view):
        # Use IP address for auth endpoints
        ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class PhoneGenerationRateThrottle(SimpleRateThrottle):
    """Rate limiter for phone generation endpoints"""
    scope = 'phone_generation'
    
    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class SMSSendingRateThrottle(SimpleRateThrottle):
    """Rate limiter for SMS sending endpoints"""
    scope = 'sms_sending'
    
    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


def get_client_ip(request) -> str:
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def check_rate_limit(request, limiter: BaseRateLimiter, identifier: Optional[str] = None) -> Tuple[bool, Optional[int]]:
    """
    Check rate limit for a request
    
    Args:
        request: Django request object
        limiter: Rate limiter instance
        identifier: Optional custom identifier (defaults to user ID or IP)
    
    Returns:
        Tuple of (is_allowed, retry_after_seconds)
    """
    if identifier is None:
        if hasattr(request, 'user') and request.user.is_authenticated:
            identifier = str(request.user.id)
        else:
            identifier = get_client_ip(request)
    
    return limiter.is_allowed(identifier)

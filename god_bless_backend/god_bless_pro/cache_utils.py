"""
Caching utilities and decorators for Django views and functions.
"""
from functools import wraps
from django.core.cache import cache
from django.conf import settings
import hashlib
import json
from typing import Any, Callable, Optional


def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Generate a unique cache key from function arguments.
    
    Args:
        prefix: Cache key prefix
        *args: Positional arguments
        **kwargs: Keyword arguments
    
    Returns:
        Unique cache key string
    """
    # Create a string representation of arguments
    key_parts = [prefix]
    
    # Add positional arguments
    for arg in args:
        if hasattr(arg, 'id'):
            key_parts.append(str(arg.id))
        else:
            key_parts.append(str(arg))
    
    # Add keyword arguments (sorted for consistency)
    for key in sorted(kwargs.keys()):
        value = kwargs[key]
        if hasattr(value, 'id'):
            key_parts.append(f"{key}:{value.id}")
        else:
            key_parts.append(f"{key}:{value}")
    
    # Create hash of the key parts
    key_string = ':'.join(key_parts)
    key_hash = hashlib.md5(key_string.encode()).hexdigest()
    
    return f"{prefix}:{key_hash}"


def cache_result(timeout: int = 300, key_prefix: Optional[str] = None):
    """
    Decorator to cache function results.
    
    Args:
        timeout: Cache timeout in seconds (default: 5 minutes)
        key_prefix: Optional cache key prefix (defaults to function name)
    
    Usage:
        @cache_result(timeout=600, key_prefix='user_stats')
        def get_user_statistics(user_id):
            # Expensive computation
            return stats
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            prefix = key_prefix or f"func:{func.__module__}.{func.__name__}"
            cache_key = generate_cache_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Compute and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, timeout)
            
            return result
        
        return wrapper
    return decorator


def cache_queryset(timeout: int = 300, key_prefix: Optional[str] = None):
    """
    Decorator to cache Django queryset results.
    Converts queryset to list before caching.
    
    Args:
        timeout: Cache timeout in seconds (default: 5 minutes)
        key_prefix: Optional cache key prefix
    
    Usage:
        @cache_queryset(timeout=600, key_prefix='active_users')
        def get_active_users():
            return User.objects.filter(is_active=True)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            prefix = key_prefix or f"qs:{func.__module__}.{func.__name__}"
            cache_key = generate_cache_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Execute queryset and convert to list
            result = func(*args, **kwargs)
            
            # Cache the result
            cache.set(cache_key, result, timeout)
            
            return result
        
        return wrapper
    return decorator


def invalidate_cache(key_prefix: str, *args, **kwargs):
    """
    Invalidate a specific cache entry.
    
    Args:
        key_prefix: Cache key prefix
        *args: Positional arguments used in cache key
        **kwargs: Keyword arguments used in cache key
    """
    cache_key = generate_cache_key(key_prefix, *args, **kwargs)
    cache.delete(cache_key)


def invalidate_cache_pattern(pattern: str):
    """
    Invalidate all cache entries matching a pattern.
    Note: This requires Redis backend with django-redis.
    
    Args:
        pattern: Pattern to match (e.g., 'user:*')
    """
    try:
        from django_redis import get_redis_connection
        redis_conn = get_redis_connection("default")
        
        # Get all keys matching pattern
        keys = redis_conn.keys(f"*{pattern}*")
        
        if keys:
            redis_conn.delete(*keys)
            return len(keys)
        return 0
    except Exception as e:
        print(f"Error invalidating cache pattern: {e}")
        return 0


class CacheManager:
    """
    Context manager for caching operations.
    
    Usage:
        with CacheManager('user_data', user_id=123, timeout=600) as cm:
            if cm.cached_value is None:
                data = expensive_operation()
                cm.set(data)
            return cm.cached_value
    """
    
    def __init__(self, key_prefix: str, timeout: int = 300, **key_params):
        self.key_prefix = key_prefix
        self.timeout = timeout
        self.key_params = key_params
        self.cache_key = generate_cache_key(key_prefix, **key_params)
        self.cached_value = None
    
    def __enter__(self):
        self.cached_value = cache.get(self.cache_key)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        return False
    
    def set(self, value: Any):
        """Set cache value"""
        cache.set(self.cache_key, value, self.timeout)
        self.cached_value = value
    
    def invalidate(self):
        """Invalidate this cache entry"""
        cache.delete(self.cache_key)
        self.cached_value = None


# Predefined cache timeouts
CACHE_TIMEOUTS = {
    'short': 60,          # 1 minute
    'medium': 300,        # 5 minutes
    'long': 1800,         # 30 minutes
    'very_long': 3600,    # 1 hour
    'day': 86400,         # 24 hours
}


def get_cache_timeout(duration: str = 'medium') -> int:
    """
    Get cache timeout by duration name.
    
    Args:
        duration: Duration name ('short', 'medium', 'long', 'very_long', 'day')
    
    Returns:
        Timeout in seconds
    """
    return CACHE_TIMEOUTS.get(duration, CACHE_TIMEOUTS['medium'])

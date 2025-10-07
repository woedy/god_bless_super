"""
Redis caching utilities for frequently accessed data.
"""
import json
import hashlib
from functools import wraps
from typing import Any, Optional, Callable
from django.core.cache import cache
from django.conf import settings


class CacheManager:
    """Manager for Redis caching operations."""
    
    # Cache timeout constants (in seconds)
    TIMEOUT_SHORT = 60 * 5  # 5 minutes
    TIMEOUT_MEDIUM = 60 * 30  # 30 minutes
    TIMEOUT_LONG = 60 * 60 * 2  # 2 hours
    TIMEOUT_VERY_LONG = 60 * 60 * 24  # 24 hours
    
    # Cache key prefixes
    PREFIX_PHONE = "phone:"
    PREFIX_USER = "user:"
    PREFIX_SMS = "sms:"
    PREFIX_SETTINGS = "settings:"
    PREFIX_STATS = "stats:"
    PREFIX_CARRIER = "carrier:"
    PREFIX_VALIDATION = "validation:"
    
    @staticmethod
    def generate_key(*args, **kwargs) -> str:
        """Generate a cache key from arguments."""
        key_data = f"{args}:{sorted(kwargs.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    @staticmethod
    def get(key: str, default: Any = None) -> Any:
        """Get value from cache."""
        try:
            value = cache.get(key, default)
            return value
        except Exception as e:
            print(f"Cache get error: {e}")
            return default
    
    @staticmethod
    def set(key: str, value: Any, timeout: int = TIMEOUT_MEDIUM) -> bool:
        """Set value in cache."""
        try:
            cache.set(key, value, timeout)
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    @staticmethod
    def delete(key: str) -> bool:
        """Delete value from cache."""
        try:
            cache.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    @staticmethod
    def delete_pattern(pattern: str) -> bool:
        """Delete all keys matching pattern."""
        try:
            if hasattr(cache, 'delete_pattern'):
                cache.delete_pattern(pattern)
            return True
        except Exception as e:
            print(f"Cache delete pattern error: {e}")
            return False
    
    @staticmethod
    def clear_all() -> bool:
        """Clear all cache."""
        try:
            cache.clear()
            return True
        except Exception as e:
            print(f"Cache clear error: {e}")
            return False


def cache_result(timeout: int = CacheManager.TIMEOUT_MEDIUM, key_prefix: str = ""):
    """
    Decorator to cache function results.
    
    Usage:
        @cache_result(timeout=300, key_prefix="user_data")
        def get_user_data(user_id):
            return expensive_operation(user_id)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{CacheManager.generate_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = CacheManager.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            CacheManager.set(cache_key, result, timeout)
            
            return result
        return wrapper
    return decorator


def invalidate_cache(key_prefix: str):
    """
    Decorator to invalidate cache after function execution.
    
    Usage:
        @invalidate_cache(key_prefix="user_data")
        def update_user(user_id, data):
            # Update user logic
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            # Invalidate cache pattern
            CacheManager.delete_pattern(f"{key_prefix}:*")
            return result
        return wrapper
    return decorator


# Specific cache helpers for common operations

class PhoneNumberCache:
    """Cache helpers for phone number operations."""
    
    @staticmethod
    def get_carrier_stats(user_id: int) -> Optional[dict]:
        """Get cached carrier statistics."""
        key = f"{CacheManager.PREFIX_CARRIER}stats:{user_id}"
        return CacheManager.get(key)
    
    @staticmethod
    def set_carrier_stats(user_id: int, stats: dict, timeout: int = CacheManager.TIMEOUT_MEDIUM):
        """Cache carrier statistics."""
        key = f"{CacheManager.PREFIX_CARRIER}stats:{user_id}"
        CacheManager.set(key, stats, timeout)
    
    @staticmethod
    def get_validation_result(phone_number: str) -> Optional[dict]:
        """Get cached validation result."""
        key = f"{CacheManager.PREFIX_VALIDATION}{phone_number}"
        return CacheManager.get(key)
    
    @staticmethod
    def set_validation_result(phone_number: str, result: dict, timeout: int = CacheManager.TIMEOUT_LONG):
        """Cache validation result."""
        key = f"{CacheManager.PREFIX_VALIDATION}{phone_number}"
        CacheManager.set(key, result, timeout)
    
    @staticmethod
    def invalidate_user_phones(user_id: int):
        """Invalidate all phone-related cache for a user."""
        CacheManager.delete_pattern(f"{CacheManager.PREFIX_PHONE}*:{user_id}:*")
        CacheManager.delete_pattern(f"{CacheManager.PREFIX_CARRIER}*:{user_id}:*")


class UserCache:
    """Cache helpers for user operations."""
    
    @staticmethod
    def get_settings(user_id: int) -> Optional[dict]:
        """Get cached user settings."""
        key = f"{CacheManager.PREFIX_SETTINGS}{user_id}"
        return CacheManager.get(key)
    
    @staticmethod
    def set_settings(user_id: int, settings: dict, timeout: int = CacheManager.TIMEOUT_LONG):
        """Cache user settings."""
        key = f"{CacheManager.PREFIX_SETTINGS}{user_id}"
        CacheManager.set(key, settings, timeout)
    
    @staticmethod
    def invalidate_settings(user_id: int):
        """Invalidate user settings cache."""
        key = f"{CacheManager.PREFIX_SETTINGS}{user_id}"
        CacheManager.delete(key)


class StatsCache:
    """Cache helpers for statistics and dashboard data."""
    
    @staticmethod
    def get_dashboard_stats(user_id: int) -> Optional[dict]:
        """Get cached dashboard statistics."""
        key = f"{CacheManager.PREFIX_STATS}dashboard:{user_id}"
        return CacheManager.get(key)
    
    @staticmethod
    def set_dashboard_stats(user_id: int, stats: dict, timeout: int = CacheManager.TIMEOUT_SHORT):
        """Cache dashboard statistics."""
        key = f"{CacheManager.PREFIX_STATS}dashboard:{user_id}"
        CacheManager.set(key, stats, timeout)
    
    @staticmethod
    def invalidate_dashboard_stats(user_id: int):
        """Invalidate dashboard statistics cache."""
        key = f"{CacheManager.PREFIX_STATS}dashboard:{user_id}"
        CacheManager.delete(key)

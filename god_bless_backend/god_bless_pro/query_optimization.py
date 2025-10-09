"""
Database query optimization utilities.
"""
from django.db.models import QuerySet, Prefetch, Count, Q
from typing import List, Optional
from functools import wraps


def optimize_phone_number_query(queryset: QuerySet) -> QuerySet:
    """
    Optimize PhoneNumber queryset with select_related and prefetch_related.
    
    Args:
        queryset: PhoneNumber queryset
    
    Returns:
        Optimized queryset
    """
    return queryset.select_related('user', 'project')


def optimize_task_query(queryset: QuerySet) -> QuerySet:
    """
    Optimize TaskProgress queryset with select_related.
    
    Args:
        queryset: TaskProgress queryset
    
    Returns:
        Optimized queryset
    """
    return queryset.select_related('user')


def optimize_campaign_query(queryset: QuerySet) -> QuerySet:
    """
    Optimize SMSCampaign queryset with related data.
    
    Args:
        queryset: SMSCampaign queryset
    
    Returns:
        Optimized queryset
    """
    return queryset.select_related('user').prefetch_related('messages')


def bulk_create_optimized(model_class, objects: List, batch_size: int = 1000):
    """
    Optimized bulk create with batching.
    
    Args:
        model_class: Django model class
        objects: List of model instances
        batch_size: Number of objects per batch
    
    Returns:
        List of created objects
    """
    created_objects = []
    
    for i in range(0, len(objects), batch_size):
        batch = objects[i:i + batch_size]
        created_objects.extend(
            model_class.objects.bulk_create(batch, ignore_conflicts=True)
        )
    
    return created_objects


def bulk_update_optimized(objects: List, fields: List[str], batch_size: int = 1000):
    """
    Optimized bulk update with batching.
    
    Args:
        objects: List of model instances to update
        fields: List of field names to update
        batch_size: Number of objects per batch
    
    Returns:
        Number of updated objects
    """
    from django.db import models
    
    if not objects:
        return 0
    
    model_class = objects[0].__class__
    total_updated = 0
    
    for i in range(0, len(objects), batch_size):
        batch = objects[i:i + batch_size]
        model_class.objects.bulk_update(batch, fields, batch_size=batch_size)
        total_updated += len(batch)
    
    return total_updated


def paginate_queryset(queryset: QuerySet, page: int = 1, page_size: int = 100):
    """
    Efficiently paginate a queryset.
    
    Args:
        queryset: Django queryset
        page: Page number (1-indexed)
        page_size: Number of items per page
    
    Returns:
        Tuple of (paginated_items, total_count, total_pages)
    """
    from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
    
    paginator = Paginator(queryset, page_size)
    total_count = paginator.count
    total_pages = paginator.num_pages
    
    try:
        paginated_items = paginator.page(page)
    except PageNotAnInteger:
        paginated_items = paginator.page(1)
    except EmptyPage:
        paginated_items = paginator.page(total_pages)
    
    return paginated_items, total_count, total_pages


def optimize_queryset_decorator(optimization_func):
    """
    Decorator to automatically optimize querysets returned by view functions.
    
    Args:
        optimization_func: Function that takes a queryset and returns optimized queryset
    
    Usage:
        @optimize_queryset_decorator(optimize_phone_number_query)
        def get_phone_numbers(user):
            return PhoneNumber.objects.filter(user=user)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            
            # Only optimize if result is a QuerySet
            if isinstance(result, QuerySet):
                return optimization_func(result)
            
            return result
        
        return wrapper
    return decorator


class QueryOptimizer:
    """
    Context manager for query optimization and monitoring.
    
    Usage:
        with QueryOptimizer() as qo:
            users = User.objects.all()
            # ... perform queries
        
        print(f"Queries executed: {qo.query_count}")
    """
    
    def __init__(self, log_queries: bool = False):
        self.log_queries = log_queries
        self.query_count = 0
        self.queries = []
    
    def __enter__(self):
        from django.db import connection, reset_queries
        from django.conf import settings
        
        if settings.DEBUG:
            reset_queries()
        
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        from django.db import connection
        from django.conf import settings
        
        if settings.DEBUG:
            self.query_count = len(connection.queries)
            self.queries = connection.queries
            
            if self.log_queries:
                print(f"\n{'='*60}")
                print(f"Query Optimization Report")
                print(f"{'='*60}")
                print(f"Total queries: {self.query_count}")
                
                if self.query_count > 20:
                    print(f"⚠️  WARNING: High query count detected!")
                
                if self.log_queries and self.queries:
                    print(f"\nQuery details:")
                    for i, query in enumerate(self.queries, 1):
                        print(f"\n{i}. {query['sql'][:100]}...")
                        print(f"   Time: {query['time']}s")
                
                print(f"{'='*60}\n")
        
        return False


def get_or_create_cached(model_class, cache_key: str, defaults: dict, **lookup):
    """
    Get or create with caching support.
    
    Args:
        model_class: Django model class
        cache_key: Cache key for the object
        defaults: Default values for creation
        **lookup: Lookup parameters
    
    Returns:
        Tuple of (object, created)
    """
    from django.core.cache import cache
    
    # Try cache first
    cached_obj = cache.get(cache_key)
    if cached_obj is not None:
        return cached_obj, False
    
    # Get or create from database
    obj, created = model_class.objects.get_or_create(defaults=defaults, **lookup)
    
    # Cache the object
    cache.set(cache_key, obj, 300)  # 5 minutes
    
    return obj, created


def count_with_cache(queryset: QuerySet, cache_key: str, timeout: int = 300) -> int:
    """
    Count queryset results with caching.
    
    Args:
        queryset: Django queryset
        cache_key: Cache key for count
        timeout: Cache timeout in seconds
    
    Returns:
        Count of queryset
    """
    from django.core.cache import cache
    
    # Try cache first
    cached_count = cache.get(cache_key)
    if cached_count is not None:
        return cached_count
    
    # Count from database
    count = queryset.count()
    
    # Cache the count
    cache.set(cache_key, count, timeout)
    
    return count


def exists_with_cache(queryset: QuerySet, cache_key: str, timeout: int = 300) -> bool:
    """
    Check queryset existence with caching.
    
    Args:
        queryset: Django queryset
        cache_key: Cache key for existence check
        timeout: Cache timeout in seconds
    
    Returns:
        True if queryset has results, False otherwise
    """
    from django.core.cache import cache
    
    # Try cache first
    cached_exists = cache.get(cache_key)
    if cached_exists is not None:
        return cached_exists
    
    # Check existence in database
    exists = queryset.exists()
    
    # Cache the result
    cache.set(cache_key, exists, timeout)
    
    return exists

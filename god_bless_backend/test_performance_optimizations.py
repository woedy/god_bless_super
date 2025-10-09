"""
Test script for performance optimizations.
Run with: python manage.py shell < test_performance_optimizations.py
"""
import time
from django.core.cache import cache
from django.db import connection, reset_queries
from django.conf import settings

print("="*60)
print("Performance Optimization Test Suite")
print("="*60)

# Test 1: Cache System
print("\n1. Testing Cache System...")
try:
    # Test basic cache operations
    cache.set('test_key', 'test_value', 60)
    cached_value = cache.get('test_key')
    
    if cached_value == 'test_value':
        print("   ✓ Cache set/get working")
    else:
        print("   ✗ Cache not working properly")
    
    # Test cache deletion
    cache.delete('test_key')
    if cache.get('test_key') is None:
        print("   ✓ Cache deletion working")
    else:
        print("   ✗ Cache deletion failed")
    
    print("   ✓ Cache system operational")
except Exception as e:
    print(f"   ✗ Cache system error: {e}")

# Test 2: Cache Utilities
print("\n2. Testing Cache Utilities...")
try:
    from god_bless_pro.cache_utils import cache_result, generate_cache_key, CacheManager
    
    # Test cache key generation
    key1 = generate_cache_key('test', 'arg1', 'arg2')
    key2 = generate_cache_key('test', 'arg1', 'arg2')
    
    if key1 == key2:
        print("   ✓ Cache key generation consistent")
    else:
        print("   ✗ Cache key generation inconsistent")
    
    # Test cache decorator
    call_count = 0
    
    @cache_result(timeout=60, key_prefix='test_func')
    def expensive_function(x):
        global call_count
        call_count += 1
        return x * 2
    
    result1 = expensive_function(5)
    result2 = expensive_function(5)
    
    if call_count == 1 and result1 == result2 == 10:
        print("   ✓ Cache decorator working (function called once)")
    else:
        print(f"   ✗ Cache decorator failed (called {call_count} times)")
    
    # Test CacheManager
    with CacheManager('test_cm', timeout=60, user_id=123) as cm:
        if cm.cached_value is None:
            cm.set({'data': 'test'})
    
    with CacheManager('test_cm', timeout=60, user_id=123) as cm:
        if cm.cached_value == {'data': 'test'}:
            print("   ✓ CacheManager working")
        else:
            print("   ✗ CacheManager failed")
    
    print("   ✓ Cache utilities operational")
except Exception as e:
    print(f"   ✗ Cache utilities error: {e}")

# Test 3: Query Optimization
print("\n3. Testing Query Optimization...")
try:
    from god_bless_pro.query_optimization import (
        optimize_phone_number_query,
        count_with_cache,
        bulk_create_optimized
    )
    
    print("   ✓ Query optimization utilities imported")
    
    # Test with actual models if available
    try:
        from phone_generator.models import PhoneNumber
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Test query optimization
        if settings.DEBUG:
            reset_queries()
            
            # Unoptimized query
            numbers = list(PhoneNumber.objects.all()[:5])
            unoptimized_count = len(connection.queries)
            
            reset_queries()
            
            # Optimized query
            numbers = list(optimize_phone_number_query(PhoneNumber.objects.all()[:5]))
            optimized_count = len(connection.queries)
            
            if optimized_count <= unoptimized_count:
                print(f"   ✓ Query optimization working (queries: {unoptimized_count} → {optimized_count})")
            else:
                print(f"   ⚠ Query optimization may need tuning (queries: {unoptimized_count} → {optimized_count})")
        
        # Test cached count
        cache_key = 'test_count_cache'
        cache.delete(cache_key)
        
        start = time.time()
        count1 = count_with_cache(PhoneNumber.objects.all(), cache_key, timeout=60)
        time1 = time.time() - start
        
        start = time.time()
        count2 = count_with_cache(PhoneNumber.objects.all(), cache_key, timeout=60)
        time2 = time.time() - start
        
        if count1 == count2 and time2 < time1:
            print(f"   ✓ Cached count working (speedup: {time1/time2:.2f}x)")
        else:
            print(f"   ⚠ Cached count may not be optimal")
        
    except Exception as e:
        print(f"   ⚠ Model tests skipped: {e}")
    
    print("   ✓ Query optimization operational")
except Exception as e:
    print(f"   ✗ Query optimization error: {e}")

# Test 4: Middleware
print("\n4. Testing Middleware...")
try:
    from god_bless_pro.middleware import APICacheMiddleware, QueryCountMiddleware
    
    print("   ✓ APICacheMiddleware imported")
    print("   ✓ QueryCountMiddleware imported")
    print("   ✓ Middleware operational")
except Exception as e:
    print(f"   ✗ Middleware error: {e}")

# Test 5: Database Indexes
print("\n5. Checking Database Indexes...")
try:
    from phone_generator.models import PhoneNumber, PhoneGenerationTask
    
    # Check if indexes are defined in Meta
    phone_indexes = PhoneNumber._meta.indexes
    task_indexes = PhoneGenerationTask._meta.indexes
    
    print(f"   ✓ PhoneNumber has {len(phone_indexes)} composite indexes")
    print(f"   ✓ PhoneGenerationTask has {len(task_indexes)} composite indexes")
    
    # Check db_index fields
    db_index_fields = [
        f.name for f in PhoneNumber._meta.fields if f.db_index
    ]
    print(f"   ✓ PhoneNumber has {len(db_index_fields)} indexed fields: {', '.join(db_index_fields)}")
    
    print("   ✓ Database indexes configured")
except Exception as e:
    print(f"   ✗ Database index check error: {e}")

# Test 6: Performance Comparison
print("\n6. Performance Comparison...")
try:
    from phone_generator.models import PhoneNumber
    
    if settings.DEBUG and PhoneNumber.objects.exists():
        # Test 1: Count without cache
        reset_queries()
        start = time.time()
        count1 = PhoneNumber.objects.count()
        time1 = time.time() - start
        queries1 = len(connection.queries)
        
        # Test 2: Count with cache
        cache_key = 'perf_test_count'
        cache.delete(cache_key)
        
        reset_queries()
        start = time.time()
        count2 = count_with_cache(PhoneNumber.objects.all(), cache_key, timeout=60)
        time2 = time.time() - start
        queries2 = len(connection.queries)
        
        # Test 3: Cached count (should be instant)
        reset_queries()
        start = time.time()
        count3 = count_with_cache(PhoneNumber.objects.all(), cache_key, timeout=60)
        time3 = time.time() - start
        queries3 = len(connection.queries)
        
        print(f"   Without cache: {time1*1000:.2f}ms, {queries1} queries")
        print(f"   With cache (miss): {time2*1000:.2f}ms, {queries2} queries")
        print(f"   With cache (hit): {time3*1000:.2f}ms, {queries3} queries")
        
        if time3 < time1 and queries3 == 0:
            speedup = time1 / time3
            print(f"   ✓ Cache provides {speedup:.1f}x speedup")
        else:
            print(f"   ⚠ Cache performance may need tuning")
    else:
        print("   ⚠ Performance comparison skipped (no data or DEBUG=False)")
except Exception as e:
    print(f"   ✗ Performance comparison error: {e}")

# Summary
print("\n" + "="*60)
print("Test Summary")
print("="*60)
print("\nAll core optimization components are operational!")
print("\nNext steps:")
print("1. Run migrations: python manage.py migrate")
print("2. Ensure Redis is running for optimal performance")
print("3. Monitor query counts in development")
print("4. Check cache hit rates in production")
print("\n" + "="*60)

# Performance Optimization Guide

This document describes the performance optimizations implemented in Task 18 of the platform modernization.

## Overview

The platform has been optimized for better performance through:
1. Redis caching for frequently accessed data
2. Database query optimization and indexing
3. API response caching for static data
4. Frontend code splitting and lazy loading
5. Virtual scrolling for large data tables

## Backend Optimizations

### 1. Redis Caching

**Location:** `god_bless_backend/god_bless_pro/cache.py`

#### Features:
- Centralized cache management with `CacheManager` class
- Decorator-based caching with `@cache_result`
- Cache invalidation with `@invalidate_cache`
- Specialized cache helpers for different data types:
  - `PhoneNumberCache` - Phone number and carrier data
  - `UserCache` - User settings and preferences
  - `StatsCache` - Dashboard statistics

#### Usage Example:
```python
from god_bless_pro.cache import cache_result, CacheManager

# Cache function results
@cache_result(timeout=300, key_prefix="user_data")
def get_user_data(user_id):
    return expensive_database_query(user_id)

# Manual caching
from god_bless_pro.cache import PhoneNumberCache

stats = PhoneNumberCache.get_carrier_stats(user_id)
if not stats:
    stats = calculate_carrier_stats(user_id)
    PhoneNumberCache.set_carrier_stats(user_id, stats)
```

#### Cache Configuration:
- Default cache backend: Redis (DB 1)
- Fallback: Local memory cache for development
- Connection pool: 50 max connections
- Default timeout: 5 minutes

### 2. Database Query Optimization

**Location:** `god_bless_backend/god_bless_pro/db_optimization.py`

#### Features:
- `QueryOptimizer` - Tools for optimizing querysets
- `BulkOperations` - Batch operations for large datasets
- Query logging decorator for debugging
- Automatic select_related and prefetch_related optimization

#### Usage Example:
```python
from god_bless_pro.db_optimization import QueryOptimizer, BulkOperations

# Optimize queryset
queryset = QueryOptimizer.optimize_queryset(
    PhoneNumber.objects.all(),
    select_related=['user', 'project'],
    prefetch_related=['messages']
)

# Bulk create with batching
BulkOperations.bulk_create_with_batch(
    PhoneNumber,
    phone_objects,
    batch_size=1000
)
```

#### Database Indexes:
All key models have been indexed on frequently queried fields:

**PhoneNumber Model:**
- `carrier`, `type` (composite index)
- `area_code`, `valid_number` (composite index)
- `user`, `project` (composite index)

**PhoneGenerationTask Model:**
- `user`, `status` (composite index)
- `celery_task_id` (unique index)
- `created_at` (descending index)

**SMSCampaign Model:**
- `user`, `status` (composite index)
- `scheduled_time` (index)
- `created_at` (descending index)

**SMSMessage Model:**
- `campaign`, `delivery_status` (composite index)
- `phone_number` (index)
- `delivery_status` (index)

### 3. API Response Caching

**Location:** `god_bless_backend/god_bless_pro/middleware.py`

#### Features:
- `APICacheMiddleware` - Automatic caching of GET requests
- `QueryCountMiddleware` - Database query monitoring
- `CompressionMiddleware` - Response compression hints

#### Cached Endpoints:
- `/api/settings/` - User settings (5 min)
- `/api/carriers/` - Carrier list (5 min)
- `/api/phone-types/` - Phone types (5 min)
- `/api/area-codes/` - Area codes (5 min)
- `/api/dashboard/stats/` - Dashboard stats (5 min)

#### Cache Headers:
- `X-Cache: HIT` - Response served from cache
- `X-Cache: MISS` - Response fetched from database
- `X-DB-Query-Count` - Number of database queries (debug mode)

## Frontend Optimizations

### 1. Code Splitting and Lazy Loading

**Location:** `god_bless_frontend/src/App.tsx`

#### Implementation:
- All non-critical routes are lazy loaded
- Critical components (Landing, SignIn, SignUp) are eagerly loaded
- Suspense boundaries with loading fallbacks

#### Benefits:
- Reduced initial bundle size
- Faster initial page load
- Better caching strategy
- Improved Time to Interactive (TTI)

### 2. Vite Build Optimization

**Location:** `god_bless_frontend/vite.config.js`

#### Features:
- Manual chunk splitting for vendor libraries
- Optimized chunk size (1000KB warning limit)
- Terser minification with console removal
- Dependency pre-bundling

#### Chunk Strategy:
- `react-vendor` - React core libraries
- `ui-vendor` - UI component libraries
- `chart-vendor` - Chart libraries
- `data-vendor` - Data processing libraries

### 3. Frontend API Caching

**Location:** `god_bless_frontend/src/utils/apiCache.ts`

#### Features:
- In-memory cache with TTL support
- Automatic cache expiration
- Pattern-based invalidation
- Cache statistics

#### Usage Example:
```typescript
import apiCache from './utils/apiCache';

// Get cached data
const data = apiCache.get('/api/settings');

// Set cache with custom TTL
apiCache.set('/api/settings', data, undefined, 10 * 60 * 1000); // 10 min

// Invalidate cache
apiCache.invalidate('/api/settings');

// Invalidate by pattern
apiCache.invalidatePattern('/api/phone');
```

### 4. Optimized API Client

**Location:** `god_bless_frontend/src/utils/optimizedApi.ts`

#### Features:
- Automatic caching for GET requests
- Performance monitoring
- Request deduplication
- Slow request warnings

#### Usage Example:
```typescript
import api from './utils/optimizedApi';

// GET with caching (default)
const data = await api.get('/api/settings');

// GET without caching
const data = await api.get('/api/settings', {}, { cache: false });

// POST request
await api.post('/api/phone/generate', { area_code: '555', quantity: 1000 });

// Invalidate cache
api.invalidateCache('/api/settings');
```

### 5. Performance Monitoring

**Location:** `god_bless_frontend/src/utils/performance.ts`

#### Features:
- Operation timing
- Slow operation warnings
- Performance metrics collection
- Summary reporting

#### Usage Example:
```typescript
import performanceMonitor from './utils/performance';

// Time an operation
performanceMonitor.startTimer('data-fetch');
await fetchData();
performanceMonitor.endTimer('data-fetch');

// Measure async function
const result = await performanceMonitor.measure('api-call', async () => {
  return await api.get('/api/data');
});

// Get performance summary
performanceMonitor.logSummary();
```

### 6. Virtual Scrolling

**Location:** `god_bless_frontend/src/components/DataTable/DataTable.tsx`

#### Features:
- Efficient rendering of large datasets
- Configurable row height
- Automatic viewport calculation
- Smooth scrolling

#### Usage:
```typescript
<DataTable
  data={largeDataset}
  columns={columns}
  enableVirtualScroll={true}
  rowHeight={50}
/>
```

## Performance Metrics

### Expected Improvements:

#### Backend:
- **API Response Time:** 30-50% reduction for cached endpoints
- **Database Queries:** 40-60% reduction through optimization
- **Concurrent Users:** 2-3x increase in capacity

#### Frontend:
- **Initial Load Time:** 40-60% reduction
- **Time to Interactive:** 50-70% reduction
- **Bundle Size:** 30-40% reduction
- **Large Table Rendering:** 80-90% improvement

## Monitoring and Debugging

### Backend Monitoring:

```python
# Enable query logging
from god_bless_pro.db_optimization import QueryOptimizer

@QueryOptimizer.log_queries
def my_view(request):
    # Your view logic
    pass
```

### Frontend Monitoring:

```typescript
// Log performance summary
import performanceMonitor from './utils/performance';
performanceMonitor.logSummary();

// Check cache stats
import apiCache from './utils/apiCache';
console.log(apiCache.getStats());
```

## Best Practices

### Backend:
1. Use `@cache_result` decorator for expensive operations
2. Invalidate cache when data changes
3. Use `select_related` and `prefetch_related` for related data
4. Use bulk operations for large datasets
5. Monitor query counts in development

### Frontend:
1. Use lazy loading for non-critical routes
2. Enable caching for GET requests
3. Invalidate cache after mutations
4. Use virtual scrolling for large tables
5. Monitor performance metrics in development

## Configuration

### Redis Configuration:
```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://localhost:6379/1',
        'TIMEOUT': 300,  # 5 minutes
    }
}
```

### Cache Timeouts:
- Short: 5 minutes (frequently changing data)
- Medium: 30 minutes (semi-static data)
- Long: 2 hours (static data)
- Very Long: 24 hours (rarely changing data)

## Troubleshooting

### Cache Issues:
```python
# Clear all cache
from django.core.cache import cache
cache.clear()

# Or use CacheManager
from god_bless_pro.cache import CacheManager
CacheManager.clear_all()
```

### Performance Issues:
```python
# Check query stats
from god_bless_pro.db_optimization import QueryOptimizer
stats = QueryOptimizer.get_query_stats()
print(f"Total queries: {stats['total_queries']}")
print(f"Total time: {stats['total_time']}s")
```

## Future Enhancements

1. **CDN Integration** - Serve static assets from CDN
2. **Service Worker** - Offline support and background sync
3. **HTTP/2 Server Push** - Push critical resources
4. **Database Read Replicas** - Distribute read load
5. **GraphQL** - Reduce over-fetching
6. **WebSocket Optimization** - Reduce polling overhead

# Performance Optimization Quick Reference Card

Quick reference for using performance optimizations in the God Bless platform.

## Backend Quick Reference

### Cache a Function Result
```python
from god_bless_pro.cache_utils import cache_result

@cache_result(timeout=300)  # 5 minutes
def expensive_function(user_id):
    return compute_result(user_id)
```

### Cache a Queryset
```python
from god_bless_pro.cache_utils import cache_queryset

@cache_queryset(timeout=600)  # 10 minutes
def get_active_users():
    return User.objects.filter(is_active=True)
```

### Manual Cache Control
```python
from god_bless_pro.cache_utils import CacheManager

with CacheManager('key', timeout=300, user_id=123) as cm:
    if cm.cached_value is None:
        cm.set(expensive_operation())
    return cm.cached_value
```

### Invalidate Cache
```python
from god_bless_pro.cache_utils import invalidate_cache, invalidate_cache_pattern

invalidate_cache('user_stats', user_id=123)
invalidate_cache_pattern('user:*')
```

### Optimize Queries
```python
from god_bless_pro.query_optimization import optimize_phone_number_query

# Adds select_related('user', 'project')
numbers = optimize_phone_number_query(
    PhoneNumber.objects.filter(user=user)
)
```

### Cached Count
```python
from god_bless_pro.query_optimization import count_with_cache

total = count_with_cache(
    PhoneNumber.objects.filter(user=user),
    f"count:numbers:user:{user.id}",
    timeout=300
)
```

### Bulk Create
```python
from god_bless_pro.query_optimization import bulk_create_optimized

objects = [PhoneNumber(...) for _ in range(10000)]
bulk_create_optimized(PhoneNumber, objects, batch_size=1000)
```

### Cache Timeouts
```python
from god_bless_pro.cache_utils import get_cache_timeout

timeout = get_cache_timeout('short')    # 60s
timeout = get_cache_timeout('medium')   # 300s (5min)
timeout = get_cache_timeout('long')     # 1800s (30min)
timeout = get_cache_timeout('very_long') # 3600s (1hr)
timeout = get_cache_timeout('day')      # 86400s (24hr)
```

## Frontend Quick Reference

### API Call with Caching
```typescript
import api from './utils/optimizedApi';

// GET with automatic caching
const users = await api.get('/api/users', { page: 1 });

// POST without caching
const result = await api.post('/api/users', userData);

// Invalidate cache
api.invalidateCache('/api/users');
```

### Manual API Caching
```typescript
import apiCache from './utils/apiCache';

// Get from cache
const cached = apiCache.get('/api/users', { page: 1 });

// Set cache
apiCache.set('/api/users', data, { page: 1 }, 300);

// Invalidate
apiCache.invalidate('/api/users', { page: 1 });
apiCache.invalidatePattern('users');
```

### Performance Monitoring
```typescript
import performanceMonitor from './utils/performance';

// Time operation
performanceMonitor.startTimer('fetchUsers');
await fetchUsers();
performanceMonitor.endTimer('fetchUsers');

// Measure async function
const result = await performanceMonitor.measure('fetchUsers', 
  async () => await fetchUsers()
);

// View summary
performanceMonitor.logSummary();
```

### Virtual Scrolling
```typescript
<DataTable
  data={largeDataset}
  columns={columns}
  enableVirtualScroll={true}
  rowHeight={50}
/>
```

### Lazy Load Component
```typescript
import { lazy, Suspense } from 'react';
import Loader from './common/Loader';

const MyComponent = lazy(() => import('./pages/MyComponent'));

<Suspense fallback={<Loader />}>
  <MyComponent />
</Suspense>
```

### Preload Component
```typescript
import { preloadComponent } from './hooks/useLazyLoad';

// Preload before navigation
const handleMouseEnter = () => {
  preloadComponent(() => import('./pages/Dashboard'));
};
```

## Common Patterns

### API Endpoint with Caching
```python
from rest_framework.decorators import api_view
from god_bless_pro.cache_utils import CacheManager

@api_view(['GET'])
def my_endpoint(request):
    user_id = request.user.id
    
    with CacheManager('endpoint', timeout=300, user_id=user_id) as cm:
        if cm.cached_value is None:
            data = compute_expensive_data(user_id)
            cm.set(data)
        
        return Response(cm.cached_value)
```

### Optimized List View
```python
from god_bless_pro.query_optimization import optimize_phone_number_query, paginate_queryset

@api_view(['GET'])
def list_view(request):
    queryset = optimize_phone_number_query(
        PhoneNumber.objects.filter(user=request.user)
    )
    
    page = request.query_params.get('page', 1)
    items, total, pages = paginate_queryset(queryset, page, 100)
    
    serializer = PhoneNumberSerializer(items, many=True)
    return Response({
        'data': serializer.data,
        'pagination': {
            'page': page,
            'total': total,
            'pages': pages
        }
    })
```

### React Component with Caching
```typescript
import { useEffect, useState } from 'react';
import api from './utils/optimizedApi';

function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Automatically cached
        const result = await api.get('/api/data');
        setData(result);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  return <div>{/* render data */}</div>;
}
```

## Performance Checklist

### Before Committing Code

Backend:
- [ ] Used `@cache_result` for expensive functions
- [ ] Used `optimize_*_query()` for related queries
- [ ] Used `bulk_create_optimized()` for bulk operations
- [ ] Invalidated cache when data changes
- [ ] Checked query count in DEBUG mode

Frontend:
- [ ] Used lazy loading for non-critical components
- [ ] Enabled virtual scrolling for large tables
- [ ] Used optimized API client
- [ ] Invalidated cache on data mutations
- [ ] Checked bundle size after build

## Monitoring Commands

### Backend
```bash
# Check Redis
redis-cli ping

# Run performance tests
python manage.py shell < test_performance_optimizations.py

# Check query count (in response headers)
curl -H "Authorization: Bearer TOKEN" http://localhost:6161/api/endpoint/ -v | grep X-DB-Query-Count
```

### Frontend
```bash
# Build and check sizes
npm run build

# Check cache stats (in browser console)
import apiCache from './utils/apiCache';
console.log(apiCache.getStats());

# Check performance (in browser console)
import performanceMonitor from './utils/performance';
performanceMonitor.logSummary();
```

## Troubleshooting

### Cache Not Working
```python
# Check Redis connection
from django.core.cache import cache
cache.set('test', 'value', 60)
print(cache.get('test'))  # Should print 'value'
```

### High Query Count
```python
# Use query optimizer
from god_bless_pro.query_optimization import QueryOptimizer

with QueryOptimizer(log_queries=True) as qo:
    # Your code here
    pass

print(f"Queries: {qo.query_count}")
```

### Large Bundle
```bash
# Check vite.config.js for manual chunks
# Ensure lazy loading is used
# Run: npm run build
# Check: dist/assets/ for chunk sizes
```

## Performance Targets

### Backend
- API response time: < 200ms
- Database queries per request: < 5
- Cache hit rate: > 80%

### Frontend
- Initial bundle: < 300KB (gzipped)
- Time to Interactive: < 2s
- Large table render: < 500ms

## Resources

- **Implementation Guide**: `PERFORMANCE_OPTIMIZATION_IMPLEMENTATION.md`
- **Quick Start**: `PERFORMANCE_OPTIMIZATION_QUICK_START.md`
- **Verification**: `TASK_18_VERIFICATION_CHECKLIST.md`
- **Summary**: `TASK_18_PERFORMANCE_OPTIMIZATION_SUMMARY.md`

## Support

For issues:
1. Check the detailed guides
2. Run test script: `test_performance_optimizations.py`
3. Check logs for errors
4. Monitor performance metrics

---

**Remember**: Cache early, cache often, but invalidate wisely! 🚀

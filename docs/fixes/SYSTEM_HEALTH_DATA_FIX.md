# System Health Data Structure Fix

## Issue
The System Health chart on the dashboard was stuck showing "Loading system health data..." even though the analytics API was returning data.

## Root Cause
There was a **data structure mismatch** between the backend and frontend:

### Backend Was Returning (Old):
```python
system_health = {
    'cpu_usage': 45.2,
    'memory_usage': 62.1,
    'memory_available': 8.5,
    'memory_total': 16.0,
    'disk_usage': 55.3,
    'disk_free': 120.5,
    'disk_total': 250.0,
    'status': 'healthy',
}
```

### Frontend Was Expecting:
```typescript
system_health: {
  cpu: {
    usage_percent: number;
    count: number;
    status: string;
  };
  memory: {
    usage_percent: number;
    available_gb: number;
    total_gb: number;
    used_gb: number;
    status: string;
  };
  disk: {
    usage_percent: number;
    free_gb: number;
    total_gb: number;
    used_gb: number;
    status: string;
  };
  overall_status: string;
}
```

## Solution

Updated the backend `dashboard_analytics` view to return the correct nested structure:

```python
system_health = {
    'cpu': {
        'usage_percent': round(cpu_percent, 2),
        'count': cpu_count,
        'status': cpu_status,
    },
    'memory': {
        'usage_percent': round(memory.percent, 2),
        'available_gb': round(memory.available / (1024 ** 3), 2),
        'total_gb': round(memory.total / (1024 ** 3), 2),
        'used_gb': round(memory.used / (1024 ** 3), 2),
        'status': memory_status,
    },
    'disk': {
        'usage_percent': round(disk.percent, 2),
        'free_gb': round(disk.free / (1024 ** 3), 2),
        'total_gb': round(disk.total / (1024 ** 3), 2),
        'used_gb': round(disk.used / (1024 ** 3), 2),
        'status': disk_status,
    },
    'overall_status': overall_status,
}
```

## Improvements

### 1. Individual Component Status
Each component (CPU, Memory, Disk) now has its own status:
- **Healthy**: < 70% usage
- **Warning**: 70-90% usage
- **Critical**: > 90% usage

### 2. Overall Status
The overall status is determined by the worst component status:
- If any component is **critical** → overall is **critical**
- If any component is **warning** → overall is **warning**
- If all are **healthy** → overall is **healthy**

### 3. Better Error Handling
If system metrics can't be retrieved, returns a safe fallback structure with all values set to 0 and status as 'unavailable'.

### 4. Complete Data
Now includes all required fields:
- CPU count
- Memory used (in addition to available)
- Disk used (in addition to free)
- Individual status for each component
- Overall system status

## Testing

1. **Restart the backend server** to apply the changes
2. Refresh the dashboard page
3. The System Health chart should now display:
   - CPU usage with core count
   - Memory usage with GB values
   - Disk usage with GB values
   - Color-coded status indicators
   - Overall system health status

## Files Modified

- `god_bless_backend/dashboard/api/analytics_views.py`

## Status Thresholds

| Component | Healthy | Warning | Critical |
|-----------|---------|---------|----------|
| CPU       | < 70%   | 70-90%  | > 90%    |
| Memory    | < 70%   | 70-90%  | > 90%    |
| Disk      | < 70%   | 70-90%  | > 90%    |

## Related Fixes

This is part of a series of dashboard fixes:
1. ✅ Dashboard connection (auto-select first project)
2. ✅ SystemHealthChart error handling (optional chaining)
3. ✅ System health data structure (this fix)

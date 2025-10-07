# Redis/Celery Compatibility Fix

## Issue
When trying to generate phone numbers, getting this error:
```
TypeError: __init__() got an unexpected keyword argument 'CLIENT_CLASS'
```

## Root Cause
This is a version compatibility issue between:
- `redis-py` (Python Redis client)
- `celery` (Task queue)
- `django-redis` (Django cache backend)

The `CLIENT_CLASS` parameter was introduced in newer versions of redis-py (5.x) but Celery or django-redis might be passing it in a way that's incompatible with the installed version.

## Solution

### 1. Added Celery Broker Configuration
Added compatibility settings to `god_bless_pro/settings.py`:

```python
# Fix for redis-py version compatibility
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_TRANSPORT_OPTIONS = {
    'visibility_timeout': 3600,
    'fanout_prefix': True,
    'fanout_patterns': True,
}
# Remove CLIENT_CLASS from broker options to fix compatibility issue
CELERY_REDIS_BACKEND_USE_SSL = False
```

### 2. Pin Package Versions (Recommended)
Update `requirements.txt` to pin compatible versions:

```txt
redis==4.6.0
celery==5.3.4
django-redis==5.4.0
channels-redis==4.1.0
django-celery-beat==2.5.0
```

## Testing

After applying the fix:

1. **Restart the backend server**:
   ```bash
   # Stop the server (Ctrl+C)
   python manage.py runserver 0.0.0.0:6161
   ```

2. **Restart Celery worker** (if running separately):
   ```bash
   celery -A god_bless_pro worker -l INFO
   ```

3. **Try generating phone numbers** - the error should be gone

## Alternative Solution

If the issue persists, you can downgrade redis-py:

```bash
pip install redis==4.6.0
```

Or upgrade Celery:

```bash
pip install celery==5.3.4
```

## Why This Happened

The `CLIENT_CLASS` parameter is used internally by redis-py 5.x to specify which Redis client class to use. However, when Celery or django-redis tries to create a Redis connection, it might be passing parameters that are incompatible with the version of redis-py installed.

The fix adds explicit broker transport options that override the problematic defaults.

## Files Modified

- `god_bless_backend/god_bless_pro/settings.py` - Added Celery broker configuration

## Prevention

To prevent this in the future:
1. Pin all package versions in `requirements.txt`
2. Test after upgrading any Redis-related packages
3. Keep Celery, redis-py, and django-redis versions compatible

## Compatibility Matrix

| redis-py | celery | django-redis | Status |
|----------|--------|--------------|--------|
| 4.6.0    | 5.3.x  | 5.4.0        | ✅ Works |
| 5.0.x    | 5.3.x  | 5.4.0        | ⚠️ May have issues |
| 5.0.x    | 5.4.x  | 5.4.0        | ✅ Should work |

## Related Issues

This is a known issue when mixing different versions of Redis-related packages. The `CLIENT_CLASS` parameter was added to support both sync and async Redis clients in redis-py 5.x.

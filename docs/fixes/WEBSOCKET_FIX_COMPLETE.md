# WebSocket Connection Fix - Complete Solution

## Problem Summary
The frontend WebSocket connections were failing with errors:
```
WebSocket connection to 'ws://localhost:6161/ws/tasks/' failed: Insufficient resources
django.core.exceptions.AppRegistryNotReady: Apps aren't loaded yet.
```

## Root Causes Identified

### 1. Wrong Server Type
- Django backend was running with `python manage.py runserver` (development server)
- This server doesn't support WebSocket connections
- Needed to use Daphne (ASGI server) for WebSocket support

### 2. Django App Initialization Order
- `get_user_model()` was being called at module level in `tasks/models.py`
- Models were being imported before Django apps were fully initialized
- This caused `AppRegistryNotReady` exceptions

### 3. ASGI Import Order
- Routing module was imported before Django ASGI application was initialized
- This triggered model imports before the app registry was ready

## Fixes Applied

### Fix 1: Updated Docker Compose to Use Daphne
**File:** `god_bless_backend/docker-compose.yml`

**Changed from:**
```yaml
command: python manage.py runserver 0.0.0.0:6161
```

**To:**
```yaml
command: daphne -b 0.0.0.0 -p 6161 god_bless_pro.asgi:application
```

### Fix 2: Updated Production Dockerfile
**File:** `god_bless_backend/Dockerfile.prod`

**Changed from:**
```dockerfile
CMD ["gunicorn", "god_bless_pro.wsgi:application", ...]
```

**To:**
```dockerfile
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "god_bless_pro.asgi:application"]
```

### Fix 3: Fixed Model User References
**File:** `god_bless_backend/tasks/models.py`

**Changed from:**
```python
from django.contrib.auth import get_user_model
User = get_user_model()

class TaskNotification(models.Model):
    user = models.ForeignKey(User, ...)
```

**To:**
```python
from django.conf import settings

class TaskNotification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, ...)
```

### Fix 4: Removed Unnecessary Import
**File:** `god_bless_backend/tasks/consumers.py`

**Removed:**
```python
from django.contrib.auth import get_user_model
User = get_user_model()
```

The `User` variable wasn't being used in this file.

### Fix 5: Fixed ASGI Import Order
**File:** `god_bless_backend/god_bless_pro/asgi.py`

**Changed from:**
```python
from god_bless_pro import routing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "god_bless_pro.settings")
django_asgi_app = get_asgi_application()
```

**To:**
```python
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "god_bless_pro.settings")

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

# Import routing after Django is initialized
from god_bless_pro import routing
```

### Fix 6: Added Missing Dependency
**File:** `god_bless_backend/requirements.txt`

**Added:**
```
channels
```

(Was missing, only `channels-redis` was present)

## Verification

### Server is Running with Daphne
Check the logs:
```cmd
docker logs god_bless_app
```

You should see:
```
[INFO] 2025-10-05 18:43:37 - Starting server at tcp:port=6161:interface=0.0.0.0
[INFO] 2025-10-05 18:43:37 - Listening on TCP address 0.0.0.0:6161
```

### WebSocket Connection Works
In the browser console, you should see:
```
Connecting to WebSocket: ws://localhost:6161/ws/tasks/
WebSocket connected
```

No more errors about "Insufficient resources" or "Max reconnection attempts reached".

## How to Apply

If you haven't already applied these fixes, run:

```cmd
cd god_bless_backend
docker-compose down
docker-compose up --build -d
```

Wait for the services to start, then check the logs:
```cmd
docker logs god_bless_app
```

## Technical Details

### Why Daphne?
- Daphne is an HTTP, HTTP2, and WebSocket protocol server for ASGI
- It's the reference server for Django Channels
- Supports both synchronous (HTTP) and asynchronous (WebSocket) protocols
- Production-ready and maintained by the Django team

### Why settings.AUTH_USER_MODEL?
- Using `settings.AUTH_USER_MODEL` (string reference) instead of `get_user_model()`
- Allows Django to resolve the user model lazily after apps are loaded
- Prevents `AppRegistryNotReady` exceptions during import time
- This is the recommended approach in Django documentation

### ASGI Import Order
- `get_asgi_application()` must be called before importing any code that uses ORM models
- This ensures Django's app registry is fully populated
- The routing module imports consumers, which import models
- Therefore, routing must be imported after `get_asgi_application()`

## Status
✅ **FIXED** - WebSocket connections are now working properly!

The backend is running with Daphne and can handle WebSocket connections for real-time task progress updates.

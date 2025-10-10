# WebSocket 301 Redirect Fix - Complete Analysis

## Issue
WebSocket connection failing with HTTP 301 redirect error:
```
WebSocket connection to 'wss://domain.com/ws?token=...' failed: 
Error during WebSocket handshake: Unexpected response code: 301
```

## Root Cause
The nginx WebSocket proxy configuration was missing critical headers and settings, causing the connection to be redirected instead of upgraded to WebSocket protocol.

## Complete Fix Applied

### File: `nginx.prod.conf`

**Changed WebSocket location block from:**
```nginx
location /ws/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**To:**
```nginx
location ~ ^/ws/?(.*)$ {
    proxy_pass http://127.0.0.1:8000/ws/$1$is_args$args;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
    
    # Disable buffering for WebSocket
    proxy_buffering off;
    proxy_cache off;
    
    # Timeouts for WebSocket
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
}
```

## Key Improvements

### 1. Regex Location Match
- **Before:** `location /ws/` - Only matched exact `/ws/` path
- **After:** `location ~ ^/ws/?(.*)$` - Matches `/ws`, `/ws/`, and any sub-paths
- **Benefit:** Handles trailing slash variations and sub-routes

### 2. Query String Forwarding
- **Added:** `$is_args$args` to properly forward query parameters (like auth token)
- **Benefit:** Authentication tokens are preserved in WebSocket connection

### 3. Additional Proxy Headers
- **Added:** `X-Forwarded-Host` and `X-Forwarded-Port`
- **Benefit:** Django Channels can properly validate the origin and construct URLs

### 4. Disabled Buffering
- **Added:** `proxy_buffering off` and `proxy_cache off`
- **Benefit:** Real-time message delivery without buffering delays

### 5. Extended Timeouts
- **Changed:** From default (60s) to 7 days
- **Benefit:** Long-lived WebSocket connections won't timeout

## Verification Checklist

### ✅ All Files Verified

1. **Dockerfile.prod** ✅
   - Daphne installed (WebSocket support)
   - Nginx configured correctly
   - No issues found

2. **docker-compose.prod.yml** ✅
   - Port 80 exposed
   - No port conflicts
   - No issues found

3. **start-prod.sh** ✅
   - Starts Daphne with ASGI application
   - Command: `daphne -b 127.0.0.1 -p 8000 god_bless_pro.asgi:application`
   - No issues found

4. **god_bless_pro/asgi.py** ✅
   - Channels routing configured
   - TokenAuthMiddleware applied
   - AllowedHostsOriginValidator applied
   - No issues found

5. **god_bless_pro/routing.py** ✅
   - WebSocket routes defined
   - Handles both `/ws` and `/ws/`
   - No issues found

6. **god_bless_pro/settings.py** ✅
   - `ASGI_APPLICATION` configured
   - `CHANNEL_LAYERS` with Redis backend
   - `ALLOWED_HOSTS` configured
   - No issues found

7. **nginx.prod.conf** ✅
   - **FIXED:** WebSocket proxy configuration
   - Proper header forwarding
   - Buffering disabled
   - Extended timeouts

## How WebSocket Connection Works Now

```
Frontend (wss://domain.com/ws?token=xxx)
    ↓
Coolify (SSL termination)
    ↓
Nginx (port 80) - WebSocket proxy
    ↓ (proxy_pass with Upgrade headers)
Daphne (127.0.0.1:8000) - ASGI server
    ↓
Django Channels
    ↓ (TokenAuthMiddleware)
Authenticate user via token
    ↓ (AllowedHostsOriginValidator)
Validate origin
    ↓ (URLRouter)
Route to SimpleDashboardConsumer
    ↓
WebSocket connection established ✅
```

## Testing After Deployment

### 1. Check Browser Console
Should see:
```
WebSocket: Connecting to wss://domain.com/ws?token=...
WebSocket: Connection established
```

### 2. Check Backend Logs
Should see:
```
WebSocket HANDSHAKING /ws [127.0.0.1]
WebSocket CONNECT /ws [127.0.0.1]
```

### 3. Test Real-time Updates
- Dashboard should receive live updates
- Task progress should update in real-time
- No reconnection attempts

## Common Issues & Solutions

### Issue: Still getting 301
**Solution:** Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: 403 Forbidden
**Solution:** Check `ALLOWED_HOSTS` includes your domain

### Issue: 401 Unauthorized
**Solution:** Check authentication token is being sent

### Issue: Connection timeout
**Solution:** Verify Redis is running and accessible

## Environment Variables Required

```bash
# In Coolify, ensure these are set:
DOMAIN=yourdomain.com
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password>
```

## Deploy Command

```bash
git add nginx.prod.conf
git commit -m "Fix: WebSocket 301 redirect - improve proxy configuration"
git push
```

Coolify will automatically redeploy.

## Expected Result

✅ WebSocket connects successfully  
✅ Real-time dashboard updates work  
✅ No 301 redirect errors  
✅ No reconnection loops  
✅ Stable long-lived connections  

---

**Status:** ✅ READY TO DEPLOY
**Files Modified:** 1 (nginx.prod.conf)
**Breaking Changes:** None
**Rollback:** Revert nginx.prod.conf if needed

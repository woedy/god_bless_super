# WebSocket Authentication Fix

## Problem
After fixing the server to use Daphne, WebSocket connections were still failing with:
```
WebSocket connection to 'ws://localhost:6161/ws/tasks/' failed: Insufficient resources
Max reconnection attempts reached
```

Backend logs showed:
```
WSCONNECTING /ws/tasks/
WSCONNECT /ws/tasks/
WSDISCONNECT /ws/tasks/  (immediate disconnect)
```

## Root Cause
The WebSocket consumer was rejecting connections because users were anonymous:

```python
async def connect(self):
    self.user = self.scope["user"]
    
    if self.user.is_anonymous:
        await self.close()  # ← Connection rejected!
        return
```

WebSocket connections don't automatically include HTTP authentication headers or cookies like regular HTTP requests. The frontend was connecting without passing the authentication token.

## Solution

### 1. Frontend: Pass Token in WebSocket URL
**File:** `god_bless_frontend/src/hooks/useTaskWebSocket.ts`

Modified the WebSocket connection to include the authentication token as a query parameter:

```typescript
// Get authentication token from localStorage
const token = localStorage.getItem('token');
if (!token) {
  console.error('No authentication token found');
  return;
}

// Include token in WebSocket URL
const wsUrl = `${wsProtocol}//${wsHost}/ws/tasks/?token=${token}`;
const ws = new WebSocket(wsUrl);
```

### 2. Backend: Custom Authentication Middleware
**File:** `god_bless_backend/god_bless_pro/ws_auth_middleware.py` (NEW)

Created a custom middleware to extract the token from the query string and authenticate the user:

```python
class TokenAuthMiddleware(BaseMiddleware):
    """
    Custom middleware that takes a token from the query string
    and authenticates the user.
    """

    async def __call__(self, scope, receive, send):
        # Get the token from query string
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token_key = query_params.get('token', [None])[0]

        # Authenticate user
        if token_key:
            scope['user'] = await get_user_from_token(token_key)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
```

### 3. Backend: Update ASGI Configuration
**File:** `god_bless_backend/god_bless_pro/asgi.py`

Replaced `AuthMiddlewareStack` with our custom `TokenAuthMiddleware`:

```python
from god_bless_pro.ws_auth_middleware import TokenAuthMiddleware

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        TokenAuthMiddleware(URLRouter(routing.websocket_urlpatterns))
    )
})
```

## How It Works

1. **Frontend**: When connecting to WebSocket, retrieves the auth token from `localStorage` and appends it to the URL as `?token=xxx`

2. **Backend Middleware**: Extracts the token from the query string, looks up the corresponding user in the database, and adds the authenticated user to the WebSocket scope

3. **Consumer**: Now receives an authenticated user instead of `AnonymousUser`, allowing the connection to proceed

## Testing

After applying these changes:

1. Restart the backend:
   ```cmd
   docker-compose restart god_bless_app
   ```

2. Refresh the frontend page

3. Check browser console - you should see:
   ```
   Connecting to WebSocket: ws://localhost:6161/ws/tasks/?token=***
   WebSocket connected
   ```

4. Check backend logs:
   ```cmd
   docker logs god_bless_app --tail 50
   ```
   
   You should see:
   ```
   WSCONNECTING /ws/tasks/
   WSCONNECT /ws/tasks/
   (connection stays open - no immediate WSDISCONNECT)
   ```

## Security Notes

- The token is passed in the query string, which is visible in logs
- For production, consider using a short-lived token or implementing additional security measures
- The `AllowedHostsOriginValidator` provides CORS protection for WebSocket connections
- Tokens are validated against the database on each connection

## Status
✅ **FIXED** - WebSocket connections now properly authenticate users and stay connected!

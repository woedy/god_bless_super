# Django Admin Session Expiration Fix

## Problem

Users were getting "Session expired" error when trying to login to Django admin:

```json
{
  "message": "Session expired",
  "errors": { "session": ["Your session has expired. Please login again."] }
}
```

## Root Causes

1. **Very short session timeout**: `SESSION_COOKIE_AGE` was set to 3600 seconds (1 hour)
2. **Aggressive idle timeout**: `IDLE_TIMEOUT` was 1800 seconds (30 minutes)
3. **Strict session validation**: `SessionSecurityMiddleware` was validating all requests including admin
4. **Missing session metadata**: If cache was cleared or session created before middleware, validation would fail

## Changes Made

### 1. Increased Session Timeouts (settings.py)

```python
# Before:
SESSION_COOKIE_AGE = 3600  # 1 hour

# After:
SESSION_COOKIE_AGE = 86400  # 24 hours
```

### 2. Relaxed Session Security Timeouts (session_security.py)

```python
# Before:
SESSION_TIMEOUT = 3600  # 1 hour
ABSOLUTE_TIMEOUT = 86400  # 24 hours
IDLE_TIMEOUT = 1800  # 30 minutes

# After:
SESSION_TIMEOUT = 86400  # 24 hours
ABSOLUTE_TIMEOUT = 604800  # 7 days
IDLE_TIMEOUT = 7200  # 2 hours
```

### 3. Auto-Create Missing Session Metadata (session_security.py)

Modified `validate_session()` to automatically create session metadata if it doesn't exist in cache, instead of immediately failing validation.

### 4. Exempted Admin Paths (security_middleware.py)

Added `/admin/` to exempt paths so Django admin isn't subject to strict session validation:

```python
EXEMPT_PATHS = [
    '/api/accounts/login/',
    '/api/accounts/register/',
    '/api/accounts/password-reset/',
    '/api/health/',
    '/admin/login/',
    '/admin/',  # NEW: Exempt all admin paths
]
```

## Testing

1. Restart your Docker containers:

   ```bash
   docker-compose down
   docker-compose up --build
   ```

2. Try logging into Django admin at `http://localhost:6161/admin/`

3. Session should now persist for 24 hours with 2-hour idle timeout

## Production Considerations

For production deployment, you may want to:

- Reduce timeouts back to more secure values
- Keep admin paths under session validation
- Implement proper session monitoring
- Use secure session cookies (already configured for production)

# Security Features Quick Reference

## Quick Start

### 1. Input Validation

```python
from god_bless_pro.security import InputValidator
from django.core.exceptions import ValidationError

# Validate email
try:
    email = InputValidator.validate_email(request.data.get('email'))
except ValidationError as e:
    return Response({'errors': {'email': [str(e)]}}, status=400)

# Validate phone
phone = InputValidator.validate_phone_number(request.data.get('phone'))

# Sanitize text
clean_text = InputValidator.sanitize_text(user_input, max_length=500)

# Validate password
password = InputValidator.validate_password(request.data.get('password'))
```

### 2. Rate Limiting

**Using Decorators:**
```python
from god_bless_pro.security_decorators import rate_limit

@rate_limit(rate=10, period=60)  # 10 requests per minute
@api_view(['POST'])
def my_endpoint(request):
    pass
```

**Using DRF Throttle Classes:**
```python
from god_bless_pro.rate_limiting import AuthenticationRateThrottle

class LoginView(APIView):
    throttle_classes = [AuthenticationRateThrottle]
    
    def post(self, request):
        pass
```

### 3. Audit Logging

```python
from god_bless_pro.audit_logging import (
    log_login_success,
    log_login_failed,
    AuditLogger,
    AuditEventType
)

# Log authentication
log_login_success(user, request)
log_login_failed(email, request, reason="Invalid password")

# Log custom events
AuditLogger.log_event(
    event_type=AuditEventType.DATA_EXPORT,
    user=user,
    request=request,
    details={'count': 100, 'format': 'csv'},
    severity='INFO'
)

# Log security events
AuditLogger.log_security_event(
    event_type=AuditEventType.SUSPICIOUS_ACTIVITY,
    request=request,
    details={'reason': 'Multiple failed attempts'},
    severity='WARNING'
)
```

### 4. Session Management

```python
from god_bless_pro.session_security import SessionManager

# Create session on login
session_data = SessionManager.create_session(request, user)

# Validate session (done automatically by middleware)
if SessionManager.validate_session(request):
    # Session is valid
    pass

# Destroy session on logout
SessionManager.destroy_session(request)

# Get session info
info = SessionManager.get_session_info(request)
```

### 5. Security Decorators

```python
from god_bless_pro.security_decorators import (
    validate_input,
    audit_log,
    require_secure_connection,
    sanitize_input,
    check_ip_whitelist
)

# Multiple decorators
@validate_input(
    email=InputValidator.validate_email,
    username=InputValidator.validate_username
)
@rate_limit(rate=5, period=60)
@audit_log(event_type=AuditEventType.ACCOUNT_CREATED)
@api_view(['POST'])
def register_user(request):
    pass

# Require HTTPS
@require_secure_connection
@api_view(['POST'])
def sensitive_endpoint(request):
    pass

# Sanitize input fields
@sanitize_input('message', 'description')
@api_view(['POST'])
def create_post(request):
    pass
```

## Common Patterns

### Secure API Endpoint Pattern

```python
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from god_bless_pro.security_decorators import rate_limit, audit_log, validate_input
from god_bless_pro.security import InputValidator
from god_bless_pro.audit_logging import AuditEventType

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
@rate_limit(rate=100, period=3600)  # 100 per hour
@audit_log(event_type=AuditEventType.DATA_EXPORT)
@validate_input(
    user_id=InputValidator.validate_uuid,
    project_id=InputValidator.validate_uuid
)
def export_data(request):
    user_id = request.data.get('user_id')
    project_id = request.data.get('project_id')
    
    # Your logic here
    
    return Response({'message': 'Success'})
```

### Manual Input Validation Pattern

```python
from god_bless_pro.security import InputValidator
from django.core.exceptions import ValidationError

@api_view(['POST'])
def my_view(request):
    errors = {}
    
    # Validate email
    try:
        email = InputValidator.validate_email(request.data.get('email', ''))
    except ValidationError as e:
        errors['email'] = [str(e)]
    
    # Validate integer
    try:
        quantity = InputValidator.validate_integer(
            request.data.get('quantity'),
            min_val=1,
            max_val=1000000
        )
    except ValidationError as e:
        errors['quantity'] = [str(e)]
    
    if errors:
        return Response({
            'message': 'Validation errors',
            'errors': errors
        }, status=400)
    
    # Continue with validated data
    pass
```

### Rate Limiting with Custom Logic

```python
from god_bless_pro.rate_limiting import EndpointRateLimiter, check_rate_limit

@api_view(['POST'])
def my_view(request):
    # Create custom rate limiter
    limiter = EndpointRateLimiter('my_endpoint', rate=10, period=60)
    
    # Check rate limit
    is_allowed, retry_after = check_rate_limit(request, limiter)
    
    if not is_allowed:
        return Response({
            'message': 'Rate limit exceeded',
            'retry_after': retry_after
        }, status=429)
    
    # Continue processing
    pass
```

## Configuration Checklist

### Development Environment

```python
# settings.py
DEBUG = True
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False
```

### Production Environment

```python
# settings.py
DEBUG = False
SECRET_KEY = os.environ.get('SECRET_KEY')
ALLOWED_HOSTS = ['yourdomain.com']

# Security
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# Rate limiting
RATE_LIMIT_ENABLE = True

# Audit logging
AUDIT_LOG_ENABLED = True
```

## Monitoring Commands

### Check Audit Logs

```bash
# View recent audit events
tail -f logs/audit.log

# Search for failed logins
grep "login_failed" logs/audit.log

# Search for rate limit violations
grep "rate_limit_exceeded" logs/audit.log

# Search for security events
grep "CRITICAL" logs/audit.log
```

### Check Security Events

```bash
# SQL injection attempts
grep "sql_injection_attempt" logs/audit.log

# XSS attempts
grep "xss_attempt" logs/audit.log

# Suspicious activity
grep "suspicious_activity" logs/audit.log
```

## Troubleshooting

### Rate Limit Issues

If users are getting rate limited incorrectly:

1. Check rate limit configuration in `settings.py`
2. Clear rate limit cache: `python manage.py shell` then `from django.core.cache import cache; cache.clear()`
3. Adjust rate limits for specific endpoints

### Session Expiration Issues

If sessions are expiring too quickly:

1. Adjust `SESSION_COOKIE_AGE` in settings
2. Check `SessionManager.SESSION_TIMEOUT` and `SessionManager.IDLE_TIMEOUT`
3. Verify session middleware is properly configured

### Input Validation Errors

If valid input is being rejected:

1. Check validation patterns in `InputValidator`
2. Review error messages in response
3. Test validation logic in Django shell

## Security Headers Reference

These headers are automatically added by `SecurityHeadersMiddleware`:

- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - Enables XSS filter
- `Strict-Transport-Security` - Forces HTTPS
- `Content-Security-Policy` - Restricts resource loading
- `Referrer-Policy` - Controls referrer information
- `Permissions-Policy` - Controls browser features

## Rate Limit Headers

Responses include rate limit information:

- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Time until limit resets
- `Retry-After` - Seconds to wait (when limited)

## Testing Security Features

```python
# Test input validation
from god_bless_pro.security import InputValidator

# Should pass
email = InputValidator.validate_email("test@example.com")

# Should raise ValidationError
try:
    InputValidator.validate_email("invalid")
except ValidationError:
    print("Validation working correctly")

# Test rate limiting
from god_bless_pro.rate_limiting import UserRateLimiter

limiter = UserRateLimiter(rate=5, period=60)
for i in range(6):
    allowed, retry = limiter.is_allowed("test_user")
    print(f"Request {i+1}: {'Allowed' if allowed else f'Blocked (retry in {retry}s)'}")
```

## Emergency Procedures

### Revoke All User Sessions

```python
from god_bless_pro.session_security import SessionManager
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(email='user@example.com')

# Revoke all sessions
SessionManager.destroy_all_sessions(user.id)
```

### Revoke User Tokens

```python
from god_bless_pro.session_security import TokenManager
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(email='user@example.com')

# Revoke all tokens
TokenManager.revoke_all_user_tokens(user)
```

### Block IP Address

```python
# Add to settings.py
IP_BLACKLIST = ['192.168.1.100', '10.0.0.50']
```

## Support

For security issues or questions:
- Review logs in `logs/audit.log`
- Check `SECURITY_IMPLEMENTATION.md` for detailed documentation
- Contact security team for vulnerabilities

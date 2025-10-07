# Security Implementation Guide

## Overview

This document describes the comprehensive security enhancements implemented in the God Bless platform. These features protect against common security vulnerabilities and ensure secure operation of the platform.

## Security Features Implemented

### 1. Input Validation and Sanitization

**Location:** `god_bless_pro/security.py`

The `InputValidator` class provides comprehensive input validation and sanitization:

- **Email Validation:** Validates email format and checks for SQL injection attempts
- **Phone Number Validation:** Validates phone number format
- **Username Validation:** Ensures usernames meet security requirements
- **Password Validation:** Enforces strong password requirements
- **Text Sanitization:** Removes HTML tags and prevents XSS attacks
- **SQL Injection Detection:** Identifies and blocks SQL injection attempts
- **XSS Detection:** Identifies and blocks cross-site scripting attempts

**Usage Example:**
```python
from god_bless_pro.security import InputValidator

# Validate email
email = InputValidator.validate_email(user_input)

# Sanitize text
clean_text = InputValidator.sanitize_text(user_input)

# Validate password
password = InputValidator.validate_password(user_input)
```

### 2. Rate Limiting

**Location:** `god_bless_pro/rate_limiting.py`

Multiple rate limiting strategies are implemented:

- **User Rate Limiting:** 1000 requests per hour for authenticated users
- **IP Rate Limiting:** 100 requests per hour for anonymous users
- **Endpoint-Specific Limiting:** Custom limits for sensitive endpoints
- **Burst Protection:** 60 requests per minute to prevent burst attacks

**Configuration in settings.py:**
```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'user': '1000/hour',
        'anon': '100/hour',
        'burst': '60/minute',
        'auth': '10/minute',
        'phone_generation': '100/hour',
        'sms_sending': '500/hour',
    }
}
```

**Usage with Decorators:**
```python
from god_bless_pro.security_decorators import rate_limit

@rate_limit(rate=10, period=60)  # 10 requests per minute
def my_view(request):
    pass
```

### 3. Session Security

**Location:** `god_bless_pro/session_security.py`

Secure session management with:

- **Session Timeouts:** 1-hour session timeout with 30-minute idle timeout
- **Absolute Timeout:** 24-hour maximum session duration
- **IP Validation:** Tracks IP address changes (optional enforcement)
- **Session Metadata:** Stores user agent and creation time
- **Automatic Cleanup:** Removes expired sessions

**Session Configuration:**
```python
SESSION_COOKIE_SECURE = True  # HTTPS only
SESSION_COOKIE_HTTPONLY = True  # No JavaScript access
SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
SESSION_COOKIE_AGE = 3600  # 1 hour
```

**Usage:**
```python
from god_bless_pro.session_security import SessionManager

# Create session
SessionManager.create_session(request, user)

# Validate session
if SessionManager.validate_session(request):
    # Session is valid
    pass

# Destroy session
SessionManager.destroy_session(request)
```

### 4. Audit Logging

**Location:** `god_bless_pro/audit_logging.py`

Comprehensive audit logging for security events:

- **Authentication Events:** Login, logout, password changes
- **Access Events:** Unauthorized access, permission denied
- **Security Events:** SQL injection attempts, XSS attempts
- **Data Events:** Exports, imports, deletions
- **System Events:** Errors, configuration changes

**Event Types:**
- `LOGIN_SUCCESS` / `LOGIN_FAILED`
- `PASSWORD_CHANGE` / `PASSWORD_RESET`
- `UNAUTHORIZED_ACCESS` / `PERMISSION_DENIED`
- `SQL_INJECTION_ATTEMPT` / `XSS_ATTEMPT`
- `DATA_EXPORT` / `DATA_IMPORT` / `DATA_DELETION`
- `RATE_LIMIT_EXCEEDED`
- `SUSPICIOUS_ACTIVITY`

**Usage:**
```python
from god_bless_pro.audit_logging import AuditLogger, log_login_success

# Log authentication
log_login_success(user, request)

# Log custom event
AuditLogger.log_event(
    event_type='custom_event',
    user=user,
    request=request,
    details={'key': 'value'},
    severity='INFO'
)
```

### 5. Security Middleware

**Location:** `god_bless_pro/security_middleware.py`

Multiple middleware components for security:

#### SecurityHeadersMiddleware
Adds security headers to all responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security`
- `Content-Security-Policy`

#### SessionSecurityMiddleware
Validates sessions on every request and enforces timeouts.

#### InputSanitizationMiddleware
Checks all input for SQL injection and XSS patterns.

#### RateLimitMiddleware
Applies rate limiting to all requests with appropriate headers.

#### SuspiciousActivityMiddleware
Detects and logs suspicious patterns:
- Suspicious user agents (scanning tools)
- Path traversal attempts
- Suspicious headers

### 6. CSRF Protection

**Enhanced CSRF Configuration:**
```python
CSRF_COOKIE_SECURE = True  # HTTPS only
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_USE_SESSIONS = False
```

Django's built-in CSRF middleware is enabled and configured for maximum security.

### 7. Security Decorators

**Location:** `god_bless_pro/security_decorators.py`

Convenient decorators for applying security measures:

```python
from god_bless_pro.security_decorators import (
    validate_input,
    rate_limit,
    audit_log,
    require_secure_connection,
    sanitize_input
)

# Validate input
@validate_input(
    email=InputValidator.validate_email,
    username=InputValidator.validate_username
)
def my_view(request):
    pass

# Apply rate limiting
@rate_limit(rate=10, period=60)
def limited_view(request):
    pass

# Log access
@audit_log(event_type='data_access')
def sensitive_view(request):
    pass

# Require HTTPS
@require_secure_connection
def secure_view(request):
    pass
```

## Security Configuration

### Environment Variables

For production, set these environment variables:

```bash
# Django Security
SECRET_KEY=<strong-random-key>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# HTTPS
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000

# Session Security
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

### Password Requirements

Passwords must meet these requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

### File Upload Security

```python
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10 MB
ALLOWED_UPLOAD_EXTENSIONS = ['csv', 'txt', 'json', 'xlsx', 'xls']
```

## Testing Security Features

Run security tests:

```bash
cd god_bless_backend
python manage.py test god_bless_pro.test_security
```

Or with pytest:

```bash
pytest god_bless_pro/test_security.py -v
```

## Security Best Practices

### For Developers

1. **Always validate input:** Use `InputValidator` for all user input
2. **Apply rate limiting:** Use decorators or throttle classes for sensitive endpoints
3. **Log security events:** Use `AuditLogger` for important actions
4. **Sanitize output:** Use `sanitize_text` or `sanitize_html` for user-generated content
5. **Use HTTPS:** Always use secure connections in production
6. **Keep dependencies updated:** Regularly update security-related packages

### For Administrators

1. **Monitor audit logs:** Regularly review `logs/audit.log`
2. **Review failed login attempts:** Check for brute force attacks
3. **Monitor rate limit violations:** Identify potential abuse
4. **Keep SECRET_KEY secure:** Never commit to version control
5. **Enable HTTPS:** Use SSL/TLS certificates in production
6. **Regular security audits:** Periodically review security configurations

## Security Incident Response

If a security incident is detected:

1. **Check audit logs:** Review `logs/audit.log` for suspicious activity
2. **Identify affected users:** Check user activity logs
3. **Revoke compromised tokens:** Use `TokenManager.revoke_all_user_tokens(user)`
4. **Force password reset:** Require users to change passwords
5. **Review access patterns:** Check for unauthorized access
6. **Update security measures:** Implement additional protections if needed

## Monitoring and Alerts

### Log Files

- **Audit Log:** `logs/audit.log` - All security events
- **Error Log:** `logs/error.log` - System errors
- **API Log:** `logs/api.log` - API requests

### Key Metrics to Monitor

- Failed login attempts per IP/user
- Rate limit violations
- SQL injection/XSS attempts
- Suspicious activity patterns
- Session hijacking attempts

## Compliance

These security features help meet compliance requirements for:

- **GDPR:** Audit logging, data protection
- **PCI DSS:** Secure authentication, encryption
- **HIPAA:** Access controls, audit trails
- **SOC 2:** Security monitoring, incident response

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Security Documentation](https://docs.djangoproject.com/en/stable/topics/security/)
- [REST Framework Security](https://www.django-rest-framework.org/topics/security/)

## Support

For security-related questions or to report vulnerabilities, contact the security team.

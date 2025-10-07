"""
Verification script for security implementation.
Tests that all security components are properly configured and working.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.core.exceptions import ValidationError
from god_bless_pro.security import InputValidator, SecurityHeaders
from god_bless_pro.rate_limiting import UserRateLimiter, IPRateLimiter
from god_bless_pro.session_security import SessionManager
from god_bless_pro.audit_logging import AuditLogger, AuditEventType


def test_input_validation():
    """Test input validation"""
    print("\n=== Testing Input Validation ===")
    
    # Test email validation
    try:
        email = InputValidator.validate_email("test@example.com")
        print(f"✓ Valid email accepted: {email}")
    except ValidationError as e:
        print(f"✗ Valid email rejected: {e}")
        return False
    
    # Test invalid email
    try:
        InputValidator.validate_email("invalid-email")
        print("✗ Invalid email accepted")
        return False
    except ValidationError:
        print("✓ Invalid email rejected")
    
    # Test SQL injection detection
    try:
        InputValidator.validate_email("test@example.com' OR '1'='1")
        print("✗ SQL injection not detected")
        return False
    except ValidationError:
        print("✓ SQL injection detected and blocked")
    
    # Test password validation
    try:
        password = InputValidator.validate_password("Test@123!")
        print(f"✓ Strong password accepted")
    except ValidationError as e:
        print(f"✗ Strong password rejected: {e}")
        return False
    
    # Test weak password
    try:
        InputValidator.validate_password("weak")
        print("✗ Weak password accepted")
        return False
    except ValidationError:
        print("✓ Weak password rejected")
    
    # Test text sanitization
    dirty_text = "<script>alert('xss')</script>Hello"
    clean_text = InputValidator.sanitize_text(dirty_text)
    if "<script>" not in clean_text:
        print(f"✓ XSS content sanitized: '{clean_text}'")
    else:
        print("✗ XSS content not sanitized")
        return False
    
    # Test phone validation
    try:
        phone = InputValidator.validate_phone_number("+1234567890")
        print(f"✓ Valid phone accepted: {phone}")
    except ValidationError as e:
        print(f"✗ Valid phone rejected: {e}")
        return False
    
    # Test area code validation
    try:
        area_code = InputValidator.validate_area_code("415")
        print(f"✓ Valid area code accepted: {area_code}")
    except ValidationError as e:
        print(f"✗ Valid area code rejected: {e}")
        return False
    
    print("✓ All input validation tests passed")
    return True


def test_rate_limiting():
    """Test rate limiting"""
    print("\n=== Testing Rate Limiting ===")
    
    # Test user rate limiter
    limiter = UserRateLimiter(rate=5, period=60)
    identifier = "test_user_verify"
    
    # Should allow first 5 requests
    for i in range(5):
        is_allowed, retry_after = limiter.is_allowed(identifier)
        if not is_allowed:
            print(f"✗ Request {i+1} blocked unexpectedly")
            return False
    
    print("✓ First 5 requests allowed")
    
    # 6th request should be blocked
    is_allowed, retry_after = limiter.is_allowed(identifier)
    if is_allowed:
        print("✗ 6th request not blocked")
        return False
    
    print(f"✓ 6th request blocked (retry after {retry_after}s)")
    
    # Test usage stats
    usage = limiter.get_usage(identifier)
    if usage['count'] == 5 and usage['remaining'] == 0:
        print(f"✓ Usage stats correct: {usage['count']}/{usage['limit']}")
    else:
        print(f"✗ Usage stats incorrect: {usage}")
        return False
    
    print("✓ All rate limiting tests passed")
    return True


def test_security_headers():
    """Test security headers"""
    print("\n=== Testing Security Headers ===")
    
    headers = SecurityHeaders.get_security_headers()
    
    required_headers = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
        'Content-Security-Policy',
    ]
    
    for header in required_headers:
        if header in headers:
            print(f"✓ {header}: {headers[header]}")
        else:
            print(f"✗ Missing header: {header}")
            return False
    
    print("✓ All security headers present")
    return True


def test_audit_logging():
    """Test audit logging"""
    print("\n=== Testing Audit Logging ===")
    
    try:
        # Test basic event logging
        AuditLogger.log_event(
            event_type=AuditEventType.LOGIN_SUCCESS,
            user=None,
            ip_address="127.0.0.1",
            user_agent="Test Agent",
            details={'test': 'verification'},
            severity='INFO'
        )
        print("✓ Basic event logging works")
        
        # Test security event logging
        AuditLogger.log_security_event(
            event_type=AuditEventType.SUSPICIOUS_ACTIVITY,
            request=None,
            details={'reason': 'test'},
            severity='WARNING'
        )
        print("✓ Security event logging works")
        
        print("✓ All audit logging tests passed")
        return True
    except Exception as e:
        print(f"✗ Audit logging failed: {e}")
        return False


def test_middleware_configuration():
    """Test middleware configuration"""
    print("\n=== Testing Middleware Configuration ===")
    
    from django.conf import settings
    
    required_middleware = [
        'god_bless_pro.security_middleware.SecurityHeadersMiddleware',
        'god_bless_pro.security_middleware.SessionSecurityMiddleware',
        'god_bless_pro.security_middleware.InputSanitizationMiddleware',
        'god_bless_pro.security_middleware.RateLimitMiddleware',
        'god_bless_pro.security_middleware.SuspiciousActivityMiddleware',
        'god_bless_pro.security_middleware.RequestLoggingMiddleware',
    ]
    
    for middleware in required_middleware:
        if middleware in settings.MIDDLEWARE:
            print(f"✓ {middleware.split('.')[-1]} configured")
        else:
            print(f"✗ Missing middleware: {middleware}")
            return False
    
    print("✓ All security middleware configured")
    return True


def test_rest_framework_configuration():
    """Test REST framework configuration"""
    print("\n=== Testing REST Framework Configuration ===")
    
    from django.conf import settings
    
    rest_config = settings.REST_FRAMEWORK
    
    # Check throttle classes
    if 'DEFAULT_THROTTLE_CLASSES' in rest_config:
        print(f"✓ Throttle classes configured: {len(rest_config['DEFAULT_THROTTLE_CLASSES'])} classes")
    else:
        print("✗ Throttle classes not configured")
        return False
    
    # Check throttle rates
    if 'DEFAULT_THROTTLE_RATES' in rest_config:
        rates = rest_config['DEFAULT_THROTTLE_RATES']
        print(f"✓ Throttle rates configured:")
        for scope, rate in rates.items():
            print(f"  - {scope}: {rate}")
    else:
        print("✗ Throttle rates not configured")
        return False
    
    print("✓ REST framework security configured")
    return True


def test_session_security_configuration():
    """Test session security configuration"""
    print("\n=== Testing Session Security Configuration ===")
    
    from django.conf import settings
    
    checks = [
        ('SESSION_COOKIE_HTTPONLY', True),
        ('SESSION_COOKIE_SAMESITE', 'Lax'),
        ('CSRF_COOKIE_HTTPONLY', True),
        ('CSRF_COOKIE_SAMESITE', 'Lax'),
        ('SECURE_BROWSER_XSS_FILTER', True),
        ('SECURE_CONTENT_TYPE_NOSNIFF', True),
        ('X_FRAME_OPTIONS', 'DENY'),
    ]
    
    for setting_name, expected_value in checks:
        actual_value = getattr(settings, setting_name, None)
        if actual_value == expected_value:
            print(f"✓ {setting_name} = {actual_value}")
        else:
            print(f"✗ {setting_name} = {actual_value} (expected {expected_value})")
            return False
    
    print("✓ Session security properly configured")
    return True


def main():
    """Run all verification tests"""
    print("=" * 60)
    print("Security Implementation Verification")
    print("=" * 60)
    
    tests = [
        ("Input Validation", test_input_validation),
        ("Rate Limiting", test_rate_limiting),
        ("Security Headers", test_security_headers),
        ("Audit Logging", test_audit_logging),
        ("Middleware Configuration", test_middleware_configuration),
        ("REST Framework Configuration", test_rest_framework_configuration),
        ("Session Security Configuration", test_session_security_configuration),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ {test_name} failed with exception: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("Verification Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ All security features verified successfully!")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) failed")
        return 1


if __name__ == '__main__':
    sys.exit(main())

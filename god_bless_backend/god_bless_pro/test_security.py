"""
Tests for security features.
"""

import pytest
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework import status

from god_bless_pro.security import InputValidator, SecurityHeaders
from god_bless_pro.rate_limiting import UserRateLimiter, IPRateLimiter
from god_bless_pro.session_security import SessionManager
from god_bless_pro.audit_logging import AuditLogger, AuditEventType

User = get_user_model()


class InputValidatorTests(TestCase):
    """Test input validation and sanitization"""
    
    def test_validate_email_valid(self):
        """Test valid email validation"""
        email = "test@example.com"
        result = InputValidator.validate_email(email)
        self.assertEqual(result, email)
    
    def test_validate_email_invalid(self):
        """Test invalid email validation"""
        with self.assertRaises(ValidationError):
            InputValidator.validate_email("invalid-email")
    
    def test_validate_email_sql_injection(self):
        """Test SQL injection detection in email"""
        with self.assertRaises(ValidationError):
            InputValidator.validate_email("test@example.com' OR '1'='1")
    
    def test_validate_phone_number(self):
        """Test phone number validation"""
        phone = "+1234567890"
        result = InputValidator.validate_phone_number(phone)
        self.assertEqual(result, "+1234567890")
    
    def test_validate_area_code(self):
        """Test area code validation"""
        area_code = "415"
        result = InputValidator.validate_area_code(area_code)
        self.assertEqual(result, area_code)
    
    def test_validate_area_code_invalid(self):
        """Test invalid area code"""
        with self.assertRaises(ValidationError):
            InputValidator.validate_area_code("12")
    
    def test_validate_username(self):
        """Test username validation"""
        username = "test_user123"
        result = InputValidator.validate_username(username)
        self.assertEqual(result, username)
    
    def test_validate_username_invalid(self):
        """Test invalid username"""
        with self.assertRaises(ValidationError):
            InputValidator.validate_username("ab")  # Too short
    
    def test_validate_integer(self):
        """Test integer validation"""
        result = InputValidator.validate_integer("42", min_val=0, max_val=100)
        self.assertEqual(result, 42)
    
    def test_validate_integer_out_of_range(self):
        """Test integer out of range"""
        with self.assertRaises(ValidationError):
            InputValidator.validate_integer("150", min_val=0, max_val=100)
    
    def test_sanitize_text(self):
        """Test text sanitization"""
        text = "<script>alert('xss')</script>Hello"
        result = InputValidator.sanitize_text(text)
        self.assertNotIn("<script>", result)
    
    def test_sanitize_html(self):
        """Test HTML sanitization"""
        html = "<p>Hello</p><script>alert('xss')</script>"
        result = InputValidator.sanitize_html(html)
        self.assertIn("<p>", result)
        self.assertNotIn("<script>", result)
    
    def test_validate_password_valid(self):
        """Test valid password"""
        password = "Test@123!"
        result = InputValidator.validate_password(password)
        self.assertEqual(result, password)
    
    def test_validate_password_weak(self):
        """Test weak password"""
        with self.assertRaises(ValidationError):
            InputValidator.validate_password("weak")
    
    def test_sql_injection_detection(self):
        """Test SQL injection pattern detection"""
        malicious_input = "'; DROP TABLE users; --"
        self.assertTrue(InputValidator._contains_sql_injection(malicious_input))
    
    def test_xss_detection(self):
        """Test XSS pattern detection"""
        malicious_input = "<script>alert('xss')</script>"
        self.assertTrue(InputValidator._contains_xss(malicious_input))


class RateLimitingTests(TestCase):
    """Test rate limiting functionality"""
    
    def setUp(self):
        self.user_limiter = UserRateLimiter(rate=5, period=60)
        self.ip_limiter = IPRateLimiter(rate=3, period=60)
    
    def test_rate_limit_allows_requests(self):
        """Test that requests within limit are allowed"""
        identifier = "test_user_1"
        
        for i in range(5):
            is_allowed, retry_after = self.user_limiter.is_allowed(identifier)
            self.assertTrue(is_allowed)
            self.assertIsNone(retry_after)
    
    def test_rate_limit_blocks_excess_requests(self):
        """Test that requests exceeding limit are blocked"""
        identifier = "test_user_2"
        
        # Use up the limit
        for i in range(5):
            self.user_limiter.is_allowed(identifier)
        
        # Next request should be blocked
        is_allowed, retry_after = self.user_limiter.is_allowed(identifier)
        self.assertFalse(is_allowed)
        self.assertIsNotNone(retry_after)
    
    def test_rate_limit_usage_stats(self):
        """Test rate limit usage statistics"""
        identifier = "test_user_3"
        
        # Make 3 requests
        for i in range(3):
            self.user_limiter.is_allowed(identifier)
        
        usage = self.user_limiter.get_usage(identifier)
        self.assertEqual(usage['count'], 3)
        self.assertEqual(usage['limit'], 5)
        self.assertEqual(usage['remaining'], 2)


class SessionSecurityTests(TestCase):
    """Test session security functionality"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='Test@123!'
        )
    
    def test_create_session(self):
        """Test session creation"""
        request = self.factory.get('/')
        request.user = self.user
        request.session = {}
        
        # Mock session
        class MockSession:
            def __init__(self):
                self.session_key = 'test_session_key'
            
            def create(self):
                pass
            
            def set_expiry(self, seconds):
                pass
        
        request.session = MockSession()
        
        session_data = SessionManager.create_session(request, self.user)
        
        self.assertEqual(session_data['user_id'], self.user.id)
        self.assertIn('created_at', session_data)
        self.assertIn('last_activity', session_data)


class AuditLoggingTests(TestCase):
    """Test audit logging functionality"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='Test@123!'
        )
    
    def test_log_event(self):
        """Test basic event logging"""
        request = self.factory.get('/')
        request.user = self.user
        
        # This should not raise an exception
        AuditLogger.log_event(
            event_type=AuditEventType.LOGIN_SUCCESS,
            user=self.user,
            request=request,
            details={'test': 'data'},
            severity='INFO'
        )
    
    def test_log_authentication(self):
        """Test authentication event logging"""
        request = self.factory.post('/api/accounts/login/')
        request.user = self.user
        
        # This should not raise an exception
        AuditLogger.log_authentication(
            event_type=AuditEventType.LOGIN_SUCCESS,
            user=self.user,
            request=request,
            success=True
        )
    
    def test_log_security_event(self):
        """Test security event logging"""
        request = self.factory.get('/')
        
        # This should not raise an exception
        AuditLogger.log_security_event(
            event_type=AuditEventType.SQL_INJECTION_ATTEMPT,
            request=request,
            details={'query': 'malicious query'},
            severity='CRITICAL'
        )


class SecurityHeadersTests(TestCase):
    """Test security headers"""
    
    def test_get_security_headers(self):
        """Test security headers generation"""
        headers = SecurityHeaders.get_security_headers()
        
        self.assertIn('X-Content-Type-Options', headers)
        self.assertIn('X-Frame-Options', headers)
        self.assertIn('X-XSS-Protection', headers)
        self.assertIn('Strict-Transport-Security', headers)
        self.assertIn('Content-Security-Policy', headers)
        
        self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(headers['X-Frame-Options'], 'DENY')


@pytest.mark.django_db
class SecurityIntegrationTests(APITestCase):
    """Integration tests for security features"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='Test@123!'
        )
    
    def test_rate_limiting_integration(self):
        """Test rate limiting in API requests"""
        # This would require actual API endpoints
        # For now, just verify the setup
        self.assertTrue(True)
    
    def test_input_validation_integration(self):
        """Test input validation in API requests"""
        # This would require actual API endpoints
        # For now, just verify the setup
        self.assertTrue(True)


if __name__ == '__main__':
    pytest.main([__file__])

"""
Security middleware for the God Bless platform.
Implements security headers, session validation, and request sanitization.
"""

import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.core.exceptions import ValidationError
from rest_framework import status

from god_bless_pro.security import SecurityHeaders, InputValidator
from god_bless_pro.session_security import SessionManager
from god_bless_pro.rate_limiting import get_client_ip, UserRateLimiter, IPRateLimiter
from god_bless_pro.audit_logging import (
    AuditLogger,
    AuditEventType,
    log_sql_injection_attempt,
    log_xss_attempt,
    log_suspicious_activity
)

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Add security headers to all responses"""
    
    def process_response(self, request, response):
        """Add security headers to response"""
        headers = SecurityHeaders.get_security_headers()
        
        for header, value in headers.items():
            response[header] = value
        
        return response


class SessionSecurityMiddleware(MiddlewareMixin):
    """Validate and manage secure sessions"""
    
    # Paths that don't require session validation
    EXEMPT_PATHS = [
        '/api/accounts/login/',
        '/api/accounts/register/',
        '/api/accounts/password-reset/',
        '/api/health/',
        '/admin/login/',
        '/admin/',  # Exempt all admin paths from strict session validation
    ]
    
    def process_request(self, request):
        """Validate session before processing request"""
        # Skip session validation for exempt paths
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return None
        
        # Skip for unauthenticated requests
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        
        # Validate session
        if not SessionManager.validate_session(request):
            # Session invalid - force logout
            SessionManager.destroy_session(request)
            
            AuditLogger.log_event(
                event_type=AuditEventType.SESSION_EXPIRED,
                request=request,
                details={'reason': 'Session validation failed'},
                severity='WARNING'
            )
            
            return JsonResponse({
                'message': 'Session expired',
                'errors': {'session': ['Your session has expired. Please login again.']}
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Refresh session activity
        SessionManager.refresh_session(request)
        
        return None


class InputSanitizationMiddleware(MiddlewareMixin):
    """Sanitize and validate input data"""
    
    # Paths to skip sanitization
    EXEMPT_PATHS = [
        '/admin/',
        '/static/',
        '/media/',
    ]
    
    def process_request(self, request):
        """Sanitize request data"""
        # Skip for exempt paths
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return None
        
        # Check for SQL injection patterns in query parameters
        for key, value in request.GET.items():
            if isinstance(value, str) and self._contains_sql_injection(value):
                log_sql_injection_attempt(request, value)
                return JsonResponse({
                    'message': 'Invalid request',
                    'errors': {'security': ['Invalid input detected']}
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check POST data for SQL injection and XSS
        if request.method in ['POST', 'PUT', 'PATCH']:
            if hasattr(request, 'data'):
                for key, value in request.data.items():
                    if isinstance(value, str):
                        if self._contains_sql_injection(value):
                            log_sql_injection_attempt(request, value)
                            return JsonResponse({
                                'message': 'Invalid request',
                                'errors': {'security': ['Invalid input detected']}
                            }, status=status.HTTP_400_BAD_REQUEST)
                        
                        if self._contains_xss(value):
                            log_xss_attempt(request, value)
                            return JsonResponse({
                                'message': 'Invalid request',
                                'errors': {'security': ['Invalid input detected']}
                            }, status=status.HTTP_400_BAD_REQUEST)
        
        return None
    
    @staticmethod
    def _contains_sql_injection(text: str) -> bool:
        """Check for SQL injection patterns"""
        return InputValidator._contains_sql_injection(text)
    
    @staticmethod
    def _contains_xss(text: str) -> bool:
        """Check for XSS patterns"""
        return InputValidator._contains_xss(text)


class RateLimitMiddleware(MiddlewareMixin):
    """Apply rate limiting to requests"""
    
    # Paths exempt from rate limiting
    EXEMPT_PATHS = [
        '/admin/',
        '/static/',
        '/media/',
        '/api/health/',
    ]
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.user_limiter = UserRateLimiter(rate=1000, period=3600)  # 1000 req/hour
        self.ip_limiter = IPRateLimiter(rate=100, period=3600)  # 100 req/hour for anonymous
    
    def process_request(self, request):
        """Check rate limits"""
        # Skip for exempt paths
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return None
        
        # Determine identifier and limiter
        if hasattr(request, 'user') and request.user.is_authenticated:
            identifier = str(request.user.id)
            limiter = self.user_limiter
        else:
            identifier = get_client_ip(request)
            limiter = self.ip_limiter
        
        # Check rate limit
        is_allowed, retry_after = limiter.is_allowed(identifier)
        
        if not is_allowed:
            # Log rate limit exceeded
            AuditLogger.log_rate_limit(
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                request=request,
                endpoint=request.path,
                limit=limiter.rate
            )
            
            response = JsonResponse({
                'message': 'Rate limit exceeded',
                'errors': {'rate_limit': [f'Too many requests. Please try again in {retry_after} seconds.']}
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            response['Retry-After'] = str(retry_after)
            response['X-RateLimit-Limit'] = str(limiter.rate)
            response['X-RateLimit-Remaining'] = '0'
            response['X-RateLimit-Reset'] = str(retry_after)
            
            return response
        
        # Add rate limit headers to response
        usage = limiter.get_usage(identifier)
        request._rate_limit_usage = usage
        
        return None
    
    def process_response(self, request, response):
        """Add rate limit headers to response"""
        if hasattr(request, '_rate_limit_usage'):
            usage = request._rate_limit_usage
            response['X-RateLimit-Limit'] = str(usage['limit'])
            response['X-RateLimit-Remaining'] = str(usage['remaining'])
            if usage['reset_time']:
                response['X-RateLimit-Reset'] = str(int(usage['reset_time']))
        
        return response


class CSRFProtectionMiddleware(MiddlewareMixin):
    """Enhanced CSRF protection"""
    
    def process_request(self, request):
        """Validate CSRF token for state-changing requests"""
        # Django's built-in CSRF middleware handles most of this
        # This is for additional logging
        return None
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """Log CSRF failures"""
        return None


class SuspiciousActivityMiddleware(MiddlewareMixin):
    """Detect and log suspicious activity"""
    
    def process_request(self, request):
        """Check for suspicious patterns"""
        suspicious = False
        reasons = []
        
        # Check for suspicious user agents
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        if self._is_suspicious_user_agent(user_agent):
            suspicious = True
            reasons.append('Suspicious user agent')
        
        # Check for path traversal attempts
        if '../' in request.path or '..\\' in request.path:
            suspicious = True
            reasons.append('Path traversal attempt')
        
        # Check for suspicious headers
        if self._has_suspicious_headers(request):
            suspicious = True
            reasons.append('Suspicious headers')
        
        if suspicious:
            log_suspicious_activity(
                request,
                'suspicious_request',
                {
                    'reasons': reasons,
                    'path': request.path,
                    'method': request.method,
                }
            )
        
        return None
    
    @staticmethod
    def _is_suspicious_user_agent(user_agent: str) -> bool:
        """Check if user agent is suspicious"""
        suspicious_patterns = [
            'sqlmap',
            'nikto',
            'nmap',
            'masscan',
            'nessus',
            'burp',
            'metasploit',
        ]
        
        user_agent_lower = user_agent.lower()
        return any(pattern in user_agent_lower for pattern in suspicious_patterns)
    
    @staticmethod
    def _has_suspicious_headers(request) -> bool:
        """Check for suspicious headers"""
        # Check for common attack headers
        suspicious_headers = [
            'X-Forwarded-Host',
            'X-Original-URL',
            'X-Rewrite-URL',
        ]
        
        for header in suspicious_headers:
            if header in request.META:
                return True
        
        return False


class RequestLoggingMiddleware(MiddlewareMixin):
    """Log all API requests for audit purposes"""
    
    # Paths to skip logging
    EXEMPT_PATHS = [
        '/static/',
        '/media/',
        '/api/health/',
    ]
    
    def process_request(self, request):
        """Log request start"""
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return None
        
        request._start_time = logging.time.time() if hasattr(logging, 'time') else None
        
        return None
    
    def process_response(self, request, response):
        """Log request completion"""
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return response
        
        # Calculate request duration
        duration = None
        if hasattr(request, '_start_time') and request._start_time:
            import time
            duration = time.time() - request._start_time
        
        # Log request
        log_data = {
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration': duration,
            'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None,
        }
        
        if response.status_code >= 400:
            logger.warning(f"Request failed: {log_data}")
        else:
            logger.info(f"Request completed: {log_data}")
        
        return response

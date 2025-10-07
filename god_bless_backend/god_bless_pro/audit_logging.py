"""
Audit logging system for security events and user actions.
Tracks important security events for compliance and monitoring.
"""

import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import models

User = get_user_model()

# Configure audit logger
audit_logger = logging.getLogger('audit')


class AuditEventType:
    """Audit event types"""
    
    # Authentication events
    LOGIN_SUCCESS = 'login_success'
    LOGIN_FAILED = 'login_failed'
    LOGOUT = 'logout'
    PASSWORD_CHANGE = 'password_change'
    PASSWORD_RESET_REQUEST = 'password_reset_request'
    PASSWORD_RESET_COMPLETE = 'password_reset_complete'
    
    # Account events
    ACCOUNT_CREATED = 'account_created'
    ACCOUNT_UPDATED = 'account_updated'
    ACCOUNT_DELETED = 'account_deleted'
    ACCOUNT_LOCKED = 'account_locked'
    ACCOUNT_UNLOCKED = 'account_unlocked'
    
    # Session events
    SESSION_CREATED = 'session_created'
    SESSION_EXPIRED = 'session_expired'
    SESSION_HIJACK_ATTEMPT = 'session_hijack_attempt'
    
    # Access events
    UNAUTHORIZED_ACCESS = 'unauthorized_access'
    PERMISSION_DENIED = 'permission_denied'
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded'
    
    # Data events
    DATA_EXPORT = 'data_export'
    DATA_IMPORT = 'data_import'
    DATA_DELETION = 'data_deletion'
    BULK_OPERATION = 'bulk_operation'
    
    # Security events
    SUSPICIOUS_ACTIVITY = 'suspicious_activity'
    SQL_INJECTION_ATTEMPT = 'sql_injection_attempt'
    XSS_ATTEMPT = 'xss_attempt'
    CSRF_FAILURE = 'csrf_failure'
    
    # API events
    API_KEY_CREATED = 'api_key_created'
    API_KEY_REVOKED = 'api_key_revoked'
    API_RATE_LIMIT = 'api_rate_limit'
    
    # System events
    SYSTEM_ERROR = 'system_error'
    CONFIGURATION_CHANGE = 'configuration_change'


class AuditLogger:
    """Centralized audit logging"""
    
    @staticmethod
    def log_event(
        event_type: str,
        user: Optional[User] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: str = 'INFO',
        request: Optional[Any] = None
    ) -> None:
        """
        Log an audit event
        
        Args:
            event_type: Type of event (from AuditEventType)
            user: User associated with the event
            ip_address: IP address of the client
            user_agent: User agent string
            details: Additional event details
            severity: Event severity (INFO, WARNING, ERROR, CRITICAL)
            request: Django request object (optional)
        """
        # Extract info from request if provided
        if request:
            if not ip_address:
                ip_address = AuditLogger._get_client_ip(request)
            if not user_agent:
                user_agent = request.META.get('HTTP_USER_AGENT', '')[:200]
            if not user and hasattr(request, 'user') and request.user.is_authenticated:
                user = request.user
        
        # Build audit log entry
        log_entry = {
            'timestamp': timezone.now().isoformat(),
            'event_type': event_type,
            'severity': severity,
            'user_id': user.id if user else None,
            'username': user.username if user else None,
            'email': user.email if user else None,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'details': details or {},
        }
        
        # Log to file
        log_message = json.dumps(log_entry)
        
        if severity == 'CRITICAL':
            audit_logger.critical(log_message)
        elif severity == 'ERROR':
            audit_logger.error(log_message)
        elif severity == 'WARNING':
            audit_logger.warning(log_message)
        else:
            audit_logger.info(log_message)
        
        # Store in database (optional - create AuditLog model if needed)
        try:
            from activities.models import AllActivity
            if user:
                AllActivity.objects.create(
                    user=user,
                    subject=event_type,
                    body=json.dumps(details) if details else ''
                )
        except Exception as e:
            # Don't fail if activity logging fails
            logging.error(f"Failed to create activity log: {e}")
    
    @staticmethod
    def log_authentication(event_type: str, user: Optional[User], request, success: bool = True, reason: Optional[str] = None):
        """Log authentication events"""
        details = {
            'success': success,
            'reason': reason,
        }
        
        severity = 'INFO' if success else 'WARNING'
        
        AuditLogger.log_event(
            event_type=event_type,
            user=user,
            request=request,
            details=details,
            severity=severity
        )
    
    @staticmethod
    def log_access_denied(user: Optional[User], request, resource: str, reason: str):
        """Log access denied events"""
        details = {
            'resource': resource,
            'reason': reason,
            'method': request.method if request else None,
            'path': request.path if request else None,
        }
        
        AuditLogger.log_event(
            event_type=AuditEventType.PERMISSION_DENIED,
            user=user,
            request=request,
            details=details,
            severity='WARNING'
        )
    
    @staticmethod
    def log_data_operation(event_type: str, user: User, request, operation: str, count: int, filters: Optional[Dict] = None):
        """Log data operations (export, import, deletion)"""
        details = {
            'operation': operation,
            'count': count,
            'filters': filters or {},
        }
        
        AuditLogger.log_event(
            event_type=event_type,
            user=user,
            request=request,
            details=details,
            severity='INFO'
        )
    
    @staticmethod
    def log_security_event(event_type: str, request, details: Dict[str, Any], severity: str = 'WARNING'):
        """Log security events"""
        user = None
        if hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
        
        AuditLogger.log_event(
            event_type=event_type,
            user=user,
            request=request,
            details=details,
            severity=severity
        )
    
    @staticmethod
    def log_rate_limit(user: Optional[User], request, endpoint: str, limit: int):
        """Log rate limit exceeded events"""
        details = {
            'endpoint': endpoint,
            'limit': limit,
            'method': request.method if request else None,
        }
        
        AuditLogger.log_event(
            event_type=AuditEventType.RATE_LIMIT_EXCEEDED,
            user=user,
            request=request,
            details=details,
            severity='WARNING'
        )
    
    @staticmethod
    def log_system_error(error: Exception, request=None, details: Optional[Dict] = None):
        """Log system errors"""
        error_details = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'path': request.path if request else None,
            'method': request.method if request else None,
        }
        
        if details:
            error_details.update(details)
        
        user = None
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
        
        AuditLogger.log_event(
            event_type=AuditEventType.SYSTEM_ERROR,
            user=user,
            request=request,
            details=error_details,
            severity='ERROR'
        )
    
    @staticmethod
    def _get_client_ip(request) -> str:
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip


# Convenience functions for common audit events

def log_login_success(user: User, request):
    """Log successful login"""
    AuditLogger.log_authentication(
        AuditEventType.LOGIN_SUCCESS,
        user,
        request,
        success=True
    )


def log_login_failed(email: str, request, reason: str):
    """Log failed login attempt"""
    AuditLogger.log_authentication(
        AuditEventType.LOGIN_FAILED,
        None,
        request,
        success=False,
        reason=reason
    )


def log_logout(user: User, request):
    """Log user logout"""
    AuditLogger.log_event(
        AuditEventType.LOGOUT,
        user,
        request=request,
        severity='INFO'
    )


def log_password_change(user: User, request):
    """Log password change"""
    AuditLogger.log_event(
        AuditEventType.PASSWORD_CHANGE,
        user,
        request=request,
        severity='INFO'
    )


def log_account_created(user: User, request):
    """Log account creation"""
    AuditLogger.log_event(
        AuditEventType.ACCOUNT_CREATED,
        user,
        request=request,
        severity='INFO'
    )


def log_suspicious_activity(request, activity_type: str, details: Dict):
    """Log suspicious activity"""
    details['activity_type'] = activity_type
    AuditLogger.log_security_event(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        request,
        details,
        severity='WARNING'
    )


def log_sql_injection_attempt(request, query: str):
    """Log SQL injection attempt"""
    AuditLogger.log_security_event(
        AuditEventType.SQL_INJECTION_ATTEMPT,
        request,
        {'query': query[:500]},  # Limit query length
        severity='CRITICAL'
    )


def log_xss_attempt(request, content: str):
    """Log XSS attempt"""
    AuditLogger.log_security_event(
        AuditEventType.XSS_ATTEMPT,
        request,
        {'content': content[:500]},  # Limit content length
        severity='CRITICAL'
    )

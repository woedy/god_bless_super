"""
Security decorators for views and API endpoints.
Provides convenient decorators for applying security measures.
"""

from functools import wraps
from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response

from god_bless_pro.security import InputValidator
from god_bless_pro.rate_limiting import (
    BaseRateLimiter,
    UserRateLimiter,
    IPRateLimiter,
    EndpointRateLimiter,
    check_rate_limit
)
from god_bless_pro.audit_logging import AuditLogger, AuditEventType


def validate_input(**validators):
    """
    Decorator to validate input parameters
    
    Usage:
        @validate_input(
            email=InputValidator.validate_email,
            username=InputValidator.validate_username
        )
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            errors = {}
            
            # Get data from request
            if request.method == 'GET':
                data = request.GET
            else:
                data = request.data if hasattr(request, 'data') else request.POST
            
            # Validate each field
            for field_name, validator_func in validators.items():
                if field_name in data:
                    try:
                        # Validate and update data
                        validated_value = validator_func(data[field_name])
                        if hasattr(request, 'data'):
                            request.data[field_name] = validated_value
                    except Exception as e:
                        errors[field_name] = [str(e)]
            
            # Return errors if any
            if errors:
                if hasattr(view_func, 'cls'):
                    # DRF view
                    return Response({
                        'message': 'Validation errors',
                        'errors': errors
                    }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    # Django view
                    return JsonResponse({
                        'message': 'Validation errors',
                        'errors': errors
                    }, status=400)
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def rate_limit(rate: int, period: int, scope: str = 'endpoint'):
    """
    Decorator to apply rate limiting to a view
    
    Usage:
        @rate_limit(rate=10, period=60)  # 10 requests per minute
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Create rate limiter
            endpoint_name = f"{view_func.__module__}.{view_func.__name__}"
            limiter = EndpointRateLimiter(endpoint_name, rate, period)
            
            # Check rate limit
            is_allowed, retry_after = check_rate_limit(request, limiter)
            
            if not is_allowed:
                # Log rate limit exceeded
                AuditLogger.log_rate_limit(
                    user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                    request=request,
                    endpoint=endpoint_name,
                    limit=rate
                )
                
                if hasattr(view_func, 'cls'):
                    # DRF view
                    return Response({
                        'message': 'Rate limit exceeded',
                        'errors': {'rate_limit': [f'Too many requests. Please try again in {retry_after} seconds.']}
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                else:
                    # Django view
                    response = JsonResponse({
                        'message': 'Rate limit exceeded',
                        'errors': {'rate_limit': [f'Too many requests. Please try again in {retry_after} seconds.']}
                    }, status=429)
                    response['Retry-After'] = str(retry_after)
                    return response
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def audit_log(event_type: str, severity: str = 'INFO'):
    """
    Decorator to automatically log audit events
    
    Usage:
        @audit_log(event_type=AuditEventType.DATA_EXPORT)
        def export_data(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Execute view
            response = view_func(request, *args, **kwargs)
            
            # Log audit event
            details = {
                'view': f"{view_func.__module__}.{view_func.__name__}",
                'method': request.method,
                'path': request.path,
            }
            
            # Add response status if available
            if hasattr(response, 'status_code'):
                details['status_code'] = response.status_code
            
            AuditLogger.log_event(
                event_type=event_type,
                request=request,
                details=details,
                severity=severity
            )
            
            return response
        
        return wrapper
    return decorator


def require_secure_connection(view_func):
    """
    Decorator to require HTTPS connection
    
    Usage:
        @require_secure_connection
        def sensitive_view(request):
            ...
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.is_secure() and not request.META.get('HTTP_X_FORWARDED_PROTO') == 'https':
            if hasattr(view_func, 'cls'):
                # DRF view
                return Response({
                    'message': 'HTTPS required',
                    'errors': {'security': ['This endpoint requires a secure connection']}
                }, status=status.HTTP_403_FORBIDDEN)
            else:
                # Django view
                return JsonResponse({
                    'message': 'HTTPS required',
                    'errors': {'security': ['This endpoint requires a secure connection']}
                }, status=403)
        
        return view_func(request, *args, **kwargs)
    
    return wrapper


def sanitize_input(*fields):
    """
    Decorator to sanitize specific input fields
    
    Usage:
        @sanitize_input('message', 'description')
        def create_post(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Get data from request
            if request.method == 'GET':
                data = request.GET.copy()
            else:
                data = request.data.copy() if hasattr(request, 'data') else request.POST.copy()
            
            # Sanitize specified fields
            for field in fields:
                if field in data and isinstance(data[field], str):
                    data[field] = InputValidator.sanitize_text(data[field])
            
            # Update request data
            if hasattr(request, 'data'):
                request._full_data = data
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def log_access(resource_name: str):
    """
    Decorator to log resource access
    
    Usage:
        @log_access('user_data')
        def get_user_data(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Log access attempt
            AuditLogger.log_event(
                event_type='resource_access',
                request=request,
                details={
                    'resource': resource_name,
                    'view': f"{view_func.__module__}.{view_func.__name__}",
                },
                severity='INFO'
            )
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def check_ip_whitelist(view_func):
    """
    Decorator to check if request IP is whitelisted
    
    Usage:
        @check_ip_whitelist
        def admin_only_view(request):
            ...
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        from django.conf import settings
        
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        
        # Check whitelist
        whitelist = getattr(settings, 'IP_WHITELIST', [])
        if whitelist and ip not in whitelist:
            AuditLogger.log_event(
                event_type=AuditEventType.UNAUTHORIZED_ACCESS,
                request=request,
                details={
                    'reason': 'IP not whitelisted',
                    'ip': ip,
                },
                severity='WARNING'
            )
            
            if hasattr(view_func, 'cls'):
                # DRF view
                return Response({
                    'message': 'Access denied',
                    'errors': {'security': ['Access denied from this IP address']}
                }, status=status.HTTP_403_FORBIDDEN)
            else:
                # Django view
                return JsonResponse({
                    'message': 'Access denied',
                    'errors': {'security': ['Access denied from this IP address']}
                }, status=403)
        
        return view_func(request, *args, **kwargs)
    
    return wrapper


def validate_content_type(*allowed_types):
    """
    Decorator to validate request content type
    
    Usage:
        @validate_content_type('application/json')
        def api_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            content_type = request.META.get('CONTENT_TYPE', '').split(';')[0]
            
            if content_type not in allowed_types:
                if hasattr(view_func, 'cls'):
                    # DRF view
                    return Response({
                        'message': 'Invalid content type',
                        'errors': {'content_type': [f'Content type must be one of: {", ".join(allowed_types)}']}
                    }, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
                else:
                    # Django view
                    return JsonResponse({
                        'message': 'Invalid content type',
                        'errors': {'content_type': [f'Content type must be one of: {", ".join(allowed_types)}']}
                    }, status=415)
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator

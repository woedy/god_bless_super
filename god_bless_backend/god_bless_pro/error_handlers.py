"""
Global error handlers for the God Bless platform.
Provides consistent error responses across all API endpoints.
"""

import logging
import traceback
from django.http import JsonResponse
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework import status

from .exceptions import BaseAPIException

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    # Log the exception
    log_exception(exc, context)

    # If response is None, it's not a DRF exception
    if response is None:
        response = handle_non_drf_exception(exc, context)

    # Add custom error format
    if response is not None:
        error_data = format_error_response(exc, response)
        response.data = error_data

    return response


def handle_non_drf_exception(exc, context):
    """
    Handle exceptions that are not DRF exceptions.
    """
    if isinstance(exc, DjangoValidationError):
        return JsonResponse(
            {
                'error': {
                    'message': 'Validation error',
                    'code': 'validation_error',
                    'details': exc.message_dict if hasattr(exc, 'message_dict') else {'error': exc.messages},
                },
                'success': False,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Handle unexpected exceptions
    logger.error(f'Unexpected error: {str(exc)}', exc_info=True)
    
    # Don't expose internal errors in production
    error_message = str(exc) if logger.level == logging.DEBUG else 'An unexpected error occurred'
    
    return JsonResponse(
        {
            'error': {
                'message': error_message,
                'code': 'internal_error',
                'details': {},
            },
            'success': False,
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def format_error_response(exc, response):
    """
    Format error response in a consistent structure.
    """
    error_data = {
        'error': {
            'message': get_error_message(exc, response),
            'code': get_error_code(exc),
            'details': get_error_details(exc, response),
        },
        'success': False,
    }

    return error_data


def get_error_message(exc, response):
    """
    Extract error message from exception.
    """
    if isinstance(exc, BaseAPIException):
        return str(exc.detail)
    
    if hasattr(response, 'data'):
        if isinstance(response.data, dict):
            # Handle DRF validation errors
            if 'detail' in response.data:
                return response.data['detail']
            # Handle field-specific errors
            if any(key not in ['detail', 'error', 'message'] for key in response.data.keys()):
                return 'Validation error. Please check your input.'
        elif isinstance(response.data, list):
            return response.data[0] if response.data else 'An error occurred'
    
    return str(exc)


def get_error_code(exc):
    """
    Extract error code from exception.
    """
    if isinstance(exc, BaseAPIException):
        return exc.default_code
    
    if isinstance(exc, APIException):
        return getattr(exc, 'default_code', 'error')
    
    return 'unknown_error'


def get_error_details(exc, response):
    """
    Extract error details from exception.
    """
    details = {}

    if isinstance(exc, BaseAPIException) and hasattr(exc, 'details'):
        details = exc.details

    if hasattr(response, 'data') and isinstance(response.data, dict):
        # Include field-specific validation errors
        for key, value in response.data.items():
            if key not in ['detail', 'error', 'message']:
                details[key] = value

    return details


def log_exception(exc, context):
    """
    Log exception with context information.
    """
    request = context.get('request')
    view = context.get('view')

    log_data = {
        'exception_type': type(exc).__name__,
        'exception_message': str(exc),
        'view': view.__class__.__name__ if view else None,
        'method': request.method if request else None,
        'path': request.path if request else None,
        'user': str(request.user) if request and hasattr(request, 'user') else None,
    }

    # Log at appropriate level
    if isinstance(exc, (BaseAPIException, APIException)):
        if exc.status_code >= 500:
            logger.error(f'Server error: {log_data}', exc_info=True)
        elif exc.status_code >= 400:
            logger.warning(f'Client error: {log_data}')
    else:
        logger.error(f'Unexpected error: {log_data}', exc_info=True)


class ErrorLoggingMiddleware:
    """
    Middleware to log all errors that occur during request processing.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_exception(self, request, exception):
        """
        Log exceptions that occur during request processing.
        """
        logger.error(
            f'Exception during request processing: {request.method} {request.path}',
            exc_info=True,
            extra={
                'request_method': request.method,
                'request_path': request.path,
                'user': str(request.user) if hasattr(request, 'user') else None,
                'exception_type': type(exception).__name__,
                'exception_message': str(exception),
                'traceback': traceback.format_exc(),
            },
        )
        return None  # Let Django's default exception handling continue

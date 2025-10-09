"""
Core views for the God Bless platform.
"""

import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """
    API root endpoint showing available endpoints.
    """
    return Response({
        'message': 'God Bless Platform API',
        'version': '1.0.0',
        'endpoints': {
            'health': '/api/health/',
            'accounts': '/api/accounts/',
            'phone-generator': '/api/phone-generator/',
            'phone-validator': '/api/phone-validator/',
            'sms-sender': '/api/sms-sender/',
            'dashboard': '/api/dashboard/',
            'projects': '/api/projects/',
            'tasks': '/api/tasks/',
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def log_frontend_error(request):
    """
    Endpoint to receive and log frontend errors.
    This allows the frontend to send error information to the backend for centralized logging.
    """
    try:
        error_data = request.data
        
        # Extract error information
        message = error_data.get('message', 'Unknown error')
        stack = error_data.get('stack', '')
        component_stack = error_data.get('componentStack', '')
        url = error_data.get('url', '')
        user_agent = error_data.get('userAgent', '')
        timestamp = error_data.get('timestamp', timezone.now().isoformat())
        
        # Log the error
        logger.error(
            f'Frontend Error: {message}',
            extra={
                'error_type': 'frontend_error',
                'error_message': message,
                'stack': stack,
                'component_stack': component_stack,
                'url': url,
                'user_agent': user_agent,
                'timestamp': timestamp,
                'user': str(request.user) if request.user.is_authenticated else 'anonymous',
            }
        )
        
        return Response(
            {
                'success': True,
                'message': 'Error logged successfully',
            },
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f'Failed to log frontend error: {str(e)}', exc_info=True)
        return Response(
            {
                'success': False,
                'error': 'Failed to log error',
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

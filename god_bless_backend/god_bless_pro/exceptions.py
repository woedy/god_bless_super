"""
Custom exception classes for the God Bless platform.
These exceptions provide structured error handling across the application.
"""

from rest_framework.exceptions import APIException
from rest_framework import status


class BaseAPIException(APIException):
    """Base exception class for all custom API exceptions"""
    
    def __init__(self, message=None, code=None, details=None):
        if message:
            self.detail = message
        if code:
            self.code = code
        self.details = details or {}
        super().__init__(detail=self.detail)


class ValidationException(BaseAPIException):
    """Raised when validation fails"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Validation error occurred'
    default_code = 'validation_error'


class ResourceNotFoundException(BaseAPIException):
    """Raised when a requested resource is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'The requested resource was not found'
    default_code = 'not_found'


class PermissionDeniedException(BaseAPIException):
    """Raised when user doesn't have permission for an action"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to perform this action'
    default_code = 'permission_denied'


class AuthenticationException(BaseAPIException):
    """Raised when authentication fails"""
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Authentication credentials were not provided or are invalid'
    default_code = 'authentication_failed'


class RateLimitException(BaseAPIException):
    """Raised when rate limit is exceeded"""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'Rate limit exceeded. Please try again later'
    default_code = 'rate_limit_exceeded'


class ServiceUnavailableException(BaseAPIException):
    """Raised when a service is temporarily unavailable"""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Service temporarily unavailable. Please try again later'
    default_code = 'service_unavailable'


class TaskException(BaseAPIException):
    """Raised when a background task encounters an error"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'An error occurred while processing the task'
    default_code = 'task_error'


class TaskCancelledException(Exception):
    """Raised when a task is cancelled by user"""
    pass


class TaskTimeoutException(TaskException):
    """Raised when a task exceeds its time limit"""
    default_detail = 'Task execution timed out'
    default_code = 'task_timeout'


class ExternalServiceException(BaseAPIException):
    """Raised when an external service call fails"""
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = 'External service error occurred'
    default_code = 'external_service_error'


class DatabaseException(BaseAPIException):
    """Raised when a database operation fails"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'Database operation failed'
    default_code = 'database_error'


class FileProcessingException(BaseAPIException):
    """Raised when file processing fails"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'File processing failed'
    default_code = 'file_processing_error'


class InvalidInputException(ValidationException):
    """Raised when input data is invalid"""
    default_detail = 'Invalid input provided'
    default_code = 'invalid_input'


class DuplicateResourceException(BaseAPIException):
    """Raised when attempting to create a duplicate resource"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Resource already exists'
    default_code = 'duplicate_resource'


class QuotaExceededException(BaseAPIException):
    """Raised when user quota is exceeded"""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'Quota exceeded'
    default_code = 'quota_exceeded'


class ConfigurationException(BaseAPIException):
    """Raised when configuration is invalid or missing"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'Configuration error'
    default_code = 'configuration_error'

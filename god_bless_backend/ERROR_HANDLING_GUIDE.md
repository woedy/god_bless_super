# Error Handling Guide

This guide explains the comprehensive error handling system implemented in the God Bless platform.

## Overview

The error handling system provides:
- **Global error boundaries** for React components
- **API error interceptor** with user-friendly messages
- **Task error recovery** with automatic retry mechanisms
- **Comprehensive logging** with error tracking
- **Validation error handling** with clear user feedback

## Frontend Error Handling

### 1. Error Boundary

The `ErrorBoundary` component catches React component errors and displays a user-friendly error page.

```tsx
import ErrorBoundary from './components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

Features:
- Catches and logs all React component errors
- Displays user-friendly error UI
- Sends error details to backend for logging
- Provides "Try Again" and "Go Home" actions
- Shows detailed error info in development mode

### 2. API Client

The `apiClient` provides centralized API error handling with automatic error messages.

```typescript
import { api } from './utils/apiClient';

// GET request
const response = await api.get('/api/users/');
if (response.success) {
  console.log(response.data);
} else {
  console.error(response.error);
}

// POST request
const response = await api.post('/api/users/', { name: 'John' });
```

Features:
- Automatic error toast notifications
- Handles different HTTP status codes
- Session expiration handling with redirect
- Network error detection
- Structured error responses

### 3. Custom Hooks

Use the `useApi` hooks for easier API integration:

```typescript
import { useGet, usePost } from './hooks/useApi';

// GET request
const { data, loading, error, get } = useGet('/api/users/');

useEffect(() => {
  get();
}, []);

// POST request
const { data, loading, error, post } = usePost('/api/users/', {
  onSuccess: (data) => console.log('User created:', data),
  onError: (error) => console.error('Failed:', error)
});

const handleSubmit = () => {
  post({ name: 'John' });
};
```

### 4. Validation Helpers

Use validation helpers for form validation:

```typescript
import { validateEmail, validatePassword, displayValidationErrors } from './utils/validationHelpers';

const emailValidation = validateEmail(email);
if (!emailValidation.isValid) {
  displayValidationErrors(emailValidation.errors);
}

const passwordValidation = validatePassword(password);
if (!passwordValidation.isValid) {
  displayValidationErrors(passwordValidation.errors);
}
```

## Backend Error Handling

### 1. Custom Exceptions

Use custom exception classes for structured error handling:

```python
from god_bless_pro.exceptions import (
    ValidationException,
    ResourceNotFoundException,
    PermissionDeniedException,
    TaskException
)

# Raise custom exceptions
raise ValidationException('Invalid input data')
raise ResourceNotFoundException('User not found')
raise PermissionDeniedException('Access denied')
```

Available exceptions:
- `ValidationException` - Validation errors (400)
- `ResourceNotFoundException` - Resource not found (404)
- `PermissionDeniedException` - Permission denied (403)
- `AuthenticationException` - Authentication failed (401)
- `RateLimitException` - Rate limit exceeded (429)
- `ServiceUnavailableException` - Service unavailable (503)
- `TaskException` - Task errors (500)
- `ExternalServiceException` - External service errors (502)
- `DatabaseException` - Database errors (500)

### 2. Error Handler Middleware

The error handler middleware provides consistent error responses:

```python
# Automatically handles all exceptions
# Returns structured error responses:
{
    "error": {
        "message": "User-friendly error message",
        "code": "error_code",
        "details": {}
    },
    "success": false
}
```

### 3. Task Error Recovery

Celery tasks automatically retry on failure:

```python
from god_bless_pro.tasks import ProgressTrackingTask, exponential_backoff

@app.task(base=ProgressTrackingTask)
def my_task():
    # Task will automatically retry on failure
    # with exponential backoff
    pass

# Manual retry with exponential backoff
@exponential_backoff(max_retries=3, base_delay=2)
def risky_operation():
    # This will retry up to 3 times with exponential backoff
    pass
```

Features:
- Automatic retry with exponential backoff
- Configurable retry limits
- Error classification (retryable vs non-retryable)
- Progress tracking during retries
- WebSocket notifications for retry events

### 4. Logging System

The logging system provides structured logging with different handlers:

```python
from god_bless_pro.logging_config import get_logger

logger = get_logger(__name__)

logger.info('Info message')
logger.warning('Warning message')
logger.error('Error message', exc_info=True)
```

Log files:
- `logs/error.log` - Error level logs
- `logs/warning.log` - Warning level logs
- `logs/info.log` - Info level logs
- `logs/celery.log` - Celery task logs
- `logs/api.log` - API request logs

## Error Response Format

All API errors follow this format:

```json
{
  "error": {
    "message": "User-friendly error message",
    "code": "error_code",
    "details": {
      "field": ["Error message for field"]
    }
  },
  "success": false
}
```

## Best Practices

### Frontend

1. **Always use the API client** instead of raw fetch
2. **Wrap components in ErrorBoundary** for critical sections
3. **Use validation helpers** before submitting forms
4. **Handle loading and error states** in components
5. **Provide user feedback** for all actions

### Backend

1. **Use custom exceptions** instead of generic exceptions
2. **Log errors with context** for debugging
3. **Validate input** before processing
4. **Handle database errors** gracefully
5. **Implement retry logic** for transient failures

## Testing Error Handling

### Frontend

```typescript
// Test error boundary
it('should catch and display errors', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };
  
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

### Backend

```python
# Test custom exceptions
def test_validation_exception():
    with pytest.raises(ValidationException):
        raise ValidationException('Invalid data')

# Test error handler
def test_error_response_format(client):
    response = client.get('/api/nonexistent/')
    assert response.status_code == 404
    assert 'error' in response.json()
    assert 'message' in response.json()['error']
```

## Monitoring and Debugging

### View Logs

```bash
# View error logs
tail -f logs/error.log

# View all logs
tail -f logs/*.log

# Search for specific errors
grep "TaskException" logs/error.log
```

### Frontend Error Tracking

All frontend errors are automatically sent to the backend endpoint:
- `POST /api/logs/frontend-error/`

View these logs in `logs/api.log` or `logs/error.log`.

## Configuration

### Retry Configuration

Modify retry settings in `god_bless_pro/tasks.py`:

```python
class ProgressTrackingTask(Task):
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 3}
    retry_backoff = True
    retry_backoff_max = 600  # 10 minutes
    retry_jitter = True
```

### Logging Configuration

Modify logging settings in `god_bless_pro/logging_config.py`:

```python
LOGGING = {
    'handlers': {
        'file_error': {
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **Errors not being logged**
   - Check that middleware is enabled in settings.py
   - Verify logs directory exists and is writable

2. **API errors not showing toast**
   - Ensure react-hot-toast is properly configured
   - Check browser console for errors

3. **Tasks not retrying**
   - Verify Celery is running
   - Check task configuration
   - Review error logs for non-retryable errors

4. **Frontend errors not reaching backend**
   - Check CORS configuration
   - Verify API URL is correct
   - Check network tab in browser dev tools

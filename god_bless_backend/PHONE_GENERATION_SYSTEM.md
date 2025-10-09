# Enhanced Phone Number Generation System

## Overview

The enhanced phone number generation system provides scalable phone number generation and validation capabilities with real-time progress tracking, background processing, and WebSocket notifications.

## Features

### 🚀 Large-Scale Generation
- Generate up to 1,000,000 phone numbers in a single request
- Background processing with Celery for non-blocking operations
- Configurable batch processing for optimal performance
- Real-time progress tracking via WebSocket connections

### 🔍 Internal Database Validation
- Uses internal phone prefix database for validation
- No external API dependencies
- Batch validation processing
- Carrier, location, and line type detection

### 📊 Progress Tracking
- Real-time progress updates via WebSocket
- Task status monitoring (pending, in_progress, completed, failed)
- Detailed progress metrics (processed items, estimated completion)
- Task history and result storage

### 🔄 Background Processing
- Celery-based task queue system
- Automatic retry mechanisms
- Task cancellation support
- Memory-efficient batch processing

## API Endpoints

### Enhanced Generation Endpoint
```
POST /api/phone-generator/generate-numbers-enhanced/
```

**Request Body:**
```json
{
    "user_id": "user123",
    "project_id": 1,
    "area_code": "212",
    "quantity": 10000,
    "carrier_filter": "Verizon",  // Optional
    "type_filter": "Mobile",      // Optional
    "batch_size": 1000           // Optional, default: 1000
}
```

**Response:**
```json
{
    "message": "Phone number generation started",
    "data": {
        "task_id": "47ce1f7b-b163-436b-9fb6-b90cdcf78038",
        "area_code": "212",
        "quantity": 10000,
        "estimated_time": "10 minutes"
    }
}
```

### Enhanced Validation Endpoint
```
POST /api/phone-generator/validate-numbers-enhanced/
```

**Request Body:**
```json
{
    "user_id": "user123",
    "project_id": 1,           // Optional
    "phone_ids": [1, 2, 3],    // Optional: specific phone IDs
    "batch_size": 1000         // Optional, default: 1000
}
```

### Task Progress Endpoint
```
GET /api/phone-generator/tasks/{task_id}/progress/?user_id=user123
```

**Response:**
```json
{
    "message": "Successful",
    "data": {
        "task_id": "47ce1f7b-b163-436b-9fb6-b90cdcf78038",
        "status": "in_progress",
        "progress": 75,
        "current_step": "Processing batch 8/10",
        "processed_items": 7500,
        "total_items": 10000,
        "estimated_completion": "2024-01-15T10:30:00Z"
    }
}
```

### Task Management Endpoints
```
GET /api/phone-generator/tasks/?user_id=user123&project_id=1
POST /api/phone-generator/tasks/{task_id}/cancel/
```

## WebSocket Connections

### Phone Generation Progress
```
ws://localhost:6161/ws/phone-generation/{user_id}/
```

### General Task Progress
```
ws://localhost:6161/ws/tasks/{user_id}/
```

**WebSocket Message Types:**
- `task_progress`: Real-time progress updates
- `task_completed`: Task completion notifications
- `task_started`: Task start notifications
- `task_failed`: Task failure notifications

## Database Models

### PhoneGenerationTask
Tracks background phone generation tasks with detailed progress and result information.

### PhoneNumber (Enhanced)
- Added validation tracking fields
- Enhanced carrier and location information
- Internal validation source tracking

### PhonePrefix
Internal database for phone number validation with carrier, location, and line type information.

## Usage Examples

### 1. Generate Large Batch of Numbers
```python
import requests

response = requests.post('http://localhost:6161/api/phone-generator/generate-numbers-enhanced/', 
    json={
        'user_id': 'user123',
        'project_id': 1,
        'area_code': '212',
        'quantity': 50000,
        'batch_size': 2000
    },
    headers={'Authorization': 'Token your_token_here'}
)

task_id = response.json()['data']['task_id']
```

### 2. Monitor Progress via WebSocket
```javascript
const ws = new WebSocket('ws://localhost:6161/ws/phone-generation/user123/');

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'task_progress') {
        console.log(`Progress: ${data.progress}% - ${data.current_step}`);
    }
};
```

### 3. Validate Generated Numbers
```python
response = requests.post('http://localhost:6161/api/phone-generator/validate-numbers-enhanced/',
    json={
        'user_id': 'user123',
        'project_id': 1,
        'batch_size': 1000
    },
    headers={'Authorization': 'Token your_token_here'}
)
```

## Performance Characteristics

### Generation Performance
- **Small batches (< 10,000)**: Synchronous processing, immediate results
- **Large batches (≥ 10,000)**: Background processing with progress tracking
- **Throughput**: ~1,000 numbers per second (depends on system resources)
- **Memory usage**: Optimized batch processing prevents memory issues

### Validation Performance
- **Internal database lookup**: ~2,000 validations per second
- **Batch processing**: Configurable batch sizes for optimal performance
- **No external API calls**: Eliminates network latency and rate limits

## Configuration

### Celery Settings
```python
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000
```

### Batch Size Recommendations
- **Generation**: 1000-2000 numbers per batch
- **Validation**: 1000-5000 numbers per batch
- **Memory constrained**: Reduce batch sizes to 500-1000

## Error Handling

### Task Failures
- Automatic retry mechanisms for transient failures
- Detailed error logging and reporting
- Graceful degradation for partial failures

### Validation Errors
- Invalid phone numbers marked appropriately
- Missing prefix data handled gracefully
- Batch processing continues on individual failures

## Monitoring and Logging

### Task Monitoring
- Real-time task status via WebSocket
- Task history and result storage
- Performance metrics and duration tracking

### System Health
- Celery worker monitoring
- Database performance tracking
- Memory usage optimization

## Backward Compatibility

The system maintains full backward compatibility with existing endpoints:
- `/api/phone-generator/generate-numbers/` (legacy)
- `/api/phone-generator/validate-numbers/` (legacy)

Legacy endpoints automatically use background processing for large batches (≥ 10,000 numbers).

## Testing

Run the test scripts to verify functionality:

```bash
# Activate virtual environment
.venv\Scripts\Activate.ps1

# Test core functionality
python test_phone_generation.py

# Test API endpoints
python test_api_endpoints.py

# Load sample phone prefixes
python manage.py load_sample_prefixes
```

## Deployment Notes

### Redis Configuration
For production deployment, ensure Redis is properly configured:
```python
CELERY_BROKER_URL = "redis://redis:6379/0"
CELERY_RESULT_BACKEND = "redis://redis:6379/0"
```

### WebSocket Support
Ensure Daphne is configured for WebSocket support in production:
```python
ASGI_APPLICATION = "god_bless_pro.asgi.application"
```

### Database Optimization
For large-scale operations, consider:
- Database indexing on frequently queried fields
- Connection pooling for high concurrency
- Regular cleanup of old task records
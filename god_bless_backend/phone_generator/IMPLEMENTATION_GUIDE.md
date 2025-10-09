# Phone Number Generation System - Implementation Guide

## Overview

This document provides a comprehensive guide to the Enhanced Phone Number Generation System implemented for the God Bless platform. The system supports large-scale phone number generation (up to 1M numbers) with real-time progress tracking, batch processing, and internal database validation.

## Features Implemented

### 1. Celery Tasks for Large-Scale Generation
- **Task**: `generate_phone_numbers_task`
- **Location**: `phone_generator/tasks.py`
- **Capabilities**:
  - Generate up to 1,000,000 phone numbers
  - Configurable batch sizes (100-10,000)
  - Progress tracking with WebSocket notifications
  - Automatic duplicate detection
  - Carrier and type filtering support
  - Robust error handling and retry logic

### 2. Phone Number Validation Task
- **Task**: `validate_phone_numbers_task`
- **Location**: `phone_generator/tasks.py`
- **Capabilities**:
  - Internal database validation using PhonePrefix lookup
  - Batch processing with configurable chunk sizes
  - Progress tracking via WebSocket
  - Carrier, state, and line type enrichment
  - Validation source tracking (internal/external)

### 3. API Endpoints

#### Generation Endpoints
- **POST** `/api/phone-generator/generate-numbers-enhanced/`
  - Enhanced generation with background processing
  - Parameters: user_id, project_id, area_code, quantity, carrier_filter, type_filter, batch_size
  - Returns: task_id for progress tracking

- **POST** `/api/phone-generator/generate-numbers-config/`
  - Advanced generation with comprehensive configuration
  - Additional parameters: auto_validate
  - Supports chaining validation after generation

#### Validation Endpoints
- **POST** `/api/phone-generator/validate-numbers-enhanced/`
  - Background validation for all pending numbers
  - Parameters: user_id, project_id, phone_ids, batch_size

- **POST** `/api/phone-generator/bulk-validate/`
  - Bulk validation for specific phone number IDs
  - Parameters: user_id, phone_ids, batch_size

#### Task Management Endpoints
- **GET** `/api/phone-generator/tasks/`
  - List all generation tasks for a user
  - Supports filtering by status and project
  - Paginated results

- **GET** `/api/phone-generator/tasks/active/`
  - Get all active tasks for a user
  - Returns both generation tasks and general task progress

- **GET** `/api/phone-generator/tasks/<task_id>/progress/`
  - Get real-time progress for a specific task
  - Returns: status, progress %, current step, processed/total items

- **POST** `/api/phone-generator/tasks/<task_id>/cancel/`
  - Cancel a running task
  - Revokes Celery task and updates database status

#### Statistics Endpoint
- **GET** `/api/phone-generator/statistics/`
  - Get comprehensive phone number statistics
  - Returns: total numbers, validation rates, carrier breakdown, type breakdown, area code breakdown

### 4. WebSocket Support

#### Consumers
- **PhoneGenerationProgressConsumer**: Real-time updates for phone generation
- **TaskProgressConsumer**: Generic task progress updates

#### WebSocket URLs
- `ws://localhost:6161/ws/phone-generation/<user_id>/` - Phone generation updates
- `ws://localhost:6161/ws/tasks/<user_id>/` - All task updates

#### WebSocket Events
- `connection_established` - Connection confirmation
- `task_started` - Task has started
- `task_progress` - Progress update (includes %, current step, items processed)
- `task_completed` - Task completed successfully
- `task_failed` - Task failed with error message

### 5. Models

#### PhoneNumber Model
Enhanced with:
- `area_code` - Indexed for fast filtering
- `carrier` - Indexed carrier information
- `type` - Indexed line type (Mobile/Landline)
- `validation_attempted` - Track validation status
- `validation_date` - When validation occurred
- `validation_source` - Source of validation (internal/external)
- Composite indexes for performance

#### PhoneGenerationTask Model
Tracks background generation tasks:
- Task parameters (area_code, quantity, filters)
- Progress metrics (progress %, processed items, successful/failed counts)
- Celery task ID for tracking
- Timestamps (created, started, completed, estimated completion)
- Result data and error messages

## Usage Examples

### 1. Generate Phone Numbers

```python
# Using Python/Django
from phone_generator.tasks import generate_phone_numbers_task

task = generate_phone_numbers_task.delay(
    user_id=1,
    project_id=5,
    area_code='415',
    quantity=100000,
    carrier_filter='AT&T',  # Optional
    type_filter='Mobile',   # Optional
    batch_size=1000
)

print(f"Task ID: {task.id}")
```

```bash
# Using API (curl)
curl -X POST http://localhost:6161/api/phone-generator/generate-numbers-enhanced/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "project_id": "5",
    "area_code": "415",
    "quantity": 100000,
    "batch_size": 1000
  }'
```

### 2. Track Progress

```javascript
// WebSocket connection
const ws = new WebSocket('ws://localhost:6161/ws/tasks/user123/');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'task_progress') {
    console.log(`Progress: ${data.progress}%`);
    console.log(`Step: ${data.current_step}`);
    console.log(`Processed: ${data.processed_items}/${data.total_items}`);
  }
  
  if (data.type === 'task_completed') {
    console.log('Task completed!', data.result_data);
  }
};
```

```bash
# Using API polling
curl -X GET "http://localhost:6161/api/phone-generator/tasks/TASK_ID/progress/?user_id=user123" \
  -H "Authorization: Token YOUR_TOKEN"
```

### 3. Validate Phone Numbers

```python
# Validate all pending numbers for a project
from phone_generator.tasks import validate_phone_numbers_task

task = validate_phone_numbers_task.delay(
    user_id=1,
    project_id=5,
    batch_size=1000
)
```

```bash
# Using API
curl -X POST http://localhost:6161/api/phone-generator/validate-numbers-enhanced/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "project_id": "5",
    "batch_size": 1000
  }'
```

### 4. Get Statistics

```bash
curl -X GET "http://localhost:6161/api/phone-generator/statistics/?user_id=user123&project_id=5" \
  -H "Authorization: Token YOUR_TOKEN"
```

Response:
```json
{
  "message": "Successful",
  "data": {
    "total_numbers": 100000,
    "validated_numbers": 95000,
    "valid_numbers": 85000,
    "invalid_numbers": 10000,
    "pending_validation": 5000,
    "validation_rate": 95.0,
    "validity_rate": 89.47,
    "carrier_breakdown": [
      {"carrier": "AT&T", "count": 30000},
      {"carrier": "Verizon", "count": 28000},
      {"carrier": "T-Mobile", "count": 27000}
    ],
    "type_breakdown": [
      {"type": "Mobile", "count": 85000},
      {"type": "Landline", "count": 0}
    ]
  }
}
```

## Configuration

### Celery Settings
Ensure these settings are in `god_bless_pro/settings.py`:

```python
# Celery Configuration
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
```

### Channels Configuration
For WebSocket support:

```python
# Channels
ASGI_APPLICATION = 'god_bless_pro.asgi.application'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}
```

## Running the System

### 1. Start Redis
```bash
# Windows (if using WSL or Docker)
docker run -d -p 6379:6379 redis

# Or use Windows Redis port
redis-server
```

### 2. Start Celery Worker
```bash
cd god_bless_backend
.venv\Scripts\activate
celery -A god_bless_pro worker -l INFO --pool=solo
```

### 3. Start Celery Beat (for scheduled tasks)
```bash
cd god_bless_backend
.venv\Scripts\activate
celery -A god_bless_pro beat -l INFO
```

### 4. Start Django Server
```bash
cd god_bless_backend
.venv\Scripts\activate
python manage.py runserver 0.0.0.0:6161
```

### 5. Start Daphne (for WebSocket support)
```bash
cd god_bless_backend
.venv\Scripts\activate
daphne -b 0.0.0.0 -p 6161 god_bless_pro.asgi:application
```

## Testing

### Run Unit Tests
```bash
cd god_bless_backend
.venv\Scripts\activate
python manage.py test phone_generator.tests
```

### Run Verification Script
```bash
cd god_bless_backend
.venv\Scripts\activate
python verify_phone_generation.py
```

## Performance Considerations

### Batch Sizes
- **Small batches (100-500)**: Better for real-time feedback, more database operations
- **Medium batches (500-2000)**: Balanced performance and feedback
- **Large batches (2000-10000)**: Best for bulk operations, less frequent updates

### Recommended Settings
- For 10K numbers: batch_size=1000 (~10 seconds)
- For 100K numbers: batch_size=2000 (~2 minutes)
- For 1M numbers: batch_size=5000 (~20 minutes)

### Database Optimization
- Indexes are created on frequently queried fields (carrier, type, area_code)
- Bulk operations use `bulk_create` and `bulk_update` for efficiency
- Composite indexes for common query patterns

## Troubleshooting

### Issue: Tasks not starting
**Solution**: Check that Celery worker is running and Redis is accessible

### Issue: WebSocket not connecting
**Solution**: Ensure Daphne is running and CHANNEL_LAYERS is configured correctly

### Issue: Slow generation
**Solution**: Increase batch_size or check database performance

### Issue: Duplicate phone numbers
**Solution**: System automatically checks for duplicates; if issues persist, check unique constraint on phone_number field

## API Response Formats

### Success Response
```json
{
  "message": "Phone number generation started",
  "data": {
    "task_id": "abc123-def456-ghi789",
    "area_code": "415",
    "quantity": 100000,
    "estimated_time": "100 minutes"
  }
}
```

### Error Response
```json
{
  "message": "Errors",
  "errors": {
    "area_code": ["Invalid area code format. Must be 3 digits."],
    "quantity": ["Maximum quantity is 1,000,000 numbers."]
  }
}
```

## Requirements Met

This implementation satisfies the following requirements from the spec:

- ✅ **4.1**: Large-scale phone number generation (up to 1M)
- ✅ **4.2**: Background processing with Celery
- ✅ **4.3**: Internal database validation using PhonePrefix
- ✅ **4.7**: Real-time progress tracking via WebSocket

## Next Steps

1. **Frontend Integration**: Connect React frontend to WebSocket for real-time updates
2. **Monitoring**: Add monitoring for task failures and performance metrics
3. **Optimization**: Fine-tune batch sizes based on production usage patterns
4. **Scaling**: Consider distributed Celery workers for higher throughput

## Support

For issues or questions, refer to:
- Task implementation: `phone_generator/tasks.py`
- API endpoints: `phone_generator/api/views.py`
- WebSocket consumers: `phone_generator/consumers.py`
- Tests: `phone_generator/tests.py`

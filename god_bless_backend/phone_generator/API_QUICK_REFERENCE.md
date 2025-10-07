# Phone Number Generation API - Quick Reference

## Base URL
```
http://localhost:6161/api/phone-generator/
```

## Authentication
All endpoints require Token Authentication:
```
Authorization: Token YOUR_AUTH_TOKEN
```

---

## 📞 Generation Endpoints

### Generate Phone Numbers (Enhanced)
**POST** `/generate-numbers-enhanced/`

Generate phone numbers with background processing.

**Request Body:**
```json
{
  "user_id": "user123",
  "project_id": "5",
  "area_code": "415",
  "quantity": 100000,
  "carrier_filter": "AT&T",      // Optional
  "type_filter": "Mobile",       // Optional
  "batch_size": 1000             // Optional (100-10000)
}
```

**Response:**
```json
{
  "message": "Phone number generation started",
  "data": {
    "task_id": "abc123-def456",
    "area_code": "415",
    "quantity": 100000,
    "estimated_time": "100 minutes"
  }
}
```

---

### Generate with Advanced Config
**POST** `/generate-numbers-config/`

Advanced generation with auto-validation option.

**Request Body:**
```json
{
  "user_id": "user123",
  "project_id": "5",
  "area_code": "415",
  "quantity": 50000,
  "batch_size": 2000,
  "auto_validate": true,         // Auto-validate after generation
  "carrier_filter": "Verizon",
  "type_filter": "Mobile"
}
```

---

## ✅ Validation Endpoints

### Validate Phone Numbers (Enhanced)
**POST** `/validate-numbers-enhanced/`

Validate pending phone numbers in background.

**Request Body:**
```json
{
  "user_id": "user123",
  "project_id": "5",              // Optional
  "phone_ids": [1, 2, 3],         // Optional - specific IDs
  "batch_size": 1000              // Optional
}
```

---

### Bulk Validate Specific Numbers
**POST** `/bulk-validate/`

Validate specific phone numbers by ID.

**Request Body:**
```json
{
  "user_id": "user123",
  "phone_ids": [101, 102, 103, 104],
  "batch_size": 500
}
```

---

## 📊 Task Management Endpoints

### List Generation Tasks
**GET** `/tasks/?user_id=user123&project_id=5&status=in_progress&page=1&page_size=20`

**Query Parameters:**
- `user_id` (required)
- `project_id` (optional)
- `status` (optional): pending, in_progress, completed, failed
- `page` (optional): default 1
- `page_size` (optional): default 20

**Response:**
```json
{
  "message": "Successful",
  "data": {
    "tasks": [
      {
        "id": 1,
        "area_code": "415",
        "quantity": 100000,
        "status": "in_progress",
        "progress": 45,
        "current_step": "Generating batch 45/100",
        "processed_items": 45000,
        "total_items": 100000,
        "celery_task_id": "abc123",
        "created_at": "2025-10-04T10:00:00Z"
      }
    ],
    "pagination": {
      "page_number": 1,
      "count": 50,
      "total_pages": 3,
      "next": 2,
      "previous": null
    }
  }
}
```

---

### Get Task Progress
**GET** `/tasks/<task_id>/progress/?user_id=user123`

**Response:**
```json
{
  "message": "Successful",
  "data": {
    "task_id": "abc123-def456",
    "status": "in_progress",
    "progress": 67,
    "current_step": "Generating batch 67/100",
    "processed_items": 67000,
    "total_items": 100000,
    "created_at": "2025-10-04T10:00:00Z",
    "started_at": "2025-10-04T10:00:05Z",
    "estimated_completion": "2025-10-04T10:35:00Z"
  }
}
```

---

### Get Active Tasks
**GET** `/tasks/active/?user_id=user123`

Returns all active tasks (generation and validation).

**Response:**
```json
{
  "message": "Successful",
  "data": {
    "generation_tasks": [...],
    "all_tasks": [...],
    "total_active_tasks": 3
  }
}
```

---

### Cancel Task
**POST** `/tasks/<task_id>/cancel/`

**Request Body:**
```json
{
  "user_id": "user123"
}
```

---

## 📈 Statistics Endpoint

### Get Phone Statistics
**GET** `/statistics/?user_id=user123&project_id=5`

**Response:**
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
      {"carrier": "Verizon", "count": 28000}
    ],
    "type_breakdown": [
      {"type": "Mobile", "count": 85000}
    ],
    "area_code_breakdown": [
      {"area_code": "415", "count": 50000},
      {"area_code": "510", "count": 50000}
    ],
    "status_breakdown": [
      {"status": "active", "count": 85000},
      {"status": "inactive", "count": 15000}
    ]
  }
}
```

---

## 🔌 WebSocket Endpoints

### Phone Generation Progress
```
ws://localhost:6161/ws/phone-generation/<user_id>/
```

### All Task Progress
```
ws://localhost:6161/ws/tasks/<user_id>/
```

### WebSocket Message Types

**Connection Established:**
```json
{
  "type": "connection_established",
  "message": "Connected to task progress updates"
}
```

**Task Started:**
```json
{
  "type": "task_started",
  "task_id": "abc123",
  "task_name": "Phone Number Generation",
  "timestamp": "2025-10-04T10:00:00Z"
}
```

**Task Progress:**
```json
{
  "type": "task_progress",
  "task_id": "abc123",
  "status": "in_progress",
  "progress": 45,
  "current_step": "Generating batch 45/100",
  "processed_items": 45000,
  "total_items": 100000,
  "timestamp": "2025-10-04T10:15:00Z"
}
```

**Task Completed:**
```json
{
  "type": "task_completed",
  "task_id": "abc123",
  "status": "completed",
  "result_data": {
    "total_generated": 100000,
    "success_rate": 100
  },
  "timestamp": "2025-10-04T10:30:00Z"
}
```

**Task Failed:**
```json
{
  "type": "task_failed",
  "task_id": "abc123",
  "status": "failed",
  "error_message": "Database connection error",
  "timestamp": "2025-10-04T10:30:00Z"
}
```

---

## 📋 Legacy Endpoints (Backward Compatible)

### Generate Numbers (Legacy)
**POST** `/generate-numbers/`

For small batches (<10,000), generates synchronously.

### Validate Numbers (Legacy)
**POST** `/validate-numbers/`

Validates all pending numbers for a user.

---

## 🔍 Other Endpoints

### List All Numbers
**GET** `/list-numbers/?user_id=user123&project_id=5&search=415&date=2025-10-04&page=1`

### Get Valid Numbers
**GET** `/get-valid-numbers/?user_id=user123&project_id=5&page=1`

### Download Numbers (CSV)
**GET** `/download-numbers/?user_id=user123&carrier=AT&T&code=415`

### Clear Invalid Numbers
**GET** `/clear-numbers/?user_id=user123&project_id=5`

Deletes invalid numbers and non-mobile valid numbers.

### Delete All Numbers
**GET** `/delete-all/?user_id=user123&project_id=5`

### Delete Specific Numbers
**POST** `/delete-numbers/?user_id=user123`

**Request Body:**
```json
{
  "selectedNumbers": [1, 2, 3, 4, 5]
}
```

---

## ⚠️ Error Responses

### Validation Error
```json
{
  "message": "Errors",
  "errors": {
    "area_code": ["Invalid area code format. Must be 3 digits."],
    "quantity": ["Maximum quantity is 1,000,000 numbers."]
  }
}
```

### Not Found
```json
{
  "message": "Errors",
  "errors": {
    "task_id": ["Task not found."]
  }
}
```

---

## 💡 Tips

1. **Batch Sizes**: Use 1000-2000 for balanced performance
2. **Large Generations**: Use WebSocket for real-time progress
3. **Polling**: If not using WebSocket, poll `/tasks/<task_id>/progress/` every 5-10 seconds
4. **Validation**: Run validation after generation completes
5. **Statistics**: Check statistics before and after operations

---

## 🚀 Quick Start Example (JavaScript)

```javascript
// 1. Start generation
const response = await fetch('http://localhost:6161/api/phone-generator/generate-numbers-enhanced/', {
  method: 'POST',
  headers: {
    'Authorization': 'Token YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: 'user123',
    project_id: '5',
    area_code: '415',
    quantity: 10000,
    batch_size: 1000
  })
});

const data = await response.json();
const taskId = data.data.task_id;

// 2. Connect to WebSocket for progress
const ws = new WebSocket('ws://localhost:6161/ws/tasks/user123/');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'task_progress' && message.task_id === taskId) {
    console.log(`Progress: ${message.progress}%`);
    updateProgressBar(message.progress);
  }
  
  if (message.type === 'task_completed' && message.task_id === taskId) {
    console.log('Generation complete!');
    showSuccessMessage();
  }
};

// 3. Or poll for progress (alternative to WebSocket)
const pollProgress = setInterval(async () => {
  const progressResponse = await fetch(
    `http://localhost:6161/api/phone-generator/tasks/${taskId}/progress/?user_id=user123`,
    {
      headers: { 'Authorization': 'Token YOUR_TOKEN' }
    }
  );
  
  const progressData = await progressResponse.json();
  console.log(`Progress: ${progressData.data.progress}%`);
  
  if (progressData.data.status === 'completed') {
    clearInterval(pollProgress);
    console.log('Generation complete!');
  }
}, 5000); // Poll every 5 seconds
```

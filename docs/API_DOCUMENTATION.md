# API Documentation - God Bless America Platform

Complete API reference for integrating with the God Bless America platform.

## Base URL

```
Development: http://localhost:6161/api
Production: https://your-domain.com/api
```

## Authentication

All API requests require authentication using Token-based authentication.

### Obtaining a Token

**Endpoint:** `POST /accounts/login/`

**Request:**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "your_auth_token_here",
  "user": {
    "id": 1,
    "username": "your_username",
    "email": "user@example.com"
  }
}
```

### Using the Token

Include the token in the Authorization header of all requests:

```
Authorization: Token your_auth_token_here
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authenticated Users**: 1000 requests/hour
- **Anonymous Users**: 100 requests/hour
- **Burst Protection**: 60 requests/minute
- **Phone Generation**: 100 requests/hour
- **SMS Sending**: 500 requests/hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
```

---

## Phone Number Management

### Generate Phone Numbers

**Endpoint:** `POST /phone-generator/generate/`

**Description:** Generate phone numbers with specified parameters.

**Request:**
```json
{
  "area_code": "555",
  "quantity": 100,
  "carrier": "Verizon",
  "number_type": "mobile"
}
```

**Parameters:**
- `area_code` (string, required): 3-digit area code
- `quantity` (integer, required): Number of phones to generate (1-1,000,000)
- `carrier` (string, optional): Carrier name (Verizon, AT&T, T-Mobile, Sprint)
- `number_type` (string, optional): Type of number (mobile, landline, voip)

**Response:**
```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "pending",
  "message": "Phone generation started"
}
```

### Get Phone Numbers

**Endpoint:** `GET /phone-generator/numbers/`

**Description:** Retrieve generated phone numbers with pagination and filtering.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `page_size` (integer): Items per page (default: 20, max: 100)
- `carrier` (string): Filter by carrier
- `area_code` (string): Filter by area code
- `number_type` (string): Filter by type
- `is_valid` (boolean): Filter by validation status
- `search` (string): Search phone numbers

**Example:**
```
GET /phone-generator/numbers/?carrier=Verizon&area_code=555&page=1&page_size=50
```

**Response:**
```json
{
  "count": 1000,
  "next": "/api/phone-generator/numbers/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "number": "5551234567",
      "carrier": "Verizon",
      "number_type": "mobile",
      "area_code": "555",
      "is_valid": true,
      "validation_date": "2025-01-04T10:30:00Z",
      "created_at": "2025-01-04T10:00:00Z"
    }
  ]
}
```

### Validate Phone Numbers

**Endpoint:** `POST /phone-validator/validate-bulk/`

**Description:** Validate multiple phone numbers.

**Request:**
```json
{
  "phone_numbers": [
    "5551234567",
    "5559876543",
    "5555555555"
  ]
}
```

**Response:**
```json
{
  "task_id": "xyz789-abc123-def456",
  "status": "pending",
  "total_numbers": 3,
  "message": "Validation started"
}
```

### Export Phone Numbers

**Endpoint:** `POST /phone-generator/export/`

**Description:** Export phone numbers in various formats.

**Request:**
```json
{
  "format": "csv",
  "filters": {
    "carrier": "Verizon",
    "area_code": "555",
    "is_valid": true
  }
}
```

**Parameters:**
- `format` (string, required): Export format (csv, txt, json, doc)
- `filters` (object, optional): Filters to apply before export

**Response:** File download with appropriate content-type

---

## SMS Campaign Management

### Create Campaign

**Endpoint:** `POST /sms-campaigns/`

**Description:** Create a new SMS campaign.

**Request:**
```json
{
  "name": "Marketing Campaign Q1",
  "message_template": "Hello {{name}}, check out our new offers!",
  "target_carrier": "Verizon",
  "status": "draft"
}
```

**Parameters:**
- `name` (string, required): Campaign name
- `message_template` (string, required): Message with optional macros
- `target_carrier` (string, optional): Target specific carrier
- `status` (string, optional): Campaign status (draft, scheduled, sending, sent)

**Response:**
```json
{
  "id": 1,
  "name": "Marketing Campaign Q1",
  "message_template": "Hello {{name}}, check out our new offers!",
  "target_carrier": "Verizon",
  "status": "draft",
  "created_at": "2025-01-04T10:00:00Z",
  "total_recipients": 0,
  "messages_sent": 0
}
```

### List Campaigns

**Endpoint:** `GET /sms-campaigns/`

**Description:** Get all campaigns with pagination.

**Query Parameters:**
- `page` (integer): Page number
- `page_size` (integer): Items per page
- `status` (string): Filter by status
- `search` (string): Search campaigns

**Response:**
```json
{
  "count": 50,
  "next": "/api/sms-campaigns/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Marketing Campaign Q1",
      "status": "sent",
      "total_recipients": 1000,
      "messages_sent": 950,
      "delivery_rate": 95.0,
      "created_at": "2025-01-04T10:00:00Z"
    }
  ]
}
```

### Get Campaign Details

**Endpoint:** `GET /sms-campaigns/{id}/`

**Description:** Get detailed information about a specific campaign.

**Response:**
```json
{
  "id": 1,
  "name": "Marketing Campaign Q1",
  "message_template": "Hello {{name}}, check out our new offers!",
  "target_carrier": "Verizon",
  "status": "sent",
  "total_recipients": 1000,
  "messages_sent": 950,
  "messages_failed": 50,
  "delivery_rate": 95.0,
  "created_at": "2025-01-04T10:00:00Z",
  "sent_at": "2025-01-04T11:00:00Z",
  "completed_at": "2025-01-04T12:00:00Z",
  "recipients": [
    {
      "phone": "5551234567",
      "personalization": {"name": "John"},
      "status": "delivered",
      "sent_at": "2025-01-04T11:05:00Z"
    }
  ]
}
```

### Add Recipients to Campaign

**Endpoint:** `POST /sms-campaigns/{id}/add-recipients/`

**Description:** Add recipients to a campaign.

**Request:**
```json
{
  "phone_numbers": ["5551234567", "5559876543"],
  "personalization": [
    {"phone": "5551234567", "name": "John", "custom_field": "value1"},
    {"phone": "5559876543", "name": "Jane", "custom_field": "value2"}
  ]
}
```

**Response:**
```json
{
  "added": 2,
  "total_recipients": 102,
  "message": "Recipients added successfully"
}
```

### Send Campaign

**Endpoint:** `POST /sms-campaigns/{id}/send/`

**Description:** Send or schedule a campaign.

**Request:**
```json
{
  "scheduled_time": "2025-01-05T10:00:00Z",
  "delivery_settings": {
    "rate_limit": 10,
    "delay_min": 2,
    "delay_max": 5,
    "batch_size": 100
  }
}
```

**Parameters:**
- `scheduled_time` (datetime, optional): Schedule for future sending
- `delivery_settings` (object, optional): Override default delivery settings

**Response:**
```json
{
  "task_id": "campaign-send-123",
  "status": "sending",
  "estimated_completion": "2025-01-04T12:00:00Z",
  "message": "Campaign sending started"
}
```

### Get Campaign Analytics

**Endpoint:** `GET /sms-campaigns/{id}/analytics/`

**Description:** Get detailed analytics for a campaign.

**Response:**
```json
{
  "campaign_id": 1,
  "total_recipients": 1000,
  "messages_sent": 950,
  "messages_delivered": 920,
  "messages_failed": 80,
  "delivery_rate": 92.0,
  "failure_rate": 8.0,
  "carrier_breakdown": {
    "Verizon": 400,
    "AT&T": 350,
    "T-Mobile": 170,
    "Sprint": 80
  },
  "timeline": [
    {"time": "2025-01-04T11:00:00Z", "sent": 100, "delivered": 95},
    {"time": "2025-01-04T11:15:00Z", "sent": 200, "delivered": 190}
  ]
}
```

---

## Task Management

### Get Task Status

**Endpoint:** `GET /tasks/{task_id}/status/`

**Description:** Get the status of a background task.

**Response:**
```json
{
  "task_id": "abc123-def456",
  "status": "in_progress",
  "progress": 45,
  "current_step": "Processing batch 5 of 10",
  "total_items": 1000,
  "processed_items": 450,
  "estimated_completion": "2025-01-04T11:30:00Z",
  "result_data": {}
}
```

**Status Values:**
- `pending`: Task is queued
- `in_progress`: Task is running
- `completed`: Task finished successfully
- `failed`: Task encountered an error
- `cancelled`: Task was cancelled by user

### Cancel Task

**Endpoint:** `POST /tasks/{task_id}/cancel/`

**Description:** Cancel a running background task.

**Response:**
```json
{
  "task_id": "abc123-def456",
  "status": "cancelled",
  "message": "Task cancelled successfully"
}
```

---

## Settings Management

### Get Settings

**Endpoint:** `GET /settings/`

**Description:** Get current user settings.

**Response:**
```json
{
  "theme": "dark",
  "notifications_enabled": true,
  "smtp_servers": [
    {
      "id": 1,
      "host": "smtp.example.com",
      "port": 587,
      "use_tls": true,
      "is_active": true
    }
  ],
  "proxy_settings": {
    "rotation_enabled": true,
    "proxies": [
      {"host": "proxy1.example.com", "port": 8080}
    ]
  },
  "delivery_settings": {
    "delay_min": 2,
    "delay_max": 5,
    "batch_size": 100
  }
}
```

### Update SMTP Settings

**Endpoint:** `POST /settings/smtp/`

**Description:** Add or update SMTP server configuration.

**Request:**
```json
{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_username": "user@gmail.com",
  "smtp_password": "app_password",
  "use_tls": true
}
```

**Response:**
```json
{
  "id": 1,
  "host": "smtp.gmail.com",
  "port": 587,
  "is_active": true,
  "message": "SMTP server configured successfully"
}
```

### Update Proxy Settings

**Endpoint:** `POST /settings/proxy/`

**Description:** Configure proxy servers.

**Request:**
```json
{
  "proxy_rotation_enabled": true,
  "proxy_list": [
    {
      "host": "proxy1.example.com",
      "port": 8080,
      "type": "http",
      "username": "user",
      "password": "pass"
    }
  ]
}
```

**Response:**
```json
{
  "rotation_enabled": true,
  "total_proxies": 1,
  "active_proxies": 1,
  "message": "Proxy settings updated successfully"
}
```

---

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {
    "field": ["Specific error details"]
  },
  "error_code": "ERR_CODE_123",
  "timestamp": "2025-01-04T10:00:00Z"
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Error Codes

- `AUTH_001`: Invalid credentials
- `AUTH_002`: Token expired
- `AUTH_003`: Insufficient permissions
- `PHONE_001`: Invalid area code
- `PHONE_002`: Invalid quantity
- `PHONE_003`: Generation failed
- `SMS_001`: Invalid campaign
- `SMS_002`: No recipients
- `SMS_003`: Sending failed
- `TASK_001`: Task not found
- `TASK_002`: Task already completed
- `RATE_001`: Rate limit exceeded

---

## Webhooks

Configure webhooks to receive real-time notifications about events.

### Webhook Events

- `phone.generation.completed`: Phone generation finished
- `phone.validation.completed`: Validation finished
- `sms.campaign.sent`: Campaign sending completed
- `sms.message.delivered`: Individual message delivered
- `sms.message.failed`: Message delivery failed
- `task.completed`: Background task completed
- `task.failed`: Background task failed

### Webhook Payload

```json
{
  "event": "sms.campaign.sent",
  "timestamp": "2025-01-04T12:00:00Z",
  "data": {
    "campaign_id": 1,
    "total_sent": 950,
    "total_failed": 50,
    "delivery_rate": 95.0
  }
}
```

### Configuring Webhooks

**Endpoint:** `POST /settings/webhooks/`

**Request:**
```json
{
  "url": "https://your-domain.com/webhook",
  "events": ["sms.campaign.sent", "phone.generation.completed"],
  "secret": "your_webhook_secret"
}
```

---

## Code Examples

### Python

```python
import requests

# Authentication
response = requests.post('http://localhost:6161/api/accounts/login/', json={
    'username': 'your_username',
    'password': 'your_password'
})
token = response.json()['token']

# Set headers
headers = {'Authorization': f'Token {token}'}

# Generate phone numbers
response = requests.post(
    'http://localhost:6161/api/phone-generator/generate/',
    headers=headers,
    json={
        'area_code': '555',
        'quantity': 100,
        'carrier': 'Verizon'
    }
)
task_id = response.json()['task_id']

# Check task status
response = requests.get(
    f'http://localhost:6161/api/tasks/{task_id}/status/',
    headers=headers
)
print(response.json())
```

### JavaScript

```javascript
// Authentication
const response = await fetch('http://localhost:6161/api/accounts/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'your_username',
    password: 'your_password'
  })
});
const { token } = await response.json();

// Generate phone numbers
const genResponse = await fetch('http://localhost:6161/api/phone-generator/generate/', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    area_code: '555',
    quantity: 100,
    carrier: 'Verizon'
  })
});
const { task_id } = await genResponse.json();

// Check task status
const statusResponse = await fetch(
  `http://localhost:6161/api/tasks/${task_id}/status/`,
  { headers: { 'Authorization': `Token ${token}` } }
);
const status = await statusResponse.json();
console.log(status);
```

### cURL

```bash
# Authentication
curl -X POST http://localhost:6161/api/accounts/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# Generate phone numbers
curl -X POST http://localhost:6161/api/phone-generator/generate/ \
  -H "Authorization: Token your_token_here" \
  -H "Content-Type: application/json" \
  -d '{"area_code":"555","quantity":100,"carrier":"Verizon"}'

# Get phone numbers
curl -X GET "http://localhost:6161/api/phone-generator/numbers/?carrier=Verizon" \
  -H "Authorization: Token your_token_here"
```

---

## Best Practices

1. **Authentication**: Store tokens securely, never in client-side code
2. **Rate Limiting**: Implement exponential backoff for rate limit errors
3. **Error Handling**: Always check response status and handle errors gracefully
4. **Pagination**: Use pagination for large datasets
5. **Webhooks**: Use webhooks for real-time updates instead of polling
6. **Timeouts**: Set appropriate timeouts for long-running operations
7. **Retries**: Implement retry logic for transient failures
8. **Logging**: Log all API interactions for debugging

---

## Support

For API support:
- **Email**: api-support@godblessamerica.com
- **Documentation**: https://docs.godblessamerica.com
- **Status Page**: https://status.godblessamerica.com

---

*API Version: 1.0*
*Last Updated: January 2025*

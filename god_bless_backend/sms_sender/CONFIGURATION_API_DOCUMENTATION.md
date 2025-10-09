# Configuration Management API Documentation

This document describes the configuration management API endpoints implemented for the bulk SMS rotation enhancement system.

## Overview

The configuration management API provides comprehensive endpoints for managing rotation settings, campaign delivery configurations, server health monitoring, and bulk configuration import/export functionality.

## API Endpoints

All endpoints are prefixed with `/api/sms-sender/api/`

### 1. Rotation Settings Management

**Base URL:** `/rotation-settings/`

#### Get/Create Rotation Settings
- **GET** `/rotation-settings/` - Get current rotation settings (creates default if none exist)
- **POST** `/rotation-settings/` - Update rotation settings

#### Additional Actions
- **POST** `/rotation-settings/reset_to_defaults/` - Reset all settings to default values
- **GET** `/rotation-settings/validate_settings/` - Validate current settings and check server availability

**Example Response:**
```json
{
  "id": 1,
  "proxy_rotation_enabled": true,
  "proxy_rotation_strategy": "round_robin",
  "proxy_health_check_interval": 300,
  "proxy_max_failures": 3,
  "smtp_rotation_enabled": true,
  "smtp_rotation_strategy": "round_robin",
  "smtp_health_check_interval": 300,
  "smtp_max_failures": 3,
  "delivery_delay_enabled": true,
  "delivery_delay_min": 1,
  "delivery_delay_max": 5,
  "delivery_delay_random_seed": null,
  "created_at": "2025-10-08T17:55:24.123456Z",
  "updated_at": "2025-10-08T17:55:24.123456Z"
}
```

### 2. Campaign Delivery Settings

**Base URL:** `/campaign-delivery-settings/`

#### Per-Campaign Configuration
- **GET** `/campaign-delivery-settings/by_campaign/?campaign_id=123` - Get settings for specific campaign
- **POST** `/campaign-delivery-settings/update_by_campaign/` - Update settings for specific campaign
- **POST** `/campaign-delivery-settings/copy_from_template/` - Apply template settings to campaign

**Example Request:**
```json
{
  "campaign_id": 123,
  "use_proxy_rotation": false,
  "proxy_rotation_strategy": "best_performance",
  "custom_delay_enabled": true,
  "custom_delay_min": 2,
  "custom_delay_max": 8
}
```

### 3. Server Health Monitoring

**Base URL:** `/server-health/`

#### Health Information
- **GET** `/server-health/` - Get health status for all servers
- **GET** `/server-health/?type=proxy` - Get health status for proxy servers only
- **GET** `/server-health/?type=smtp` - Get health status for SMTP servers only
- **GET** `/server-health/summary/` - Get summary statistics for all servers

#### Health Management
- **POST** `/server-health/force_health_check/` - Force health check for specific servers

**Example Response:**
```json
[
  {
    "id": 1,
    "type": "proxy",
    "host": "proxy.example.com",
    "port": "8080",
    "is_healthy": true,
    "is_active": true,
    "success_rate": 95.5,
    "total_requests": 1000,
    "successful_requests": 955,
    "failed_requests": 45,
    "last_used": "2025-10-08T17:55:24.123456Z",
    "last_health_check": "2025-10-08T17:50:00.000000Z",
    "health_check_failures": 0,
    "average_response_time": null,
    "performance_score": 85.5,
    "predicted_failure_risk": 5.0
  }
]
```

### 4. Bulk Configuration Management

**Base URL:** `/bulk-configuration/`

#### Export Configuration
- **GET** `/bulk-configuration/export/` - Export configuration as JSON
- **GET** `/bulk-configuration/export/?format=csv` - Export configuration as CSV
- **GET** `/bulk-configuration/export/?include_servers=false` - Export without server data
- **GET** `/bulk-configuration/export/?include_templates=false` - Export without templates

#### Import Configuration
- **POST** `/bulk-configuration/import_config/` - Import configuration from JSON
- **POST** `/bulk-configuration/validate_import/` - Validate import data without importing

**Example Export Response:**
```json
{
  "export_timestamp": "2025-10-08T17:55:24.123456Z",
  "user_id": 1,
  "rotation_settings": {
    "proxy_rotation_enabled": true,
    "smtp_rotation_enabled": true,
    // ... other settings
  },
  "proxy_servers": [
    {
      "host": "proxy.example.com",
      "port": 8080,
      "protocol": "http",
      "is_active": true
    }
  ],
  "smtp_servers": [
    {
      "host": "smtp.example.com",
      "port": "587",
      "ssl": false,
      "tls": true,
      "active": true
    }
  ]
}
```

## Authentication

All endpoints require authentication. Include the authentication token in the request headers:

```
Authorization: Token your_auth_token_here
```

## Error Handling

The API returns standard HTTP status codes:

- **200 OK** - Request successful
- **400 Bad Request** - Invalid request data
- **401 Unauthorized** - Authentication required
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

Error responses include detailed error messages:

```json
{
  "error": "Campaign not found",
  "details": "No campaign with ID 123 exists for this user"
}
```

## Usage Examples

### Setting Up Rotation for a Campaign

1. **Get current rotation settings:**
```bash
curl -H "Authorization: Token your_token" \
     http://localhost:6161/api/sms-sender/api/rotation-settings/
```

2. **Configure campaign-specific settings:**
```bash
curl -X POST \
     -H "Authorization: Token your_token" \
     -H "Content-Type: application/json" \
     -d '{"campaign_id": 123, "use_proxy_rotation": true, "proxy_rotation_strategy": "best_performance"}' \
     http://localhost:6161/api/sms-sender/api/campaign-delivery-settings/update_by_campaign/
```

3. **Monitor server health:**
```bash
curl -H "Authorization: Token your_token" \
     http://localhost:6161/api/sms-sender/api/server-health/summary/
```

### Exporting and Importing Configuration

1. **Export current configuration:**
```bash
curl -H "Authorization: Token your_token" \
     http://localhost:6161/api/sms-sender/api/bulk-configuration/export/ > config_backup.json
```

2. **Validate import data:**
```bash
curl -X POST \
     -H "Authorization: Token your_token" \
     -H "Content-Type: application/json" \
     -d @config_backup.json \
     http://localhost:6161/api/sms-sender/api/bulk-configuration/validate_import/
```

3. **Import configuration:**
```bash
curl -X POST \
     -H "Authorization: Token your_token" \
     -H "Content-Type: application/json" \
     -d @config_backup.json \
     http://localhost:6161/api/sms-sender/api/bulk-configuration/import_config/
```

## Security Considerations

- Sensitive server credentials (usernames/passwords) are excluded from export operations
- All endpoints require user authentication
- Users can only access their own configuration data
- Import operations validate data before applying changes
- Health check operations are rate-limited to prevent abuse

## Integration with Frontend

The API is designed to work seamlessly with the god_bless_platform frontend. Key integration points:

1. **Real-time Updates:** Use WebSocket connections for live server health monitoring
2. **Form Validation:** Use the validation endpoints to provide immediate feedback
3. **Bulk Operations:** Support for importing/exporting configurations for backup and migration
4. **Performance Monitoring:** Rich server health data for dashboard displays

## Testing

Comprehensive test suite is available in `test_configuration_api.py`. Run tests with:

```bash
docker-compose exec god_bless_app python manage.py test sms_sender.test_configuration_api
```

## Requirements Fulfilled

This implementation fulfills the following requirements from the specification:

- **5.1-5.5:** Centralized configuration management with validation and export/import
- **10.4:** Bulk configuration import/export functionality
- **Server Health Monitoring:** Real-time server status and performance tracking
- **Campaign-Specific Settings:** Per-campaign delivery configuration overrides
- **Security:** Proper authentication and data protection
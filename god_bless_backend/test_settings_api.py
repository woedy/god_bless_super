"""
Simple test script to verify settings API endpoints
Run this after starting the Django server
"""

# This is a documentation file showing how to test the settings API
# Use tools like Postman, curl, or the frontend to test these endpoints

print("""
Settings API Test Guide
=======================

1. Get All Settings:
   GET /api/accounts/all-settings/?user_id={user_id}
   Headers: Authorization: Token {token}

2. Update User Preferences:
   POST /api/accounts/user-preferences/
   Headers: Authorization: Token {token}
   Body: {
       "user_id": "...",
       "theme_preference": "dark",
       "notification_preferences": {
           "email_notifications": true,
           "sms_notifications": true,
           "task_completion": true,
           "system_alerts": true
       }
   }

3. Update System Settings:
   POST /api/accounts/system-settings/
   Headers: Authorization: Token {token}
   Body: {
       "user_id": "...",
       "batch_size": 100,
       "sms_rate_limit_per_minute": 10,
       "delivery_delay_min": 1,
       "delivery_delay_max": 5
   }

4. Update Rotation Settings:
   POST /api/proxy-server/rotation/settings/
   Headers: Authorization: Token {token}
   Body: {
       "user_id": "...",
       "proxy_rotation_enabled": true,
       "proxy_rotation_strategy": "round_robin",
       "smtp_rotation_enabled": true,
       "delivery_delay_enabled": true
   }

All endpoints return:
{
    "message": "Successful",
    "data": {...}
}
""")

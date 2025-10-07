# Task 14: Enhanced Settings Management - Quick Start Guide

## Quick Testing Guide

### Prerequisites
- Django backend running on port 6161
- React frontend running on port 5173
- User account created and logged in

### Testing Steps

#### 1. Access Settings Page
```
Navigate to: http://localhost:5173/settings
```

#### 2. Test User Preferences Tab
- Switch between Light and Dark themes
- Toggle notification preferences
- Click "Save Preferences"
- Verify theme changes immediately
- Refresh page to confirm persistence

#### 3. Test Rotation & Delivery Tab
- Enable/disable proxy rotation
- Change rotation strategy
- Adjust health check intervals
- Enable/disable SMTP rotation
- Configure delivery delays
- Set random seed (optional)
- Click "Save Rotation Settings"

#### 4. Test System Settings Tab
- Adjust batch size
- Set SMS rate limit
- Configure delivery delays
- Set random seed
- Click "Save System Settings"

### API Testing (Optional)

#### Using curl:

**Get All Settings:**
```bash
curl -X GET "http://localhost:6161/api/accounts/all-settings/?user_id=YOUR_USER_ID" \
  -H "Authorization: Token YOUR_TOKEN"
```

**Update User Preferences:**
```bash
curl -X POST "http://localhost:6161/api/accounts/user-preferences/" \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "theme_preference": "dark",
    "notification_preferences": {
      "email_notifications": true,
      "sms_notifications": true,
      "task_completion": true,
      "system_alerts": true
    }
  }'
```

**Update System Settings:**
```bash
curl -X POST "http://localhost:6161/api/accounts/system-settings/" \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "batch_size": 100,
    "sms_rate_limit_per_minute": 10,
    "delivery_delay_min": 1,
    "delivery_delay_max": 5
  }'
```

**Update Rotation Settings:**
```bash
curl -X POST "http://localhost:6161/api/proxy-server/rotation/settings/" \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "proxy_rotation_enabled": true,
    "proxy_rotation_strategy": "round_robin",
    "smtp_rotation_enabled": true,
    "delivery_delay_enabled": true,
    "delivery_delay_min": 1,
    "delivery_delay_max": 5
  }'
```

### Expected Results

#### User Preferences
- Theme changes apply immediately to the UI
- Notification preferences saved successfully
- Settings persist after page refresh
- Toast notification confirms save

#### Rotation Settings
- Proxy rotation configuration saved
- SMTP rotation configuration saved
- Delivery delay settings saved
- Dependent fields disabled when parent disabled
- Toast notification confirms save

#### System Settings
- Batch size updated
- Rate limits configured
- Delivery delays set
- Toast notification confirms save

### Verification

1. **Database Check:**
   - User.theme_preference updated
   - User.notification_preferences updated
   - SystemSettings record created/updated
   - RotationSettings record created/updated

2. **UI Check:**
   - Theme applied correctly
   - All form fields populated with saved values
   - Loading states work properly
   - Error messages display for failures

3. **Integration Check:**
   - Theme persists across page navigation
   - SMS campaigns use configured rate limits
   - Proxy rotation uses configured strategy
   - SMTP rotation uses configured strategy

### Troubleshooting

#### Settings Not Loading
- Check browser console for errors
- Verify API endpoint is accessible
- Confirm user is authenticated
- Check token is valid

#### Settings Not Saving
- Check network tab for API response
- Verify request payload is correct
- Check backend logs for errors
- Confirm user has permissions

#### Theme Not Changing
- Check localStorage for 'theme' key
- Verify themeChange event is dispatched
- Check theme provider is listening
- Refresh page if needed

### Common Issues

1. **401 Unauthorized**: Token expired or invalid
2. **400 Bad Request**: Invalid data format
3. **404 Not Found**: Endpoint URL incorrect
4. **500 Server Error**: Backend issue, check logs

### Success Indicators

✅ All three tabs load without errors
✅ Settings fetch successfully on page load
✅ Form inputs update state correctly
✅ Save operations complete successfully
✅ Toast notifications appear
✅ Theme changes apply immediately
✅ Settings persist after refresh

### Next Steps After Testing

1. Test integration with SMS campaigns
2. Verify proxy rotation uses settings
3. Confirm SMTP rotation uses settings
4. Test rate limiting in action
5. Verify delivery delays work
6. Check notification preferences are respected

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Django server logs
3. Verify all dependencies installed
4. Confirm migrations are up to date
5. Review TASK_14_COMPLETION.md for details

# SMS Campaign and Task Management Testing Guide

## Overview

This guide covers how to test the SMS campaign and task management features in the God Bless America platform. The system is properly wired with both frontend components and backend API endpoints.

## Architecture Overview

### Frontend Structure
- **Pages**: Located in `god_bless_platform/src/pages/sms/` and `god_bless_platform/src/pages/tasks/`
- **Components**: Located in `god_bless_platform/src/components/sms/`
- **Routing**: Configured in `god_bless_platform/src/App.tsx` with routes defined in `god_bless_platform/src/config/routes.ts`

### Backend Structure
- **API Endpoints**: Available at `/api/sms-sender/` with comprehensive REST API
- **Models**: SMS campaigns, templates, monitoring, optimization
- **Services**: Smart delivery, analytics, retry management, optimization

## Available Routes and Features

### SMS Campaign Routes
- `/sms` - Main SMS dashboard
- `/sms/campaigns` - List all campaigns
- `/sms/create` - Create new campaign
- `/sms/campaigns/:campaignId` - View campaign details
- `/sms/campaigns/:campaignId/edit` - Edit campaign
- `/sms/bulk` - Send bulk SMS

### Task Management Routes
- `/tasks` - Main tasks dashboard
- `/tasks/active` - View active/running tasks
- `/tasks/history` - View task history
- `/tasks/:id` - View specific task details

### Optimization Routes
- Optimization features are integrated into the SMS pages
- Available components: OptimizationDashboard, OneClickOptimization, RealTimeGuidance

## Testing Procedures

### 1. Frontend Component Testing

#### Prerequisites
```bash
cd god_bless_platform
npm install
npm run dev
```

#### Test SMS Components
1. **Navigation Test**
   - Navigate to `/sms` - should load SMS dashboard
   - Navigate to `/sms/campaigns` - should show campaign list
   - Navigate to `/sms/create` - should show campaign creation form

2. **Component Integration Test**
   - Check that all SMS components are properly imported (fixed export issue)
   - Verify OptimizationDashboard loads without errors
   - Verify OneClickOptimization component renders
   - Verify RealTimeGuidance component displays

3. **Task Management Test**
   - Navigate to `/tasks` - should show task dashboard
   - Navigate to `/tasks/active` - should show active tasks
   - Navigate to `/tasks/history` - should show task history

### 2. Backend API Testing

#### Prerequisites
```bash
cd god_bless_backend
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### Test API Endpoints

**Campaign Management APIs:**
```bash
# List campaigns
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8000/api/sms-sender/campaigns/

# Create campaign
curl -X POST -H "Content-Type: application/json" -H "Authorization: Token YOUR_TOKEN" \
  -d '{"name":"Test Campaign","message":"Hello World","recipients":[]}' \
  http://localhost:8000/api/sms-sender/campaigns/

# Get campaign stats
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/sms-sender/campaigns/1/stats/
```

**Optimization APIs:**
```bash
# Get optimization recommendations
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/sms-sender/api/optimization/recommendations/

# Auto-optimize campaign
curl -X POST -H "Content-Type: application/json" -H "Authorization: Token YOUR_TOKEN" \
  -d '{"campaign_id":1}' \
  http://localhost:8000/api/sms-sender/api/optimization/auto_optimize_campaign/

# Get real-time guidance
curl -X POST -H "Content-Type: application/json" -H "Authorization: Token YOUR_TOKEN" \
  -d '{"context":"campaign_setup"}' \
  http://localhost:8000/api/sms-sender/api/optimization/guidance/
```

**Task Management APIs:**
```bash
# List active tasks
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8000/api/tasks/active/

# Get task details
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8000/api/tasks/1/

# Task history
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8000/api/tasks/history/
```

### 3. Integration Testing

#### Full Stack Test Flow
1. **Start Backend Services**
   ```bash
   # Terminal 1: Django server
   python manage.py runserver
   
   # Terminal 2: Celery worker (for background tasks)
   celery -A god_bless_pro worker -l info
   
   # Terminal 3: Celery beat (for scheduled tasks)
   celery -A god_bless_pro beat -l info
   ```

2. **Start Frontend**
   ```bash
   # Terminal 4: React development server
   cd god_bless_platform
   npm run dev
   ```

3. **Test Complete Workflow**
   - Login to the application
   - Navigate to SMS campaigns
   - Create a new campaign
   - Monitor task progress in tasks section
   - Use optimization features
   - Check real-time guidance

### 4. Automated Testing

#### Backend Tests
```bash
cd god_bless_backend

# Run all SMS-related tests
python -m pytest sms_sender/tests/ -v

# Run specific test files
python -m pytest sms_sender/test_api.py -v
python -m pytest sms_sender/test_optimization_service.py -v
python -m pytest sms_sender/test_monitoring_service.py -v
```

#### Frontend Tests
```bash
cd god_bless_platform

# Run component tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### 5. Manual Testing Checklist

#### SMS Campaign Features
- [ ] Campaign creation form works
- [ ] Campaign list displays correctly
- [ ] Campaign details page loads
- [ ] Campaign editing functionality
- [ ] Bulk SMS sending
- [ ] Message templates work
- [ ] Recipient management
- [ ] Campaign monitoring/stats

#### Optimization Features
- [ ] OptimizationDashboard displays recommendations
- [ ] OneClickOptimization component functions
- [ ] RealTimeGuidance provides contextual tips
- [ ] Configuration import works
- [ ] Server maintenance mode toggle

#### Task Management Features
- [ ] Active tasks display with real-time updates
- [ ] Task history shows completed tasks
- [ ] Task details provide comprehensive info
- [ ] Task cancellation works
- [ ] Task retry functionality
- [ ] WebSocket updates for task progress

### 6. Performance Testing

#### Load Testing
```bash
# Install Apache Bench or similar tool
# Test campaign creation endpoint
ab -n 100 -c 10 -H "Authorization: Token YOUR_TOKEN" \
  -p campaign_data.json -T application/json \
  http://localhost:8000/api/sms-sender/campaigns/

# Test optimization endpoint
ab -n 50 -c 5 -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/sms-sender/api/optimization/recommendations/
```

### 7. Error Handling Testing

#### Test Error Scenarios
- Invalid authentication tokens
- Malformed request data
- Network connectivity issues
- Database connection failures
- Celery worker unavailability

### 8. Browser Compatibility Testing

Test the frontend in multiple browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Common Issues and Solutions

### Frontend Issues
1. **Module Import Errors**: Fixed - components now use proper default exports
2. **Route Not Found**: Check that routes are properly defined in `routes.ts`
3. **Component Not Rendering**: Verify component is properly exported in `index.ts`

### Backend Issues
1. **API 404 Errors**: Check URL patterns in `urls.py`
2. **Authentication Errors**: Ensure proper token authentication
3. **Database Errors**: Run migrations and check database connection

### Integration Issues
1. **CORS Errors**: Configure CORS settings in Django
2. **WebSocket Connection**: Ensure Redis is running for Channels
3. **Task Queue Issues**: Verify Celery worker and Redis are running

## Monitoring and Debugging

### Frontend Debugging
- Use browser developer tools
- Check console for JavaScript errors
- Use React Developer Tools extension
- Monitor network requests in Network tab

### Backend Debugging
- Check Django logs
- Use Django Debug Toolbar
- Monitor Celery logs
- Check Redis connection status

### Database Monitoring
- Monitor query performance
- Check for database locks
- Verify data integrity

## Conclusion

The SMS campaign and task management features are properly wired and ready for testing. Follow this guide systematically to ensure all components work correctly both individually and as an integrated system.
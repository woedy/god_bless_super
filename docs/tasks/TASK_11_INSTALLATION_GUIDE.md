# Task 11: Modern Dashboard - Installation Guide

## Prerequisites
- Python 3.8+
- Node.js 16+
- Running Django backend
- Running React frontend

## Backend Installation

### 1. Install Python Dependencies

Navigate to the backend directory:
```bash
cd god_bless_backend
```

Install the new dependency (psutil):
```bash
pip install psutil
```

Or install all requirements:
```bash
pip install -r requirements.txt
```

### 2. Verify Installation

Test that psutil is working:
```python
python -c "import psutil; print(f'CPU: {psutil.cpu_percent()}%')"
```

### 3. Run Migrations (if needed)

```bash
python manage.py migrate
```

### 4. Start the Backend Server

```bash
python manage.py runserver 0.0.0.0:6161
```

## Frontend Installation

### 1. Verify Dependencies

Navigate to the frontend directory:
```bash
cd god_bless_frontend
```

The required dependencies (apexcharts, react-apexcharts) are already in package.json. If you need to reinstall:

```bash
npm install
```

### 2. Start the Frontend Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Verification

### 1. Test Backend Endpoints

Test the analytics endpoint:
```bash
curl -H "Authorization: Token YOUR_TOKEN" \
  "http://localhost:6161/api/dashboard/analytics/?project_id=1"
```

Test system health:
```bash
curl -H "Authorization: Token YOUR_TOKEN" \
  "http://localhost:6161/api/dashboard/system-health/"
```

### 2. Access the Dashboard

1. Open your browser and navigate to `http://localhost:5173`
2. Log in with your credentials
3. Navigate to `/dashboard`
4. Verify that:
   - Platform metrics display correctly
   - System health chart shows CPU, memory, and disk usage
   - Task statistics are visible
   - Charts render properly

## Docker Installation

If using Docker:

### 1. Rebuild Backend Container

```bash
cd god_bless_backend
docker-compose build backend
docker-compose up -d backend
```

### 2. Rebuild Frontend Container

```bash
cd god_bless_frontend
docker-compose build frontend
docker-compose up -d frontend
```

### 3. Verify Services

```bash
docker-compose ps
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Troubleshooting

### Backend Issues

#### psutil Not Found
```bash
pip install psutil
```

#### Permission Denied for System Metrics
On some systems, psutil may need elevated permissions. The dashboard will gracefully handle this and show "unavailable" status.

#### Database Errors
```bash
python manage.py migrate
python manage.py makemigrations
python manage.py migrate
```

### Frontend Issues

#### Charts Not Rendering
```bash
npm install apexcharts react-apexcharts
npm run dev
```

#### Module Not Found Errors
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Build Errors
```bash
npm run build
```

Check the console for specific errors.

### API Connection Issues

#### CORS Errors
Verify `django-cors-headers` is configured in `settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

#### Authentication Errors
- Verify token is valid
- Check token expiration
- Ensure user has proper permissions

## Configuration

### Backend Configuration

No additional configuration needed. The analytics views use existing models and settings.

### Frontend Configuration

Update constants if needed in `god_bless_frontend/src/constants.tsx`:
```typescript
export const baseUrl = 'http://localhost:6161/';
```

## Performance Optimization

### Backend

1. **Database Indexing**: Already implemented in TaskProgress model
2. **Query Optimization**: Uses select_related and prefetch_related
3. **Caching**: Consider adding Redis caching for system health metrics

### Frontend

1. **Auto-refresh Interval**: Adjust in ModernDashboard.tsx (default: 30 seconds)
```typescript
const interval = setInterval(() => {
  fetchActiveTasks();
}, 30000); // Change this value
```

2. **Chart Performance**: For large datasets, consider pagination or data aggregation

## Next Steps

1. ✅ Verify backend endpoints are working
2. ✅ Verify frontend displays correctly
3. ✅ Test with real data
4. ✅ Monitor performance
5. ✅ Configure auto-refresh intervals as needed

## Support

For issues or questions:
1. Check the README.md in `god_bless_frontend/src/pages/Dashboard/`
2. Review the completion summary in `TASK_11_DASHBOARD_COMPLETION.md`
3. Check browser console for frontend errors
4. Check Django logs for backend errors

## Production Deployment

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --noinput

# Run with Gunicorn
gunicorn god_bless_pro.wsgi:application --bind 0.0.0.0:6161
```

### Frontend
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring

Monitor the following in production:
- API response times for analytics endpoints
- System resource usage (CPU, memory, disk)
- Task completion rates
- Error rates in logs

## Success Criteria

✅ Backend endpoints return data without errors
✅ Frontend dashboard loads within 2 seconds
✅ System health metrics display correctly
✅ Charts render properly
✅ Active tasks update automatically
✅ Manual refresh works
✅ No console errors
✅ Responsive design works on mobile

## Rollback Plan

If issues occur, rollback to legacy dashboard:

1. Update `App.tsx`:
```typescript
// Change from:
<ModernDashboard />
// Back to:
<Dashboard />
```

2. Restart frontend:
```bash
npm run dev
```

The legacy dashboard will continue to work as before.

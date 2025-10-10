# God Bless Platform - Production Setup Guide

## Quick Setup

### 1. Environment Configuration
Copy the environment template and configure your values:
```bash
cp .env.production .env
# Edit .env with your actual values
```

### 2. Build and Deploy
```bash
# Build the Docker images
docker-compose -f docker-compose.prod.yml build

# Start the services
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Verify Deployment
Check these endpoints to verify everything is working:

- **Health Check**: `http://your-domain/api/health/`
- **API Root**: `http://your-domain/api/`
- **Admin Panel**: `http://your-domain/admin/`
- **Frontend**: `http://your-domain/`

### 4. Monitor Logs
```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f worker
docker-compose -f docker-compose.prod.yml logs -f database
```

## Architecture Overview

- **Single Container App**: Combines Django backend + React frontend + Nginx
- **PostgreSQL Database**: Persistent data storage
- **Redis**: Caching and message broker
- **Celery Worker**: Background task processing
- **Celery Beat**: Scheduled task management

## Key Features

✅ **Multi-stage Docker build** for optimized images
✅ **Health checks** for all services
✅ **Automatic migrations** on startup
✅ **Static file serving** via Nginx
✅ **WebSocket support** for real-time features
✅ **Comprehensive logging** and monitoring
✅ **Graceful fallbacks** if frontend build fails

## Troubleshooting

### Frontend Not Loading
- Check `/api/health/` - if this works, backend is fine
- Check Docker logs: `docker-compose -f docker-compose.prod.yml logs app`
- Frontend fallback page will show if build failed

### Database Connection Issues
- Verify environment variables in `.env`
- Check database logs: `docker-compose -f docker-compose.prod.yml logs database`
- Ensure PostgreSQL is healthy: `docker-compose -f docker-compose.prod.yml ps`

### Redis Connection Issues
- Check Redis logs: `docker-compose -f docker-compose.prod.yml logs redis`
- Verify REDIS_PASSWORD in environment

## Production Checklist

- [ ] Update SECRET_KEY with a secure random value
- [ ] Set proper DOMAIN in environment
- [ ] Configure secure database passwords
- [ ] Set up SSL/TLS certificates
- [ ] Configure email settings for notifications
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy for database
- [ ] Review and update CORS settings
- [ ] Set up log rotation and retention

## Coolify Deployment

This configuration is optimized for Coolify deployment:

1. **Single Port Exposure**: Only port 80 is exposed
2. **Health Checks**: Built-in health endpoints for monitoring
3. **Environment Variables**: All configuration via environment
4. **Persistent Volumes**: Data persists across deployments
5. **Graceful Startup**: Waits for dependencies before starting
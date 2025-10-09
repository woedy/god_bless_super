# Docker Deployment Guide for God Bless America Platform

This guide covers the optimized Docker configurations for deploying the God Bless America platform on Coolify or any Docker-based hosting platform.

## 🏗️ Architecture Overview

The platform consists of the following services:

- **Database**: PostgreSQL 15 with Alpine Linux
- **Cache/Broker**: Redis 7 with persistence
- **Backend**: Django application with Daphne (WebSocket support)
- **Workers**: Celery workers for background tasks
- **Scheduler**: Celery Beat for periodic tasks
- **Frontend**: React application (legacy) with Nginx
- **Platform**: React application (new) with Nginx
- **Proxy**: Nginx reverse proxy with SSL support
- **Monitoring**: Flower for Celery monitoring (optional)

## 🔧 Optimizations Implemented

### Security Hardening

- ✅ Non-root user execution in all containers
- ✅ Read-only filesystems where possible
- ✅ Minimal base images (Alpine Linux)
- ✅ Security headers in Nginx
- ✅ Network segmentation with internal Docker networks
- ✅ Proper secret management through environment variables

### Performance Optimizations

- ✅ Multi-stage Docker builds to reduce image size
- ✅ Layer caching optimization
- ✅ Resource limits and reservations
- ✅ Gzip compression in Nginx
- ✅ Static file caching
- ✅ Connection pooling and keepalive
- ✅ Optimized Nginx worker configuration

### Health Checks

- ✅ Comprehensive health checks for all services
- ✅ Dependency-aware startup ordering
- ✅ Graceful failure handling
- ✅ Custom health endpoints in Django

### Production Readiness

- ✅ Persistent volumes for data
- ✅ Proper logging configuration
- ✅ Environment-based configuration
- ✅ Backup-friendly volume structure
- ✅ Monitoring and observability

## 📁 File Structure

```
├── docker-compose.yml              # Production configuration
├── docker-compose.override.yml     # Development overrides
├── .env.example                    # Environment template
├── nginx/
│   ├── nginx.conf                  # Main Nginx config
│   └── conf.d/
│       └── default.conf            # Site configuration
├── god_bless_backend/
│   ├── Dockerfile                  # Development backend
│   ├── Dockerfile.prod             # Production backend
│   ├── docker-entrypoint.sh        # Startup script
│   └── .dockerignore               # Build context exclusions
├── god_bless_frontend/
│   ├── Dockerfile                  # Development frontend
│   ├── Dockerfile.prod             # Production frontend
│   ├── nginx.conf                  # Frontend Nginx config
│   └── .dockerignore               # Build context exclusions
└── god_bless_platform/
    ├── docker/
    │   ├── Dockerfile              # Development platform
    │   ├── Dockerfile.prod         # Production platform
    │   └── nginx.conf              # Platform Nginx config
    └── .dockerignore               # Build context exclusions
```

## 🚀 Quick Start

### For Coolify Deployment

1. **Clone the repository** to your Coolify server
2. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```
3. **Configure environment variables** in Coolify UI or `.env` file
4. **Deploy using Coolify** - it will automatically use `docker-compose.yml`

### For Local Development

1. **Start development environment**:

   ```bash
   docker-compose up -d
   ```

   This automatically uses `docker-compose.override.yml` for development settings.

2. **View logs**:

   ```bash
   docker-compose logs -f [service_name]
   ```

3. **Stop services**:
   ```bash
   docker-compose down
   ```

### For Production (Manual)

1. **Set production environment**:

   ```bash
   export COMPOSE_FILE=docker-compose.yml
   ```

2. **Configure environment variables** in `.env` file

3. **Deploy**:
   ```bash
   docker-compose up -d
   ```

## 🔐 Environment Configuration

### Required Variables

```bash
# Database
POSTGRES_DB=god_bless_db
POSTGRES_USER=god_bless_user
POSTGRES_PASSWORD=your_secure_password

# Redis
REDIS_PASSWORD=your_redis_password

# Django
SECRET_KEY=your_50_character_secret_key
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Frontend
VITE_API_URL=https://yourdomain.com/api
VITE_WS_URL=wss://yourdomain.com/ws
```

### Optional Variables

```bash
# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password

# Monitoring
FLOWER_USER=admin
FLOWER_PASSWORD=your_flower_password

# Initial Setup
CREATE_SUPERUSER=true
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@yourdomain.com
DJANGO_SUPERUSER_PASSWORD=your_admin_password
```

## 🏥 Health Checks

All services include comprehensive health checks:

- **Database**: `pg_isready` command
- **Redis**: `redis-cli ping` command
- **Backend**: HTTP request to `/api/health/`
- **Frontend/Platform**: HTTP request to `/health`
- **Nginx**: HTTP request to `/health`
- **Celery Worker**: `celery inspect ping`

## 📊 Monitoring

### Built-in Endpoints

- **Health Check**: `GET /api/health/` - Basic service status
- **Readiness Check**: `GET /api/health/ready/` - Dependency status
- **Liveness Check**: `GET /api/health/live/` - Service alive status
- **Metrics**: `GET /api/metrics/` - System metrics

### Flower (Celery Monitoring)

Access Flower at `http://yourdomain.com:5555` (if enabled in monitoring profile):

```bash
docker-compose --profile monitoring up -d
```

## 🔧 Customization

### Resource Limits

Adjust resource limits in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: "1.0"
    reservations:
      memory: 512M
      cpus: "0.5"
```

### Nginx Configuration

Customize Nginx settings in:

- `nginx/nginx.conf` - Global settings
- `nginx/conf.d/default.conf` - Site-specific settings

### Health Check Intervals

Modify health check settings:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/health/"]
  interval: 30s
  timeout: 15s
  retries: 3
  start_period: 90s
```

## 🐛 Troubleshooting

### Common Issues

1. **Service won't start**:

   ```bash
   docker-compose logs [service_name]
   ```

2. **Database connection issues**:

   - Check `POSTGRES_*` environment variables
   - Verify database service is healthy: `docker-compose ps`

3. **Redis connection issues**:

   - Check `REDIS_PASSWORD` matches in all services
   - Verify Redis service is healthy

4. **Frontend build failures**:

   - Check `VITE_*` environment variables
   - Ensure Node.js version compatibility

5. **Permission issues**:
   - All containers run as non-root user (UID 1000)
   - Check volume permissions on host

### Debug Commands

```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs -f [service_name]

# Execute commands in running container
docker-compose exec [service_name] /bin/bash

# Restart specific service
docker-compose restart [service_name]

# Rebuild and restart service
docker-compose up -d --build [service_name]
```

## 🔄 Updates and Maintenance

### Updating Services

1. **Pull latest code**:

   ```bash
   git pull origin main
   ```

2. **Rebuild and restart**:

   ```bash
   docker-compose up -d --build
   ```

3. **Run migrations** (if needed):
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

### Backup Data

```bash
# Database backup
docker-compose exec database pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql

# Redis backup
docker-compose exec redis redis-cli --rdb /data/dump.rdb
```

## 📈 Performance Tuning

### Database Optimization

- Adjust PostgreSQL settings in environment variables
- Monitor connection pool usage
- Consider read replicas for high-traffic deployments

### Redis Optimization

- Configure memory limits based on usage
- Enable persistence for important data
- Monitor memory usage and eviction policies

### Nginx Optimization

- Adjust worker processes based on CPU cores
- Configure appropriate buffer sizes
- Enable HTTP/2 for better performance

## 🔒 Security Best Practices

1. **Use strong passwords** for all services
2. **Enable SSL/TLS** in production
3. **Regularly update** base images
4. **Monitor logs** for suspicious activity
5. **Limit network exposure** to necessary ports only
6. **Use secrets management** for sensitive data
7. **Enable security headers** in Nginx
8. **Regular security audits** of dependencies

## 📞 Support

For issues related to Docker deployment:

1. Check this guide first
2. Review service logs
3. Verify environment configuration
4. Check resource availability
5. Consult Docker and service-specific documentation

---

**Note**: This configuration is optimized for production deployment on Coolify but can be adapted for other Docker-based hosting platforms.

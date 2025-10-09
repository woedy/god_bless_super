# Coolify Deployment Troubleshooting Guide

## Overview

This comprehensive troubleshooting guide addresses common issues encountered when deploying the God Bless America platform on Coolify. It provides step-by-step solutions, diagnostic commands, and preventive measures.

## Table of Contents

1. [General Troubleshooting Approach](#general-troubleshooting-approach)
2. [Deployment Issues](#deployment-issues)
3. [Service Startup Problems](#service-startup-problems)
4. [Database Connection Issues](#database-connection-issues)
5. [Redis and Caching Problems](#redis-and-caching-problems)
6. [SSL and Domain Issues](#ssl-and-domain-issues)
7. [Performance Problems](#performance-problems)
8. [Security and Authentication Issues](#security-and-authentication-issues)
9. [Monitoring and Logging Issues](#monitoring-and-logging-issues)
10. [Recovery Procedures](#recovery-procedures)

## General Troubleshooting Approach

### 1. Initial Diagnostic Steps

When encountering issues, follow this systematic approach:

1. **Check Service Status**
   ```bash
   # In Coolify dashboard, verify all services are running
   # Look for services marked as "Unhealthy" or "Stopped"
   ```

2. **Review Recent Logs**
   ```bash
   # Access service logs through Coolify interface
   # Look for error messages, stack traces, or warnings
   ```

3. **Verify Environment Variables**
   ```bash
   # Check all required environment variables are set
   # Verify sensitive values are properly configured
   ```

4. **Test Network Connectivity**
   ```bash
   # Test internal service communication
   # Verify external network access
   ```

### 2. Log Analysis Techniques

#### Reading Application Logs
- Look for ERROR and CRITICAL level messages
- Check for stack traces and exception details
- Monitor startup sequences for initialization failures
- Track request/response patterns for performance issues

#### Common Log Patterns to Watch For
```bash
# Database connection errors
ERROR: could not connect to server
FATAL: password authentication failed

# Redis connection errors
ConnectionError: Error connecting to Redis
redis.exceptions.ConnectionError

# Django errors
django.core.exceptions.ImproperlyConfigured
django.db.utils.OperationalError

# Nginx errors
nginx: [error] connect() failed
upstream timed out
```

## Deployment Issues

### Issue: Deployment Fails to Start

**Symptoms:**
- Deployment process stops with errors
- Services fail to initialize
- Docker containers exit immediately

**Diagnostic Steps:**
1. Check deployment logs in Coolify dashboard
2. Verify Docker Compose file syntax
3. Check for missing environment variables
4. Verify image build process

**Solutions:**

#### Docker Compose Syntax Errors
```yaml
# Common syntax issues to check:
version: '3.8'  # Ensure version is specified
services:
  backend:
    build: .  # Ensure build context is correct
    environment:
      - DEBUG=False  # Check environment variable format
    depends_on:
      - database  # Verify service names match
```

#### Missing Environment Variables
```bash
# Check required variables are set:
- DATABASE_URL
- SECRET_KEY
- REDIS_URL
- ALLOWED_HOSTS
```

#### Image Build Failures
```dockerfile
# Common Dockerfile issues:
FROM python:3.11-slim  # Ensure base image exists
COPY requirements.txt .  # Verify file paths
RUN pip install -r requirements.txt  # Check for dependency conflicts
```

### Issue: Partial Deployment Success

**Symptoms:**
- Some services start successfully
- Other services fail to start or become unhealthy
- Inconsistent service availability

**Solutions:**

1. **Check Service Dependencies**
   ```yaml
   # Ensure proper dependency order
   services:
     backend:
       depends_on:
         - database
         - redis
   ```

2. **Verify Health Checks**
   ```yaml
   # Add proper health checks
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

3. **Review Resource Limits**
   ```yaml
   # Adjust resource constraints
   deploy:
     resources:
       limits:
         memory: 512M
         cpus: '0.5'
   ```

## Service Startup Problems

### Issue: Django Backend Won't Start

**Symptoms:**
- Backend service shows as unhealthy
- HTTP 502/503 errors when accessing application
- Django process exits with errors

**Diagnostic Commands:**
```bash
# Check Django configuration
python manage.py check --deploy

# Test database connection
python manage.py dbshell

# Verify migrations
python manage.py showmigrations
```

**Common Solutions:**

#### Database Migration Issues
```bash
# Run migrations manually
python manage.py migrate

# Check for migration conflicts
python manage.py showmigrations --plan

# Reset migrations if necessary (CAUTION: Data loss)
python manage.py migrate --fake-initial
```

#### Static Files Collection
```bash
# Collect static files
python manage.py collectstatic --noinput

# Verify static files configuration
STATIC_ROOT = '/app/staticfiles/'
STATIC_URL = '/static/'
```

#### Gunicorn Configuration
```bash
# Check Gunicorn startup command
gunicorn --bind 0.0.0.0:8000 god_bless_pro.wsgi:application

# Adjust worker configuration
gunicorn --workers 3 --timeout 120 --bind 0.0.0.0:8000 god_bless_pro.wsgi:application
```

### Issue: Celery Workers Not Starting

**Symptoms:**
- Background tasks not processing
- Celery worker logs show connection errors
- Task queue builds up without processing

**Solutions:**

#### Redis Connection Issues
```bash
# Test Redis connectivity
redis-cli -h redis -p 6379 ping

# Check Redis URL format
CELERY_BROKER_URL=redis://redis:6379/0
```

#### Worker Configuration
```bash
# Start Celery worker with proper settings
celery -A god_bless_pro worker --loglevel=info --concurrency=2

# Check for task registration
celery -A god_bless_pro inspect registered
```

#### Beat Scheduler Issues
```bash
# Start Celery beat scheduler
celery -A god_bless_pro beat --loglevel=info

# Check scheduled tasks
celery -A god_bless_pro inspect scheduled
```

### Issue: Frontend Services Not Loading

**Symptoms:**
- Frontend shows blank page or loading errors
- JavaScript console errors
- API connection failures

**Solutions:**

#### Build Process Issues
```bash
# Check Vite build process
npm run build

# Verify build output
ls -la dist/

# Check for build errors
npm run build 2>&1 | grep ERROR
```

#### Environment Variable Issues
```bash
# Verify frontend environment variables
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_WS_BASE_URL=wss://yourdomain.com/ws
```

#### Nginx Configuration
```nginx
# Ensure proper frontend serving
location / {
    root /usr/share/nginx/html;
    index index.html index.htm;
    try_files $uri $uri/ /index.html;
}
```

## Database Connection Issues

### Issue: PostgreSQL Connection Failures

**Symptoms:**
- Django can't connect to database
- Connection timeout errors
- Authentication failures

**Diagnostic Steps:**
```bash
# Test database connectivity
pg_isready -h database -p 5432

# Test authentication
psql -h database -U god_bless_user -d god_bless_db

# Check database logs
docker logs coolify_database_container
```

**Solutions:**

#### Connection String Issues
```bash
# Verify DATABASE_URL format
DATABASE_URL=postgresql://username:password@host:port/database

# Check for special characters in password
# URL encode special characters if necessary
```

#### Database Initialization
```sql
-- Create database and user manually if needed
CREATE DATABASE god_bless_db;
CREATE USER god_bless_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE god_bless_db TO god_bless_user;
```

#### Connection Pool Configuration
```python
# Django database settings
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'god_bless_db',
        'USER': 'god_bless_user',
        'PASSWORD': 'secure_password',
        'HOST': 'database',
        'PORT': '5432',
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'MAX_CONNS': 20,
        }
    }
}
```

### Issue: Database Migration Problems

**Symptoms:**
- Migration commands fail
- Database schema inconsistencies
- Data integrity errors

**Solutions:**

#### Migration Conflicts
```bash
# Check for migration conflicts
python manage.py showmigrations

# Resolve conflicts by merging migrations
python manage.py makemigrations --merge

# Apply specific migration
python manage.py migrate app_name migration_name
```

#### Fake Migrations (Use with Caution)
```bash
# Mark migration as applied without running
python manage.py migrate --fake app_name migration_name

# Fake initial migration for existing database
python manage.py migrate --fake-initial
```

## Redis and Caching Problems

### Issue: Redis Connection Failures

**Symptoms:**
- Cache operations fail
- Session storage not working
- Celery broker connection errors

**Diagnostic Steps:**
```bash
# Test Redis connectivity
redis-cli -h redis -p 6379 ping

# Check Redis configuration
redis-cli -h redis -p 6379 CONFIG GET "*"

# Monitor Redis operations
redis-cli -h redis -p 6379 MONITOR
```

**Solutions:**

#### Redis URL Configuration
```bash
# Verify Redis URL format
REDIS_URL=redis://redis:6379/0

# Test different database numbers
REDIS_URL=redis://redis:6379/1  # Use database 1 instead of 0
```

#### Redis Memory Issues
```bash
# Check Redis memory usage
redis-cli -h redis -p 6379 INFO memory

# Configure memory limits
redis-cli -h redis -p 6379 CONFIG SET maxmemory 256mb
redis-cli -h redis -p 6379 CONFIG SET maxmemory-policy allkeys-lru
```

#### Cache Configuration
```python
# Django cache settings
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            }
        }
    }
}
```

## SSL and Domain Issues

### Issue: SSL Certificate Generation Fails

**Symptoms:**
- Let's Encrypt certificate generation fails
- HTTPS not working
- Certificate validation errors

**Solutions:**

#### DNS Verification
```bash
# Check DNS propagation
dig yourdomain.com A
nslookup yourdomain.com

# Verify domain points to correct IP
ping yourdomain.com
```

#### Port Accessibility
```bash
# Ensure port 80 is accessible for HTTP-01 challenge
curl -I http://yourdomain.com/.well-known/acme-challenge/test

# Check firewall settings
ufw status
iptables -L
```

#### Rate Limiting Issues
- Let's Encrypt has rate limits (50 certificates per domain per week)
- Use staging environment for testing
- Wait for rate limit reset if exceeded

### Issue: Mixed Content Warnings

**Symptoms:**
- Browser shows mixed content warnings
- Some resources load over HTTP instead of HTTPS
- Security warnings in browser console

**Solutions:**

#### Update Application URLs
```python
# Django settings for HTTPS
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

#### Frontend Configuration
```javascript
// Use relative URLs or HTTPS
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://yourdomain.com/api';
```

#### Content Security Policy
```nginx
# Add CSP header to upgrade insecure requests
add_header Content-Security-Policy "upgrade-insecure-requests;" always;
```

## Performance Problems

### Issue: Slow Application Response

**Symptoms:**
- High response times
- Timeouts under load
- Poor user experience

**Diagnostic Steps:**
```bash
# Check resource usage
docker stats

# Monitor database performance
SELECT * FROM pg_stat_activity;

# Check Redis performance
redis-cli -h redis -p 6379 --latency
```

**Solutions:**

#### Database Optimization
```sql
-- Add database indexes
CREATE INDEX idx_user_email ON accounts_user(email);
CREATE INDEX idx_project_created ON projects_project(created_at);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM accounts_user WHERE email = 'user@example.com';
```

#### Caching Implementation
```python
# Add caching to views
from django.views.decorators.cache import cache_page

@cache_page(60 * 15)  # Cache for 15 minutes
def expensive_view(request):
    # Expensive operation
    return response
```

#### Resource Limits Adjustment
```yaml
# Increase resource limits
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
    reservations:
      memory: 512M
      cpus: '0.5'
```

### Issue: High Memory Usage

**Symptoms:**
- Containers being killed due to memory limits
- Out of memory errors
- System becomes unresponsive

**Solutions:**

#### Memory Profiling
```python
# Add memory profiling to Django
import tracemalloc
tracemalloc.start()

# Monitor memory usage
import psutil
process = psutil.Process()
print(f"Memory usage: {process.memory_info().rss / 1024 / 1024:.2f} MB")
```

#### Optimize Database Queries
```python
# Use select_related and prefetch_related
users = User.objects.select_related('profile').prefetch_related('projects')

# Limit query results
users = User.objects.all()[:100]
```

#### Garbage Collection Tuning
```python
# Django settings for memory management
import gc
gc.set_threshold(700, 10, 10)
```

## Security and Authentication Issues

### Issue: Authentication Not Working

**Symptoms:**
- Users can't log in
- Token authentication fails
- Session management problems

**Solutions:**

#### Token Authentication
```python
# Verify token authentication settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
}
```

#### Session Configuration
```python
# Session settings
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 86400  # 24 hours
```

#### CORS Configuration
```python
# CORS settings for frontend
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]
CORS_ALLOW_CREDENTIALS = True
```

### Issue: CSRF Token Errors

**Symptoms:**
- CSRF verification failed errors
- Forms not submitting
- API calls being rejected

**Solutions:**

#### CSRF Configuration
```python
# CSRF settings
CSRF_TRUSTED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = 'Lax'
```

#### Frontend CSRF Handling
```javascript
// Get CSRF token from cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Include CSRF token in requests
const csrftoken = getCookie('csrftoken');
```

## Monitoring and Logging Issues

### Issue: Logs Not Appearing

**Symptoms:**
- No logs visible in Coolify dashboard
- Missing application logs
- Debugging information not available

**Solutions:**

#### Logging Configuration
```python
# Django logging settings
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

#### Docker Logging
```yaml
# Docker Compose logging configuration
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Issue: Health Checks Failing

**Symptoms:**
- Services marked as unhealthy
- Frequent container restarts
- Inconsistent service availability

**Solutions:**

#### Health Check Implementation
```python
# Django health check view
from django.http import JsonResponse
from django.db import connection

def health_check(request):
    try:
        # Test database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        # Test Redis connection
        from django.core.cache import cache
        cache.set('health_check', 'ok', 30)
        
        return JsonResponse({'status': 'healthy'})
    except Exception as e:
        return JsonResponse({'status': 'unhealthy', 'error': str(e)}, status=500)
```

#### Docker Health Check
```dockerfile
# Add health check to Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1
```

## Recovery Procedures

### Emergency Recovery Steps

#### Service Recovery
1. **Identify Failed Services**
   ```bash
   # Check service status in Coolify
   # Identify which services are down
   ```

2. **Restart Failed Services**
   ```bash
   # Restart individual services through Coolify interface
   # Or restart entire application if necessary
   ```

3. **Verify Data Integrity**
   ```bash
   # Check database consistency
   python manage.py check --database default
   
   # Verify Redis data
   redis-cli -h redis -p 6379 DBSIZE
   ```

#### Database Recovery
1. **Restore from Backup**
   ```bash
   # Stop application services
   # Restore database from latest backup
   pg_restore -h database -U god_bless_user -d god_bless_db backup.sql
   ```

2. **Verify Data Integrity**
   ```sql
   -- Check table counts
   SELECT schemaname,tablename,n_tup_ins,n_tup_upd,n_tup_del 
   FROM pg_stat_user_tables;
   ```

3. **Run Migrations**
   ```bash
   python manage.py migrate
   ```

#### Configuration Recovery
1. **Backup Current Configuration**
   ```bash
   # Export current environment variables
   # Document current service configuration
   ```

2. **Restore Known Good Configuration**
   ```bash
   # Restore environment variables from backup
   # Revert to last known good Docker Compose configuration
   ```

3. **Test Configuration**
   ```bash
   # Verify all services start correctly
   # Test application functionality
   ```

### Preventive Measures

#### Regular Backups
- Schedule daily database backups
- Backup environment configuration
- Store backups in multiple locations
- Test backup restoration procedures

#### Monitoring Setup
- Configure health check alerts
- Monitor resource usage trends
- Set up log aggregation and analysis
- Implement performance monitoring

#### Documentation Maintenance
- Keep deployment documentation updated
- Document all configuration changes
- Maintain troubleshooting runbooks
- Record lessons learned from incidents

## Getting Help

### Coolify Support Resources
- [Coolify Documentation](https://coolify.io/docs)
- [Coolify Discord Community](https://discord.gg/coolify)
- [GitHub Issues](https://github.com/coollabsio/coolify/issues)

### Application-Specific Support
- Check application logs for specific error messages
- Review Django and React documentation
- Consult database and Redis documentation
- Search for similar issues in community forums

### Emergency Contacts
- Document emergency contact procedures
- Maintain list of key personnel
- Establish escalation procedures
- Keep vendor support contacts updated

Remember: Always test solutions in a staging environment before applying to production, and maintain regular backups to enable quick recovery from any issues.
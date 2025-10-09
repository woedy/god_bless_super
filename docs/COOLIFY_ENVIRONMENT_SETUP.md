# Coolify Environment Variable Setup Checklist

## Overview

This checklist ensures all required environment variables are properly configured in Coolify for the God Bless America platform deployment.

## Pre-Setup Requirements

- [ ] Coolify project created
- [ ] Git repository connected
- [ ] Domain name ready
- [ ] SSL certificate plan determined

## Database Configuration

### PostgreSQL Settings
- [ ] `POSTGRES_DB` - Database name (e.g., `god_bless_db`)
- [ ] `POSTGRES_USER` - Database username (e.g., `god_bless_user`)
- [ ] `POSTGRES_PASSWORD` - Strong database password (min 16 chars, mixed case, numbers, symbols)
- [ ] `DATABASE_URL` - Full PostgreSQL connection string
  ```
  postgresql://god_bless_user:<password>@database:5432/god_bless_db
  ```

### Database Security
- [ ] Password meets complexity requirements
- [ ] Database name doesn't contain sensitive information
- [ ] Connection string uses internal Docker network names

## Django Backend Configuration

### Core Django Settings
- [ ] `SECRET_KEY` - Django secret key (50+ random characters)
  ```bash
  # Generate with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
  ```
- [ ] `DEBUG` - Set to `False` for production
- [ ] `ALLOWED_HOSTS` - Comma-separated list of allowed hostnames
  ```
  yourdomain.com,www.yourdomain.com,localhost
  ```

### CORS Configuration
- [ ] `CORS_ALLOWED_ORIGINS` - Allowed frontend origins
  ```
  https://yourdomain.com,https://www.yourdomain.com
  ```
- [ ] `CORS_ALLOW_CREDENTIALS` - Set to `True` if using authentication cookies

### Security Headers
- [ ] `SECURE_SSL_REDIRECT` - Set to `True` to force HTTPS
- [ ] `SECURE_PROXY_SSL_HEADER` - Set to `HTTP_X_FORWARDED_PROTO,https`
- [ ] `SESSION_COOKIE_SECURE` - Set to `True` for HTTPS-only session cookies
- [ ] `CSRF_COOKIE_SECURE` - Set to `True` for HTTPS-only CSRF cookies
- [ ] `SECURE_HSTS_SECONDS` - Set to `31536000` (1 year) for HSTS
- [ ] `SECURE_CONTENT_TYPE_NOSNIFF` - Set to `True`
- [ ] `SECURE_BROWSER_XSS_FILTER` - Set to `True`

## Redis Configuration

### Redis Connection
- [ ] `REDIS_URL` - Redis connection URL
  ```
  redis://redis:6379/0
  ```

### Celery Configuration
- [ ] `CELERY_BROKER_URL` - Celery message broker URL (same as Redis URL)
- [ ] `CELERY_RESULT_BACKEND` - Celery result backend URL (same as Redis URL)
- [ ] `CELERY_ACCEPT_CONTENT` - Set to `json` for security
- [ ] `CELERY_TASK_SERIALIZER` - Set to `json`
- [ ] `CELERY_RESULT_SERIALIZER` - Set to `json`

### Session Configuration
- [ ] `SESSION_ENGINE` - Set to `django.contrib.sessions.backends.cache`
- [ ] `SESSION_CACHE_ALIAS` - Set to `default` (Redis cache)

## Email Configuration (Optional)

### SMTP Settings
- [ ] `EMAIL_BACKEND` - Set to `django.core.mail.backends.smtp.EmailBackend`
- [ ] `EMAIL_HOST` - SMTP server hostname (e.g., `smtp.gmail.com`)
- [ ] `EMAIL_PORT` - SMTP port (587 for TLS, 465 for SSL)
- [ ] `EMAIL_USE_TLS` - Set to `True` for TLS encryption
- [ ] `EMAIL_HOST_USER` - SMTP username/email
- [ ] `EMAIL_HOST_PASSWORD` - SMTP password or app password
- [ ] `DEFAULT_FROM_EMAIL` - Default sender email address

### Email Security
- [ ] Using app-specific passwords for Gmail/Outlook
- [ ] SMTP credentials are not exposed in logs
- [ ] Email settings tested with test email

## Frontend Configuration

### React/Vite Settings
- [ ] `VITE_API_BASE_URL` - Backend API base URL
  ```
  https://yourdomain.com/api
  ```
- [ ] `VITE_WS_BASE_URL` - WebSocket base URL (if using WebSockets)
  ```
  wss://yourdomain.com/ws
  ```

### Frontend Security
- [ ] API URLs use HTTPS in production
- [ ] WebSocket URLs use WSS in production
- [ ] No sensitive data in frontend environment variables

## File Storage Configuration

### Media Files
- [ ] `MEDIA_URL` - Media files URL path (e.g., `/media/`)
- [ ] `MEDIA_ROOT` - Media files storage path (e.g., `/app/media/`)

### Static Files
- [ ] `STATIC_URL` - Static files URL path (e.g., `/static/`)
- [ ] `STATIC_ROOT` - Static files collection path (e.g., `/app/staticfiles/`)

### File Upload Security
- [ ] `FILE_UPLOAD_MAX_MEMORY_SIZE` - Maximum file size in memory
- [ ] `DATA_UPLOAD_MAX_MEMORY_SIZE` - Maximum request size
- [ ] `FILE_UPLOAD_PERMISSIONS` - File permissions (e.g., `0o644`)

## Logging Configuration

### Log Levels
- [ ] `LOG_LEVEL` - Application log level (`INFO` for production)
- [ ] `DJANGO_LOG_LEVEL` - Django framework log level
- [ ] `SQL_LOG_LEVEL` - Database query log level (`WARNING` for production)

### Log Destinations
- [ ] `LOG_FILE` - Log file path (if file logging enabled)
- [ ] `SYSLOG_ADDRESS` - Syslog server address (if using syslog)

## Performance Configuration

### Database Performance
- [ ] `DB_CONN_MAX_AGE` - Database connection max age (e.g., `600`)
- [ ] `DB_CONN_HEALTH_CHECKS` - Set to `True` for connection health checks

### Cache Configuration
- [ ] `CACHE_TTL` - Default cache timeout in seconds
- [ ] `CACHE_KEY_PREFIX` - Cache key prefix for multi-tenant setups

### Celery Performance
- [ ] `CELERY_WORKER_CONCURRENCY` - Number of worker processes
- [ ] `CELERY_TASK_SOFT_TIME_LIMIT` - Soft task timeout
- [ ] `CELERY_TASK_TIME_LIMIT` - Hard task timeout

## Monitoring Configuration

### Health Checks
- [ ] `HEALTH_CHECK_TIMEOUT` - Health check timeout in seconds
- [ ] `HEALTH_CHECK_INTERVAL` - Health check interval

### Metrics (Optional)
- [ ] `PROMETHEUS_METRICS_ENABLED` - Enable Prometheus metrics
- [ ] `METRICS_PORT` - Metrics endpoint port

## Environment-Specific Settings

### Development vs Production
- [ ] All `DEBUG` flags set to `False`
- [ ] All security settings enabled
- [ ] Performance optimizations applied
- [ ] Monitoring and logging configured

### Staging Environment (Optional)
- [ ] Separate database for staging
- [ ] Staging-specific domain configuration
- [ ] Test data and fixtures configured

## Security Validation

### Secrets Management
- [ ] All passwords and keys are properly secured in Coolify secrets
- [ ] No sensitive data in plain text environment variables
- [ ] Regular rotation schedule for secrets established

### Access Control
- [ ] Database access restricted to application services
- [ ] Redis access restricted to application services
- [ ] Admin interfaces protected with strong authentication

### Network Security
- [ ] Internal service communication uses Docker networks
- [ ] External access limited to necessary ports only
- [ ] SSL/TLS configured for all external communications

## Testing Checklist

### Environment Variable Testing
- [ ] All services start successfully with configured variables
- [ ] Database connections work correctly
- [ ] Redis connections work correctly
- [ ] Email sending works (if configured)
- [ ] File uploads work correctly
- [ ] WebSocket connections work (if applicable)

### Security Testing
- [ ] HTTPS redirect works correctly
- [ ] Security headers are present in responses
- [ ] CORS policy works as expected
- [ ] Authentication and authorization work correctly

### Performance Testing
- [ ] Application responds within acceptable time limits
- [ ] Database queries are optimized
- [ ] Cache hit rates are acceptable
- [ ] Background tasks process correctly

## Post-Configuration Steps

### Documentation
- [ ] Document any custom environment variables
- [ ] Create backup of environment configuration
- [ ] Document any special configuration requirements

### Monitoring Setup
- [ ] Configure alerts for critical environment variables
- [ ] Set up monitoring for service health
- [ ] Configure log aggregation and analysis

### Maintenance
- [ ] Schedule regular review of environment configuration
- [ ] Plan for secret rotation
- [ ] Document rollback procedures

## Common Environment Variable Patterns

### Boolean Values
```bash
# Use string values for boolean environment variables
DEBUG=False
SECURE_SSL_REDIRECT=True
EMAIL_USE_TLS=True
```

### List Values
```bash
# Use comma-separated values for lists
ALLOWED_HOSTS=domain1.com,domain2.com,localhost
CORS_ALLOWED_ORIGINS=https://domain1.com,https://domain2.com
```

### URL Values
```bash
# Ensure URLs include protocol and proper formatting
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://host:port/db
VITE_API_BASE_URL=https://api.domain.com
```

## Troubleshooting Environment Issues

### Common Problems
- [ ] Service fails to start: Check required variables are set
- [ ] Database connection fails: Verify DATABASE_URL format
- [ ] Redis connection fails: Check REDIS_URL and service availability
- [ ] CORS errors: Verify CORS_ALLOWED_ORIGINS includes frontend domain
- [ ] SSL issues: Check security header configuration

### Debugging Steps
1. Check Coolify environment variable interface
2. Verify variable names match application expectations
3. Check service logs for specific error messages
4. Test individual service connections
5. Validate environment variable formats

## Resources

- [Django Settings Reference](https://docs.djangoproject.com/en/stable/ref/settings/)
- [Coolify Environment Variables](https://coolify.io/docs/environment-variables)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [Security Best Practices](https://docs.djangoproject.com/en/stable/topics/security/)
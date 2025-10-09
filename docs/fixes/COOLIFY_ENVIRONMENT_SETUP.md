# Coolify Environment Setup Guide

This guide provides step-by-step instructions for configuring environment variables in Coolify for the God Bless America platform deployment.

## Prerequisites

- Coolify instance running on Ubuntu server
- Domain name configured and pointing to your server
- SSL certificate (Let's Encrypt recommended)

## Environment Variables Configuration

### 1. Access Coolify Environment Settings

1. Log into your Coolify dashboard
2. Navigate to your project
3. Go to **Environment Variables** section
4. Add the following variables:

### 2. Required Environment Variables

#### Database Configuration
```
POSTGRES_DB=god_bless_db
POSTGRES_USER=god_bless_user
POSTGRES_PASSWORD=<generate-secure-password>
POSTGRES_HOST=database
POSTGRES_PORT=5432
USE_POSTGRES=true
```

#### Security Configuration
```
SECRET_KEY=<generate-50-character-secret-key>
DEBUG=false
ENVIRONMENT=production
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Redis Configuration
```
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<generate-secure-redis-password>
```

#### Celery Configuration
```
CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD}@redis:6379/0
```

### 3. Optional Environment Variables

#### Email Configuration (SMTP)
```
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=<your-app-password>
EMAIL_PORT=587
EMAIL_USE_TLS=true
DEFAULT_FROM_EMAIL=God Bless Platform <noreply@yourdomain.com>
```

#### Frontend Configuration
```
VITE_API_URL=https://yourdomain.com/api
VITE_WS_URL=wss://yourdomain.com/ws
VITE_APP_NAME=God Bless America Platform
VITE_VERSION=1.0.0
VITE_ENVIRONMENT=production
```

#### SSL/Security Configuration
```
SECURE_SSL_REDIRECT=true
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true
USE_TLS=true
```

#### Performance Configuration
```
CACHE_TTL=300
DB_CONN_MAX_AGE=300
DB_CONN_HEALTH_CHECKS=true
```

#### Logging Configuration
```
LOG_LEVEL=INFO
DJANGO_LOG_LEVEL=INFO
CELERY_LOG_LEVEL=INFO
```

#### Monitoring Configuration
```
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30
FLOWER_USER=admin
FLOWER_PASSWORD=<generate-secure-password>
```

#### Backup Configuration
```
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE=0 2 * * *
```

### 4. Initial Setup Variables (One-time use)

```
CREATE_SUPERUSER=true
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@yourdomain.com
DJANGO_SUPERUSER_PASSWORD=<secure-admin-password>
LOAD_INITIAL_DATA=false
```

**Important**: Set `CREATE_SUPERUSER=false` after the first successful deployment.

## Security Best Practices

### 1. Secret Generation

Generate secure secrets using:
```bash
# Django Secret Key (50+ characters)
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Or use openssl
openssl rand -base64 50

# Database/Redis passwords
openssl rand -base64 32
```

### 2. Coolify Secret Management

1. Use Coolify's **Secret** feature for sensitive values:
   - `SECRET_KEY`
   - `POSTGRES_PASSWORD`
   - `REDIS_PASSWORD`
   - `EMAIL_HOST_PASSWORD`
   - `DJANGO_SUPERUSER_PASSWORD`

2. Reference secrets in environment variables:
   ```
   SECRET_KEY=${SECRET_DJANGO_KEY}
   POSTGRES_PASSWORD=${SECRET_DB_PASSWORD}
   ```

### 3. Domain Configuration

Replace `yourdomain.com` with your actual domain in:
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `VITE_API_URL`
- `VITE_WS_URL`

## Validation and Testing

### 1. Environment Validation

The application includes built-in environment validation. Check logs for:
```
Environment configuration validated successfully for production environment
```

### 2. Health Checks

After deployment, verify:
- Database connectivity: `https://yourdomain.com/health/db/`
- Redis connectivity: `https://yourdomain.com/health/redis/`
- Overall health: `https://yourdomain.com/health/`

### 3. Common Issues

#### Missing Required Variables
```
Environment configuration error: Required environment variable 'SECRET_KEY' is not set
```
**Solution**: Add the missing variable in Coolify environment settings.

#### Database Connection Issues
```
django.db.utils.OperationalError: could not connect to server
```
**Solution**: Verify database service is running and credentials are correct.

#### Redis Connection Issues
```
redis.exceptions.ConnectionError: Error connecting to Redis
```
**Solution**: Check Redis service status and password configuration.

## Environment Variable Reference

### Variable Types

- **String**: Text values (e.g., `SECRET_KEY`, `EMAIL_HOST`)
- **Boolean**: `true`/`false` values (e.g., `DEBUG`, `USE_TLS`)
- **Integer**: Numeric values (e.g., `REDIS_PORT`, `CACHE_TTL`)
- **List**: Comma-separated values (e.g., `ALLOWED_HOSTS`)

### Environment-Specific Defaults

| Variable | Development | Production |
|----------|-------------|------------|
| `DEBUG` | `true` | `false` |
| `SECURE_SSL_REDIRECT` | `false` | `true` |
| `SESSION_COOKIE_SECURE` | `false` | `true` |
| `CORS_ALLOW_ALL_ORIGINS` | `true` | `false` |

## Deployment Checklist

- [ ] All required variables configured
- [ ] Secrets properly set in Coolify
- [ ] Domain names updated in configuration
- [ ] SSL certificate configured
- [ ] Database service running
- [ ] Redis service running
- [ ] Health checks passing
- [ ] Superuser created (then disable `CREATE_SUPERUSER`)
- [ ] Email configuration tested
- [ ] Backup configuration verified

## Support

For issues with environment configuration:

1. Check Coolify application logs
2. Verify environment variable syntax
3. Test individual service connectivity
4. Review Django application logs for validation errors

## Security Notes

- Never commit sensitive values to version control
- Use Coolify's secret management for passwords and keys
- Regularly rotate secrets and passwords
- Monitor logs for security events
- Keep environment variables documentation updated
# Coolify Deployment Guide for God Bless America Platform

## Overview

This guide provides step-by-step instructions for deploying the God Bless America platform on Coolify, a self-hosted deployment platform. The platform consists of multiple services including Django backend, React frontends, PostgreSQL database, Redis cache, and Celery workers.

## Prerequisites

- Coolify instance running on Ubuntu server
- Domain name configured and pointing to your server
- SSL certificate capability (Let's Encrypt recommended)
- Minimum server requirements: 4GB RAM, 2 CPU cores, 50GB storage

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Project Creation](#project-creation)
3. [Environment Configuration](#environment-configuration)
4. [Service Deployment](#service-deployment)
5. [Domain and SSL Setup](#domain-and-ssl-setup)
6. [Health Check Verification](#health-check-verification)
7. [Post-Deployment Tasks](#post-deployment-tasks)
8. [Troubleshooting](#troubleshooting)

## Initial Setup

### 1. Access Coolify Dashboard

1. Navigate to your Coolify instance URL
2. Log in with your administrator credentials
3. Ensure your server is properly connected and showing as "Online"

### 2. Prepare Repository Access

1. Ensure your Git repository is accessible to Coolify
2. If using private repository, configure SSH keys or access tokens
3. Note the repository URL for later use

## Project Creation

### 1. Create New Project

1. Click "New Project" in the Coolify dashboard
2. Enter project details:
   - **Name**: `god-bless-america`
   - **Description**: `Phone number management and validation platform`
3. Click "Create Project"

### 2. Add Git Repository

1. In the project dashboard, click "New Resource"
2. Select "Git Repository"
3. Configure repository settings:
   - **Repository URL**: Your Git repository URL
   - **Branch**: `main` (or your production branch)
   - **Build Pack**: `Docker Compose`
4. Click "Save"

## Environment Configuration

### 1. Database Configuration

Navigate to the Environment Variables section and add the following database variables:

```bash
# Database Configuration
POSTGRES_DB=god_bless_db
POSTGRES_USER=god_bless_user
POSTGRES_PASSWORD=<generate-secure-password>
DATABASE_URL=postgresql://god_bless_user:<password>@database:5432/god_bless_db
```

### 2. Django Backend Configuration

Add the following Django-specific environment variables:

```bash
# Django Configuration
SECRET_KEY=<generate-django-secret-key>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security Settings
SECURE_SSL_REDIRECT=True
SECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,https
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

### 3. Redis Configuration

```bash
# Redis Configuration
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

### 4. Email Configuration (Optional)

```bash
# Email Settings
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=<app-password>
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

### 5. Frontend Configuration

```bash
# Frontend Configuration
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_WS_BASE_URL=wss://yourdomain.com/ws
```

## Service Deployment

### 1. Configure Docker Compose

Ensure your `docker-compose.yml` file is properly configured for Coolify deployment. The file should be in your repository root.

### 2. Deploy Services

1. In the Coolify project dashboard, click "Deploy"
2. Select the deployment configuration:
   - **Environment**: Production
   - **Docker Compose File**: `docker-compose.yml`
3. Click "Start Deployment"

### 3. Monitor Deployment Progress

1. Watch the deployment logs in real-time
2. Verify each service starts successfully:
   - Database (PostgreSQL)
   - Redis Cache
   - Django Backend
   - Celery Workers
   - Frontend Services
   - Nginx Proxy

### 4. Verify Service Health

After deployment completes, check service health:

1. Navigate to the "Services" tab
2. Verify all services show "Healthy" status
3. Check individual service logs for any errors

## Domain and SSL Setup

### 1. Configure Domain

1. In the project settings, navigate to "Domains"
2. Click "Add Domain"
3. Enter your domain name: `yourdomain.com`
4. Configure the following settings:
   - **Port**: 80 (HTTP) and 443 (HTTPS)
   - **Path**: `/`
   - **Service**: `nginx` (your reverse proxy service)

### 2. Enable SSL Certificate

1. In the domain configuration, enable "SSL Certificate"
2. Select "Let's Encrypt" for automatic certificate management
3. Click "Generate Certificate"
4. Wait for certificate generation to complete

### 3. Configure SSL Redirect

1. Enable "Force HTTPS Redirect"
2. Verify SSL certificate is properly installed
3. Test HTTPS access to your domain

### 4. Configure Subdomains (Optional)

If using subdomains for different services:

1. Add additional domains for each subdomain
2. Configure appropriate service routing
3. Generate SSL certificates for each subdomain

## Health Check Verification

### 1. Application Health Checks

Verify the following endpoints are responding correctly:

```bash
# Backend Health Check
curl https://yourdomain.com/health/

# API Health Check
curl https://yourdomain.com/api/health/

# Frontend Health Check
curl https://yourdomain.com/
```

### 2. Database Connectivity

1. Access the Django admin interface: `https://yourdomain.com/admin/`
2. Verify database connectivity by logging in
3. Check that migrations have been applied correctly

### 3. Redis Connectivity

Verify Redis is working by checking:
1. Session storage functionality
2. Celery task processing
3. WebSocket connections (if applicable)

### 4. Background Tasks

Verify Celery workers are processing tasks:
1. Check Celery worker logs
2. Test background task functionality
3. Verify scheduled tasks are running

## Post-Deployment Tasks

### 1. Create Django Superuser

Access the Django backend container and create a superuser:

1. In Coolify, navigate to the backend service
2. Open the container terminal
3. Run the following command:
```bash
python manage.py createsuperuser
```

### 2. Load Initial Data (Optional)

If you have initial data fixtures:

```bash
python manage.py loaddata initial_data.json
```

### 3. Configure Monitoring

1. Set up log monitoring in Coolify
2. Configure alert notifications
3. Set up backup schedules for database

### 4. Performance Optimization

1. Verify resource limits are appropriate
2. Monitor CPU and memory usage
3. Adjust scaling settings if needed

## Security Checklist

After deployment, verify the following security measures:

- [ ] HTTPS is enforced for all traffic
- [ ] SSL certificates are valid and auto-renewing
- [ ] Database credentials are secure and not exposed
- [ ] Django SECRET_KEY is properly set
- [ ] CORS origins are properly configured
- [ ] Security headers are properly set
- [ ] Admin interface is accessible only to authorized users
- [ ] File upload restrictions are in place
- [ ] Rate limiting is configured

## Backup Configuration

### 1. Database Backups

Configure automated database backups:

1. In Coolify, navigate to the database service
2. Enable automatic backups
3. Set backup retention policy
4. Test backup restoration process

### 2. File Backups

Configure backups for uploaded files and media:

1. Set up volume backups for media storage
2. Configure backup retention policies
3. Test file restoration procedures

## Monitoring and Maintenance

### 1. Log Monitoring

1. Configure log aggregation in Coolify
2. Set up log retention policies
3. Configure log-based alerts

### 2. Performance Monitoring

1. Monitor resource usage regularly
2. Set up performance alerts
3. Review and optimize slow queries

### 3. Security Updates

1. Enable automatic security updates
2. Regularly review security logs
3. Update dependencies regularly

## Next Steps

After successful deployment:

1. Test all application functionality
2. Configure monitoring and alerting
3. Set up backup and recovery procedures
4. Document any custom configurations
5. Train team members on Coolify management

## Support and Resources

- [Coolify Documentation](https://coolify.io/docs)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

For issues specific to this deployment, refer to the [Troubleshooting Guide](COOLIFY_TROUBLESHOOTING_GUIDE.md).
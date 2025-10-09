# Coolify Deployment Guide for God Bless America Platform

This guide provides step-by-step instructions for deploying the God Bless America platform on Coolify using the optimized Docker Compose configuration.

## Prerequisites

- Coolify instance running on Ubuntu server
- Domain name configured and pointing to your server
- SSL certificate management (Let's Encrypt) configured in Coolify
- Sufficient server resources (minimum 4GB RAM, 2 CPU cores)

## Deployment Steps

### 1. Project Setup in Coolify

1. **Create New Project**
   - Log into your Coolify dashboard
   - Click "New Project"
   - Name: `god-bless-america-platform`
   - Description: `Phone number management and validation platform`

2. **Add Git Repository**
   - Connect your Git repository containing the project
   - Select the main/master branch
   - Set build pack to "Docker Compose"

### 2. Environment Configuration

Copy the contents of `.env.production.example` and configure the following critical variables in Coolify:

#### Critical Security Settings (REQUIRED)
```env
SECRET_KEY=your-super-secret-key-here-change-this-in-production
POSTGRES_PASSWORD=your-secure-database-password-here
REDIS_PASSWORD=your-secure-redis-password-here
```

#### Application Configuration
```env
ENVIRONMENT=production
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### Frontend Configuration
```env
VITE_API_URL=/api
VITE_WS_URL=/ws
VITE_APP_NAME=God Bless America Platform
VITE_VERSION=1.0.0
VITE_ENVIRONMENT=production
```

#### Email Configuration (Optional)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_PORT=587
EMAIL_USE_TLS=True
```

### 3. Domain and SSL Configuration

1. **Domain Setup**
   - In Coolify, go to your project settings
   - Add your domain name
   - Enable SSL/TLS with Let's Encrypt
   - Configure automatic certificate renewal

2. **Port Configuration**
   - Coolify will automatically handle port mapping
   - The application exposes ports 80 and 443 through Nginx
   - All internal services communicate through Docker networks

### 4. Deployment Configuration

1. **Docker Compose File**
   - Ensure `docker-compose.yml` is in your repository root
   - Coolify will automatically detect and use this file
   - No additional configuration needed

2. **Build Settings**
   - Build Command: `docker-compose build`
   - Start Command: `docker-compose up -d`
   - Health Check URL: `/api/health/`

### 5. Initial Deployment

1. **Deploy Application**
   - Click "Deploy" in Coolify dashboard
   - Monitor the build logs for any issues
   - Wait for all services to start (approximately 5-10 minutes)

2. **Verify Deployment**
   - Check service status in Coolify dashboard
   - All services should show as "healthy"
   - Access your domain to verify the application is running

### 6. Post-Deployment Setup

#### Create Superuser (First Time Only)
1. Set environment variable: `CREATE_SUPERUSER=true`
2. Configure superuser credentials:
   ```env
   DJANGO_SUPERUSER_USERNAME=admin
   DJANGO_SUPERUSER_EMAIL=admin@yourdomain.com
   DJANGO_SUPERUSER_PASSWORD=secure-admin-password
   ```
3. Redeploy the application
4. After successful deployment, set `CREATE_SUPERUSER=false`

#### Database Migrations
- Migrations run automatically on container startup
- No manual intervention required
- Check backend service logs if issues occur

### 7. Monitoring and Maintenance

#### Service Health Monitoring
- All services include health checks
- Monitor through Coolify dashboard
- Services automatically restart on failure

#### Log Access
- Access logs through Coolify interface
- Logs are centralized and persistent
- Available services: backend, nginx, celery_worker, celery_beat

#### Optional Monitoring (Advanced)
Enable Flower for Celery monitoring:
1. Set environment variables:
   ```env
   FLOWER_USER=admin
   FLOWER_PASSWORD=secure-flower-password
   ```
2. Access Flower at: `https://yourdomain.com/flower/`

### 8. Backup and Recovery

#### Automated Backups
- Database backups are stored in persistent volumes
- Configure external backup storage for production
- Test backup restoration procedures regularly

#### Data Persistence
- All critical data is stored in named Docker volumes
- Volumes persist across container restarts and updates
- Managed automatically by Coolify

## Troubleshooting

### Common Issues

#### 1. Services Not Starting
- Check environment variables are properly set
- Verify domain configuration
- Review service logs in Coolify dashboard

#### 2. Database Connection Issues
- Ensure `POSTGRES_PASSWORD` is set
- Check database service health status
- Verify network connectivity between services

#### 3. SSL Certificate Issues
- Verify domain DNS configuration
- Check Let's Encrypt certificate status
- Ensure ports 80 and 443 are accessible

#### 4. Frontend Not Loading
- Check `ALLOWED_HOSTS` includes your domain
- Verify `CORS_ALLOWED_ORIGINS` configuration
- Check Nginx service status and logs

### Health Check Endpoints

- **Backend API**: `https://yourdomain.com/api/health/`
- **Overall Status**: Monitor through Coolify dashboard
- **Individual Services**: Check service logs for detailed status

### Performance Optimization

#### Resource Limits
- Services include predefined resource limits
- Adjust based on your server capacity
- Monitor resource usage through Coolify

#### Scaling
- Horizontal scaling available for worker services
- Vertical scaling through resource limit adjustments
- Configure auto-scaling based on load

## Security Considerations

### Network Security
- Internal services communicate through isolated Docker networks
- Only Nginx exposes ports to the internet
- Database and Redis are not directly accessible

### Data Security
- All sensitive data encrypted in transit (HTTPS)
- Database credentials managed through environment variables
- Regular security updates through container image updates

### Access Control
- Admin interface protected by Django authentication
- API endpoints secured with token-based authentication
- Role-based access control implemented

## Maintenance Schedule

### Regular Tasks
- **Weekly**: Review service logs and performance metrics
- **Monthly**: Update container images and security patches
- **Quarterly**: Review and test backup/recovery procedures
- **Annually**: Security audit and dependency updates

### Update Procedure
1. Test updates in staging environment
2. Schedule maintenance window
3. Deploy updates through Coolify
4. Verify all services are healthy
5. Test critical functionality

## Support and Documentation

### Additional Resources
- [Coolify Documentation](https://coolify.io/docs)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Django Deployment Guide](https://docs.djangoproject.com/en/stable/howto/deployment/)

### Getting Help
- Check service logs first
- Review this deployment guide
- Contact system administrator for server-specific issues
- Refer to application documentation for feature-specific problems

---

**Note**: This deployment configuration is optimized for production use with Coolify. All services include proper health checks, resource limits, and security configurations for reliable operation.
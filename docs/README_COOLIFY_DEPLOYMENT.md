# Coolify Deployment Documentation

## Overview

This directory contains comprehensive documentation for deploying the God Bless America platform on Coolify, a self-hosted deployment platform. The documentation is organized to guide you through the entire deployment process from initial setup to troubleshooting.

## Documentation Structure

### 📋 Quick Start
- **[COOLIFY_DEPLOYMENT_CHECKLIST.md](../COOLIFY_DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment checklist (auto-generated)
- **[Deployment Setup Scripts](#deployment-scripts)** - Automated setup scripts for quick configuration

### 📖 Comprehensive Guides
- **[COOLIFY_DEPLOYMENT_GUIDE.md](COOLIFY_DEPLOYMENT_GUIDE.md)** - Complete deployment guide with detailed instructions
- **[COOLIFY_ENVIRONMENT_SETUP.md](COOLIFY_ENVIRONMENT_SETUP.md)** - Environment variable configuration checklist
- **[COOLIFY_DOMAIN_SSL_SETUP.md](COOLIFY_DOMAIN_SSL_SETUP.md)** - Domain and SSL certificate configuration
- **[COOLIFY_TROUBLESHOOTING_GUIDE.md](COOLIFY_TROUBLESHOOTING_GUIDE.md)** - Comprehensive troubleshooting guide

## Getting Started

### Prerequisites

Before starting the deployment process, ensure you have:

- **Coolify Instance**: Running on Ubuntu server with minimum 4GB RAM, 2 CPU cores, 50GB storage
- **Domain Name**: Purchased and ready for DNS configuration
- **Git Repository**: Code accessible to Coolify (public or with proper access tokens)
- **Basic Knowledge**: Understanding of Docker, environment variables, and DNS configuration

### Quick Setup Process

1. **Run Setup Script** (Recommended)
   ```bash
   # Linux/Mac
   ./scripts/coolify-deployment-setup.sh
   
   # Windows PowerShell
   .\scripts\coolify-deployment-setup.ps1
   ```

2. **Follow Generated Checklist**
   - Review the auto-generated `COOLIFY_DEPLOYMENT_CHECKLIST.md`
   - Update the `.env.production` file with your domain and settings

3. **Configure Coolify**
   - Create new project in Coolify
   - Connect Git repository
   - Configure environment variables
   - Set up domain and SSL

4. **Deploy and Verify**
   - Initiate deployment
   - Verify all services are healthy
   - Test application functionality

## Deployment Scripts

### Automated Setup Scripts

The project includes automated setup scripts to streamline the deployment preparation:

#### Linux/Mac Script
```bash
./scripts/coolify-deployment-setup.sh
```

**Features:**
- Validates Docker Compose configuration
- Generates secure environment variables
- Creates deployment checklist
- Checks required files and dependencies

#### Windows PowerShell Script
```powershell
.\scripts\coolify-deployment-setup.ps1
```

**Features:**
- Same functionality as Linux script
- Windows-compatible commands
- PowerShell-native error handling
- Force overwrite option with `-Force` parameter

### What the Scripts Generate

1. **`.env.production`** - Production environment configuration with:
   - Secure database credentials
   - Django secret key
   - Redis configuration
   - Security settings
   - Performance optimizations

2. **`COOLIFY_DEPLOYMENT_CHECKLIST.md`** - Step-by-step checklist covering:
   - Pre-deployment requirements
   - Coolify configuration steps
   - Post-deployment verification
   - Security validation

## Documentation Guide

### For First-Time Deployments

1. **Start Here**: [COOLIFY_DEPLOYMENT_GUIDE.md](COOLIFY_DEPLOYMENT_GUIDE.md)
   - Complete walkthrough of the deployment process
   - Screenshots and detailed explanations
   - Best practices and recommendations

2. **Environment Setup**: [COOLIFY_ENVIRONMENT_SETUP.md](COOLIFY_ENVIRONMENT_SETUP.md)
   - Comprehensive environment variable checklist
   - Security considerations
   - Performance tuning options

3. **Domain Configuration**: [COOLIFY_DOMAIN_SSL_SETUP.md](COOLIFY_DOMAIN_SSL_SETUP.md)
   - DNS configuration instructions
   - SSL certificate setup
   - Advanced domain configurations

### For Troubleshooting

1. **Primary Resource**: [COOLIFY_TROUBLESHOOTING_GUIDE.md](COOLIFY_TROUBLESHOOTING_GUIDE.md)
   - Common deployment issues and solutions
   - Diagnostic commands and techniques
   - Recovery procedures

2. **Specific Issues**:
   - Service startup problems
   - Database connection issues
   - SSL and domain problems
   - Performance optimization

### For Maintenance

1. **Regular Tasks**:
   - Monitor service health
   - Review security settings
   - Update environment variables
   - Backup verification

2. **Updates and Changes**:
   - Application updates
   - Configuration changes
   - Scaling considerations

## Platform Architecture

The God Bless America platform consists of multiple services that work together:

### Core Services
- **Django Backend** - Main application server with REST API
- **PostgreSQL Database** - Primary data storage
- **Redis Cache** - Caching and message broker
- **Celery Workers** - Background task processing
- **Celery Beat** - Scheduled task management

### Frontend Services
- **React Frontend (Main)** - Primary user interface
- **React Frontend (Platform)** - Additional platform interface
- **Nginx Proxy** - Reverse proxy and static file serving

### Supporting Services
- **Health Checks** - Service monitoring and health validation
- **Logging** - Centralized log collection and analysis

## Environment Configuration

### Required Environment Variables

The platform requires several categories of environment variables:

#### Database Configuration
- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Database username
- `POSTGRES_PASSWORD` - Database password
- `DATABASE_URL` - Complete database connection string

#### Django Configuration
- `SECRET_KEY` - Django secret key (50+ characters)
- `DEBUG` - Debug mode (False for production)
- `ALLOWED_HOSTS` - Allowed hostnames
- `CORS_ALLOWED_ORIGINS` - CORS configuration

#### Security Settings
- `SECURE_SSL_REDIRECT` - Force HTTPS redirect
- `SESSION_COOKIE_SECURE` - Secure session cookies
- `CSRF_COOKIE_SECURE` - Secure CSRF cookies

#### Redis Configuration
- `REDIS_URL` - Redis connection string
- `CELERY_BROKER_URL` - Celery message broker
- `CELERY_RESULT_BACKEND` - Celery result storage

### Security Considerations

1. **Secret Management**
   - Use Coolify's secret management features
   - Never commit secrets to version control
   - Rotate secrets regularly

2. **Network Security**
   - Use internal Docker networks for service communication
   - Limit external port exposure
   - Configure proper firewall rules

3. **SSL/TLS Configuration**
   - Use Let's Encrypt for automatic certificate management
   - Enable HSTS headers
   - Configure secure cipher suites

## Performance Optimization

### Resource Management
- Configure appropriate resource limits for containers
- Monitor CPU and memory usage
- Implement horizontal scaling for high-demand services

### Caching Strategy
- Use Redis for application caching
- Configure Nginx for static file caching
- Implement database query optimization

### Database Optimization
- Configure connection pooling
- Optimize database queries
- Implement proper indexing

## Monitoring and Maintenance

### Health Monitoring
- Configure health check endpoints for all services
- Set up automated monitoring and alerting
- Monitor resource usage and performance metrics

### Backup and Recovery
- Implement automated database backups
- Test backup restoration procedures
- Document recovery processes

### Log Management
- Configure centralized logging
- Set up log retention policies
- Implement log analysis and alerting

## Support and Resources

### Official Documentation
- [Coolify Documentation](https://coolify.io/docs)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

### Community Support
- [Coolify Discord Community](https://discord.gg/coolify)
- [Coolify GitHub Issues](https://github.com/coollabsio/coolify/issues)

### Emergency Procedures
- Document emergency contact procedures
- Maintain escalation procedures
- Keep vendor support contacts updated

## Contributing to Documentation

### Updating Documentation
When making changes to the deployment process:

1. Update relevant documentation files
2. Test changes in staging environment
3. Update troubleshooting guide with new issues/solutions
4. Regenerate deployment checklist if needed

### Documentation Standards
- Use clear, step-by-step instructions
- Include code examples and screenshots where helpful
- Maintain consistent formatting and structure
- Test all procedures before documenting

## Version History

- **v1.0** - Initial Coolify deployment documentation
- **v1.1** - Added automated setup scripts
- **v1.2** - Enhanced troubleshooting guide
- **v1.3** - Added domain and SSL configuration guide

## License

This documentation is part of the God Bless America platform and follows the same licensing terms as the main project.

---

**Need Help?** Start with the [Deployment Guide](COOLIFY_DEPLOYMENT_GUIDE.md) or run the setup script for automated configuration assistance.
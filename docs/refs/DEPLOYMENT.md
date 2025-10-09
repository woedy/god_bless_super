# God Bless Platform - Production Deployment Guide

This guide covers deploying the God Bless platform in production environments, both locally and on remote servers.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Production Deployment](#local-production-deployment)
4. [Remote Server Deployment](#remote-server-deployment)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Monitoring Setup](#monitoring-setup)
7. [Backup and Restore](#backup-and-restore)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04+ (recommended) or any Linux distribution
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Memory**: Minimum 4GB RAM (8GB+ recommended)
- **Storage**: Minimum 20GB free space
- **CPU**: 2+ cores recommended

### Software Installation

#### Install Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

#### Verify Installation

```bash
docker --version
docker compose version
```

## Environment Configuration

### 1. Create Environment File

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` file with your production values:

```bash
# CRITICAL: Change these values!
SECRET_KEY=your-very-long-random-secret-key-here
POSTGRES_PASSWORD=your-secure-database-password
REDIS_PASSWORD=your-secure-redis-password

# Domain configuration
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Email configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-specific-password
EMAIL_PORT=587
EMAIL_USE_TLS=True

# Frontend API URL
VITE_API_URL=https://your-domain.com/api

# Optional: Monitoring
FLOWER_USER=admin
FLOWER_PASSWORD=secure-flower-password
```

### 3. Generate Secret Key

Generate a secure Django secret key:

```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

## Local Production Deployment

### Quick Start

```bash
# Make deployment script executable
chmod +x deploy.sh

# Deploy the application
./deploy.sh deploy
```

### Manual Deployment Steps

If you prefer manual deployment:

```bash
# 1. Build images
docker-compose -f docker-compose.prod.yml build

# 2. Start services
docker-compose -f docker-compose.prod.yml up -d

# 3. Check service status
docker-compose -f docker-compose.prod.yml ps

# 4. View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Verify Deployment

```bash
# Check health endpoints
curl http://localhost/api/health/
curl http://localhost/api/health/ready/

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost/api
# Admin: http://localhost/admin
```

## Remote Server Deployment

### Prerequisites

- SSH access to remote server
- Server meets system requirements
- Domain name configured (optional but recommended)

### Deployment Steps

#### 1. Configure Remote Deployment

```bash
# Set environment variables
export REMOTE_USER=ubuntu
export REMOTE_HOST=your-server-ip
export SSH_KEY=~/.ssh/id_rsa
export REMOTE_PATH=/opt/god_bless
```

#### 2. Deploy to Remote Server

```bash
# Make script executable
chmod +x deploy-remote.sh

# Deploy
./deploy-remote.sh
```

#### 3. Manual Remote Deployment

If you prefer manual deployment:

```bash
# 1. Copy files to server
rsync -avz --exclude='.git' --exclude='node_modules' \
  -e "ssh -i ~/.ssh/id_rsa" \
  ./ ubuntu@your-server-ip:/opt/god_bless/

# 2. SSH into server
ssh -i ~/.ssh/id_rsa ubuntu@your-server-ip

# 3. Navigate to deployment directory
cd /opt/god_bless

# 4. Configure environment
cp .env.example .env
nano .env  # Edit with your values

# 5. Deploy
chmod +x deploy.sh
./deploy.sh deploy
```

## SSL/TLS Configuration

### Using Let's Encrypt (Recommended)

#### 1. Install Certbot

```bash
# On the server
sudo apt-get update
sudo apt-get install certbot
```

#### 2. Obtain SSL Certificate

```bash
# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Start nginx
docker-compose -f docker-compose.prod.yml start nginx
```

#### 3. Configure Nginx for HTTPS

Edit `nginx/conf.d/default.conf` and uncomment the HTTPS section, then:

```bash
# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

#### 4. Auto-Renewal

```bash
# Add cron job for auto-renewal
sudo crontab -e

# Add this line:
0 0 * * * certbot renew --quiet && docker-compose -f /opt/god_bless/docker-compose.prod.yml restart nginx
```

## Monitoring Setup

### Enable Monitoring Stack

```bash
# Start monitoring services
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d

# Access monitoring tools
# Grafana: http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
# Flower (Celery): http://localhost:5555
```

### Configure Grafana

1. Access Grafana at `http://your-server:3000`
2. Login with credentials from `.env` file
3. Add Prometheus data source
4. Import dashboards from `monitoring/grafana/dashboards/`

### View Logs

```bash
# View all logs
./deploy.sh logs

# View specific service logs
./deploy.sh logs backend
./deploy.sh logs celery_worker

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f backend
```

## Backup and Restore

### Create Backup

```bash
# Using deployment script
./deploy.sh backup

# Manual backup
docker-compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U god_bless_user god_bless_db > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup

```bash
# Using deployment script
./deploy.sh restore backups/backup_20240101_120000.sql

# Manual restore
docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U god_bless_user god_bless_db < backups/backup_20240101_120000.sql
```

### Automated Backups

Add to crontab for daily backups:

```bash
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * cd /opt/god_bless && ./deploy.sh backup
```

## Troubleshooting

### Service Won't Start

```bash
# Check service logs
docker-compose -f docker-compose.prod.yml logs backend

# Check service status
docker-compose -f docker-compose.prod.yml ps

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Database Connection Issues

```bash
# Check database is running
docker-compose -f docker-compose.prod.yml ps db

# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Connect to database
docker-compose -f docker-compose.prod.yml exec db \
  psql -U god_bless_user -d god_bless_db
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose -f docker-compose.prod.yml ps redis

# Test Redis connection
docker-compose -f docker-compose.prod.yml exec redis \
  redis-cli -a your-redis-password ping
```

### High Memory Usage

```bash
# Check container resource usage
docker stats

# Restart services to free memory
docker-compose -f docker-compose.prod.yml restart
```

### Celery Tasks Not Processing

```bash
# Check Celery worker status
docker-compose -f docker-compose.prod.yml logs celery_worker

# Restart Celery workers
docker-compose -f docker-compose.prod.yml restart celery_worker celery_beat
```

## Maintenance

### Update Application

```bash
# 1. Pull latest changes
git pull origin main

# 2. Backup database
./deploy.sh backup

# 3. Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 4. Run migrations
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py migrate
```

### Clean Up Resources

```bash
# Using deployment script
./deploy.sh cleanup

# Manual cleanup
docker system prune -a
docker volume prune
```

### Scale Services

```bash
# Scale Celery workers
docker-compose -f docker-compose.prod.yml up -d --scale celery_worker=4

# Scale backend instances (requires load balancer)
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Monitor Resource Usage

```bash
# View container stats
docker stats

# View disk usage
df -h

# View logs size
du -sh god_bless_backend/logs/
```

## Security Best Practices

1. **Change Default Passwords**: Update all default passwords in `.env`
2. **Enable HTTPS**: Use SSL/TLS certificates for production
3. **Firewall Configuration**: Only expose necessary ports
4. **Regular Updates**: Keep Docker and system packages updated
5. **Backup Regularly**: Automate database backups
6. **Monitor Logs**: Check logs regularly for suspicious activity
7. **Limit Access**: Use SSH keys and disable password authentication
8. **Environment Variables**: Never commit `.env` file to version control

## Performance Optimization

1. **Database Indexing**: Ensure proper database indexes
2. **Redis Caching**: Configure appropriate cache timeouts
3. **Static Files**: Use CDN for static assets in production
4. **Connection Pooling**: Configured in production settings
5. **Worker Scaling**: Scale Celery workers based on load
6. **Resource Limits**: Set appropriate Docker resource limits

## Support and Documentation

- **Health Checks**: `http://your-domain/api/health/`
- **API Documentation**: `http://your-domain/api/docs/`
- **Admin Panel**: `http://your-domain/admin/`
- **Monitoring**: `http://your-domain:3000` (Grafana)

For issues and questions, refer to the project documentation or contact the development team.

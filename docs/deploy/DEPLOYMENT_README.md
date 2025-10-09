# Production Deployment Configuration

This directory contains production-ready deployment configurations for the God Bless platform.

## 📁 File Structure

```
.
├── docker-compose.prod.yml           # Production Docker Compose configuration
├── docker-compose.monitoring.yml     # Optional monitoring stack
├── deploy.sh                         # Local deployment script
├── deploy-remote.sh                  # Remote deployment script
├── .env.example                      # Environment variables template
├── DEPLOYMENT.md                     # Comprehensive deployment guide
├── DEPLOYMENT_QUICK_REFERENCE.md     # Quick command reference
│
├── god_bless_backend/
│   ├── Dockerfile.prod              # Production backend Dockerfile
│   ├── docker-entrypoint.sh         # Backend startup script
│   ├── .dockerignore                # Docker build exclusions
│   └── god_bless_pro/
│       ├── settings_prod.py         # Production Django settings
│       └── health_checks.py         # Health check endpoints
│
├── god_bless_frontend/
│   ├── Dockerfile.prod              # Production frontend Dockerfile
│   ├── nginx.conf                   # Frontend Nginx configuration
│   └── .dockerignore                # Docker build exclusions
│
├── nginx/
│   ├── nginx.conf                   # Main Nginx configuration
│   └── conf.d/
│       └── default.conf             # Site configuration
│
└── monitoring/
    ├── prometheus.yml               # Prometheus configuration
    ├── loki-config.yml              # Loki log aggregation config
    ├── promtail-config.yml          # Promtail log shipper config
    └── alerts/
        └── service_alerts.yml       # Alert rules
```

## 🚀 Quick Start

### 1. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

### 2. Deploy Locally

```bash
# Make scripts executable
chmod +x deploy.sh deploy-remote.sh

# Deploy
./deploy.sh deploy
```

### 3. Deploy to Remote Server

```bash
# Configure remote server details
export REMOTE_USER=ubuntu
export REMOTE_HOST=your-server-ip
export SSH_KEY=~/.ssh/id_rsa

# Deploy
./deploy-remote.sh
```

## 🔧 Configuration Files

### docker-compose.prod.yml

Production Docker Compose configuration with:
- Nginx reverse proxy
- PostgreSQL database with health checks
- Redis cache with password protection
- Django backend with Gunicorn
- React frontend with optimized build
- Celery workers and beat scheduler
- Flower monitoring (optional)

### Environment Variables (.env)

Critical variables to configure:
- `SECRET_KEY` - Django secret key
- `POSTGRES_PASSWORD` - Database password
- `REDIS_PASSWORD` - Redis password
- `ALLOWED_HOSTS` - Allowed domain names
- `CORS_ALLOWED_ORIGINS` - CORS origins
- Email configuration
- Monitoring credentials

### Dockerfiles

**Backend (Dockerfile.prod)**:
- Multi-stage build for optimization
- Non-root user for security
- Health checks
- Gunicorn with gevent workers

**Frontend (Dockerfile.prod)**:
- Multi-stage build
- Nginx for serving static files
- Optimized production build
- Security headers

## 🏥 Health Checks

All services include health checks:

| Service | Endpoint | Check |
|---------|----------|-------|
| Backend | `/api/health/` | Basic health |
| Backend | `/api/health/ready/` | Dependencies ready |
| Backend | `/api/health/live/` | Service alive |
| Backend | `/api/metrics/` | System metrics |
| Nginx | `/health` | Proxy health |
| PostgreSQL | `pg_isready` | Database ready |
| Redis | `redis-cli ping` | Cache ready |

## 📊 Monitoring

Optional monitoring stack includes:
- **Prometheus** - Metrics collection
- **Grafana** - Visualization dashboards
- **Loki** - Log aggregation
- **Promtail** - Log shipping
- **Node Exporter** - System metrics
- **Redis Exporter** - Redis metrics
- **Postgres Exporter** - Database metrics
- **Flower** - Celery monitoring

Enable monitoring:
```bash
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
```

## 🔒 Security Features

1. **Non-root containers** - All services run as non-root users
2. **Password protection** - Redis and database require passwords
3. **Security headers** - Nginx configured with security headers
4. **Rate limiting** - API rate limiting configured
5. **SSL/TLS ready** - HTTPS configuration included
6. **Secret management** - Environment-based secrets
7. **Network isolation** - Services on isolated network

## 💾 Backup & Restore

### Automated Backups

```bash
# Create backup
./deploy.sh backup

# Schedule daily backups (crontab)
0 2 * * * cd /opt/god_bless && ./deploy.sh backup
```

### Restore

```bash
./deploy.sh restore backups/backup_20240101_120000.sql
```

## 🔄 Updates & Maintenance

### Update Application

```bash
# 1. Backup
./deploy.sh backup

# 2. Pull changes
git pull

# 3. Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 4. Run migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

### Clean Up

```bash
./deploy.sh cleanup
```

## 📝 Deployment Scripts

### deploy.sh

Local deployment script with commands:
- `deploy` - Full deployment
- `start` - Start services
- `stop` - Stop services
- `restart` - Restart services
- `status` - Show status
- `logs` - View logs
- `backup` - Create backup
- `restore` - Restore backup
- `cleanup` - Clean up resources

### deploy-remote.sh

Remote deployment script for Ubuntu servers:
- Checks remote requirements
- Syncs files via rsync
- Deploys on remote server
- Configures services

## 🐛 Troubleshooting

### View Logs

```bash
# All services
./deploy.sh logs

# Specific service
./deploy.sh logs backend
```

### Check Service Status

```bash
./deploy.sh status
```

### Restart Service

```bash
docker-compose -f docker-compose.prod.yml restart backend
```

### Database Issues

```bash
# Check database
docker-compose -f docker-compose.prod.yml exec db pg_isready

# Connect to database
docker-compose -f docker-compose.prod.yml exec db psql -U god_bless_user -d god_bless_db
```

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Comprehensive deployment guide
- **[DEPLOYMENT_QUICK_REFERENCE.md](DEPLOYMENT_QUICK_REFERENCE.md)** - Quick command reference
- **[.env.example](.env.example)** - Environment configuration template

## 🎯 Production Checklist

Before deploying to production:

- [ ] Configure `.env` with production values
- [ ] Change `SECRET_KEY`
- [ ] Set strong database password
- [ ] Set strong Redis password
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Configure `CORS_ALLOWED_ORIGINS`
- [ ] Set up email configuration
- [ ] Configure domain name
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Configure monitoring alerts
- [ ] Test health check endpoints
- [ ] Review security settings
- [ ] Test backup and restore
- [ ] Document access credentials

## 🆘 Support

For issues or questions:
1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed documentation
2. Review logs: `./deploy.sh logs`
3. Check service health: `curl http://localhost/api/health/ready/`
4. Verify configuration in `.env`

## 📄 License

See main project LICENSE file.

# Deployment Quick Reference

## Quick Commands

### Local Deployment
```bash
# Full deployment
./deploy.sh deploy

# Start services
./deploy.sh start

# Stop services
./deploy.sh stop

# View status
./deploy.sh status

# View logs
./deploy.sh logs [service]

# Backup database
./deploy.sh backup

# Restore database
./deploy.sh restore <backup-file>
```

### Remote Deployment
```bash
# Deploy to remote server
./deploy-remote.sh -u ubuntu -h 192.168.1.100 -k ~/.ssh/id_rsa

# Or using environment variables
export REMOTE_USER=ubuntu
export REMOTE_HOST=192.168.1.100
export SSH_KEY=~/.ssh/id_rsa
./deploy-remote.sh
```

## Service URLs

| Service | URL | Default Port |
|---------|-----|--------------|
| Frontend | http://localhost | 80 |
| Backend API | http://localhost/api | 80 |
| Admin Panel | http://localhost/admin | 80 |
| Health Check | http://localhost/api/health/ | 80 |
| Grafana | http://localhost:3000 | 3000 |
| Prometheus | http://localhost:9090 | 9090 |
| Flower | http://localhost:5555 | 5555 |

## Health Check Endpoints

```bash
# Basic health check
curl http://localhost/api/health/

# Readiness check (all dependencies)
curl http://localhost/api/health/ready/

# Liveness check
curl http://localhost/api/health/live/

# Metrics
curl http://localhost/api/metrics/
```

## Common Docker Commands

```bash
# View running containers
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f [service]

# Restart service
docker-compose -f docker-compose.prod.yml restart [service]

# Execute command in container
docker-compose -f docker-compose.prod.yml exec [service] [command]

# Scale service
docker-compose -f docker-compose.prod.yml up -d --scale celery_worker=4

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.prod.yml down -v
```

## Database Operations

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U god_bless_user god_bless_db > backup.sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U god_bless_user god_bless_db < backup.sql

# Connect to database
docker-compose -f docker-compose.prod.yml exec db \
  psql -U god_bless_user -d god_bless_db

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py migrate

# Create superuser
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py createsuperuser
```

## Monitoring Commands

```bash
# Start monitoring stack
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d

# View container resource usage
docker stats

# Check disk usage
df -h

# Check logs size
du -sh god_bless_backend/logs/
```

## Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs [service]

# Check service health
docker-compose -f docker-compose.prod.yml ps

# Restart service
docker-compose -f docker-compose.prod.yml restart [service]
```

### Database issues
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec db pg_isready

# View database logs
docker-compose -f docker-compose.prod.yml logs db
```

### Redis issues
```bash
# Test Redis connection
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# View Redis logs
docker-compose -f docker-compose.prod.yml logs redis
```

### Clear cache
```bash
# Clear Redis cache
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL
```

## Environment Variables

Critical variables to set in `.env`:

```bash
SECRET_KEY=                    # Django secret key
POSTGRES_PASSWORD=             # Database password
REDIS_PASSWORD=                # Redis password
ALLOWED_HOSTS=                 # Comma-separated domains
CORS_ALLOWED_ORIGINS=          # Comma-separated origins
EMAIL_HOST_USER=               # Email username
EMAIL_HOST_PASSWORD=           # Email password
VITE_API_URL=                  # Frontend API URL
```

## SSL/TLS Setup

```bash
# Obtain certificate (Let's Encrypt)
sudo certbot certonly --standalone -d your-domain.com

# Certificate location
/etc/letsencrypt/live/your-domain.com/

# Auto-renewal cron job
0 0 * * * certbot renew --quiet && docker-compose restart nginx
```

## Backup Schedule

```bash
# Add to crontab for daily backups at 2 AM
crontab -e

# Add this line
0 2 * * * cd /opt/god_bless && ./deploy.sh backup
```

## Performance Tuning

```bash
# Scale Celery workers
docker-compose -f docker-compose.prod.yml up -d --scale celery_worker=4

# Adjust worker concurrency
# Edit docker-compose.prod.yml:
# command: celery -A god_bless_pro worker -l info --concurrency=8

# Monitor performance
docker stats
```

## Security Checklist

- [ ] Change SECRET_KEY
- [ ] Set strong POSTGRES_PASSWORD
- [ ] Set strong REDIS_PASSWORD
- [ ] Configure ALLOWED_HOSTS
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Disable DEBUG mode
- [ ] Set up automated backups
- [ ] Configure monitoring alerts
- [ ] Review and update dependencies

## Port Configuration

| Service | Internal Port | External Port |
|---------|---------------|---------------|
| Nginx | 80, 443 | 80, 443 |
| Backend | 8000 | - |
| Frontend | 80 | - |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |
| Grafana | 3000 | 3000 |
| Prometheus | 9090 | 9090 |
| Flower | 5555 | 5555 |

## File Locations

```
/opt/god_bless/                    # Application root
├── .env                           # Environment configuration
├── docker-compose.prod.yml        # Production compose file
├── god_bless_backend/
│   ├── logs/                      # Application logs
│   ├── media/                     # User uploads
│   └── static_cdn/                # Static files
├── backups/                       # Database backups
├── nginx/                         # Nginx configuration
└── monitoring/                    # Monitoring configs
```

## Support

For detailed documentation, see [DEPLOYMENT.md](DEPLOYMENT.md)

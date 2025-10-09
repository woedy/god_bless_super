# 🚀 Quick Start - Production Deployment

Get the God Bless platform running in production in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- 4GB+ RAM available
- 20GB+ disk space

## Step 1: Configure Environment (2 minutes)

```bash
# Copy environment template
cp .env.example .env

# Edit with your values (REQUIRED!)
nano .env
```

**Minimum required changes:**
```bash
SECRET_KEY=<generate-a-long-random-string>
POSTGRES_PASSWORD=<your-secure-password>
REDIS_PASSWORD=<your-secure-password>
```

**Generate SECRET_KEY:**
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

## Step 2: Deploy (2 minutes)

```bash
# Make scripts executable
chmod +x deploy.sh verify-deployment.sh

# Verify configuration (optional but recommended)
./verify-deployment.sh

# Deploy!
./deploy.sh deploy
```

## Step 3: Verify (1 minute)

```bash
# Check services are running
./deploy.sh status

# Test health endpoint
curl http://localhost/api/health/

# View logs
./deploy.sh logs
```

## Access Your Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **Admin Panel**: http://localhost/admin
- **Health Check**: http://localhost/api/health/

## Common Commands

```bash
# View logs
./deploy.sh logs

# Restart services
./deploy.sh restart

# Create backup
./deploy.sh backup

# Stop services
./deploy.sh stop
```

## Enable Monitoring (Optional)

```bash
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
```

Access monitoring:
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Flower**: http://localhost:5555

## Remote Server Deployment

```bash
# Configure
export REMOTE_USER=ubuntu
export REMOTE_HOST=your-server-ip
export SSH_KEY=~/.ssh/id_rsa

# Deploy
chmod +x deploy-remote.sh
./deploy-remote.sh
```

## Troubleshooting

**Services won't start?**
```bash
./deploy.sh logs
```

**Need to restart?**
```bash
./deploy.sh restart
```

**Database issues?**
```bash
docker-compose -f docker-compose.prod.yml logs db
```

## Next Steps

1. ✅ Configure domain name
2. ✅ Set up SSL/TLS (see DEPLOYMENT.md)
3. ✅ Configure automated backups
4. ✅ Set up monitoring alerts
5. ✅ Review security settings

## Full Documentation

- **Comprehensive Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Quick Reference**: [DEPLOYMENT_QUICK_REFERENCE.md](DEPLOYMENT_QUICK_REFERENCE.md)
- **Configuration Details**: [DEPLOYMENT_README.md](DEPLOYMENT_README.md)

## Need Help?

1. Check logs: `./deploy.sh logs`
2. Verify health: `curl http://localhost/api/health/ready/`
3. Review documentation: [DEPLOYMENT.md](DEPLOYMENT.md)

---

**That's it! Your God Bless platform is now running in production! 🎉**

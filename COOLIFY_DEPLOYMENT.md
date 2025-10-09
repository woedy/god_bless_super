# Unified Docker Deployment Guide

This guide shows how to use the unified Docker configuration for both local development and Coolify production deployment.

## 🏠 Local Development

### Quick Start
```bash
# Use the provided scripts
.\start.ps1    # PowerShell
# or
start.bat      # Batch
# or  
./start.sh     # Bash (Linux/Mac)
```

### Manual Start
```bash
cd god_bless_backend
docker-compose --env-file .env.local --profile development up -d
```

## ☁️ Coolify Production Deployment

### 1. Repository Setup
- Push your code to GitHub/GitLab
- Ensure `god_bless_backend/docker-compose.yml` is in your repo

### 2. Coolify Project Setup
1. Create new project in Coolify
2. Add a new **Docker Compose** service
3. Set repository URL to your Git repo
4. Set **Build Pack** to `docker-compose`
5. Set **Docker Compose File** path to: `god_bless_backend/docker-compose.yml`

### 3. Environment Variables
Add these environment variables in Coolify:

```bash
# Required - Change these values!
SECRET_KEY=your-super-secret-key-here-minimum-50-characters-long
POSTGRES_PASSWORD=your-secure-postgres-password-123
REDIS_PASSWORD=your-secure-redis-password-123

# Optional - Customize as needed
DEBUG=False
POSTGRES_DB=god_bless_postgres
POSTGRES_USER=god_bless_postgres
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
ALLOWED_HOSTS=your-domain.com,*.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
```

### 4. Domain Setup
1. Set your custom domain in Coolify
2. Enable SSL/TLS certificate
3. Update `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` with your domain

### 5. Deploy
1. Click **Deploy** in Coolify
2. Monitor deployment logs
3. Access your application at your domain

## 🔧 Local vs Production

### Local Development
```bash
# With frontend (development profile)
docker-compose --env-file .env.local --profile development up -d

# Backend only (production-like)
docker-compose --env-file .env.local up -d
```

### Production (Coolify)
```bash
# Coolify automatically uses environment variables
# No .env file needed - uses Coolify's environment settings
docker-compose up -d
```

## 📊 Service Mapping

| Service | Local Port | Coolify | Description |
|---------|------------|---------|-------------|
| Backend | 6161 | Auto-assigned | Django API |
| Database | Internal | Internal | PostgreSQL |
| Redis | Internal | Internal | Cache/Queue |
| Celery | Internal | Internal | Background tasks |

## 🛠️ Troubleshooting

### Common Issues

**1. Build Fails**
- Check Dockerfile exists in `god_bless_backend/`
- Verify requirements.txt is present
- Check build logs in Coolify

**2. Database Connection Issues**
- Verify POSTGRES_* environment variables
- Check if migrations ran successfully
- Look for database connection errors in logs

**3. Static Files Not Loading**
- Ensure `collectstatic` runs in entrypoint
- Check volume mounts for static files
- Verify ALLOWED_HOSTS includes your domain

**4. Celery Not Working**
- Check Redis connection
- Verify CELERY_BROKER_URL format
- Monitor celery service logs

### Viewing Logs
```bash
# In Coolify dashboard
1. Go to your service
2. Click "Logs" tab
3. Select specific container (backend, celery, etc.)
```

## 🔐 Security Checklist

- [ ] Change SECRET_KEY to a strong, unique value
- [ ] Set DEBUG=False in production
- [ ] Use strong database passwords
- [ ] Configure proper ALLOWED_HOSTS
- [ ] Set up CORS_ALLOWED_ORIGINS correctly
- [ ] Enable SSL/TLS certificate
- [ ] Review email settings for production use

## 📝 Notes

- Coolify handles container orchestration automatically
- No need to expose ports manually (Coolify manages this)
- Database and Redis data persist between deployments
- Static files are collected automatically on each deployment
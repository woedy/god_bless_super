# Unified Docker Setup Guide

This project uses a **single docker-compose.yml** that works for both local development and production deployment (Coolify).

## 🏠 Local Development

### Quick Start
```bash
# Windows PowerShell
.\start.ps1

# Windows Batch
start.bat

# Linux/Mac Bash
./start.sh
```

### Manual Start
```bash
cd god_bless_backend
docker-compose --env-file .env.local --profile development up -d
```

### What You Get Locally
- **Backend**: http://localhost:6161 (Django API)
- **Frontend**: http://localhost:5173 (React Dev Server)
- **Admin**: http://localhost:6161/admin
- **Database**: PostgreSQL (internal)
- **Cache**: Redis (internal)
- **Background Tasks**: Celery + Celery Beat

## ☁️ Production (Coolify)

### Setup Steps
1. **Push to Git**: Ensure your code is in a Git repository
2. **Create Coolify Service**: 
   - Service Type: **Docker Compose**
   - Docker Compose File: `god_bless_backend/docker-compose.yml`
3. **Set Environment Variables** (see below)
4. **Deploy**

### Required Environment Variables for Coolify
```bash
# Security (REQUIRED - Change these!)
SECRET_KEY=your-super-secret-key-minimum-50-characters-long
DEBUG=False

# Database (REQUIRED - Change these!)
POSTGRES_PASSWORD=your-secure-postgres-password
REDIS_PASSWORD=your-secure-redis-password

# Domain (REQUIRED - Set your domain!)
ALLOWED_HOSTS=your-domain.com,*.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com

# Optional - Customize as needed
POSTGRES_DB=god_bless_postgres
POSTGRES_USER=god_bless_postgres
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
CELERY_LOG_LEVEL=INFO
```

## 🔧 Configuration Files

### Local Development
- **Environment**: `god_bless_backend/.env.local`
- **Profile**: `development` (includes frontend)
- **Debug**: `True`
- **Volumes**: Source code mounted for hot reload

### Production (Coolify)
- **Environment**: Coolify environment variables
- **Profile**: Default (backend only)
- **Debug**: `False`
- **Volumes**: Named volumes for persistence

## 🚀 Key Features

### Environment Variable Defaults
The docker-compose.yml uses `${VAR:-default}` syntax:
- **Local**: Uses `.env.local` file with development defaults
- **Production**: Uses Coolify environment variables with fallbacks

### Service Profiles
- **Development Profile**: Includes React frontend container
- **Production**: Backend services only (frontend deployed separately)

### Health Checks
- **PostgreSQL**: `pg_isready` check
- **Redis**: `redis-cli ping` check
- **Dependencies**: Services wait for healthy dependencies

### Volume Strategy
- **Local**: Source code mounted for development
- **Production**: Named volumes for data persistence

## 📊 Service Architecture

| Service | Local Port | Production | Description |
|---------|------------|------------|-------------|
| Backend | 6161 | Auto-assigned | Django API + WebSockets |
| Frontend | 5173 | Separate deployment | React development server |
| Database | Internal | Internal | PostgreSQL |
| Redis | Internal | Internal | Cache + Message broker |
| Celery | Internal | Internal | Background tasks |
| Celery Beat | Internal | Internal | Scheduled tasks |

## 🛠️ Management Commands

### Local Development
```bash
# Start with frontend
.\start.ps1

# Stop all services
.\stop.ps1

# Check status
.\status.ps1

# View logs
cd god_bless_backend
docker-compose --env-file .env.local logs -f

# Shell access
docker-compose --env-file .env.local exec backend bash
```

### Production (Coolify Dashboard)
- **Deploy**: Click deploy button
- **Logs**: View in Coolify dashboard
- **Shell**: Use Coolify's container shell feature

## 🔐 Security Considerations

### Local Development
- Uses development passwords (safe for local)
- Debug mode enabled
- Permissive CORS settings

### Production
- **Must change** all default passwords
- Debug mode disabled
- Restricted CORS and allowed hosts
- Strong secret keys required

## 🧹 Maintenance

### Clean Restart (Local)
```bash
cd god_bless_backend
docker-compose --env-file .env.local down -v  # Removes volumes
docker-compose --env-file .env.local --profile development up -d
```

### Update Dependencies
```bash
# Rebuild containers after requirements.txt changes
cd god_bless_backend
docker-compose --env-file .env.local build --no-cache
docker-compose --env-file .env.local --profile development up -d
```

## ✅ Benefits of Unified Setup

1. **Single Configuration**: One docker-compose.yml for all environments
2. **Environment Flexibility**: Uses environment variables with sensible defaults
3. **Easy Local Development**: Simple scripts for common operations
4. **Production Ready**: Coolify-compatible with proper health checks
5. **Maintainable**: No duplicate configurations to keep in sync
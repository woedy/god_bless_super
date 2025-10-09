# Coolify Deployment Guide

## Simple Single-Domain Setup

This setup serves everything from one domain:
- `https://yourdomain.com/` → Frontend (React)
- `https://yourdomain.com/api/` → Backend API  
- `https://yourdomain.com/ws/` → WebSocket
- `https://yourdomain.com/admin/` → Django Admin

## Quick Deployment Steps

### 1. Deploy to Coolify
1. Connect your repository to Coolify
2. Select **Docker Compose** as deployment type
3. Set compose file path to: `docker-compose.prod.yml`

### 2. Set Environment Variables
Copy these variables to Coolify environment settings:

```bash
# Required
DOMAIN=yourdomain.com
SECRET_KEY=your-super-secret-key-here-minimum-50-characters
POSTGRES_PASSWORD=your-secure-postgres-password  
REDIS_PASSWORD=your-secure-redis-password

# Database
POSTGRES_DB=god_bless_db
POSTGRES_USER=god_bless_user

# Optional: Email
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-email-password
```

### 3. Configure Domain
1. Set your domain in Coolify dashboard
2. Enable SSL (automatic with Coolify)
3. Deploy!

## Database Rotation Handling

Your current setup supports database switching via environment variables:

### Option 1: Keep Current Database
- Set `USE_POSTGRES=true` in production
- Your existing data stays in PostgreSQL
- Coolify handles backups automatically

### Option 2: Migrate from SQLite to PostgreSQL
If you're currently using SQLite and want to migrate:

```bash
# 1. Export SQLite data
python manage.py dumpdata > backup.json

# 2. Deploy with PostgreSQL
# 3. Load data into PostgreSQL
python manage.py loaddata backup.json
```

### Option 3: Database Rotation Strategy
For automatic database rotation/backup:

1. **Coolify Backups**: Enable automatic PostgreSQL backups in Coolify
2. **Manual Rotation**: Use Django management commands
3. **External Backup**: Set up external backup service

## Frontend Configuration

The frontend automatically uses the correct endpoints:
- API: `https://yourdomain.com/api/`
- WebSocket: `wss://yourdomain.com/ws/`

No code changes needed - environment variables handle everything!

## Troubleshooting

### Check Logs
```bash
# Application logs
docker logs <container_name>

# Database logs  
docker logs <database_container>
```

### Health Check
Visit: `https://yourdomain.com/api/health/`

### Admin Access
Visit: `https://yourdomain.com/admin/`

## Security Notes

- All passwords are environment variables
- HTTPS enforced in production
- CORS properly configured
- Static files cached with proper headers
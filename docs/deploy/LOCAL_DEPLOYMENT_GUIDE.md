# Local Docker Deployment Guide

This guide will help you deploy and test the God Bless platform on your local machine using Docker.

## Prerequisites

- Docker Desktop installed and running
- At least 4GB of available RAM
- Ports 6161, 5173, and 5432 available

## Quick Start

### Option 1: Full Stack with Docker Compose (Recommended for Testing)

1. **Navigate to the backend directory:**
   ```cmd
   cd god_bless_backend
   ```

2. **Build and start all services:**
   ```cmd
   docker-compose up --build
   ```

   This will start:
   - PostgreSQL database (internal)
   - Redis (internal)
   - Django backend (port 6161)
   - React frontend (port 4173)
   - Celery worker
   - Celery beat scheduler

3. **Wait for services to start** (first time takes 5-10 minutes)
   Look for messages like:
   - "Django version X.X.X, using settings 'god_bless_pro.settings'"
   - "Starting development server at http://0.0.0.0:6161/"

4. **In a new terminal, run migrations:**
   ```cmd
   docker exec -it god_bless_app python manage.py migrate
   ```

5. **Create a superuser:**
   ```cmd
   docker exec -it god_bless_app python manage.py createsuperuser
   ```
   Follow the prompts to create your admin account.

6. **Access the application:**
   - Frontend: http://localhost:4173
   - Backend API: http://localhost:6161
   - Admin Panel: http://localhost:6161/admin

### Option 2: Development Mode (Separate Services)

If you want to run backend and frontend separately for development:

**Backend:**
```cmd
cd god_bless_backend
docker-compose up db redis celery celery-beat god_bless_app
```

**Frontend (in a new terminal):**
```cmd
cd god_bless_frontend
npm install
npm run dev
```
Access at http://localhost:5173

## Common Commands

### View Logs
```cmd
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f god_bless_app
docker-compose logs -f celery
```

### Stop Services
```cmd
# Stop all
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Restart a Service
```cmd
docker-compose restart god_bless_app
```

### Run Django Commands
```cmd
# Run migrations
docker exec -it god_bless_app python manage.py migrate

# Create superuser
docker exec -it god_bless_app python manage.py createsuperuser

# Collect static files
docker exec -it god_bless_app python manage.py collectstatic --noinput

# Django shell
docker exec -it god_bless_app python manage.py shell
```

### Database Access
```cmd
# Access PostgreSQL
docker exec -it god_bless_postgres_db psql -U god_bless_postgres -d god_bless_postgres
```

### Redis Access
```cmd
# Access Redis CLI
docker exec -it god_bless_redis redis-cli
```

## Troubleshooting

### Port Already in Use
If you get "port is already allocated" error:
```cmd
# Check what's using the port (example for 6161)
netstat -ano | findstr :6161

# Stop the process or change the port in docker-compose.yml
```

### Database Connection Issues
```cmd
# Restart database
docker-compose restart db

# Check database logs
docker-compose logs db
```

### Frontend Not Loading
```cmd
# Rebuild frontend
docker-compose up --build god_bless_frontend

# Or run locally
cd god_bless_frontend
npm install
npm run dev
```

### Celery Not Processing Tasks
```cmd
# Check celery logs
docker-compose logs celery

# Restart celery
docker-compose restart celery celery-beat
```

### Clean Start (Nuclear Option)
```cmd
# Stop everything and remove volumes
docker-compose down -v

# Remove all containers and images
docker system prune -a

# Start fresh
docker-compose up --build
```

## Testing the Application

1. **Login to Admin Panel:**
   - Go to http://localhost:6161/admin
   - Use the superuser credentials you created

2. **Test API Endpoints:**
   - Health check: http://localhost:6161/api/health/
   - API docs: http://localhost:6161/api/docs/ (if configured)

3. **Test Frontend:**
   - Navigate to http://localhost:4173
   - Try logging in with your superuser credentials

4. **Test Background Tasks:**
   - Check Celery logs to see if workers are processing tasks
   - Monitor Redis for task queues

## Development Tips

- Use `docker-compose up` without `-d` to see logs in real-time
- Backend code changes require container restart
- Frontend with Vite has hot-reload when running with `npm run dev`
- Database data persists in `./data/db` directory
- Static files are in `./static_cdn`

## Next Steps

After successful deployment:
1. Configure email settings in `.env.local` for email features
2. Set up any required API keys for external services
3. Load initial data if needed
4. Run tests to verify everything works
5. Explore the admin panel and API endpoints

## Getting Help

- Check logs: `docker-compose logs -f [service_name]`
- Verify containers are running: `docker ps`
- Check container resource usage: `docker stats`

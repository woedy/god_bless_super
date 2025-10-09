# Local Deployment - Quick Start

## 🚀 One-Click Start

Double-click: **`start-local.cmd`**

Wait 5-10 minutes for first-time setup, then:
- Frontend: http://localhost:4173
- Backend: http://localhost:6161
- Admin: http://localhost:6161/admin

## 📋 First Time Setup

After services start, create an admin user:

```cmd
docker exec -it god_bless_app python manage.py createsuperuser
```

Follow prompts to set username, email, and password.

## 🛑 Stop Services

Double-click: **`stop-local.cmd`**

## 📊 View Logs

Double-click: **`view-logs.cmd`**

## 🔧 Manual Commands

### Start Services
```cmd
cd god_bless_backend
docker-compose up --build
```

### Stop Services
```cmd
cd god_bless_backend
docker-compose down
```

### View All Logs
```cmd
cd god_bless_backend
docker-compose logs -f
```

### Run Migrations
```cmd
docker exec -it god_bless_app python manage.py migrate
```

### Access Database
```cmd
docker exec -it god_bless_postgres_db psql -U god_bless_postgres -d god_bless_postgres
```

### Django Shell
```cmd
docker exec -it god_bless_app python manage.py shell
```

## 🧪 Testing

1. **Check Backend Health:**
   - Visit: http://localhost:6161/admin
   - Should see Django admin login

2. **Check Frontend:**
   - Visit: http://localhost:4173
   - Should see the application interface

3. **Check API:**
   - Visit: http://localhost:6161/api/
   - Should see API endpoints

## ❗ Troubleshooting

### Services won't start
```cmd
# Check if Docker is running
docker --version

# Check if ports are available
netstat -ano | findstr :6161
netstat -ano | findstr :4173
```

### Database errors
```cmd
cd god_bless_backend
docker-compose restart db
docker exec -it god_bless_app python manage.py migrate
```

### Clean restart
```cmd
cd god_bless_backend
docker-compose down -v
docker-compose up --build
```

## 📁 Important Files

- **LOCAL_DEPLOYMENT_GUIDE.md** - Full deployment documentation
- **.env.local** - Local environment configuration
- **god_bless_backend/docker-compose.yml** - Service definitions

## 🎯 What's Running?

- **PostgreSQL** - Database (internal only)
- **Redis** - Cache & message broker (internal only)
- **Django** - Backend API (port 6161)
- **React** - Frontend UI (port 4173)
- **Celery Worker** - Background tasks
- **Celery Beat** - Task scheduler

## 💡 Tips

- First startup takes longer (downloading images)
- Backend changes need container restart
- Frontend has hot-reload in dev mode
- Data persists between restarts
- Use `docker-compose down -v` to wipe data

## 🆘 Need Help?

Check the full guide: **LOCAL_DEPLOYMENT_GUIDE.md**

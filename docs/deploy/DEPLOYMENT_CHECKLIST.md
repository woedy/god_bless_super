# Local Deployment Checklist

Use this checklist to ensure successful local deployment.

## ✅ Pre-Deployment

- [ ] Docker Desktop installed
- [ ] Docker Desktop is running
- [ ] At least 4GB RAM available
- [ ] Ports 6161, 4173, 5432 are free
- [ ] Git repository cloned

## ✅ Initial Setup

- [ ] Navigate to project root directory
- [ ] Review `.env.local` file (already created)
- [ ] Review `LOCAL_QUICK_START.md` for overview

## ✅ Deployment Steps

### Option A: Quick Start (Recommended)
- [ ] Double-click `start-local.cmd`
- [ ] Wait for "Services are starting!" message
- [ ] Run superuser creation command shown

### Option B: Manual Start
- [ ] Open terminal/command prompt
- [ ] Navigate to `god_bless_backend` directory
- [ ] Run: `docker-compose up --build`
- [ ] Wait for all services to start (5-10 minutes first time)
- [ ] Open new terminal
- [ ] Run: `docker exec -it god_bless_app python manage.py migrate`
- [ ] Run: `docker exec -it god_bless_app python manage.py createsuperuser`

## ✅ Verification

### Backend Verification
- [ ] Visit http://localhost:6161/admin
- [ ] See Django admin login page
- [ ] Login with superuser credentials
- [ ] Access admin dashboard successfully

### Frontend Verification
- [ ] Visit http://localhost:4173
- [ ] See application interface
- [ ] No console errors in browser
- [ ] Can navigate between pages

### Services Verification
- [ ] Run: `docker ps`
- [ ] Verify all containers are running:
  - [ ] god_bless_app
  - [ ] god_bless_frontend
  - [ ] god_bless_postgres_db
  - [ ] god_bless_redis
  - [ ] god_bless_celery
  - [ ] god_bless_celery_beat

### Database Verification
- [ ] Run: `docker exec -it god_bless_postgres_db psql -U god_bless_postgres -d god_bless_postgres -c "\dt"`
- [ ] See list of Django tables
- [ ] No connection errors

### Celery Verification
- [ ] Run: `docker-compose logs celery`
- [ ] See "celery@hostname ready" message
- [ ] No error messages

## ✅ Testing

### Basic Functionality
- [ ] Create a test user in admin panel
- [ ] Test login/logout functionality
- [ ] Navigate through different sections
- [ ] Check that data persists after page refresh

### API Testing
- [ ] Visit http://localhost:6161/api/
- [ ] Test an API endpoint with curl or Postman
- [ ] Verify JSON responses

### Background Tasks
- [ ] Check Celery logs for task processing
- [ ] Verify scheduled tasks are running (if any)

## ✅ Common Issues Resolution

### Port Conflicts
- [ ] If port 6161 in use: Check with `netstat -ano | findstr :6161`
- [ ] If port 4173 in use: Check with `netstat -ano | findstr :4173`
- [ ] Kill conflicting processes or change ports in docker-compose.yml

### Container Issues
- [ ] If containers won't start: Run `docker-compose down -v`
- [ ] Then: `docker-compose up --build`
- [ ] Check logs: `docker-compose logs -f`

### Database Issues
- [ ] If migration errors: Run `docker-compose restart db`
- [ ] Wait 30 seconds, then retry migrations
- [ ] Check database logs: `docker-compose logs db`

### Frontend Issues
- [ ] If frontend won't load: Check `docker-compose logs god_bless_frontend`
- [ ] Verify node_modules installed in container
- [ ] Try rebuilding: `docker-compose up --build god_bless_frontend`

## ✅ Post-Deployment

- [ ] Document any custom configurations made
- [ ] Save superuser credentials securely
- [ ] Bookmark important URLs
- [ ] Review LOCAL_DEPLOYMENT_GUIDE.md for advanced usage
- [ ] Test all critical features you plan to use

## ✅ Daily Usage

### Starting Work
- [ ] Ensure Docker Desktop is running
- [ ] Run `start-local.cmd` or `docker-compose up`
- [ ] Wait for services to be ready

### During Development
- [ ] Use `view-logs.cmd` to monitor services
- [ ] Restart specific services as needed
- [ ] Run migrations after model changes

### Ending Work
- [ ] Run `stop-local.cmd` or `docker-compose down`
- [ ] Or leave running if you'll continue later

## 📝 Notes

**First Time Setup:** Takes 5-10 minutes to download images and build containers.

**Subsequent Starts:** Takes 30-60 seconds for services to be ready.

**Data Persistence:** Database data persists in `god_bless_backend/data/db` directory.

**Clean Slate:** Use `docker-compose down -v` to remove all data and start fresh.

## 🆘 Getting Help

If you encounter issues:

1. Check logs: `docker-compose logs -f [service_name]`
2. Review LOCAL_DEPLOYMENT_GUIDE.md troubleshooting section
3. Verify all containers are running: `docker ps`
4. Check Docker Desktop for resource usage
5. Try clean restart: `docker-compose down -v && docker-compose up --build`

## ✅ Deployment Complete!

Once all items are checked, your local deployment is complete and ready for testing!

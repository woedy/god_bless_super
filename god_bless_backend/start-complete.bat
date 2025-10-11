@echo off
echo === Complete God Bless Application ===
echo.

echo Stopping any existing containers...
docker-compose -f docker-compose.simple.yml down

echo.
echo Building all images...
docker-compose -f docker-compose.simple.yml build --no-cache

echo.
echo Starting complete application stack...
echo.
echo Services:
echo - Redis (Cache & Message Broker)
echo - Django Backend (API & Admin)
echo - React Frontend (Web Interface)  
echo - Celery Worker (Background Tasks)
echo - Celery Beat (Task Scheduler)
echo.
echo Access points:
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:6161
echo - Admin Panel: http://localhost:6161/admin
echo.
echo Press Ctrl+C to stop all services
echo.

docker-compose -f docker-compose.simple.yml up

pause

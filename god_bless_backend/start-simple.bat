@echo off
echo === Simple Docker Setup ===
echo.

echo Stopping any existing containers...
docker-compose -f docker-compose.simple.yml down

echo.
echo Building simple image...
docker-compose -f docker-compose.simple.yml build --no-cache backend

echo.
echo Starting complete application...
echo.
echo Services starting:
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

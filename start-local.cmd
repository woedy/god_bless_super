@echo off
echo ========================================
echo God Bless Local Deployment
echo ========================================
echo.

echo Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not running!
    echo Please install Docker Desktop and start it.
    pause
    exit /b 1
)

echo Docker is running!
echo.

echo Starting services...
echo This may take 5-10 minutes on first run...
echo.

cd god_bless_backend

echo Building and starting containers...
docker-compose up --build -d

echo.
echo Waiting for services to be ready...
timeout /t 30 /nobreak >nul

echo.
echo Checking service status...
docker ps

echo.
echo Running database migrations...
docker exec god_bless_app python manage.py migrate

echo.
echo ========================================
echo Services are starting!
echo ========================================
echo.
echo Backend API: http://localhost:6161
echo Frontend: http://localhost:4173
echo Admin Panel: http://localhost:6161/admin
echo.
echo To create a superuser, run:
echo   docker exec -it god_bless_app python manage.py createsuperuser
echo.
echo To view logs:
echo   docker-compose logs -f
echo.
echo To stop services:
echo   docker-compose down
echo.
echo ========================================

pause

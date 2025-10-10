@echo off
REM Quick startup script for God Bless Platform (Backend + Frontend)

echo 🚀 Starting God Bless Platform (Backend + Frontend)...
echo ======================================================

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo ✅ Docker is running

REM Clean up any existing containers (optional)
echo 🧹 Cleaning up existing containers...
docker-compose down >nul 2>&1

REM Start all services
echo 🔥 Starting Redis, Backend, and Frontend...
docker-compose up -d redis backend frontend

echo.
echo ⏳ Waiting for services to start up...
timeout /t 10 /nobreak >nul

echo.
echo 🎉 God Bless Platform is starting up!
echo.
echo 📍 Access your application at:
echo   🌐 Frontend: http://localhost:5173
echo   🔗 Backend API: http://localhost:6161/api/
echo.
echo 🔧 Quick commands:
echo   View logs: docker-compose logs -f
echo   Stop all:  docker-compose down
echo   Restart:   docker-compose restart
echo.
echo The platform should be fully loaded in a few moments!
echo.
echo Press any key to continue...
pause >nul

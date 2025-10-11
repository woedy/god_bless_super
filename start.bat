@echo off
REM God Bless America - Docker Start Script
REM Usage: start.bat

echo 🚀 Starting God Bless America Docker Services...
echo.

REM Change to backend directory
cd god_bless_backend

REM Check if docker-compose.yml exists
if not exist "docker-compose.yml" (
    echo ❌ Error: docker-compose.yml not found in god_bless_backend directory
    pause
    exit /b 1
)

REM Start services with development profile
echo Starting Docker containers...
docker-compose --env-file .env.development --profile development up -d

if %errorlevel% equ 0 (
    echo.
    echo ✅ Services started successfully!
    echo.
    echo 🌐 Access your application:
    echo    Frontend: http://localhost:5173
    echo    Backend:  http://localhost:6161
    echo    Admin:    http://localhost:6161/admin
    echo.
    echo 📊 Check status: docker-compose ps
    echo 📋 View logs:    docker-compose logs -f
    echo 🛑 Stop:         stop.bat
) else (
    echo.
    echo ❌ Failed to start services
    echo 💡 Try: docker-compose logs
)

REM Return to root directory
cd ..
pause
@echo off
REM God Bless America - Docker Stop Script
REM Usage: stop.bat

echo 🛑 Stopping God Bless America Docker Services...
echo.

REM Change to backend directory
cd god_bless_backend

REM Check if docker-compose.yml exists
if not exist "docker-compose.yml" (
    echo ❌ Error: docker-compose.yml not found in god_bless_backend directory
    pause
    exit /b 1
)

REM Stop services
echo Stopping Docker containers...
docker-compose --env-file .env.local down

if %errorlevel% equ 0 (
    echo.
    echo ✅ Services stopped successfully!
    echo.
    echo 💡 To start again: start.bat
) else (
    echo.
    echo ❌ Failed to stop services
    echo 💡 Try: docker-compose down --remove-orphans
)

REM Return to root directory
cd ..
pause
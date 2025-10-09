@echo off
echo ========================================
echo God Bless Services Status
echo ========================================
echo.

cd god_bless_backend

echo Running containers:
echo.
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo ========================================
echo Service Health Check
echo ========================================
echo.

echo Checking Django API...
curl -s http://localhost:6161/api/ >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Django API is responding
) else (
    echo [ERROR] Django API is not responding
)

echo.
echo Checking Frontend...
curl -s http://localhost:4173 >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Frontend is responding
) else (
    echo [ERROR] Frontend is not responding
)

echo.
echo ========================================
pause

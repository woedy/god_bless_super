@echo off
echo ========================================
echo Stopping God Bless Services
echo ========================================
echo.

cd god_bless_backend

echo Stopping all containers...
docker-compose down

echo.
echo ========================================
echo All services stopped!
echo ========================================
echo.

pause

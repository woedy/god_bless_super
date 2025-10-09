@echo off
echo ========================================
echo Restarting God Bless with WebSocket Fix
echo ========================================
echo.

cd god_bless_backend

echo Stopping containers...
docker-compose down

echo.
echo Rebuilding containers with WebSocket support...
docker-compose up --build -d

echo.
echo Waiting for services to start...
timeout /t 20 /nobreak >nul

echo.
echo Running migrations...
docker exec god_bless_app python manage.py migrate

echo.
echo ========================================
echo Services restarted with Daphne (ASGI)!
echo ========================================
echo.
echo Backend API: http://localhost:6161
echo Frontend: http://localhost:4173
echo WebSocket: ws://localhost:6161/ws/tasks/
echo.
echo Check logs to verify Daphne is running:
echo   docker logs god_bless_app
echo.
echo You should see "Listening on TCP address" from Daphne
echo.
echo ========================================

pause

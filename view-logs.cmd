@echo off
echo ========================================
echo God Bless Service Logs
echo ========================================
echo.
echo Select a service to view logs:
echo 1. Django App
echo 2. Celery Worker
echo 3. Celery Beat
echo 4. PostgreSQL
echo 5. Redis
echo 6. Frontend
echo 7. All Services
echo.

set /p choice="Enter your choice (1-7): "

cd god_bless_backend

if "%choice%"=="1" (
    echo.
    echo Viewing Django App logs...
    docker logs -f god_bless_app
) else if "%choice%"=="2" (
    echo.
    echo Viewing Celery Worker logs...
    docker logs -f god_bless_celery
) else if "%choice%"=="3" (
    echo.
    echo Viewing Celery Beat logs...
    docker logs -f god_bless_celery_beat
) else if "%choice%"=="4" (
    echo.
    echo Viewing PostgreSQL logs...
    docker logs -f god_bless_postgres_db
) else if "%choice%"=="5" (
    echo.
    echo Viewing Redis logs...
    docker logs -f god_bless_redis
) else if "%choice%"=="6" (
    echo.
    echo Viewing Frontend logs...
    docker logs -f god_bless_backend-god_bless_frontend-1
) else if "%choice%"=="7" (
    echo.
    echo Viewing all service logs...
    docker-compose logs -f
) else (
    echo Invalid choice!
    pause
)

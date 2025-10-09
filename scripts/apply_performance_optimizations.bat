@echo off
REM Performance Optimization Application Script for Windows
REM This script applies all performance optimizations for the God Bless America platform

setlocal enabledelayedexpansion

echo === God Bless America Platform Performance Optimization ===
echo Starting performance optimization application...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running or not accessible
    exit /b 1
)
echo [SUCCESS] Docker is running

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] docker-compose is not installed
    exit /b 1
)
echo [SUCCESS] docker-compose is available

REM Check if .env.performance exists
if not exist ".env.performance" (
    echo [WARNING] .env.performance not found. Creating from example...
    copy ".env.performance.example" ".env.performance" >nul
    echo [INFO] Please edit .env.performance with your specific values
)

REM Create monitoring directories
if not exist "monitoring\scripts" mkdir "monitoring\scripts"
if not exist "nginx\cache\static" mkdir "nginx\cache\static"
if not exist "nginx\cache\api" mkdir "nginx\cache\api"
if not exist "nginx\cache\media" mkdir "nginx\cache\media"
if not exist "nginx\cache\fastcgi" mkdir "nginx\cache\fastcgi"
if not exist "redis\data" mkdir "redis\data"

echo [SUCCESS] Directory structure created

REM Create performance monitoring batch script
echo @echo off > "monitoring\scripts\performance_check.bat"
echo REM Performance monitoring script for Windows >> "monitoring\scripts\performance_check.bat"
echo. >> "monitoring\scripts\performance_check.bat"
echo set LogFile=god_bless_backend\logs\performance_check.log >> "monitoring\scripts\performance_check.bat"
echo set Timestamp=%%date%% %%time%% >> "monitoring\scripts\performance_check.bat"
echo. >> "monitoring\scripts\performance_check.bat"
echo echo [!Timestamp!] Starting performance check... ^>^> "!LogFile!" >> "monitoring\scripts\performance_check.bat"
echo. >> "monitoring\scripts\performance_check.bat"
echo REM Check container resource usage >> "monitoring\scripts\performance_check.bat"
echo docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" ^>^> "!LogFile!" 2^>^&1 >> "monitoring\scripts\performance_check.bat"
echo. >> "monitoring\scripts\performance_check.bat"
echo echo [!Timestamp!] Performance check completed. ^>^> "!LogFile!" >> "monitoring\scripts\performance_check.bat"

echo [SUCCESS] Performance monitoring script created

REM Create health check batch script
echo @echo off > "scripts\health_check.bat"
echo REM Comprehensive health check for God Bless America platform >> "scripts\health_check.bat"
echo. >> "scripts\health_check.bat"
echo echo === God Bless America Platform Health Check === >> "scripts\health_check.bat"
echo echo Timestamp: %%date%% %%time%% >> "scripts\health_check.bat"
echo echo. >> "scripts\health_check.bat"
echo. >> "scripts\health_check.bat"
echo echo Checking service status... >> "scripts\health_check.bat"
echo. >> "scripts\health_check.bat"
echo REM Check if containers are running >> "scripts\health_check.bat"
echo docker ps --filter "name=god_bless_database" --filter "status=running" ^| findstr "god_bless_database" ^>nul ^&^& echo [SUCCESS] Database is running ^|^| echo [ERROR] Database is not running >> "scripts\health_check.bat"
echo docker ps --filter "name=god_bless_redis" --filter "status=running" ^| findstr "god_bless_redis" ^>nul ^&^& echo [SUCCESS] Redis is running ^|^| echo [ERROR] Redis is not running >> "scripts\health_check.bat"
echo docker ps --filter "name=god_bless_backend" --filter "status=running" ^| findstr "god_bless_backend" ^>nul ^&^& echo [SUCCESS] Backend is running ^|^| echo [ERROR] Backend is not running >> "scripts\health_check.bat"
echo docker ps --filter "name=god_bless_celery_worker" --filter "status=running" ^| findstr "god_bless_celery_worker" ^>nul ^&^& echo [SUCCESS] Celery Worker is running ^|^| echo [ERROR] Celery Worker is not running >> "scripts\health_check.bat"
echo docker ps --filter "name=god_bless_nginx" --filter "status=running" ^| findstr "god_bless_nginx" ^>nul ^&^& echo [SUCCESS] Nginx is running ^|^| echo [ERROR] Nginx is not running >> "scripts\health_check.bat"
echo. >> "scripts\health_check.bat"
echo echo. >> "scripts\health_check.bat"
echo echo Checking resource usage... >> "scripts\health_check.bat"
echo docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" >> "scripts\health_check.bat"
echo. >> "scripts\health_check.bat"
echo echo. >> "scripts\health_check.bat"
echo echo Health check completed. >> "scripts\health_check.bat"

echo [SUCCESS] Health check script created

REM Create Redis monitoring script
echo @echo off > "monitoring\scripts\redis_monitor.bat"
echo REM Redis performance monitoring script >> "monitoring\scripts\redis_monitor.bat"
echo. >> "monitoring\scripts\redis_monitor.bat"
echo set RedisContainer=god_bless_redis >> "monitoring\scripts\redis_monitor.bat"
echo set LogFile=god_bless_backend\logs\redis_monitor.log >> "monitoring\scripts\redis_monitor.bat"
echo set Timestamp=%%date%% %%time%% >> "monitoring\scripts\redis_monitor.bat"
echo. >> "monitoring\scripts\redis_monitor.bat"
echo echo [!Timestamp!] Redis monitoring check... ^>^> "!LogFile!" >> "monitoring\scripts\redis_monitor.bat"
echo. >> "monitoring\scripts\redis_monitor.bat"
echo REM Check Redis memory usage >> "monitoring\scripts\redis_monitor.bat"
echo docker exec !RedisContainer! redis-cli INFO memory ^| findstr "used_memory_human" ^>^> "!LogFile!" 2^>^&1 >> "monitoring\scripts\redis_monitor.bat"
echo. >> "monitoring\scripts\redis_monitor.bat"
echo REM Check Redis connection count >> "monitoring\scripts\redis_monitor.bat"
echo docker exec !RedisContainer! redis-cli INFO clients ^| findstr "connected_clients" ^>^> "!LogFile!" 2^>^&1 >> "monitoring\scripts\redis_monitor.bat"
echo. >> "monitoring\scripts\redis_monitor.bat"
echo echo [!Timestamp!] Redis monitoring completed. ^>^> "!LogFile!" >> "monitoring\scripts\redis_monitor.bat"

echo [SUCCESS] Redis monitoring script created

REM Create database monitoring script
echo @echo off > "monitoring\scripts\db_monitor.bat"
echo REM Database performance monitoring script >> "monitoring\scripts\db_monitor.bat"
echo. >> "monitoring\scripts\db_monitor.bat"
echo set DbContainer=god_bless_database >> "monitoring\scripts\db_monitor.bat"
echo set LogFile=god_bless_backend\logs\db_monitor.log >> "monitoring\scripts\db_monitor.bat"
echo set Timestamp=%%date%% %%time%% >> "monitoring\scripts\db_monitor.bat"
echo if not defined POSTGRES_USER set POSTGRES_USER=god_bless_user >> "monitoring\scripts\db_monitor.bat"
echo if not defined POSTGRES_DB set POSTGRES_DB=god_bless_db >> "monitoring\scripts\db_monitor.bat"
echo. >> "monitoring\scripts\db_monitor.bat"
echo echo [!Timestamp!] Database monitoring check... ^>^> "!LogFile!" >> "monitoring\scripts\db_monitor.bat"
echo. >> "monitoring\scripts\db_monitor.bat"
echo REM Check database size >> "monitoring\scripts\db_monitor.bat"
echo docker exec !DbContainer! psql -U !POSTGRES_USER! -d !POSTGRES_DB! -c "SELECT pg_size_pretty(pg_database_size(current_database()));" ^>^> "!LogFile!" 2^>^&1 >> "monitoring\scripts\db_monitor.bat"
echo. >> "monitoring\scripts\db_monitor.bat"
echo REM Check connection count >> "monitoring\scripts\db_monitor.bat"
echo docker exec !DbContainer! psql -U !POSTGRES_USER! -d !POSTGRES_DB! -c "SELECT count(*) FROM pg_stat_activity;" ^>^> "!LogFile!" 2^>^&1 >> "monitoring\scripts\db_monitor.bat"
echo. >> "monitoring\scripts\db_monitor.bat"
echo echo [!Timestamp!] Database monitoring completed. ^>^> "!LogFile!" >> "monitoring\scripts\db_monitor.bat"

echo [SUCCESS] Database monitoring script created

REM Test the setup
echo [INFO] Testing Docker connectivity...
docker ps >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Docker connectivity test failed
) else (
    echo [SUCCESS] Docker connectivity test passed
)

echo.
echo [SUCCESS] Performance optimization application completed!
echo.
echo Next steps:
echo 1. Review and edit .env.performance with your specific values
echo 2. Restart Docker Desktop if needed
echo 3. Restart the application: docker-compose down ^&^& docker-compose up -d
echo 4. Run health check: scripts\health_check.bat
echo 5. Monitor performance: monitoring\scripts\performance_check.bat
echo.
echo [INFO] Performance optimization setup is complete!

pause
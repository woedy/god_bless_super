@echo off
setlocal enabledelayedexpansion

REM God Bless Super - Easy Deployment Script for Coolify (Windows)
REM This script helps you deploy your application to Coolify with proper environment setup

echo 🚀 Starting God Bless Super Deployment Process...

REM Check if required files exist
echo [INFO] Checking required files...
set "required_files=Dockerfile.prod docker-compose.prod.yml god_bless_backend\requirements.txt god_bless_platform\package.json start-prod.sh nginx.prod.conf"

for %%f in (%required_files%) do (
    if not exist "%%f" (
        echo [ERROR] Required file missing: %%f
        exit /b 1
    )
)

echo [SUCCESS] All required files found!

REM Check environment variables
echo [INFO] Checking environment variables...

if "%SECRET_KEY%"=="" (
    echo [WARNING] SECRET_KEY not set. Please set it before deployment.
    echo Example: set SECRET_KEY=your-secret-key-here
    set /p SECRET_KEY="Enter SECRET_KEY (or press Enter to generate one): "
    if "!SECRET_KEY!"=="" (
        echo [ERROR] SECRET_KEY is required for production deployment!
        exit /b 1
    )
)

if "%POSTGRES_PASSWORD%"=="" (
    echo [ERROR] POSTGRES_PASSWORD must be set for production deployment!
    echo Example: set POSTGRES_PASSWORD=your-secure-password
    exit /b 1
)

if "%REDIS_PASSWORD%"=="" (
    echo [WARNING] REDIS_PASSWORD not set. Using default...
    set "REDIS_PASSWORD=development-redis-password-123"
)

if "%DOMAIN%"=="" (
    echo [ERROR] DOMAIN must be set for production deployment!
    echo Example: set DOMAIN=yourdomain.com
    exit /b 1
)

echo [SUCCESS] Environment variables validated!

REM Test Docker build locally if requested
if "%1"=="--test-build" (
    echo [INFO] Testing Docker build locally...
    
    REM Build frontend first
    echo [INFO] Building frontend...
    cd god_bless_platform
    call npm install
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Frontend build failed!
        cd ..
        exit /b 1
    )
    cd ..
    
    REM Build Docker image
    echo [INFO] Building Docker image...
    docker build -f Dockerfile.prod -t god-bless-super:test .
    if errorlevel 1 (
        echo [ERROR] Docker build test failed!
        exit /b 1
    ) else (
        echo [SUCCESS] Docker build test passed!
        docker rmi god-bless-super:test
    )
)

REM Create environment file for Coolify
echo [INFO] Creating environment configuration...
(
echo # Database Configuration
echo POSTGRES_DB=god_bless_db
echo POSTGRES_USER=god_bless_user
echo POSTGRES_PASSWORD=%POSTGRES_PASSWORD%
echo POSTGRES_HOST=database
echo POSTGRES_PORT=5432
echo.
echo # Redis Configuration
echo REDIS_HOST=redis
echo REDIS_PORT=6379
echo REDIS_PASSWORD=%REDIS_PASSWORD%
echo.
echo # Django Configuration
echo SECRET_KEY=%SECRET_KEY%
echo DEBUG=false
echo USE_POSTGRES=true
echo ALLOWED_HOSTS=%DOMAIN%
echo.
echo # CORS ^& Security
echo CORS_ALLOWED_ORIGINS=https://%DOMAIN%
echo CSRF_TRUSTED_ORIGINS=https://%DOMAIN%
echo.
echo # Email Configuration ^(Optional^)
echo EMAIL_HOST=%EMAIL_HOST%
echo EMAIL_HOST_USER=%EMAIL_HOST_USER%
echo EMAIL_HOST_PASSWORD=%EMAIL_HOST_PASSWORD%
echo EMAIL_PORT=%EMAIL_PORT%
echo EMAIL_USE_TLS=%EMAIL_USE_TLS%
) > .env.production

echo [SUCCESS] Environment configuration created: .env.production

REM Display deployment instructions
echo.
echo [INFO] Deployment Instructions for Coolify:
echo.
echo 1. 📁 Upload your project to Coolify ^(or connect your Git repository^)
echo 2. 🔧 Set the following environment variables in Coolify:
echo.
echo    Required Variables:
echo    - SECRET_KEY=%SECRET_KEY%
echo    - POSTGRES_PASSWORD=%POSTGRES_PASSWORD%
echo    - REDIS_PASSWORD=%REDIS_PASSWORD%
echo    - DOMAIN=%DOMAIN%
echo.
echo    Optional Variables:
echo    - EMAIL_HOST=%EMAIL_HOST%
echo    - EMAIL_HOST_USER=%EMAIL_HOST_USER%
echo    - EMAIL_HOST_PASSWORD=%EMAIL_HOST_PASSWORD%
echo.
echo 3. 🐳 Use the following Docker configuration:
echo    - Dockerfile: Dockerfile.prod
echo    - Docker Compose: docker-compose.prod.yml
echo.
echo 4. 🚀 Deploy and monitor the logs for any issues
echo.

REM Cleanup
del .env.production 2>nul

echo [SUCCESS] Deployment preparation complete!
echo [INFO] Your application is ready for Coolify deployment!
echo.
echo [WARNING] Remember to:
echo   - Set up SSL certificates in Coolify
echo   - Configure your domain DNS to point to Coolify
echo   - Monitor the application logs after deployment
echo.

pause

@echo off
REM Simple script to test local Docker deployment on Windows

echo 🧪 Testing God Bless Backend + Frontend Local Deployment
echo ======================================================

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo ✅ Docker is running

REM Check if docker-compose file exists
if not exist "docker-compose.yml" (
    echo ❌ docker-compose.yml not found
    pause
    exit /b 1
)

echo ✅ docker-compose.yml found

REM Check if .env.sqlite exists
if not exist ".env.sqlite" (
    echo ❌ .env.sqlite not found
    pause
    exit /b 1
)

echo ✅ .env.sqlite found

REM Clean up any existing containers
echo 🧹 Cleaning up existing containers...
docker-compose down >nul 2>&1

REM Build the images
echo 🔨 Building Docker images...
docker-compose build --no-cache
if errorlevel 1 (
    echo ❌ Build failed. Check the errors above.
    pause
    exit /b 1
)

echo ✅ Docker images built successfully

REM Start Redis first
echo 🚀 Starting Redis...
docker-compose up -d redis

REM Wait for Redis to be ready
echo ⏳ Waiting for Redis to be ready...
timeout /t 5 /nobreak >nul

REM Check Redis health
docker-compose exec redis redis-cli ping | findstr /C:"PONG" >nul
if errorlevel 1 (
    echo ❌ Redis failed to start
    docker-compose logs redis
    pause
    exit /b 1
) else (
    echo ✅ Redis is ready
)

REM Start the backend and frontend together
echo 🚀 Starting backend and frontend...
docker-compose up -d backend frontend

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 15 /nobreak >nul

REM Check if backend is responding
curl -f http://localhost:6161/api/health/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend is not responding
    echo.
    echo 🔍 Debugging information:
    docker-compose logs backend
    pause
    exit /b 1
) else (
    echo ✅ Backend is responding on http://localhost:6161
)

REM Check if frontend is responding
curl -f http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend is not responding
    echo.
    echo 🔍 Debugging information:
    docker-compose logs frontend
    pause
    exit /b 1
) else (
    echo ✅ Frontend is responding on http://localhost:5173
)

echo.
echo 🎉 Full-stack deployment test completed successfully!
echo.
echo 🌐 Access your application:
echo   Frontend: http://localhost:5173
echo   Backend API: http://localhost:6161/api/
echo   API Health: http://localhost:6161/api/health/
echo.
echo 📝 Services running:
echo   - Redis: ✅ Running (port 6379)
echo   - Backend: ✅ Running (port 6161)
echo   - Frontend: ✅ Running (port 5173)
echo.
echo 🔧 Useful commands:
echo   - View logs: docker-compose logs -f
echo   - View specific service logs: docker-compose logs -f backend
echo   - Stop all: docker-compose down
echo   - Restart: docker-compose restart

echo.
echo Press any key to continue...
pause >nul

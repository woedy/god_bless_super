#!/bin/bash

# Simple script to test local Docker deployment
echo "🧪 Testing God Bless Backend Local Deployment"
echo "==============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"

# Check if docker-compose file exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found"
    exit 1
fi

echo "✅ docker-compose.yml found"

# Check if .env.sqlite exists
if [ ! -f ".env.sqlite" ]; then
    echo "❌ .env.sqlite not found"
    exit 1
fi

echo "✅ .env.sqlite found"

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose down > /dev/null 2>&1

# Build the images
echo "🔨 Building Docker images..."
if docker-compose build --no-cache 2>&1 | grep -q "ERROR"; then
    echo "❌ Build failed. Check the errors above."
    exit 1
fi

echo "✅ Docker images built successfully"

# Start Redis first
echo "🚀 Starting Redis..."
docker-compose up -d redis

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
sleep 5

# Check Redis health
if docker-compose exec redis redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis failed to start"
    docker-compose logs redis
    exit 1
fi

# Start the backend
echo "🚀 Starting backend..."
docker-compose up -d backend

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 10

# Check if backend is responding
if curl -f http://localhost:6161/api/health/ > /dev/null 2>&1; then
    echo "✅ Backend is responding on http://localhost:6161"
    echo ""
    echo "🎉 Local deployment test completed successfully!"
    echo ""
    echo "📝 Summary:"
    echo "  - Redis: ✅ Running"
    echo "  - Backend: ✅ Running on port 6161"
    echo "  - Frontend: Not tested (run with 'docker-compose --profile frontend up' if needed)"
    echo ""
    echo "🔧 Useful commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Stop all: docker-compose down"
    echo "  - Start with frontend: docker-compose --profile frontend up -d"
else
    echo "❌ Backend is not responding"
    echo ""
    echo "🔍 Debugging information:"
    docker-compose logs backend
    exit 1
fi

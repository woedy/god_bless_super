#!/bin/bash

echo "🚀 Testing God Bless Platform Deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Copying from .env.production..."
    cp .env.production .env
    echo "📝 Please edit .env file with your actual values before proceeding."
    exit 1
fi

echo "✅ Environment file found"

# Build the images
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Check the logs above."
    exit 1
fi

echo "✅ Build completed successfully"

# Start the services
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "📊 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# Test health endpoints
echo "🏥 Testing health endpoints..."

# Test API health
if curl -f http://localhost/api/health/ > /dev/null 2>&1; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed"
fi

# Test API root
if curl -f http://localhost/api/ > /dev/null 2>&1; then
    echo "✅ API root endpoint accessible"
else
    echo "❌ API root endpoint failed"
fi

# Test frontend
if curl -f http://localhost/ > /dev/null 2>&1; then
    echo "✅ Frontend accessible"
else
    echo "❌ Frontend failed"
fi

echo ""
echo "🎉 Deployment test completed!"
echo ""
echo "📋 Access your application:"
echo "   Frontend: http://localhost/"
echo "   API: http://localhost/api/"
echo "   Admin: http://localhost/admin/"
echo "   Health: http://localhost/api/health/"
echo ""
echo "📊 View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "🛑 Stop services: docker-compose -f docker-compose.prod.yml down"
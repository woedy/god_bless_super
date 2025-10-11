#!/bin/bash

# Quick startup script for God Bless Platform (Backend + Frontend)
echo "🚀 Starting God Bless Platform (Backend + Frontend)..."
echo "======================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"

# Clean up any existing containers (optional)
echo "🧹 Cleaning up existing containers..."
docker-compose down > /dev/null 2>&1

# Start all services
echo "🔥 Starting Redis, Backend, and Frontend..."
docker-compose up -d redis backend frontend

echo ""
echo "⏳ Waiting for services to start up..."
sleep 10

echo ""
echo "🎉 God Bless Platform is starting up!"
echo ""
echo "📍 Access your application at:"
echo "   🌐 Frontend: http://localhost:5173"
echo "   🔗 Backend API: http://localhost:6161/api/"
echo ""
echo "🔧 Quick commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop all:  docker-compose down"
echo "   Restart:   docker-compose restart"
echo ""
echo "The platform should be fully loaded in a few moments!"

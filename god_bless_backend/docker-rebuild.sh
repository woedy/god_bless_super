#!/bin/bash

echo "Stopping existing containers..."
docker-compose down

echo "Rebuilding containers..."
docker-compose build --no-cache

echo "Starting containers..."
docker-compose up -d

echo "Checking container status..."
docker-compose ps

echo "Following logs (Ctrl+C to exit)..."
docker-compose logs -f god_bless_app
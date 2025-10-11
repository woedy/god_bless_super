#!/bin/bash

echo "=== Simple Docker Test ==="

# Stop any running containers
echo "Stopping existing containers..."
docker-compose down

# Remove any existing images to force rebuild
echo "Removing existing images..."
docker-compose down --rmi all

# Build and test
echo "Building new image..."
docker-compose build --no-cache backend

echo "Testing if entrypoint script exists in container..."
docker-compose run --rm backend /bin/bash -c "
echo 'Working directory:'
pwd
echo 'Listing files:'
ls -la /god_bless_django/
echo 'Checking entrypoint script:'
ls -la /god_bless_django/docker-entrypoint-sqlite.sh
echo 'Testing script content:'
head -3 /god_bless_django/docker-entrypoint-sqlite.sh
"

echo "=== Test Complete ==="

#!/bin/bash

echo "Testing Docker entrypoint script..."

# Build the image
echo "Building Docker image..."
docker build -f Dockerfile.local -t god-bless-local .

# Test if the entrypoint script exists and is executable
echo "Testing entrypoint script in container..."
docker run --rm god-bless-local /bin/bash -c "
echo 'Checking if entrypoint script exists:'
ls -la /god_bless_django/docker-entrypoint-sqlite.sh
echo 'Testing script execution:'
head -5 /god_bless_django/docker-entrypoint-sqlite.sh
echo 'Script test complete'
"

echo "Test complete!"

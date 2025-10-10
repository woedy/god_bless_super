#!/bin/bash
set -e

echo "Starting God Bless Platform Production..."

# Wait for database
echo "Waiting for database..."
while ! pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER; do
    echo "Database is unavailable - sleeping"
    sleep 2
done
echo "Database is ready!"

# Wait for Redis
echo "Waiting for Redis..."
while ! redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping; do
    echo "Redis is unavailable - sleeping"
    sleep 2
done
echo "Redis is ready!"

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Run django-celery-beat migrations specifically
echo "Running django-celery-beat migrations..."
python manage.py migrate django_celery_beat --noinput

# Create superuser if specified
if [ "$CREATE_SUPERUSER" = "true" ]; then
    echo "Creating superuser..."
    python manage.py shell << EOF
from django.contrib.auth import get_user_model
import os
User = get_user_model()
username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'changeme')

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f'Superuser {username} created successfully')
else:
    print(f'Superuser {username} already exists')
EOF
fi

# Debug: Show directory structure
echo "=== Directory Structure Debug ==="
echo "App directory contents:"
ls -la /app/
echo ""
echo "Frontend build contents:"
ls -la /app/frontend_build/ || echo "Frontend build directory not found"
echo ""
echo "Static files contents:"
ls -la /app/static_cdn/ || echo "Static cdn directory not found"
ls -la /app/static_cdn/static_root/ || echo "Static root directory not found"
echo "=== End Debug ==="

# Check frontend build exists (create fallback if missing)
if [ ! -d "/app/frontend_build" ] || [ ! -f "/app/frontend_build/index.html" ]; then
    echo "WARNING: Frontend build not found at /app/frontend_build/"
    echo "Creating fallback frontend directory..."
    mkdir -p /app/frontend_build
    cat > /app/frontend_build/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>God Bless Platform</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 600px; margin: 0 auto; }
        .status { padding: 20px; background: #f0f0f0; border-radius: 5px; }
        .api-link { color: #007bff; text-decoration: none; }
        .api-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>God Bless Platform</h1>
        <div class="status">
            <h2>System Status</h2>
            <p>✅ Backend API is running</p>
            <p>⚠️ Frontend build not available</p>
            <p>Access the API at: <a href="/api/" class="api-link">/api/</a></p>
            <p>Access admin at: <a href="/admin/" class="api-link">/admin/</a></p>
        </div>
    </div>
</body>
</html>
EOF
    echo "Fallback frontend created"
fi

# Ensure static files directory exists
if [ ! -d "/app/static_cdn/static_root" ]; then
    echo "WARNING: Static files not found, creating directory..."
    mkdir -p /app/static_cdn/static_root
fi

# Test Nginx configuration
echo "Testing Nginx configuration..."
nginx -t

# Start Nginx
echo "Starting Nginx..."
nginx

# Start Django with Daphne (for WebSocket support)
echo "Starting Django application..."
exec daphne -b 127.0.0.1 -p 8000 god_bless_pro.asgi:application
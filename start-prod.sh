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

# Start Nginx
echo "Starting Nginx..."
nginx

# Start Django with Daphne (for WebSocket support)
echo "Starting Django application..."
exec daphne -b 127.0.0.1 -p 8000 god_bless_pro.asgi:application
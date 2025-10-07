#!/bin/bash
set -e

echo "Starting God Bless Backend..."

# Wait for database to be ready
echo "Waiting for database..."
while ! pg_isready -h ${POSTGRES_HOST:-db} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-god_bless_postgres}; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "Database is up!"

# Wait for Redis to be ready
echo "Waiting for Redis..."
until redis-cli -h ${REDIS_HOST:-redis} -p ${REDIS_PORT:-6379} ping 2>/dev/null; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "Redis is up!"

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create superuser if it doesn't exist (only in non-production or first setup)
if [ "$CREATE_SUPERUSER" = "true" ]; then
  echo "Creating superuser..."
  python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='${DJANGO_SUPERUSER_USERNAME:-admin}').exists():
    User.objects.create_superuser(
        username='${DJANGO_SUPERUSER_USERNAME:-admin}',
        email='${DJANGO_SUPERUSER_EMAIL:-admin@example.com}',
        password='${DJANGO_SUPERUSER_PASSWORD:-changeme}'
    )
    print('Superuser created successfully')
else:
    print('Superuser already exists')
END
fi

# Load initial data if specified
if [ "$LOAD_INITIAL_DATA" = "true" ]; then
  echo "Loading initial data..."
  python manage.py loaddata initial_data.json || echo "No initial data to load"
fi

echo "Starting application..."
exec "$@"

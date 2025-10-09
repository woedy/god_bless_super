#!/bin/bash
set -e

# Function to log with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting God Bless Backend with SQLite..."

# Create log directories if they don't exist
mkdir -p /god_bless_django/logs/django /god_bless_django/logs/celery /god_bless_django/logs/daphne

# Set proper permissions for log directories
chmod -R 755 /god_bless_django/logs

# Wait for Redis to be ready
log "Waiting for Redis..."
counter=0
while ! redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT:-6379} ${REDIS_PASSWORD:+-a $REDIS_PASSWORD} ping >/dev/null 2>&1; do
    if [ $counter -ge 60 ]; then
        log "ERROR: Redis is not available after 60s timeout"
        exit 1
    fi
    log "Redis is unavailable - sleeping (${counter}/60s)"
    sleep 2
    counter=$((counter + 2))
done
log "Redis is ready!"

# Check if SQLite database exists
if [ -f "/god_bless_django/db.sqlite3" ]; then
    log "Found existing SQLite database"
else
    log "No SQLite database found, will create new one"
fi

# Run migrations (this will create tables if they don't exist)
log "Running database migrations..."
python manage.py migrate

# Collect static files
log "Collecting static files..."
python manage.py collectstatic --noinput --clear || {
    log "WARNING: Static files collection failed, continuing..."
}

log "Initialization complete. Starting application..."
exec "$@"
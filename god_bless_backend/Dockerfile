# Development Dockerfile with security hardening
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    redis-tools \
    gcc \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    libffi-dev \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for development
RUN groupadd -r -g 1000 appgroup && \
    useradd -r -u 1000 -g appgroup -m -d /app -s /bin/bash appuser

# Create application directories
RUN mkdir -p /god_bless_django /god_bless_django/static_cdn /god_bless_django/media /god_bless_django/logs && \
    chown -R appuser:appgroup /god_bless_django

WORKDIR /god_bless_django

# Copy requirements and install Python dependencies
COPY requirements.txt requirements-test.txt ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir -r requirements-test.txt

# Copy application code with proper ownership
COPY --chown=appuser:appgroup . .

# Create entrypoint script directly in the container
RUN cat > /god_bless_django/docker-entrypoint.sh << 'EOF'
#!/bin/bash
set -e

# Function to log with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Function to wait for service with timeout
wait_for_service() {
    local service_name=$1
    local check_command=$2
    local timeout=${3:-60}
    local counter=0
    
    log "Waiting for $service_name..."
    while ! eval "$check_command" >/dev/null 2>&1; do
        if [ $counter -ge $timeout ]; then
            log "ERROR: $service_name is not available after ${timeout}s timeout"
            exit 1
        fi
        log "$service_name is unavailable - sleeping (${counter}/${timeout}s)"
        sleep 2
        counter=$((counter + 2))
    done
    log "$service_name is ready!"
}

log "Starting God Bless Backend..."

# Validate required environment variables
required_vars=("POSTGRES_HOST" "POSTGRES_DB" "POSTGRES_USER" "REDIS_HOST")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log "ERROR: Required environment variable $var is not set"
        exit 1
    fi
done

# Wait for database to be ready
wait_for_service "PostgreSQL Database" \
    "pg_isready -h ${POSTGRES_HOST} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER}" \
    90

# Wait for Redis to be ready
wait_for_service "Redis Cache" \
    "redis-cli -h ${REDIS_HOST} -p ${REDIS_PORT:-6379} ${REDIS_PASSWORD:+-a $REDIS_PASSWORD} ping" \
    60

# Test database connection
log "Testing database connection..."
python -c "
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()
from django.db import connection
cursor = connection.cursor()
cursor.execute('SELECT 1')
print('Database connection successful')
" || {
    log "ERROR: Database connection failed"
    exit 1
}

# Run database initialization and migrations
log "Running database initialization..."
python scripts/db_init.py || {
    log "ERROR: Database initialization failed"
    exit 1
}

# Collect static files
log "Collecting static files..."
python manage.py collectstatic --noinput --clear || {
    log "WARNING: Static files collection failed, continuing..."
}

# Create superuser if it doesn't exist (only in non-production or first setup)
if [ "$CREATE_SUPERUSER" = "true" ]; then
    log "Creating superuser..."
    python manage.py shell << 'END' || log "WARNING: Superuser creation failed"
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
END
fi

# Load initial data if specified
if [ "$LOAD_INITIAL_DATA" = "true" ]; then
    log "Loading initial data..."
    python manage.py loaddata initial_data.json || log "WARNING: No initial data to load"
fi

# Create log directories if they don't exist
mkdir -p /god_bless_django/logs/django /god_bless_django/logs/celery /god_bless_django/logs/daphne

# Set proper permissions for log directories
chmod -R 755 /god_bless_django/logs

log "Initialization complete. Starting application..."
exec "$@"
EOF

RUN chmod +x /god_bless_django/docker-entrypoint.sh && chown appuser:appgroup /god_bless_django/docker-entrypoint.sh

# Keep running as root for now to avoid permission issues
# USER appuser

# Expose port
EXPOSE 8000

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# Default command for development with initialization
CMD ["/bin/bash", "-c", "/god_bless_django/docker-entrypoint.sh python manage.py runserver 0.0.0.0:8000"]

# Simplified Development Dockerfile
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

# Create application directories
RUN mkdir -p /god_bless_django /god_bless_django/static_cdn /god_bless_django/media /god_bless_django/logs

WORKDIR /god_bless_django

# Copy requirements and install Python dependencies
COPY requirements.txt requirements-test.txt ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir -r requirements-test.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN groupadd -r -g 1000 appgroup && \
    useradd -r -u 1000 -g appgroup -m -d /god_bless_django -s /bin/bash appuser && \
    chown -R appuser:appgroup /god_bless_django

# Switch to non-root user
USER appuser

# Ensure logs directory exists and is writable
RUN mkdir -p /god_bless_django/logs && \
    chmod -R 755 /god_bless_django/logs

# Expose port
EXPOSE 6161

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:6161/api/health/ || exit 1

# Default command for development
CMD ["python", "manage.py", "runserver", "0.0.0.0:6161"]

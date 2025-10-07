FROM python:3.9-slim

ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    redis-tools \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /god_bless_django

# Copy requirements and install Python dependencies
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create startup script inline
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Starting God Bless Backend..."\n\
echo "Waiting for database..."\n\
while ! pg_isready -h ${POSTGRES_HOST:-db} -p ${POSTGRES_PORT:-5432} -U ${POSTGRES_USER:-god_bless_postgres}; do\n\
  echo "Database is unavailable - sleeping"\n\
  sleep 2\n\
done\n\
echo "Database is up!"\n\
echo "Running migrations..."\n\
python manage.py migrate --noinput\n\
echo "Collecting static files..."\n\
python manage.py collectstatic --noinput --clear\n\
echo "Starting application..."\n\
exec "$@"' > /startup.sh && chmod +x /startup.sh

ENTRYPOINT ["/startup.sh"]

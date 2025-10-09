# Technology Stack

## Backend (god_bless_backend)

**Framework**: Django 5.1+ with Django REST Framework
**Database**: PostgreSQL (production) / SQLite (development)
**Cache & Message Broker**: Redis
**Task Queue**: Celery with django-celery-beat
**WebSockets**: Django Channels with channels-redis
**Authentication**: Token-based authentication
**Server**: Gunicorn with Daphne for ASGI

### Key Dependencies
- `djangorestframework` - API development
- `celery` - Background task processing
- `channels` - WebSocket support
- `redis` - Caching and message broker
- `psycopg2-binary` - PostgreSQL adapter
- `phonenumbers` - Phone number validation
- `requests` - HTTP client
- `bleach` - HTML sanitization

## Frontend (god_bless_frontend)

**Framework**: React 18 with TypeScript
**Build Tool**: Vite 4
**Styling**: Tailwind CSS 3
**UI Components**: TailAdmin template base
**Charts**: ApexCharts with react-apexcharts
**Routing**: React Router DOM 6
**State Management**: React hooks (no external state library)
**Testing**: Vitest with Testing Library

### Key Dependencies
- `react` & `react-dom` - Core React
- `react-router-dom` - Client-side routing
- `apexcharts` - Data visualization
- `react-hot-toast` - Notifications
- `papaparse` - CSV parsing
- `file-saver` - File downloads

## Infrastructure

**Containerization**: Docker with docker-compose
**Reverse Proxy**: Nginx
**Monitoring**: Prometheus, Grafana, Loki (optional)
**SSL**: Let's Encrypt with Certbot

## Common Commands

### Backend Development
```bash
# Setup virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Database operations
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Run development server
python manage.py runserver

# Run Celery worker (separate terminal)
celery -A god_bless_pro worker -l info

# Run Celery beat scheduler (separate terminal)
celery -A god_bless_pro beat -l info

# Run tests
python -m pytest
```

### Frontend Development
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
npm run test:watch
npm run test:coverage
```

### Docker Operations
```bash
# Local development
docker-compose up -d

# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f [service_name]

# Rebuild specific service
docker-compose build [service_name]
```

## Environment Configuration

- Use `.env.local` for local development
- Use `.env.example` as template
- Production uses environment variables in docker-compose
- Frontend uses `VITE_` prefixed environment variables
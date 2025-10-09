# Technology Stack

## Backend (god_bless_backend/)
- **Framework**: Django 4+ with Django REST Framework
- **Database**: PostgreSQL (production) / SQLite (development)
- **Cache**: Redis with django-redis
- **Task Queue**: Celery with Redis broker
- **WebSockets**: Django Channels with channels-redis
- **Authentication**: JWT with djangorestframework-simplejwt
- **Server**: Gunicorn (production) / Django dev server (development)

## Frontend (god_bless_platform/)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 3 with forms and typography plugins
- **Routing**: React Router DOM 7
- **Testing**: Vitest with React Testing Library
- **Linting**: ESLint 9 with TypeScript support

## Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Web Server**: Nginx (production frontend)
- **Environment**: Environment-based configuration with .env files

## Common Commands

### Backend Development
```bash
# Setup virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-test.txt

# Database operations
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic

# Run development server
python manage.py runserver

# Run tests
python run_tests.py
pytest

# Switch database backends
switch_to_sqlite.bat
switch_to_postgres.bat
```

### Frontend Development
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build and test
npm run build
npm run test
npm run test:coverage

# Linting
npm run lint
npm run lint:fix
npm run type-check
```

### Docker Operations
```bash
# Backend
docker build -t god_bless_backend .
docker-compose up

# Frontend
docker build -t god_bless_platform .
docker run -p 80:80 god_bless_platform
```

## Key Libraries
- **Phone Processing**: phonenumbers for validation
- **HTTP Requests**: requests (backend), fetch API (frontend)
- **Real-time**: WebSocket API with custom hooks
- **UI Components**: React Icons, react-hot-toast
- **Data Analysis**: numpy, scipy for A/B testing
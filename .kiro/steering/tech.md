# Technology Stack

## Backend (Django)
- **Framework**: Django 4.x with Django REST Framework
- **Database**: PostgreSQL (production), SQLite (development)
- **Cache/Message Broker**: Redis
- **Background Tasks**: Celery with Celery Beat for scheduling
- **Authentication**: JWT tokens via djangorestframework-simplejwt
- **ASGI Server**: Daphne for WebSocket support
- **WSGI Server**: Gunicorn for production
- **Additional Libraries**:
  - `phonenumbers` for phone validation
  - `pyfcm` for Firebase Cloud Messaging
  - `beautifulsoup4` for web scraping
  - `requests` for HTTP clients
  - `Pillow` for image processing

## Frontend (React)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Custom components based on TailAdmin template
- **Charts**: ApexCharts via react-apexcharts
- **Routing**: React Router DOM
- **Notifications**: React Hot Toast
- **Data Processing**: PapaParse for CSV, json2csv for exports
- **Icons**: React Icons

## Development & Deployment
- **Containerization**: Docker with Docker Compose
- **Code Formatting**: Prettier with Tailwind plugin
- **Package Management**: npm (frontend), pip (backend)

## Common Commands

### Backend Development
```bash
# Navigate to backend
cd god_bless_backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver 0.0.0.0:6161

# Run Celery worker
celery -A god_bless_pro worker -l DEBUG

# Run Celery beat scheduler
celery -A god_bless_pro beat -l DEBUG
```

### Frontend Development
```bash
# Navigate to frontend
cd god_bless_frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker Commands
```bash
# Build and run all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service_name]
```

## Port Configuration
- **Backend API**: 6161
- **Frontend Dev**: 5173
- **Frontend Preview**: 4173
- **PostgreSQL**: 5432 (internal)
- **Redis**: 6379 (internal)
# Project Structure

## Root Directory Organization

```
├── god_bless_backend/     # Django backend application
├── god_bless_frontend/    # React frontend application
├── nginx/                 # Nginx configuration files
├── monitoring/            # Prometheus, Grafana, Loki configs
├── docs/                  # Project documentation
├── docker-compose.*.yml   # Docker orchestration files
└── *.md                   # Various fix summaries and guides
```

## Backend Structure (god_bless_backend/)

### Django Apps
- `accounts/` - User management and authentication
- `activities/` - Activity logging and tracking
- `phone_generator/` - Phone number generation logic
- `phone_number_validator/` - Phone validation services
- `sms_sender/` - SMS sending functionality
- `projects/` - Project management
- `tasks/` - Background task definitions
- `proxy_server/` - Proxy server functionality
- `smtps/` - SMTP configuration management
- `shortener/` - URL shortening services

### Core Configuration
- `god_bless_pro/` - Main Django project settings
  - `settings.py` - Django configuration
  - `urls.py` - URL routing
  - `asgi.py` - ASGI configuration for WebSockets
  - `celery.py` - Celery task queue configuration
  - `middleware.py` - Custom middleware
  - `security_middleware.py` - Security-related middleware

### Key Directories
- `templates/` - Django HTML templates
- `static_cdn/` - Static files for production
- `media/` - User uploaded files
- `logs/` - Application logs
- `tests/` - Test files
- `data/` - Data files and fixtures

## Frontend Structure (god_bless_frontend/)

### Source Organization (`src/`)
- `pages/` - React page components
  - `Dashboard/` - Dashboard-related components
  - `Projects/` - Project management pages
  - `Authentication/` - Login/signup pages
- `components/` - Reusable UI components
- `hooks/` - Custom React hooks
- `utils/` - Utility functions
- `types/` - TypeScript type definitions
- `tests/` - Test files

### Configuration Files
- `vite.config.js` - Vite build configuration
- `tailwind.config.cjs` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `vitest.config.js` - Test configuration
- `package.json` - Dependencies and scripts

### Build Output
- `dist/` - Production build output
- `node_modules/` - NPM dependencies

## Documentation Structure (docs/)

- `API_DOCUMENTATION.md` - API reference
- `USER_GUIDE.md` - End-user documentation
- `deploy/` - Deployment guides
- `testing/` - Testing documentation
- `tasks/` - Task-specific documentation
- `refs/` - Reference materials

## Infrastructure Files

### Docker Configuration
- `docker-compose.yml` - Local development
- `docker-compose.prod.yml` - Production deployment
- `docker-compose.monitoring.yml` - Monitoring stack
- `Dockerfile` - Backend container definition
- `Dockerfile.prod` - Production backend container

### Nginx Configuration
- `nginx/nginx.conf` - Main Nginx configuration
- `nginx/conf.d/` - Site-specific configurations

### Monitoring
- `monitoring/prometheus.yml` - Metrics collection
- `monitoring/loki-config.yml` - Log aggregation
- `monitoring/promtail-config.yml` - Log shipping

## Naming Conventions

### Backend (Python/Django)
- Use `snake_case` for variables, functions, and file names
- Use `PascalCase` for class names
- Use `UPPER_CASE` for constants
- Django apps use lowercase with underscores

### Frontend (React/TypeScript)
- Use `PascalCase` for component names and files
- Use `camelCase` for variables and functions
- Use `kebab-case` for CSS classes (Tailwind)
- Use `UPPER_CASE` for constants

### File Organization
- Group related functionality in dedicated directories
- Keep test files adjacent to source files when possible
- Use descriptive names that indicate purpose
- Separate concerns between pages, components, and utilities

## Key Patterns

### Backend Patterns
- Each Django app follows standard structure: `models.py`, `views.py`, `serializers.py`, `urls.py`
- Use Django REST Framework viewsets for API endpoints
- Implement custom middleware for cross-cutting concerns
- Use Celery tasks for background processing

### Frontend Patterns
- Page components in `pages/` directory
- Reusable components in `components/` directory
- Custom hooks for shared logic
- TypeScript interfaces in `types/` directory
- Utility functions separated by concern
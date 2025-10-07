# Project Structure

## Root Directory Layout
```
├── god_bless_backend/     # Django REST API backend
├── god_bless_frontend/    # React TypeScript frontend
├── .kiro/                 # Kiro AI assistant configuration
└── .vscode/               # VS Code workspace settings
```

## Backend Structure (`god_bless_backend/`)

### Django Apps Organization
- **`god_bless_pro/`** - Main Django project settings and configuration
- **`accounts/`** - User authentication and account management
- **`activities/`** - Activity logging and tracking
- **`banks/`** - Banking services and integrations
- **`client/`** - Client management functionality
- **`dashboard/`** - Dashboard data and analytics
- **`free_validator/`** - Free validation services
- **`phone_generator/`** - Phone number generation service
- **`phone_number_validator/`** - Phone number validation service
- **`projects/`** - Project management features
- **`proxy_server/`** - Proxy server management
- **`shortener/`** - URL shortening service
- **`sms_sender/`** - SMS sending functionality
- **`smtps/`** - SMTP server management
- **`validator/`** - General validation services

### Key Backend Files
- **`manage.py`** - Django management script
- **`requirements.txt`** - Python dependencies
- **`docker-compose.yml`** - Multi-service Docker configuration
- **`Dockerfile`** - Backend container definition
- **`db.sqlite3`** - Development database
- **`static_cdn/`** - Static files for production
- **`media/`** - User uploaded files
- **`templates/`** - Django HTML templates

## Frontend Structure (`god_bless_frontend/`)

### React App Organization
```
src/
├── components/           # Reusable UI components
├── pages/               # Page-level components
├── layout/              # Layout components (headers, sidebars)
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── css/                 # Stylesheets and Tailwind configs
├── images/              # Static image assets
├── fonts/               # Font files
├── js/                  # JavaScript utilities
├── common/              # Shared utilities and constants
├── App.tsx              # Main app component
├── main.tsx             # React entry point
└── constants.tsx        # App-wide constants
```

### Key Frontend Files
- **`package.json`** - Node.js dependencies and scripts
- **`vite.config.js`** - Vite build configuration
- **`tailwind.config.cjs`** - Tailwind CSS configuration
- **`tsconfig.json`** - TypeScript configuration
- **`docker-compose.yml`** - Frontend container configuration
- **`Dockerfile`** - Frontend container definition
- **`.prettierrc`** - Code formatting rules

## Architecture Patterns

### Backend Patterns
- **Django Apps**: Each major feature is organized as a separate Django app
- **API-First**: All functionality exposed through REST endpoints
- **Background Processing**: Long-running tasks handled by Celery workers
- **Multi-Database**: Support for both SQLite (dev) and PostgreSQL (prod)

### Frontend Patterns
- **Component-Based**: Modular React components with TypeScript
- **Page-Based Routing**: React Router for navigation
- **Utility-First CSS**: Tailwind CSS for styling
- **Admin Dashboard**: TailAdmin template-based UI structure

### File Naming Conventions
- **Backend**: Snake_case for Python files and directories
- **Frontend**: PascalCase for React components, camelCase for utilities
- **Configuration**: Lowercase with extensions (docker-compose.yml, package.json)

### Development Workflow
1. Backend changes go in respective Django apps under `god_bless_backend/`
2. Frontend changes go in appropriate `src/` subdirectories
3. Use Docker Compose for full-stack development
4. API endpoints should follow REST conventions
5. Components should be reusable and well-typed with TypeScript
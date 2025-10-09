# Project Structure

## Root Level Organization
```
├── god_bless_backend/     # Django REST API backend
├── god_bless_platform/    # React TypeScript frontend  
├── docs/                  # Documentation and deployment guides
├── scripts/               # Deployment and utility scripts
├── tests/                 # Cross-project integration tests
└── package.json           # Root workspace dependencies (WebSocket)
```

## Backend Structure (god_bless_backend/)
```
├── god_bless_pro/         # Main Django project settings
├── accounts/              # User authentication and management
├── activities/            # Activity logging and tracking
├── banks/                 # Banking/payment integrations
├── phone_generator/       # Phone number generation logic
├── phone_number_validator/ # Phone validation services
├── sms_sender/            # SMS campaign management
├── validator/             # General validation utilities
├── projects/              # Project management system
├── tasks/                 # Background task definitions
├── dashboard/             # Analytics and reporting
├── shortener/             # URL shortening service
├── proxy_server/          # Proxy management
├── templates/             # Django HTML templates
├── static_cdn/            # Static file serving
├── media/                 # User uploaded files
├── logs/                  # Application logs
└── scripts/               # Database and utility scripts
```

## Frontend Structure (god_bless_platform/src/)
```
├── components/            # Reusable UI components
│   ├── common/           # Generic components (buttons, modals)
│   ├── forms/            # Form-specific components
│   ├── charts/           # Data visualization components
│   └── layout/           # Layout and navigation
├── pages/                # Route-level page components
│   ├── auth/             # Login, register, password reset
│   ├── dashboard/        # Main dashboard and analytics
│   ├── projects/         # Project management pages
│   ├── phone-numbers/    # Phone generation and validation
│   └── sms/              # SMS campaign management
├── hooks/                # Custom React hooks
├── services/             # API client and WebSocket services
├── utils/                # Utility functions and helpers
├── types/                # TypeScript type definitions
├── contexts/             # React context providers
├── config/               # Configuration and routing
└── styles/               # Global CSS and Tailwind config
```

## Configuration Files
- **Environment**: `.env.example`, `.env.local`, `.env.production` per service
- **Docker**: `Dockerfile`, `docker-compose.yml` in each service
- **Database**: Multiple `.env.*` files for different database backends
- **Scripts**: Batch files (`.bat`) for Windows, shell scripts (`.sh`) for Unix

## Key Conventions
- **Database Switching**: Use provided scripts (`switch_to_sqlite.bat`, `switch_to_postgres.bat`)
- **Environment Management**: Service-specific `.env` files with examples provided
- **Testing**: Separate test directories with dedicated configuration
- **Logging**: Centralized in `logs/` directory with structured formats
- **Static Files**: Served from `static_cdn/` with proper CDN configuration
- **Media Files**: User uploads in `media/` with proper permissions

## Documentation Structure (docs/)
- **API**: Complete API documentation
- **Deployment**: Coolify-specific deployment guides
- **Environment**: Configuration setup guides
- **Troubleshooting**: Common issues and solutions
- **SSL/Domain**: NGINX and SSL configuration guides
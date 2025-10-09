# Product Overview

God Bless Platform is a comprehensive phone number management and SMS campaign system consisting of two main components:

## Core Functionality
- **Phone Number Generation**: Generate up to 1 million phone numbers per request with carrier detection
- **Phone Number Validation**: Real-time validation with carrier information
- **SMS Campaigns**: Bulk SMS sending with delivery tracking and analytics
- **Project Management**: Organize phone operations and campaigns into projects
- **Dashboard Analytics**: System monitoring, reporting, and performance metrics

## Architecture
- **Backend**: Django REST API (`god_bless_backend/`) with PostgreSQL/SQLite database support
- **Frontend**: React TypeScript SPA (`god_bless_platform/`) with real-time WebSocket integration
- **Infrastructure**: Docker containerization with Redis for caching and Celery for background tasks

## Key Features
- Real-time progress tracking via WebSockets
- Multi-database support (PostgreSQL for production, SQLite for development)
- Comprehensive testing and validation systems
- Scalable SMS delivery infrastructure
- User authentication and project-based access control
# God Bless Platform

A modern React-based frontend for the God Bless phone number management and SMS campaign system.

## Features

- **Phone Number Generation**: Generate up to 1 million phone numbers per request
- **Phone Number Validation**: Real-time validation with carrier detection
- **SMS Campaigns**: Bulk SMS sending with delivery tracking
- **Project Management**: Organize operations into projects
- **Real-time Updates**: WebSocket integration for live progress tracking
- **Dashboard Analytics**: Comprehensive system monitoring and reporting

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 4
- **Styling**: Tailwind CSS 3
- **Routing**: React Router DOM 6
- **Testing**: Vitest + React Testing Library
- **Containerization**: Docker

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components
│   ├── forms/          # Form components
│   ├── charts/         # Data visualization
│   └── layout/         # Layout components
├── pages/              # Page components
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard
│   ├── projects/       # Project management
│   ├── phone-numbers/  # Phone operations
│   └── sms/            # SMS campaigns
├── hooks/              # Custom React hooks
├── services/           # API and WebSocket services
├── utils/              # Utility functions
├── types/              # TypeScript definitions
├── contexts/           # React contexts
└── styles/             # Global styles
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
VITE_APP_NAME=God Bless Platform
VITE_VERSION=1.0.0
VITE_ENVIRONMENT=development
```

## Docker Deployment

### Development
```bash
docker build -f docker/Dockerfile -t god_bless_platform:dev .
docker run -p 5173:5173 god_bless_platform:dev
```

### Production
```bash
docker build -f docker/Dockerfile.prod -t god_bless_platform:prod .
docker run -p 80:80 god_bless_platform:prod
```

## Integration with Backend

This frontend integrates with the Django backend at `god_bless_backend/`. Ensure the backend is running on port 8000 for proper API communication.

## Contributing

1. Follow the existing code style and structure
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

This project is part of the God Bless platform system.
#!/bin/bash

# God Bless Super - Easy Deployment Script for Coolify
# This script helps you deploy your application to Coolify with proper environment setup

set -e

echo "🚀 Starting God Bless Super Deployment Process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist
print_status "Checking required files..."
required_files=(
    "Dockerfile.prod"
    "docker-compose.prod.yml"
    "god_bless_backend/requirements.txt"
    "god_bless_platform/package.json"
    "start-prod.sh"
    "nginx.prod.conf"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done

print_success "All required files found!"

# Check if environment variables are set
print_status "Checking environment variables..."

if [ -z "$SECRET_KEY" ]; then
    print_warning "SECRET_KEY not set. Generating a random one..."
    export SECRET_KEY=$(openssl rand -base64 32)
    print_success "Generated SECRET_KEY: ${SECRET_KEY:0:20}..."
fi

if [ -z "$POSTGRES_PASSWORD" ]; then
    print_error "POSTGRES_PASSWORD must be set for production deployment!"
    print_status "Example: export POSTGRES_PASSWORD='your-secure-password'"
    exit 1
fi

if [ -z "$REDIS_PASSWORD" ]; then
    print_warning "REDIS_PASSWORD not set. Using default..."
    export REDIS_PASSWORD="development-redis-password-123"
fi

if [ -z "$DOMAIN" ]; then
    print_error "DOMAIN must be set for production deployment!"
    print_status "Example: export DOMAIN='yourdomain.com'"
    exit 1
fi

print_success "Environment variables validated!"

# Test Docker build locally (optional)
if [ "$1" = "--test-build" ]; then
    print_status "Testing Docker build locally..."
    
    # Build the frontend first to catch any issues
    print_status "Building frontend..."
    cd god_bless_platform
    npm install
    npm run build
    cd ..
    
    print_status "Building Docker image..."
    docker build -f Dockerfile.prod -t god-bless-super:test .
    
    if [ $? -eq 0 ]; then
        print_success "Docker build test passed!"
        docker rmi god-bless-super:test
    else
        print_error "Docker build test failed!"
        exit 1
    fi
fi

# Create environment file for Coolify
print_status "Creating environment configuration..."
cat > .env.production << EOF
# Database Configuration
POSTGRES_DB=god_bless_db
POSTGRES_USER=god_bless_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_HOST=database
POSTGRES_PORT=5432

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Django Configuration
SECRET_KEY=${SECRET_KEY}
DEBUG=false
USE_POSTGRES=true
ALLOWED_HOSTS=${DOMAIN}

# CORS & Security
CORS_ALLOWED_ORIGINS=https://${DOMAIN}
CSRF_TRUSTED_ORIGINS=https://${DOMAIN}

# Email Configuration (Optional)
EMAIL_HOST=${EMAIL_HOST:-}
EMAIL_HOST_USER=${EMAIL_HOST_USER:-}
EMAIL_HOST_PASSWORD=${EMAIL_HOST_PASSWORD:-}
EMAIL_PORT=${EMAIL_PORT:-587}
EMAIL_USE_TLS=${EMAIL_USE_TLS:-true}
EOF

print_success "Environment configuration created: .env.production"

# Display deployment instructions
print_status "Deployment Instructions for Coolify:"
echo ""
echo "1. 📁 Upload your project to Coolify (or connect your Git repository)"
echo "2. 🔧 Set the following environment variables in Coolify:"
echo ""
echo "   Required Variables:"
echo "   - SECRET_KEY=${SECRET_KEY:0:20}..."
echo "   - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:0:10}..."
echo "   - REDIS_PASSWORD=${REDIS_PASSWORD:0:10}..."
echo "   - DOMAIN=${DOMAIN}"
echo ""
echo "   Optional Variables:"
echo "   - EMAIL_HOST=${EMAIL_HOST:-'Not set'}"
echo "   - EMAIL_HOST_USER=${EMAIL_HOST_USER:-'Not set'}"
echo "   - EMAIL_HOST_PASSWORD=${EMAIL_HOST_PASSWORD:-'Not set'}"
echo ""
echo "3. 🐳 Use the following Docker configuration:"
echo "   - Dockerfile: Dockerfile.prod"
echo "   - Docker Compose: docker-compose.prod.yml"
echo ""
echo "4. 🚀 Deploy and monitor the logs for any issues"
echo ""

# Cleanup
rm -f .env.production

print_success "Deployment preparation complete!"
print_status "Your application is ready for Coolify deployment!"
echo ""
print_warning "Remember to:"
echo "  - Set up SSL certificates in Coolify"
echo "  - Configure your domain DNS to point to Coolify"
echo "  - Monitor the application logs after deployment"
echo ""

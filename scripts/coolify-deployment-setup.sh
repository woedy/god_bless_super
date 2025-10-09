#!/bin/bash

# Coolify Deployment Setup Script for God Bless America Platform
# This script helps automate the initial setup and validation for Coolify deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_EXAMPLE_FILE="$PROJECT_ROOT/.env.example"
ENV_PRODUCTION_FILE="$PROJECT_ROOT/.env.production.example"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Generate Django secret key
generate_django_secret() {
    python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" 2>/dev/null || \
    openssl rand -base64 50 | tr -d "=+/" | cut -c1-50
}

# Validate environment variables
validate_env_vars() {
    local env_file="$1"
    local missing_vars=()
    
    # Required variables
    local required_vars=(
        "POSTGRES_DB"
        "POSTGRES_USER" 
        "POSTGRES_PASSWORD"
        "DATABASE_URL"
        "SECRET_KEY"
        "REDIS_URL"
        "ALLOWED_HOSTS"
        "CORS_ALLOWED_ORIGINS"
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file" 2>/dev/null; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        print_success "All required environment variables are present"
        return 0
    else
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
}

# Check Docker Compose file
validate_docker_compose() {
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        print_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        return 1
    fi
    
    # Check if docker-compose is available
    if command_exists docker-compose; then
        if docker-compose -f "$DOCKER_COMPOSE_FILE" config >/dev/null 2>&1; then
            print_success "Docker Compose file is valid"
            return 0
        else
            print_error "Docker Compose file has syntax errors"
            docker-compose -f "$DOCKER_COMPOSE_FILE" config
            return 1
        fi
    elif command_exists docker; then
        if docker compose -f "$DOCKER_COMPOSE_FILE" config >/dev/null 2>&1; then
            print_success "Docker Compose file is valid"
            return 0
        else
            print_error "Docker Compose file has syntax errors"
            docker compose -f "$DOCKER_COMPOSE_FILE" config
            return 1
        fi
    else
        print_warning "Docker not available, skipping Docker Compose validation"
        return 0
    fi
}

# Check required files
check_required_files() {
    local files=(
        "$PROJECT_ROOT/god_bless_backend/Dockerfile"
        "$PROJECT_ROOT/god_bless_frontend/Dockerfile"
        "$PROJECT_ROOT/nginx/nginx.conf"
        "$PROJECT_ROOT/docker-compose.yml"
    )
    
    local missing_files=()
    
    for file in "${files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        print_success "All required files are present"
        return 0
    else
        print_error "Missing required files:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        return 1
    fi
}

# Generate production environment file
generate_production_env() {
    local output_file="$1"
    
    print_info "Generating production environment file: $output_file"
    
    # Generate secure values
    local db_password=$(generate_password)
    local django_secret=$(generate_django_secret)
    local db_name="god_bless_db"
    local db_user="god_bless_user"
    
    cat > "$output_file" << EOF
# Production Environment Configuration for Coolify Deployment
# Generated on $(date)

# Database Configuration
POSTGRES_DB=$db_name
POSTGRES_USER=$db_user
POSTGRES_PASSWORD=$db_password
DATABASE_URL=postgresql://$db_user:$db_password@database:5432/$db_name

# Django Configuration
SECRET_KEY=$django_secret
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Security Settings
SECURE_SSL_REDIRECT=True
SECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,https
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_CONTENT_TYPE_NOSNIFF=True
SECURE_BROWSER_XSS_FILTER=True

# Redis Configuration
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Session Configuration
SESSION_ENGINE=django.contrib.sessions.backends.cache
SESSION_CACHE_ALIAS=default
SESSION_COOKIE_AGE=86400

# Frontend Configuration
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_WS_BASE_URL=wss://yourdomain.com/ws

# Email Configuration (Optional - Update with your SMTP settings)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com

# Logging Configuration
LOG_LEVEL=INFO
DJANGO_LOG_LEVEL=INFO

# Performance Configuration
DB_CONN_MAX_AGE=600
CELERY_WORKER_CONCURRENCY=2
CACHE_TTL=300

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=30
HEALTH_CHECK_INTERVAL=60
EOF

    print_success "Production environment file generated"
    print_warning "Please update the following values in $output_file:"
    echo "  - ALLOWED_HOSTS (replace yourdomain.com with your actual domain)"
    echo "  - CORS_ALLOWED_ORIGINS (replace yourdomain.com with your actual domain)"
    echo "  - VITE_API_BASE_URL (replace yourdomain.com with your actual domain)"
    echo "  - VITE_WS_BASE_URL (replace yourdomain.com with your actual domain)"
    echo "  - Email configuration (if using email features)"
}

# Create Coolify deployment checklist
create_deployment_checklist() {
    local checklist_file="$PROJECT_ROOT/COOLIFY_DEPLOYMENT_CHECKLIST.md"
    
    cat > "$checklist_file" << 'EOF'
# Coolify Deployment Checklist

## Pre-Deployment Setup

### DNS Configuration
- [ ] Domain purchased and configured
- [ ] A record pointing to server IP address
- [ ] WWW subdomain configured (optional)
- [ ] DNS propagation verified

### Server Requirements
- [ ] Coolify instance running on Ubuntu server
- [ ] Minimum 4GB RAM, 2 CPU cores, 50GB storage
- [ ] Server accessible from internet
- [ ] Ports 80 and 443 open

### Repository Setup
- [ ] Code pushed to Git repository
- [ ] Repository accessible to Coolify
- [ ] SSH keys or access tokens configured (if private repo)

## Coolify Configuration

### Project Setup
- [ ] New project created in Coolify
- [ ] Git repository connected
- [ ] Build pack set to "Docker Compose"
- [ ] Branch configured (usually 'main')

### Environment Variables
- [ ] All required environment variables configured
- [ ] Database credentials set
- [ ] Django SECRET_KEY configured
- [ ] Domain names updated in ALLOWED_HOSTS and CORS settings
- [ ] Redis configuration set
- [ ] Email configuration set (if needed)

### Domain Configuration
- [ ] Primary domain added
- [ ] WWW domain added (if needed)
- [ ] SSL certificate configured (Let's Encrypt recommended)
- [ ] HTTPS redirect enabled
- [ ] Domain routing configured

## Deployment Process

### Initial Deployment
- [ ] Deployment initiated from Coolify dashboard
- [ ] All services started successfully
- [ ] Health checks passing
- [ ] No errors in service logs

### Post-Deployment Verification
- [ ] Website accessible via HTTPS
- [ ] Django admin accessible
- [ ] API endpoints responding
- [ ] Database migrations applied
- [ ] Static files serving correctly
- [ ] Background tasks processing (Celery)

### Security Verification
- [ ] HTTPS enforced
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] Admin interface secured
- [ ] Database access restricted

## Final Steps

### Superuser Creation
- [ ] Django superuser created
- [ ] Admin access verified

### Monitoring Setup
- [ ] Health monitoring configured
- [ ] Log monitoring set up
- [ ] Backup schedules configured
- [ ] Alert notifications configured

### Documentation
- [ ] Deployment documented
- [ ] Environment variables documented
- [ ] Recovery procedures documented
- [ ] Team access configured

## Troubleshooting Resources

If you encounter issues during deployment:

1. Check the [Coolify Deployment Guide](docs/COOLIFY_DEPLOYMENT_GUIDE.md)
2. Review the [Environment Setup Checklist](docs/COOLIFY_ENVIRONMENT_SETUP.md)
3. Consult the [Troubleshooting Guide](docs/COOLIFY_TROUBLESHOOTING_GUIDE.md)
4. Check service logs in Coolify dashboard
5. Verify DNS configuration and propagation

## Support

- Coolify Documentation: https://coolify.io/docs
- Coolify Discord: https://discord.gg/coolify
- Project Issues: Check application logs and documentation
EOF

    print_success "Deployment checklist created: $checklist_file"
}

# Main execution
main() {
    print_header "Coolify Deployment Setup for God Bless America Platform"
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        print_error "This script must be run from the project root directory"
        exit 1
    fi
    
    print_info "Project root: $PROJECT_ROOT"
    
    # Check required tools
    print_header "Checking Required Tools"
    
    local tools_ok=true
    
    if command_exists docker; then
        print_success "Docker is available"
    else
        print_warning "Docker not found (optional for validation)"
    fi
    
    if command_exists python3; then
        print_success "Python 3 is available"
    else
        print_warning "Python 3 not found (needed for Django secret generation)"
    fi
    
    if command_exists openssl; then
        print_success "OpenSSL is available"
    else
        print_error "OpenSSL not found (required for password generation)"
        tools_ok=false
    fi
    
    if [ "$tools_ok" = false ]; then
        print_error "Some required tools are missing. Please install them and try again."
        exit 1
    fi
    
    # Check required files
    print_header "Checking Required Files"
    if ! check_required_files; then
        print_error "Some required files are missing. Please ensure all Docker files are present."
        exit 1
    fi
    
    # Validate Docker Compose
    print_header "Validating Docker Compose Configuration"
    if ! validate_docker_compose; then
        print_error "Docker Compose validation failed. Please fix the configuration."
        exit 1
    fi
    
    # Generate production environment file
    print_header "Generating Production Environment Configuration"
    
    local env_file="$PROJECT_ROOT/.env.production"
    
    if [ -f "$env_file" ]; then
        print_warning "Production environment file already exists: $env_file"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping environment file generation"
        else
            generate_production_env "$env_file"
        fi
    else
        generate_production_env "$env_file"
    fi
    
    # Create deployment checklist
    print_header "Creating Deployment Checklist"
    create_deployment_checklist
    
    # Final instructions
    print_header "Setup Complete!"
    
    print_success "Coolify deployment setup completed successfully!"
    echo
    print_info "Next steps:"
    echo "1. Update domain names in .env.production file"
    echo "2. Follow the simple guide: docs/COOLIFY_SIMPLE_DEPLOYMENT.md"
    echo "3. Create Coolify project and connect your Git repo"
    echo "4. Add environment variables and domain"
    echo "5. Click Deploy!"
    echo
    print_info "Important files created/updated:"
    echo "- .env.production (environment variables for production)"
    echo "- COOLIFY_DEPLOYMENT_CHECKLIST.md (step-by-step checklist)"
    echo
    print_warning "Remember to:"
    echo "- Update domain names in the environment file"
    echo "- Configure DNS before deployment"
    echo "- Test the deployment in a staging environment first"
    echo "- Keep your environment variables secure"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
#!/bin/bash

# Deployment script with SSL support for Coolify
# This script handles the complete deployment process including SSL certificate setup

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Load environment variables
load_environment() {
    if [[ -f "$ENV_FILE" ]]; then
        log "Loading environment variables from $ENV_FILE"
        set -a
        source "$ENV_FILE"
        set +a
    else
        warn "Environment file $ENV_FILE not found, using defaults"
    fi
    
    # Set default values
    export DOMAIN=${DOMAIN:-localhost}
    export LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:-admin@example.com}
    export LETSENCRYPT_STAGING=${LETSENCRYPT_STAGING:-false}
    export SSL_ENABLED=${SSL_ENABLED:-true}
    export COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-god_bless}
}

# Validate configuration
validate_config() {
    log "Validating deployment configuration..."
    
    # Check required environment variables
    local required_vars=("SECRET_KEY" "POSTGRES_PASSWORD" "REDIS_PASSWORD")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Missing required environment variables: ${missing_vars[*]}"
        error "Please set these variables in $ENV_FILE"
        exit 1
    fi
    
    # Validate domain for SSL
    if [[ "$SSL_ENABLED" == "true" ]] && [[ "$DOMAIN" != "localhost" ]]; then
        if [[ "$LETSENCRYPT_EMAIL" == "admin@example.com" ]] || [[ -z "$LETSENCRYPT_EMAIL" ]]; then
            warn "LETSENCRYPT_EMAIL not set or using default. SSL certificates may not be generated."
        fi
    fi
    
    log "Configuration validation completed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running or not accessible"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose >/dev/null 2>&1; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check available disk space (minimum 5GB)
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 5242880 ]]; then  # 5GB in KB
        warn "Low disk space detected. Available: $(($available_space / 1024 / 1024))GB"
    fi
    
    # Check if ports are available
    local ports=(80 443)
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            warn "Port $port is already in use"
        fi
    done
    
    log "Pre-deployment checks completed"
}

# Setup SSL certificates
setup_ssl() {
    if [[ "$SSL_ENABLED" != "true" ]]; then
        info "SSL is disabled, skipping SSL setup"
        return 0
    fi
    
    log "Setting up SSL certificates..."
    
    # Create SSL directories
    docker volume create god_bless_ssl_certificates 2>/dev/null || true
    docker volume create god_bless_certbot_webroot 2>/dev/null || true
    
    # Generate self-signed certificates for immediate use
    log "Generating temporary self-signed certificates..."
    docker run --rm \
        -v god_bless_ssl_certificates:/etc/nginx/ssl \
        -e DOMAIN="$DOMAIN" \
        alpine/openssl:latest \
        sh -c "
        mkdir -p /etc/nginx/ssl;
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/nginx/ssl/key.pem \
            -out /etc/nginx/ssl/cert.pem \
            -subj '/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN';
        openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048;
        chmod 600 /etc/nginx/ssl/key.pem;
        chmod 644 /etc/nginx/ssl/cert.pem;
        chmod 644 /etc/nginx/ssl/dhparam.pem;
        echo 'Self-signed certificates generated successfully';
        "
    
    log "SSL setup completed"
}

# Deploy services
deploy_services() {
    log "Deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # Build and start core services
    log "Building and starting core services..."
    docker-compose build --parallel
    docker-compose up -d database redis
    
    # Wait for database and redis to be ready
    log "Waiting for database and Redis to be ready..."
    sleep 30
    
    # Start backend services
    log "Starting backend services..."
    docker-compose up -d backend celery_worker celery_beat
    
    # Wait for backend to be ready
    log "Waiting for backend to be ready..."
    sleep 60
    
    # Start frontend services
    log "Starting frontend services..."
    docker-compose up -d frontend platform
    
    # Start nginx
    log "Starting Nginx reverse proxy..."
    if [[ "$SSL_ENABLED" == "true" ]]; then
        docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d nginx
    else
        docker-compose up -d nginx
    fi
    
    log "Core services deployment completed"
}

# Setup Let's Encrypt certificates
setup_letsencrypt() {
    if [[ "$SSL_ENABLED" != "true" ]] || [[ "$DOMAIN" == "localhost" ]] || [[ "$LETSENCRYPT_EMAIL" == "admin@example.com" ]]; then
        info "Skipping Let's Encrypt setup (SSL disabled, localhost, or no email configured)"
        return 0
    fi
    
    log "Setting up Let's Encrypt certificates..."
    
    # Start certbot service
    docker-compose -f docker-compose.yml -f docker-compose.ssl.yml --profile ssl up -d certbot
    
    # Wait for certificate generation
    log "Waiting for certificate generation (this may take a few minutes)..."
    sleep 120
    
    # Check if certificates were generated
    if docker exec god_bless_certbot test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
        log "Let's Encrypt certificates generated successfully"
        
        # Copy certificates to nginx SSL directory
        docker exec god_bless_certbot sh -c "
        cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/cert.pem;
        cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/key.pem;
        chmod 644 /etc/nginx/ssl/cert.pem;
        chmod 600 /etc/nginx/ssl/key.pem;
        "
        
        # Reload nginx
        docker exec god_bless_nginx nginx -s reload
        
        # Start renewal service
        docker-compose -f docker-compose.yml -f docker-compose.ssl.yml --profile ssl --profile renewal up -d certbot_renew
        
        log "Let's Encrypt setup completed with automatic renewal"
    else
        warn "Let's Encrypt certificate generation failed, using self-signed certificates"
    fi
}

# Post-deployment verification
verify_deployment() {
    log "Verifying deployment..."
    
    # Check service health
    local services=("database" "redis" "backend" "frontend" "platform" "nginx")
    local failed_services=()
    
    for service in "${services[@]}"; do
        if ! docker-compose ps "$service" | grep -q "Up"; then
            failed_services+=("$service")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        error "Failed services: ${failed_services[*]}"
        return 1
    fi
    
    # Test HTTP/HTTPS endpoints
    local base_url="http://localhost"
    if [[ "$SSL_ENABLED" == "true" ]]; then
        base_url="https://localhost"
    fi
    
    # Test health endpoint
    if curl -k -s "$base_url/health" | grep -q "healthy"; then
        log "Health check passed"
    else
        warn "Health check failed"
    fi
    
    # Test API endpoint
    if curl -k -s "$base_url/api/health/" | grep -q "status"; then
        log "API health check passed"
    else
        warn "API health check failed"
    fi
    
    log "Deployment verification completed"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary resources..."
    
    # Remove unused Docker resources
    docker system prune -f >/dev/null 2>&1 || true
    
    log "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting deployment with SSL support..."
    
    # Load configuration
    load_environment
    
    # Validate configuration
    validate_config
    
    # Run pre-deployment checks
    pre_deployment_checks
    
    # Setup SSL certificates
    setup_ssl
    
    # Deploy services
    deploy_services
    
    # Setup Let's Encrypt (if applicable)
    setup_letsencrypt
    
    # Verify deployment
    if verify_deployment; then
        log "Deployment completed successfully!"
        
        # Display access information
        echo ""
        echo "=== Deployment Information ==="
        echo "Domain: $DOMAIN"
        echo "HTTP URL: http://$DOMAIN"
        if [[ "$SSL_ENABLED" == "true" ]]; then
            echo "HTTPS URL: https://$DOMAIN"
        fi
        echo "API Health: http://$DOMAIN/api/health/"
        echo "Nginx Status: http://$DOMAIN/nginx_status (internal only)"
        echo ""
        echo "=== Service Status ==="
        docker-compose ps
        echo ""
    else
        error "Deployment verification failed!"
        exit 1
    fi
    
    # Cleanup
    cleanup
    
    log "Deployment process completed!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "ssl-only")
        load_environment
        setup_ssl
        setup_letsencrypt
        ;;
    "verify")
        load_environment
        verify_deployment
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|ssl-only|verify|cleanup}"
        echo "  deploy    - Full deployment with SSL (default)"
        echo "  ssl-only  - Setup SSL certificates only"
        echo "  verify    - Verify deployment status"
        echo "  cleanup   - Cleanup temporary resources"
        exit 1
        ;;
esac
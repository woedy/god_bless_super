#!/bin/bash

# SSL Certificate Setup Script for Coolify Deployment
# This script handles SSL certificate generation and renewal using Let's Encrypt

set -e

# Configuration
DOMAIN=${DOMAIN:-"localhost"}
EMAIL=${SSL_EMAIL:-"admin@${DOMAIN}"}
STAGING=${STAGING:-false}
FORCE_RENEWAL=${FORCE_RENEWAL:-false}

# Directories
SSL_DIR="/etc/nginx/ssl"
CERTBOT_DIR="/var/www/certbot"
NGINX_CONF_DIR="/etc/nginx/conf.d"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Check if running in Docker
check_environment() {
    if [ ! -d "$SSL_DIR" ]; then
        log "Creating SSL directory: $SSL_DIR"
        mkdir -p "$SSL_DIR"
    fi
    
    if [ ! -d "$CERTBOT_DIR" ]; then
        log "Creating Certbot webroot directory: $CERTBOT_DIR"
        mkdir -p "$CERTBOT_DIR"
    fi
}

# Generate self-signed certificate for development
generate_self_signed() {
    log "Generating self-signed certificate for development..."
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/key.pem" \
        -out "$SSL_DIR/cert.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
    
    log "Self-signed certificate generated successfully"
}

# Generate DH parameters
generate_dhparam() {
    if [ ! -f "$SSL_DIR/dhparam.pem" ]; then
        log "Generating Diffie-Hellman parameters (this may take a while)..."
        openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048
        log "DH parameters generated successfully"
    else
        log "DH parameters already exist"
    fi
}

# Check if Let's Encrypt certificate exists and is valid
check_certificate() {
    if [ -f "$SSL_DIR/cert.pem" ] && [ -f "$SSL_DIR/key.pem" ]; then
        # Check if certificate is valid and not expiring soon (30 days)
        if openssl x509 -checkend 2592000 -noout -in "$SSL_DIR/cert.pem" >/dev/null 2>&1; then
            log "Valid SSL certificate found"
            return 0
        else
            warn "SSL certificate is expiring soon or invalid"
            return 1
        fi
    else
        warn "No SSL certificate found"
        return 1
    fi
}

# Request Let's Encrypt certificate
request_letsencrypt() {
    log "Requesting Let's Encrypt certificate for domain: $DOMAIN"
    
    # Determine if we should use staging
    local staging_flag=""
    if [ "$STAGING" = "true" ]; then
        staging_flag="--staging"
        warn "Using Let's Encrypt staging environment"
    fi
    
    # Force renewal flag
    local force_flag=""
    if [ "$FORCE_RENEWAL" = "true" ]; then
        force_flag="--force-renewal"
        warn "Forcing certificate renewal"
    fi
    
    # Run certbot
    certbot certonly \
        --webroot \
        --webroot-path="$CERTBOT_DIR" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN" \
        $staging_flag \
        $force_flag \
        --non-interactive
    
    # Copy certificates to nginx directory
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/cert.pem"
        cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/key.pem"
        chmod 644 "$SSL_DIR/cert.pem"
        chmod 600 "$SSL_DIR/key.pem"
        log "Let's Encrypt certificate installed successfully"
    else
        error "Failed to obtain Let's Encrypt certificate"
        return 1
    fi
}

# Renew certificates
renew_certificates() {
    log "Checking for certificate renewal..."
    
    certbot renew --webroot --webroot-path="$CERTBOT_DIR" --quiet
    
    # Copy renewed certificates if they exist
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/cert.pem"
        cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/key.pem"
        log "Certificates renewed successfully"
        
        # Reload nginx
        if command -v nginx >/dev/null 2>&1; then
            nginx -s reload
            log "Nginx reloaded"
        fi
    fi
}

# Main function
main() {
    log "Starting SSL setup for domain: $DOMAIN"
    
    check_environment
    generate_dhparam
    
    case "${1:-setup}" in
        "setup")
            if [ "$DOMAIN" = "localhost" ] || [ "$DOMAIN" = "127.0.0.1" ]; then
                log "Development environment detected, generating self-signed certificate"
                generate_self_signed
            else
                if ! check_certificate; then
                    log "Requesting new Let's Encrypt certificate"
                    if ! request_letsencrypt; then
                        warn "Let's Encrypt failed, falling back to self-signed certificate"
                        generate_self_signed
                    fi
                fi
            fi
            ;;
        "renew")
            renew_certificates
            ;;
        "force-renew")
            FORCE_RENEWAL=true
            request_letsencrypt
            ;;
        "self-signed")
            generate_self_signed
            ;;
        *)
            error "Unknown command: $1"
            echo "Usage: $0 [setup|renew|force-renew|self-signed]"
            exit 1
            ;;
    esac
    
    log "SSL setup completed successfully"
}

# Run main function with all arguments
main "$@"
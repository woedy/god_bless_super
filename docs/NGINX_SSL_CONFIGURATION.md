# Nginx Reverse Proxy and SSL Configuration

This document provides comprehensive information about the Nginx reverse proxy and SSL configuration for the God Bless America platform deployment on Coolify.

## Overview

The Nginx configuration provides:
- **Reverse Proxy**: Load balancing and traffic routing to backend services
- **SSL/TLS Termination**: HTTPS support with Let's Encrypt integration
- **WebSocket Support**: Real-time communication for Django Channels
- **Static File Serving**: Optimized delivery of static assets
- **Security Headers**: Modern security configurations
- **Health Monitoring**: Comprehensive health check endpoints

## Architecture

```
Internet → Nginx (Port 80/443) → Internal Services
                ├── Backend API (Django)
                ├── Frontend (React)
                ├── Platform (React)
                └── WebSocket (Django Channels)
```

## Configuration Files

### Core Configuration Files

- `nginx/nginx.conf` - Main Nginx configuration with upstreams and global settings
- `nginx/conf.d/default.conf` - HTTP/HTTPS server blocks and routing
- `nginx/conf.d/locations.conf` - Shared location blocks for all services
- `nginx/conf.d/ssl.conf` - SSL/TLS configuration and security headers
- `nginx/conf.d/letsencrypt.conf` - Let's Encrypt ACME challenge handling
- `nginx/conf.d/health.conf` - Health check endpoints
- `nginx/conf.d/compression.conf` - Static file optimization and compression

### SSL Management

- `nginx/scripts/ssl-setup.sh` - SSL certificate generation and management script
- `docker-compose.ssl.yml` - SSL-specific Docker Compose configuration
- `scripts/deploy-with-ssl.sh` - Deployment script with SSL support

## SSL/TLS Configuration

### Supported SSL Methods

1. **Let's Encrypt (Production)**
   - Automatic certificate generation and renewal
   - Domain validation required
   - Free SSL certificates

2. **Self-Signed Certificates (Development)**
   - Generated automatically for localhost/development
   - No domain validation required
   - Browser warnings expected

### SSL Security Features

- **TLS 1.2 and 1.3 Support**: Modern protocol versions only
- **Strong Cipher Suites**: ECDHE and ChaCha20-Poly1305 preferred
- **HSTS**: HTTP Strict Transport Security with preload
- **OCSP Stapling**: Certificate validation optimization
- **Perfect Forward Secrecy**: DHE and ECDHE key exchange
- **Security Headers**: Comprehensive security header implementation

### Certificate Management

#### Automatic Setup
```bash
# Deploy with SSL enabled
DOMAIN=yourdomain.com LETSENCRYPT_EMAIL=admin@yourdomain.com ./scripts/deploy-with-ssl.sh

# SSL-only setup
DOMAIN=yourdomain.com LETSENCRYPT_EMAIL=admin@yourdomain.com ./scripts/deploy-with-ssl.sh ssl-only
```

#### Manual Certificate Installation
```bash
# Generate self-signed certificate
./nginx/scripts/ssl-setup.sh self-signed

# Setup Let's Encrypt certificate
DOMAIN=yourdomain.com EMAIL=admin@yourdomain.com ./nginx/scripts/ssl-setup.sh setup

# Renew certificates
./nginx/scripts/ssl-setup.sh renew
```

## Load Balancing and Upstream Configuration

### Backend Services

```nginx
upstream backend {
    least_conn;
    server backend:8000 max_fails=3 fail_timeout=30s weight=1;
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
}
```

### Frontend Services

```nginx
upstream frontend {
    least_conn;
    server frontend:8080 max_fails=3 fail_timeout=30s weight=1;
    keepalive 16;
}

upstream platform {
    least_conn;
    server platform:8080 max_fails=3 fail_timeout=30s weight=1;
    keepalive 16;
}
```

## WebSocket Configuration

### Django Channels Support

The configuration includes optimized WebSocket proxying for Django Channels:

```nginx
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    
    # Long timeouts for persistent connections
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
    
    # WebSocket-specific headers
    proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
    proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
    proxy_set_header Sec-WebSocket-Protocol $http_sec_websocket_protocol;
    proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
}
```

## Static File Optimization

### Caching Strategy

- **CSS/JS Files**: 1 year cache with immutable flag
- **Images**: 1 month cache with public flag
- **Fonts**: 1 year cache with CORS headers
- **Documents**: 1 month cache with security headers

### Compression

- **Gzip**: Enabled for text-based files with level 6 compression
- **Brotli**: Ready for implementation (commented out)
- **Pre-compressed Files**: Support for .gz files

## Security Configuration

### Security Headers

```nginx
# HSTS
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'..." always;

# Frame Options
add_header X-Frame-Options "SAMEORIGIN" always;

# Content Type Options
add_header X-Content-Type-Options "nosniff" always;

# XSS Protection
add_header X-XSS-Protection "1; mode=block" always;

# Referrer Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Rate Limiting

```nginx
# API endpoints
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Login endpoints
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
```

## Health Monitoring

### Available Health Endpoints

- `/health` - Basic health check
- `/health/detailed` - Detailed system information
- `/health/backend` - Backend service health
- `/health/frontend` - Frontend service health
- `/health/platform` - Platform service health
- `/nginx_status` - Nginx status (internal only)
- `/ready` - Readiness probe
- `/live` - Liveness probe

### Health Check Usage

```bash
# Basic health check
curl https://yourdomain.com/health

# Detailed health information
curl https://yourdomain.com/health/detailed

# Backend API health
curl https://yourdomain.com/health/backend
```

## Environment Variables

### Required Variables

```bash
# Domain configuration
DOMAIN=yourdomain.com

# SSL configuration
LETSENCRYPT_EMAIL=admin@yourdomain.com
LETSENCRYPT_STAGING=false
SSL_ENABLED=true

# Application configuration
SECRET_KEY=your-secret-key
POSTGRES_PASSWORD=your-db-password
REDIS_PASSWORD=your-redis-password
```

### Optional Variables

```bash
# Flower monitoring
FLOWER_USER=admin
FLOWER_PASSWORD=your-flower-password

# Backup configuration
BACKUP_RETENTION_DAYS=30
BACKUP_SUCCESS_WEBHOOK=https://your-webhook-url
BACKUP_FAILURE_WEBHOOK=https://your-webhook-url
```

## Deployment

### Standard Deployment

```bash
# Clone repository
git clone <repository-url>
cd god_bless_super

# Configure environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Deploy with SSL
./scripts/deploy-with-ssl.sh
```

### Coolify Deployment

1. **Create New Project** in Coolify
2. **Set Environment Variables** in Coolify UI
3. **Deploy** using the main docker-compose.yml file
4. **Enable SSL** through Coolify's SSL management

### Docker Compose Commands

```bash
# Standard deployment
docker-compose up -d

# With SSL support
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d

# With SSL and certificate generation
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml --profile ssl up -d

# With monitoring
docker-compose --profile monitoring up -d
```

## Troubleshooting

### Common Issues

#### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /path/to/cert.pem -text -noout

# Test SSL configuration
nginx -t

# Check certificate expiration
openssl x509 -in /path/to/cert.pem -enddate -noout
```

#### WebSocket Connection Issues

```bash
# Test WebSocket connection
wscat -c wss://yourdomain.com/ws/

# Check nginx error logs
docker logs god_bless_nginx

# Check backend logs
docker logs god_bless_backend
```

#### Performance Issues

```bash
# Check nginx status
curl http://localhost/nginx_status

# Monitor resource usage
docker stats

# Check upstream health
curl https://yourdomain.com/health/detailed
```

### Log Locations

- **Nginx Access Logs**: `/var/log/nginx/access.log`
- **Nginx Error Logs**: `/var/log/nginx/error.log`
- **SSL Renewal Logs**: `/var/log/letsencrypt/renewal.log`
- **Certbot Logs**: `/var/log/letsencrypt/letsencrypt.log`

## Performance Optimization

### Recommended Settings

```nginx
# Worker processes
worker_processes auto;

# Worker connections
worker_connections 1024;

# Keepalive settings
keepalive_timeout 65;
keepalive_requests 100;

# Buffer sizes
client_max_body_size 100M;
client_body_buffer_size 1M;
proxy_buffer_size 8k;
proxy_buffers 16 8k;
```

### Monitoring Metrics

- **Response Times**: Monitor upstream response times
- **Connection Counts**: Track active connections
- **Error Rates**: Monitor 4xx/5xx error rates
- **SSL Handshake Times**: Monitor SSL performance
- **Cache Hit Rates**: Monitor static file caching

## Security Best Practices

1. **Regular Updates**: Keep Nginx and SSL certificates updated
2. **Security Headers**: Implement all recommended security headers
3. **Rate Limiting**: Configure appropriate rate limits
4. **Access Logs**: Monitor access logs for suspicious activity
5. **SSL Configuration**: Use strong ciphers and protocols only
6. **HSTS**: Enable HTTP Strict Transport Security
7. **Certificate Monitoring**: Monitor certificate expiration

## Maintenance

### Regular Tasks

- **Certificate Renewal**: Automated via cron job
- **Log Rotation**: Configured via Docker volumes
- **Security Updates**: Regular Nginx image updates
- **Configuration Validation**: Test configuration changes
- **Performance Monitoring**: Regular performance reviews

### Backup Procedures

- **Configuration Backup**: Backup nginx configuration files
- **Certificate Backup**: Backup SSL certificates and keys
- **Log Backup**: Archive important log files
- **Volume Backup**: Backup Docker volumes

## Support and Documentation

For additional support:
- Check the main project README.md
- Review Docker Compose configurations
- Consult Nginx official documentation
- Check Let's Encrypt documentation for SSL issues
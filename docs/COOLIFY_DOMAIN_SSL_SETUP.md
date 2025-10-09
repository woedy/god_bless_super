# Coolify Domain and SSL Configuration Guide

## Overview

This guide provides detailed instructions for configuring domains and SSL certificates for the God Bless America platform deployed on Coolify. It covers domain setup, SSL certificate generation, and advanced configuration options.

## Prerequisites

- Coolify instance running and accessible
- Domain name purchased and DNS access
- Application successfully deployed on Coolify
- Basic understanding of DNS configuration

## Table of Contents

1. [DNS Configuration](#dns-configuration)
2. [Domain Setup in Coolify](#domain-setup-in-coolify)
3. [SSL Certificate Configuration](#ssl-certificate-configuration)
4. [Advanced SSL Settings](#advanced-ssl-settings)
5. [Subdomain Configuration](#subdomain-configuration)
6. [Wildcard SSL Certificates](#wildcard-ssl-certificates)
7. [Custom SSL Certificates](#custom-ssl-certificates)
8. [Troubleshooting](#troubleshooting)

## DNS Configuration

### 1. Basic DNS Setup

Before configuring domains in Coolify, ensure your DNS is properly configured:

#### A Records
Point your domain to your server's IP address:

```
Type: A
Name: @
Value: YOUR_SERVER_IP
TTL: 300 (or your preferred value)

Type: A
Name: www
Value: YOUR_SERVER_IP
TTL: 300
```

#### CNAME Records (Alternative for www)
```
Type: CNAME
Name: www
Value: yourdomain.com
TTL: 300
```

### 2. Subdomain DNS Setup

If using subdomains for different services:

```
Type: A
Name: api
Value: YOUR_SERVER_IP
TTL: 300

Type: A
Name: admin
Value: YOUR_SERVER_IP
TTL: 300
```

### 3. DNS Propagation

- DNS changes can take 24-48 hours to fully propagate
- Use tools like `dig` or online DNS checkers to verify propagation
- Test from multiple locations to ensure global propagation

```bash
# Check DNS propagation
dig yourdomain.com A
dig www.yourdomain.com A
```

## Domain Setup in Coolify

### 1. Access Domain Configuration

1. Navigate to your Coolify project dashboard
2. Click on your deployed application
3. Go to the "Domains" tab
4. Click "Add Domain"

### 2. Primary Domain Configuration

Configure your main domain:

**Domain Settings:**
- **Domain**: `yourdomain.com`
- **Port**: `80` (HTTP) and `443` (HTTPS)
- **Path**: `/`
- **Service**: Select your nginx/reverse proxy service
- **Container Port**: `80` (the port your nginx container exposes)

**Advanced Settings:**
- **Force HTTPS Redirect**: Enable this option
- **HSTS**: Enable for enhanced security
- **Custom Headers**: Add security headers if needed

### 3. WWW Domain Configuration

Add www subdomain:

**Domain Settings:**
- **Domain**: `www.yourdomain.com`
- **Port**: `80` and `443`
- **Path**: `/`
- **Service**: Same as primary domain
- **Redirect to Primary**: Enable to redirect www to non-www (optional)

### 4. Save Domain Configuration

1. Click "Save" to apply domain settings
2. Wait for Coolify to update the configuration
3. Verify domain is listed in the domains table

## SSL Certificate Configuration

### 1. Let's Encrypt SSL (Recommended)

Let's Encrypt provides free SSL certificates with automatic renewal:

#### Enable Let's Encrypt
1. In the domain configuration, find "SSL Certificate" section
2. Select "Let's Encrypt" as the certificate provider
3. Click "Generate Certificate"
4. Wait for certificate generation (usually 1-2 minutes)

#### Verify Certificate Generation
- Check the certificate status shows "Active"
- Verify expiration date (typically 90 days from generation)
- Test HTTPS access to your domain

### 2. Automatic Certificate Renewal

Coolify automatically handles Let's Encrypt certificate renewal:

- Certificates are renewed 30 days before expiration
- No manual intervention required
- Monitor renewal logs in Coolify dashboard

### 3. Certificate Validation

Verify your SSL certificate is working correctly:

```bash
# Check SSL certificate details
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiration
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Advanced SSL Settings

### 1. Security Headers Configuration

Configure additional security headers in your nginx configuration:

```nginx
# Add to your nginx configuration
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

### 2. SSL Configuration Optimization

Optimize SSL settings for better security and performance:

```nginx
# SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;
```

### 3. HTTP/2 Configuration

Enable HTTP/2 for better performance:

```nginx
# Enable HTTP/2
listen 443 ssl http2;
```

## Subdomain Configuration

### 1. API Subdomain Setup

Configure API subdomain for backend services:

**Domain Settings:**
- **Domain**: `api.yourdomain.com`
- **Port**: `443`
- **Path**: `/`
- **Service**: Django backend service
- **Container Port**: `8000`

**Nginx Configuration:**
```nginx
location / {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 2. Admin Subdomain Setup

Configure admin subdomain for Django admin:

**Domain Settings:**
- **Domain**: `admin.yourdomain.com`
- **Port**: `443`
- **Path**: `/admin`
- **Service**: Django backend service

### 3. WebSocket Subdomain (Optional)

If using WebSockets, configure a dedicated subdomain:

**Domain Settings:**
- **Domain**: `ws.yourdomain.com`
- **Port**: `443`
- **Path**: `/ws`
- **Service**: Django backend service

**Nginx WebSocket Configuration:**
```nginx
location /ws/ {
    proxy_pass http://backend:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Wildcard SSL Certificates

### 1. When to Use Wildcard Certificates

Use wildcard certificates when you have multiple subdomains:
- `*.yourdomain.com` covers all subdomains
- Simplifies certificate management
- Reduces the number of certificates needed

### 2. Let's Encrypt Wildcard Setup

**Requirements:**
- DNS-01 challenge (requires DNS API access)
- Supported DNS provider

**Configuration Steps:**
1. In Coolify, select "Let's Encrypt Wildcard"
2. Configure DNS provider API credentials
3. Generate wildcard certificate for `*.yourdomain.com`
4. Apply certificate to all subdomains

### 3. DNS Provider Configuration

Configure DNS API access for automatic validation:

**Cloudflare Example:**
```bash
CLOUDFLARE_EMAIL=your-email@example.com
CLOUDFLARE_API_KEY=your-global-api-key
```

**Other Supported Providers:**
- Route53 (AWS)
- DigitalOcean
- Google Cloud DNS
- Namecheap

## Custom SSL Certificates

### 1. When to Use Custom Certificates

Use custom SSL certificates when:
- You have existing certificates from a CA
- Company policy requires specific certificate authorities
- You need Extended Validation (EV) certificates

### 2. Upload Custom Certificate

**Required Files:**
- Certificate file (`.crt` or `.pem`)
- Private key file (`.key`)
- Certificate chain/intermediate certificates (if applicable)

**Upload Process:**
1. In domain configuration, select "Custom Certificate"
2. Upload certificate file
3. Upload private key file
4. Upload certificate chain (if required)
5. Save configuration

### 3. Certificate Validation

Verify custom certificate installation:

```bash
# Check certificate chain
openssl s_client -connect yourdomain.com:443 -showcerts

# Verify certificate matches private key
openssl x509 -noout -modulus -in certificate.crt | openssl md5
openssl rsa -noout -modulus -in private.key | openssl md5
```

## SSL Testing and Validation

### 1. SSL Labs Test

Use SSL Labs to test your SSL configuration:
1. Visit https://www.ssllabs.com/ssltest/
2. Enter your domain name
3. Wait for analysis to complete
4. Review security grade and recommendations

### 2. Certificate Transparency Logs

Verify your certificate is logged in CT logs:
1. Visit https://crt.sh/
2. Search for your domain
3. Verify certificate details match your installation

### 3. Browser Testing

Test SSL configuration in different browsers:
- Chrome: Check for green lock icon
- Firefox: Verify certificate details
- Safari: Test on mobile devices
- Edge: Check compatibility

## Monitoring and Maintenance

### 1. Certificate Expiration Monitoring

Set up monitoring for certificate expiration:

```bash
# Script to check certificate expiration
#!/bin/bash
DOMAIN="yourdomain.com"
EXPIRY_DATE=$(echo | openssl s_client -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "Certificate expires in $DAYS_UNTIL_EXPIRY days!"
fi
```

### 2. Automated Renewal Verification

Verify Let's Encrypt renewal is working:
1. Check Coolify logs for renewal attempts
2. Monitor certificate expiration dates
3. Set up alerts for renewal failures

### 3. Security Monitoring

Monitor SSL security:
- Regular SSL Labs scans
- Certificate transparency monitoring
- Security header validation
- TLS version compliance

## Troubleshooting

### Common SSL Issues

#### Certificate Generation Fails
**Symptoms:** Let's Encrypt certificate generation fails
**Solutions:**
1. Verify DNS is properly configured and propagated
2. Check domain is accessible from the internet
3. Ensure port 80 is accessible for HTTP-01 challenge
4. Verify rate limits haven't been exceeded

#### Mixed Content Warnings
**Symptoms:** Browser shows mixed content warnings
**Solutions:**
1. Ensure all resources use HTTPS URLs
2. Update hardcoded HTTP links in application
3. Configure Content Security Policy headers
4. Use relative URLs where possible

#### Certificate Chain Issues
**Symptoms:** Certificate appears invalid in some browsers
**Solutions:**
1. Verify intermediate certificates are included
2. Check certificate chain order
3. Test with different SSL validation tools
4. Regenerate certificate if chain is incomplete

#### WebSocket SSL Issues
**Symptoms:** WebSocket connections fail over HTTPS
**Solutions:**
1. Ensure WebSocket proxy configuration includes SSL headers
2. Verify WebSocket endpoint uses WSS protocol
3. Check firewall allows WebSocket traffic
4. Test WebSocket connection separately

### DNS Issues

#### Domain Not Resolving
**Symptoms:** Domain doesn't resolve to server IP
**Solutions:**
1. Check DNS configuration at registrar
2. Verify A records point to correct IP
3. Wait for DNS propagation (up to 48 hours)
4. Use DNS checking tools to verify propagation

#### Subdomain Issues
**Symptoms:** Subdomains not accessible
**Solutions:**
1. Verify subdomain DNS records exist
2. Check wildcard DNS configuration
3. Ensure Coolify domain configuration includes subdomains
4. Test subdomain resolution independently

### Performance Issues

#### Slow SSL Handshake
**Symptoms:** Slow initial connection to HTTPS site
**Solutions:**
1. Enable SSL session caching
2. Configure OCSP stapling
3. Optimize SSL cipher selection
4. Enable HTTP/2

#### Certificate Validation Delays
**Symptoms:** Long delays during certificate validation
**Solutions:**
1. Configure local OCSP responder
2. Enable OCSP stapling
3. Optimize certificate chain
4. Use faster DNS resolvers

## Security Best Practices

### 1. Certificate Security
- Use strong private keys (2048-bit RSA minimum)
- Protect private key files with appropriate permissions
- Regularly rotate certificates
- Monitor certificate transparency logs

### 2. SSL Configuration Security
- Disable weak SSL/TLS versions (SSLv3, TLSv1.0, TLSv1.1)
- Use strong cipher suites
- Enable Perfect Forward Secrecy
- Configure HSTS headers

### 3. Domain Security
- Use DNSSEC where supported
- Monitor domain expiration
- Implement CAA records
- Regular security audits

## Resources and References

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [SSL Labs Best Practices](https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Coolify SSL Documentation](https://coolify.io/docs/ssl)
- [OWASP Transport Layer Protection](https://owasp.org/www-project-cheat-sheets/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
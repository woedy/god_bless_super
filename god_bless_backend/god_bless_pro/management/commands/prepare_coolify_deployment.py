"""
Django management command to prepare Coolify deployment configuration.

This command generates all necessary configuration files and provides
step-by-step instructions for Coolify deployment.
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from pathlib import Path
import json
import os
import secrets
import string

from god_bless_pro.env_config import EnvironmentConfig
from god_bless_pro.secrets_manager import SecretsManager


class Command(BaseCommand):
    help = 'Prepare configuration for Coolify deployment'

    def add_arguments(self, parser):
        parser.add_argument(
            '--domain',
            type=str,
            required=True,
            help='Your deployment domain (e.g., myapp.com)'
        )
        parser.add_argument(
            '--output-dir',
            type=str,
            default='coolify-config',
            help='Output directory for configuration files (default: coolify-config)'
        )
        parser.add_argument(
            '--generate-secrets',
            action='store_true',
            help='Generate secure values for all secrets'
        )
        parser.add_argument(
            '--format',
            choices=['env', 'json', 'yaml'],
            default='env',
            help='Output format for configuration (default: env)'
        )

    def handle(self, *args, **options):
        """Handle the command execution."""
        try:
            domain = options['domain']
            output_dir = Path(options['output_dir'])
            
            # Create output directory
            output_dir.mkdir(exist_ok=True)
            
            self.stdout.write(
                self.style.SUCCESS(f"🚀 Preparing Coolify deployment for domain: {domain}")
            )
            
            # Generate configuration
            config = self.generate_coolify_config(domain, options['generate_secrets'])
            
            # Write configuration files
            self.write_configuration_files(config, output_dir, options['format'])
            
            # Generate deployment instructions
            self.generate_deployment_instructions(config, output_dir, domain)
            
            self.stdout.write(
                self.style.SUCCESS(f"\n✅ Coolify deployment configuration generated in: {output_dir}")
            )
            self.stdout.write("📖 See deployment-instructions.md for next steps")
            
        except Exception as e:
            raise CommandError(f"Deployment preparation failed: {e}")

    def generate_coolify_config(self, domain: str, generate_secrets: bool) -> dict:
        """Generate complete Coolify configuration."""
        config = {
            'domain': domain,
            'environment_variables': {},
            'secrets': {},
            'services': {
                'database': 'postgresql:15-alpine',
                'redis': 'redis:7-alpine',
                'backend': 'custom-build',
                'frontend': 'custom-build',
                'nginx': 'nginx:alpine'
            }
        }
        
        # Core environment variables
        config['environment_variables'].update({
            'ENVIRONMENT': 'production',
            'DEBUG': 'false',
            'DJANGO_SETTINGS_MODULE': 'god_bless_pro.settings',
            
            # Domain configuration
            'ALLOWED_HOSTS': f"{domain},www.{domain}",
            'CORS_ALLOWED_ORIGINS': f"https://{domain},https://www.{domain}",
            'CSRF_TRUSTED_ORIGINS': f"https://{domain},https://www.{domain}",
            
            # Database
            'POSTGRES_DB': 'god_bless_db',
            'POSTGRES_USER': 'god_bless_user',
            'POSTGRES_HOST': 'database',
            'POSTGRES_PORT': '5432',
            'USE_POSTGRES': 'true',
            'DB_CONN_MAX_AGE': '300',
            'DB_CONN_HEALTH_CHECKS': 'true',
            
            # Redis
            'REDIS_HOST': 'redis',
            'REDIS_PORT': '6379',
            
            # Frontend
            'VITE_API_URL': f"https://{domain}/api",
            'VITE_WS_URL': f"wss://{domain}/ws",
            'VITE_APP_NAME': 'God Bless America Platform',
            'VITE_VERSION': '1.0.0',
            'VITE_ENVIRONMENT': 'production',
            
            # Security
            'SECURE_SSL_REDIRECT': 'true',
            'SECURE_PROXY_SSL_HEADER': 'HTTP_X_FORWARDED_PROTO,https',
            'USE_TLS': 'true',
            'SESSION_COOKIE_SECURE': 'true',
            'CSRF_COOKIE_SECURE': 'true',
            'SESSION_COOKIE_HTTPONLY': 'true',
            'CSRF_COOKIE_HTTPONLY': 'true',
            'SESSION_COOKIE_SAMESITE': 'Lax',
            'CSRF_COOKIE_SAMESITE': 'Lax',
            'SECURE_BROWSER_XSS_FILTER': 'true',
            'SECURE_CONTENT_TYPE_NOSNIFF': 'true',
            'SECURE_HSTS_SECONDS': '31536000',
            'SECURE_HSTS_INCLUDE_SUBDOMAINS': 'true',
            'SECURE_HSTS_PRELOAD': 'true',
            
            # Performance
            'CACHE_TTL': '300',
            'SESSION_CACHE_ALIAS': 'default',
            'STATIC_URL': '/static/',
            'MEDIA_URL': '/media/',
            
            # Logging
            'LOG_LEVEL': 'INFO',
            'DJANGO_LOG_LEVEL': 'INFO',
            'CELERY_LOG_LEVEL': 'INFO',
            
            # Backup
            'BACKUP_ENABLED': 'true',
            'BACKUP_RETENTION_DAYS': '30',
            'BACKUP_SCHEDULE': '0 2 * * *',
            
            # Email (optional)
            'EMAIL_HOST': 'smtp.gmail.com',
            'EMAIL_PORT': '587',
            'EMAIL_USE_TLS': 'true',
            'DEFAULT_FROM_EMAIL': f'God Bless Platform <noreply@{domain}>',
            
            # Initial setup
            'CREATE_SUPERUSER': 'false',
            'DJANGO_SUPERUSER_USERNAME': 'admin',
            'DJANGO_SUPERUSER_EMAIL': f'admin@{domain}',
            'LOAD_INITIAL_DATA': 'false',
            
            # Monitoring
            'FLOWER_USER': 'admin',
        })
        
        # Generate secrets
        if generate_secrets:
            config['secrets'] = self.generate_secure_secrets()
        else:
            config['secrets'] = self.get_secret_placeholders()
            
        return config

    def generate_secure_secrets(self) -> dict:
        """Generate secure values for all secrets."""
        return {
            'SECRET_KEY': self.generate_django_secret_key(),
            'POSTGRES_PASSWORD': self.generate_password(32),
            'REDIS_PASSWORD': self.generate_password(24),
            'EMAIL_HOST_PASSWORD': '<your-email-app-password>',
            'DJANGO_SUPERUSER_PASSWORD': self.generate_password(16),
            'FLOWER_PASSWORD': self.generate_password(16),
        }

    def get_secret_placeholders(self) -> dict:
        """Get placeholder values for secrets."""
        return {
            'SECRET_KEY': '<generate-django-secret-key>',
            'POSTGRES_PASSWORD': '<generate-secure-database-password>',
            'REDIS_PASSWORD': '<generate-secure-redis-password>',
            'EMAIL_HOST_PASSWORD': '<your-email-app-password>',
            'DJANGO_SUPERUSER_PASSWORD': '<generate-secure-admin-password>',
            'FLOWER_PASSWORD': '<generate-secure-flower-password>',
        }

    def generate_django_secret_key(self) -> str:
        """Generate Django secret key."""
        from django.core.management.utils import get_random_secret_key
        return get_random_secret_key()

    def generate_password(self, length: int) -> str:
        """Generate secure password."""
        alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    def write_configuration_files(self, config: dict, output_dir: Path, format_type: str):
        """Write configuration files in specified format."""
        if format_type == 'env':
            self.write_env_file(config, output_dir)
        elif format_type == 'json':
            self.write_json_file(config, output_dir)
        elif format_type == 'yaml':
            self.write_yaml_file(config, output_dir)

    def write_env_file(self, config: dict, output_dir: Path):
        """Write .env file for Coolify."""
        env_file = output_dir / 'coolify.env'
        
        with open(env_file, 'w') as f:
            f.write("# Coolify Environment Configuration\n")
            f.write(f"# Generated for domain: {config['domain']}\n")
            f.write("# Copy these variables to Coolify's Environment Variables tab\n\n")
            
            # Write environment variables
            for key, value in config['environment_variables'].items():
                f.write(f"{key}={value}\n")
                
        # Write secrets file
        secrets_file = output_dir / 'coolify-secrets.env'
        with open(secrets_file, 'w') as f:
            f.write("# Coolify Secrets Configuration\n")
            f.write("# Copy these secrets to Coolify's Secrets tab\n")
            f.write("# IMPORTANT: Generate secure values for production\n\n")
            
            for key, value in config['secrets'].items():
                f.write(f"{key}={value}\n")

    def write_json_file(self, config: dict, output_dir: Path):
        """Write JSON configuration file."""
        json_file = output_dir / 'coolify-config.json'
        with open(json_file, 'w') as f:
            json.dump(config, f, indent=2)

    def write_yaml_file(self, config: dict, output_dir: Path):
        """Write YAML configuration file."""
        try:
            import yaml
            yaml_file = output_dir / 'coolify-config.yaml'
            with open(yaml_file, 'w') as f:
                yaml.dump(config, f, default_flow_style=False, indent=2)
        except ImportError:
            self.stdout.write(
                self.style.WARNING("PyYAML not installed. Skipping YAML output.")
            )

    def generate_deployment_instructions(self, config: dict, output_dir: Path, domain: str):
        """Generate step-by-step deployment instructions."""
        instructions_file = output_dir / 'deployment-instructions.md'
        
        instructions = f"""# Coolify Deployment Instructions

## Overview
This guide will help you deploy the God Bless America platform to Coolify using the generated configuration.

**Domain:** {domain}
**Generated:** {self.get_current_timestamp()}

## Prerequisites
- Coolify instance running and accessible
- Domain DNS pointing to your Coolify server
- Git repository accessible to Coolify

## Step 1: Create Application in Coolify

1. Log into your Coolify dashboard
2. Click "New Resource" → "Application"
3. Choose "Docker Compose" as the build pack
4. Connect your Git repository
5. Set the branch (usually `main` or `master`)

## Step 2: Configure Environment Variables

1. Go to your application's "Environment Variables" tab
2. Copy all variables from `coolify.env` file
3. Paste them into Coolify's environment variables section
4. **Important:** Replace `{domain}` with your actual domain if not already done

## Step 3: Configure Secrets

1. Go to your application's "Secrets" tab
2. Copy all secrets from `coolify-secrets.env` file
3. **CRITICAL:** Generate secure values for production:

### Required Secret Generation Commands:

```bash
# Django Secret Key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Database Password
openssl rand -base64 32

# Redis Password  
openssl rand -base64 24

# Admin Password
openssl rand -base64 16

# Flower Password
openssl rand -base64 16
```

## Step 4: Configure Domain and SSL

1. Go to your application's "Domains" tab
2. Add your primary domain: `{domain}`
3. Add www subdomain: `www.{domain}` (optional)
4. Enable SSL/TLS certificates (Let's Encrypt)
5. Wait for SSL certificates to be issued

## Step 5: Deploy Application

1. Click "Deploy" button
2. Monitor the build logs for any errors
3. Wait for all services to start (this may take 5-10 minutes)
4. Check that all services show as "healthy"

## Step 6: Initial Setup (First Deployment Only)

For the first deployment, you need to create an admin user:

1. Set `CREATE_SUPERUSER=true` in environment variables
2. Redeploy the application
3. After successful deployment, set `CREATE_SUPERUSER=false`
4. Redeploy again to disable automatic user creation

## Step 7: Verify Deployment

1. Access your application at `https://{domain}`
2. Check that all pages load correctly
3. Test login with admin credentials
4. Verify WebSocket connections work

### Validation Commands

SSH into your application container and run:

```bash
# Validate environment configuration
python manage.py validate_environment

# Perform security audit
python manage.py validate_environment --audit

# Test external service connectivity
python manage.py validate_environment --check-connectivity
```

## Step 8: Post-Deployment Configuration

1. **Email Configuration** (if needed):
   - Set `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD`
   - Test email functionality

2. **Monitoring Setup**:
   - Access Flower at `https://{domain}/flower/` (if enabled)
   - Monitor Celery tasks and workers

3. **Backup Configuration**:
   - Verify backup settings are correct
   - Test backup and restore procedures

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check build logs for specific errors
   - Verify all required files are in repository
   - Ensure Docker Compose file is valid

2. **Database Connection Issues**:
   - Verify PostgreSQL service is running
   - Check database credentials
   - Ensure network connectivity between services

3. **SSL Certificate Issues**:
   - Verify domain DNS is pointing to Coolify server
   - Check domain configuration in Coolify
   - Wait for certificate propagation (can take up to 10 minutes)

4. **Application Not Loading**:
   - Check application logs in Coolify dashboard
   - Verify all environment variables are set correctly
   - Ensure all secrets have valid values

### Debug Mode (Temporary)

If you need to debug issues, temporarily set:
```
DEBUG=true
SECURE_SSL_REDIRECT=false
SESSION_COOKIE_SECURE=false
CSRF_COOKIE_SECURE=false
```

**⚠️ Important:** Always disable debug mode after troubleshooting.

## Security Checklist

- [ ] All secrets have secure, generated values
- [ ] Debug mode is disabled (`DEBUG=false`)
- [ ] SSL/TLS is enabled and working
- [ ] Admin user has a strong password
- [ ] Email notifications are configured
- [ ] Backup procedures are tested
- [ ] Monitoring is set up and working

## Support

If you encounter issues:
1. Check Coolify application logs
2. Run validation commands in the container
3. Review environment variable configuration
4. Check this troubleshooting guide

## Next Steps

After successful deployment:
1. Set up monitoring and alerting
2. Configure backup procedures
3. Test all application features
4. Set up CI/CD pipeline for updates
5. Document your deployment process

---

**Generated Configuration Files:**
- `coolify.env` - Environment variables for Coolify
- `coolify-secrets.env` - Secrets for Coolify (generate secure values!)
- `coolify-config.json` - Complete configuration in JSON format

**Important:** Keep your secrets secure and never commit them to version control.
"""

        with open(instructions_file, 'w') as f:
            f.write(instructions)

    def get_current_timestamp(self) -> str:
        """Get current timestamp for documentation."""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
"""
Django management command to generate secure secrets for deployment.
"""

from django.core.management.base import BaseCommand
from god_bless_pro.secrets_manager import secrets_manager
import os


class Command(BaseCommand):
    help = 'Generate secure secrets for deployment'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            choices=['env', 'json', 'coolify'],
            default='env',
            help='Output format (default: env)'
        )
        parser.add_argument(
            '--domain',
            type=str,
            help='Domain name for the deployment'
        )
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing .env.production file'
        )
    
    def handle(self, *args, **options):
        """Handle the command execution"""
        self.stdout.write(self.style.SUCCESS('Generating secure secrets...'))
        
        # Generate secrets
        secrets = self._generate_secrets(options.get('domain'))
        
        # Output in requested format
        if options['output'] == 'env':
            self._output_env_format(secrets, options.get('overwrite', False))
        elif options['output'] == 'json':
            self._output_json_format(secrets)
        elif options['output'] == 'coolify':
            self._output_coolify_format(secrets)
        
        self.stdout.write(self.style.SUCCESS('Secrets generated successfully'))
        
        # Security reminders
        self._output_security_reminders()
    
    def _generate_secrets(self, domain=None):
        """Generate all required secrets"""
        secrets = {
            # Django secrets
            'SECRET_KEY': secrets_manager.generate_secret_key(),
            
            # Database secrets
            'POSTGRES_PASSWORD': secrets_manager.generate_password(32),
            
            # Redis secrets
            'REDIS_PASSWORD': secrets_manager.generate_password(24),
            
            # Email secrets (placeholder)
            'EMAIL_HOST_PASSWORD': 'your-email-app-password-change-this',
            
            # Admin secrets
            'DJANGO_SUPERUSER_PASSWORD': secrets_manager.generate_password(16),
            'FLOWER_PASSWORD': secrets_manager.generate_password(16),
            
            # Domain configuration
            'DOMAIN': domain or 'yourdomain.com',
        }
        
        return secrets
    
    def _output_env_format(self, secrets, overwrite=False):
        """Output secrets in .env format"""
        filename = '.env.production'
        
        if os.path.exists(filename) and not overwrite:
            self.stdout.write(
                self.style.WARNING(f'{filename} already exists. Use --overwrite to replace it.')
            )
            return
        
        env_content = self._generate_env_content(secrets)
        
        with open(filename, 'w') as f:
            f.write(env_content)
        
        self.stdout.write(f'Secrets written to {filename}')
    
    def _output_json_format(self, secrets):
        """Output secrets in JSON format"""
        import json
        self.stdout.write(json.dumps(secrets, indent=2))
    
    def _output_coolify_format(self, secrets):
        """Output secrets in Coolify-friendly format"""
        self.stdout.write(self.style.HTTP_INFO('Copy these environment variables to Coolify:'))
        self.stdout.write('')
        
        # Regular environment variables
        env_vars = [
            'ENVIRONMENT=production',
            'DEBUG=false',
            f'SECRET_KEY={secrets["SECRET_KEY"]}',
            f'POSTGRES_PASSWORD={secrets["POSTGRES_PASSWORD"]}',
            f'REDIS_PASSWORD={secrets["REDIS_PASSWORD"]}',
            f'ALLOWED_HOSTS=localhost,127.0.0.1,{secrets["DOMAIN"]},www.{secrets["DOMAIN"]}',
            f'CORS_ALLOWED_ORIGINS=https://{secrets["DOMAIN"]},https://www.{secrets["DOMAIN"]}',
            f'CSRF_TRUSTED_ORIGINS=https://{secrets["DOMAIN"]},https://www.{secrets["DOMAIN"]}',
            f'VITE_API_URL=https://{secrets["DOMAIN"]}/api',
            f'VITE_WS_URL=wss://{secrets["DOMAIN"]}/ws',
        ]
        
        for var in env_vars:
            self.stdout.write(var)
        
        self.stdout.write('')
        self.stdout.write(self.style.HTTP_INFO('Copy these secrets to Coolify Secrets tab:'))
        self.stdout.write('')
        
        # Sensitive secrets
        secret_vars = [
            f'EMAIL_HOST_PASSWORD={secrets["EMAIL_HOST_PASSWORD"]}',
            f'DJANGO_SUPERUSER_PASSWORD={secrets["DJANGO_SUPERUSER_PASSWORD"]}',
            f'FLOWER_PASSWORD={secrets["FLOWER_PASSWORD"]}',
        ]
        
        for var in secret_vars:
            self.stdout.write(var)
    
    def _generate_env_content(self, secrets):
        """Generate complete .env file content"""
        domain = secrets['DOMAIN']
        
        return f"""# =============================================================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# Generated by: python manage.py generate_secrets
# =============================================================================

# Environment
ENVIRONMENT=production
DEBUG=false
DJANGO_SETTINGS_MODULE=god_bless_pro.settings

# Django Configuration
SECRET_KEY={secrets['SECRET_KEY']}
ALLOWED_HOSTS=localhost,127.0.0.1,{domain},www.{domain}
CORS_ALLOWED_ORIGINS=https://{domain},https://www.{domain}
CSRF_TRUSTED_ORIGINS=https://{domain},https://www.{domain}

# Database Configuration
POSTGRES_DB=god_bless_db
POSTGRES_USER=god_bless_user
POSTGRES_PASSWORD={secrets['POSTGRES_PASSWORD']}
POSTGRES_HOST=database
POSTGRES_PORT=5432

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD={secrets['REDIS_PASSWORD']}

# Celery Configuration
CELERY_BROKER_URL=redis://:{secrets['REDIS_PASSWORD']}@redis:6379/0
CELERY_RESULT_BACKEND=redis://:{secrets['REDIS_PASSWORD']}@redis:6379/0

# Email Configuration (UPDATE THESE VALUES)
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD={secrets['EMAIL_HOST_PASSWORD']}
EMAIL_PORT=587
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=God Bless Platform <noreply@{domain}>

# Frontend Configuration
VITE_API_URL=https://{domain}/api
VITE_WS_URL=wss://{domain}/ws
VITE_APP_NAME=God Bless America Platform
VITE_VERSION=1.0.0
VITE_ENVIRONMENT=production

# Admin Configuration
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@{domain}
DJANGO_SUPERUSER_PASSWORD={secrets['DJANGO_SUPERUSER_PASSWORD']}

# Monitoring Configuration
FLOWER_USER=admin
FLOWER_PASSWORD={secrets['FLOWER_PASSWORD']}

# Security Configuration
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
USE_TLS=True

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30

# =============================================================================
# IMPORTANT: Update the following values before deployment:
# - EMAIL_HOST_USER: Your actual email address
# - EMAIL_HOST_PASSWORD: Your email app password
# - Domain references: Replace '{domain}' with your actual domain
# =============================================================================
"""
    
    def _output_security_reminders(self):
        """Output important security reminders"""
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('SECURITY REMINDERS:'))
        self.stdout.write('1. Store secrets securely and never commit them to version control')
        self.stdout.write('2. Use different secrets for different environments')
        self.stdout.write('3. Rotate secrets regularly (every 90 days recommended)')
        self.stdout.write('4. Update EMAIL_HOST_PASSWORD with your actual email app password')
        self.stdout.write('5. Replace domain placeholders with your actual domain')
        self.stdout.write('6. Enable 2FA for all admin accounts')
        self.stdout.write('7. Monitor logs for suspicious activity')
        self.stdout.write('')
        self.stdout.write(self.style.HTTP_INFO('Next steps:'))
        self.stdout.write('1. Update email configuration with real values')
        self.stdout.write('2. Test the configuration: python manage.py validate_secrets --audit')
        self.stdout.write('3. Deploy to your Coolify instance')
        self.stdout.write('')
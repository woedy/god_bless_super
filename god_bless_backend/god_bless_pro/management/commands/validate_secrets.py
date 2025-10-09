"""
Django management command to validate environment secrets and configuration.
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from god_bless_pro.secrets_manager import secrets_manager
import json


class Command(BaseCommand):
    help = 'Validate environment secrets and security configuration'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--format',
            choices=['text', 'json'],
            default='text',
            help='Output format (default: text)'
        )
        parser.add_argument(
            '--audit',
            action='store_true',
            help='Perform comprehensive security audit'
        )
        parser.add_argument(
            '--fix-warnings',
            action='store_true',
            help='Attempt to fix common configuration warnings'
        )
    
    def handle(self, *args, **options):
        """Handle the command execution"""
        self.stdout.write(self.style.SUCCESS('Validating environment secrets and configuration...'))
        
        # Validate secrets
        validation_results = secrets_manager.validate_environment()
        
        if options['audit']:
            # Perform additional security audit
            audit_results = self._perform_security_audit()
            validation_results.update(audit_results)
        
        # Output results
        if options['format'] == 'json':
            self.stdout.write(json.dumps(validation_results, indent=2))
        else:
            self._output_text_results(validation_results)
        
        # Fix warnings if requested
        if options['fix_warnings']:
            self._fix_warnings(validation_results)
        
        # Exit with error code if validation failed
        if not validation_results['valid']:
            raise CommandError('Environment validation failed')
        
        self.stdout.write(self.style.SUCCESS('Environment validation completed successfully'))
    
    def _output_text_results(self, results):
        """Output validation results in text format"""
        # Summary
        if results['valid']:
            self.stdout.write(self.style.SUCCESS('✓ Environment validation PASSED'))
        else:
            self.stdout.write(self.style.ERROR('✗ Environment validation FAILED'))
        
        self.stdout.write('')
        
        # Secrets found
        if results['secrets_found']:
            self.stdout.write(self.style.SUCCESS('Secrets found:'))
            for secret in results['secrets_found']:
                self.stdout.write(f'  ✓ {secret}')
            self.stdout.write('')
        
        # Missing secrets
        if results['secrets_missing']:
            self.stdout.write(self.style.ERROR('Missing required secrets:'))
            for secret in results['secrets_missing']:
                self.stdout.write(f'  ✗ {secret}')
            self.stdout.write('')
        
        # Errors
        if results['errors']:
            self.stdout.write(self.style.ERROR('Errors:'))
            for error in results['errors']:
                self.stdout.write(f'  ✗ {error}')
            self.stdout.write('')
        
        # Warnings
        if results['warnings']:
            self.stdout.write(self.style.WARNING('Warnings:'))
            for warning in results['warnings']:
                self.stdout.write(f'  ⚠ {warning}')
            self.stdout.write('')
        
        # Security audit results
        if 'security_audit' in results:
            self._output_security_audit(results['security_audit'])
    
    def _output_security_audit(self, audit_results):
        """Output security audit results"""
        self.stdout.write(self.style.HTTP_INFO('Security Audit Results:'))
        
        for category, checks in audit_results.items():
            self.stdout.write(f'\n{category.upper()}:')
            for check in checks:
                status = '✓' if check['passed'] else '✗'
                style = self.style.SUCCESS if check['passed'] else self.style.ERROR
                self.stdout.write(style(f'  {status} {check["description"]}'))
                if not check['passed'] and 'recommendation' in check:
                    self.stdout.write(f'    Recommendation: {check["recommendation"]}')
    
    def _perform_security_audit(self):
        """Perform comprehensive security audit"""
        audit_results = {
            'security_audit': {
                'django_security': [],
                'database_security': [],
                'session_security': [],
                'network_security': [],
            }
        }
        
        # Django security checks
        django_checks = [
            {
                'description': 'DEBUG is disabled in production',
                'passed': not settings.DEBUG,
                'recommendation': 'Set DEBUG=False in production environment'
            },
            {
                'description': 'SECRET_KEY is properly configured',
                'passed': len(settings.SECRET_KEY) >= 50,
                'recommendation': 'Use a SECRET_KEY with at least 50 characters'
            },
            {
                'description': 'ALLOWED_HOSTS is properly configured',
                'passed': '*' not in settings.ALLOWED_HOSTS,
                'recommendation': 'Specify exact hostnames instead of using "*"'
            },
            {
                'description': 'SECURE_SSL_REDIRECT is enabled',
                'passed': getattr(settings, 'SECURE_SSL_REDIRECT', False),
                'recommendation': 'Enable SECURE_SSL_REDIRECT for HTTPS enforcement'
            },
            {
                'description': 'SECURE_HSTS_SECONDS is configured',
                'passed': getattr(settings, 'SECURE_HSTS_SECONDS', 0) > 0,
                'recommendation': 'Set SECURE_HSTS_SECONDS to enable HSTS'
            },
        ]
        audit_results['security_audit']['django_security'] = django_checks
        
        # Database security checks
        db_config = settings.DATABASES['default']
        db_checks = [
            {
                'description': 'Database password is set',
                'passed': bool(db_config.get('PASSWORD')),
                'recommendation': 'Set a strong database password'
            },
            {
                'description': 'Database connection uses SSL',
                'passed': db_config.get('OPTIONS', {}).get('sslmode') in ['require', 'verify-full'],
                'recommendation': 'Enable SSL for database connections'
            },
        ]
        audit_results['security_audit']['database_security'] = db_checks
        
        # Session security checks
        session_checks = [
            {
                'description': 'SESSION_COOKIE_SECURE is enabled',
                'passed': getattr(settings, 'SESSION_COOKIE_SECURE', False),
                'recommendation': 'Enable SESSION_COOKIE_SECURE for HTTPS'
            },
            {
                'description': 'SESSION_COOKIE_HTTPONLY is enabled',
                'passed': getattr(settings, 'SESSION_COOKIE_HTTPONLY', False),
                'recommendation': 'Enable SESSION_COOKIE_HTTPONLY to prevent XSS'
            },
            {
                'description': 'CSRF_COOKIE_SECURE is enabled',
                'passed': getattr(settings, 'CSRF_COOKIE_SECURE', False),
                'recommendation': 'Enable CSRF_COOKIE_SECURE for HTTPS'
            },
        ]
        audit_results['security_audit']['session_security'] = session_checks
        
        # Network security checks
        network_checks = [
            {
                'description': 'CORS origins are properly configured',
                'passed': hasattr(settings, 'CORS_ALLOWED_ORIGINS') and settings.CORS_ALLOWED_ORIGINS,
                'recommendation': 'Configure specific CORS_ALLOWED_ORIGINS instead of allowing all'
            },
            {
                'description': 'CORS credentials are properly configured',
                'passed': not getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', True),
                'recommendation': 'Disable CORS_ALLOW_ALL_ORIGINS in production'
            },
        ]
        audit_results['security_audit']['network_security'] = network_checks
        
        return audit_results
    
    def _fix_warnings(self, results):
        """Attempt to fix common configuration warnings"""
        self.stdout.write(self.style.WARNING('Attempting to fix configuration warnings...'))
        
        # This would implement automatic fixes for common issues
        # For now, just provide recommendations
        
        if results['warnings']:
            self.stdout.write(self.style.HTTP_INFO('Recommendations to fix warnings:'))
            
            for warning in results['warnings']:
                if 'ALLOWED_HOSTS contains' in warning:
                    self.stdout.write('  - Set specific hostnames in ALLOWED_HOSTS environment variable')
                elif 'CORS_ALLOWED_ORIGINS is not set' in warning:
                    self.stdout.write('  - Set CORS_ALLOWED_ORIGINS with your frontend URLs')
                elif 'shorter than recommended' in warning:
                    self.stdout.write('  - Generate stronger passwords using: python manage.py generate_secrets')
        
        self.stdout.write('')
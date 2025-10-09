"""
Django management command to validate environment configuration.

This command validates all environment variables and secrets required
for the God Bless America platform deployment.
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from pathlib import Path
import json
import sys

from god_bless_pro.env_config import EnvironmentConfig, EnvironmentConfigError
from god_bless_pro.secrets_manager import SecretsManager


class Command(BaseCommand):
    help = 'Validate environment configuration and secrets'

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
            help='Perform security audit of secrets'
        )
        parser.add_argument(
            '--export-template',
            action='store_true',
            help='Export Coolify secrets template'
        )
        parser.add_argument(
            '--check-connectivity',
            action='store_true',
            help='Test connectivity to external services'
        )

    def handle(self, *args, **options):
        """Handle the command execution."""
        try:
            if options['export_template']:
                self.export_secrets_template()
                return

            if options['audit']:
                self.audit_secrets(options['format'])
                return

            self.validate_configuration(options['format'], options['check_connectivity'])

        except Exception as e:
            raise CommandError(f"Environment validation failed: {e}")

    def validate_configuration(self, output_format: str, check_connectivity: bool):
        """Validate environment configuration."""
        base_dir = Path(settings.BASE_DIR)
        env_config = EnvironmentConfig(base_dir)

        try:
            config = env_config.validate_all()
            
            if check_connectivity:
                connectivity_results = self.test_connectivity(config)
                config['connectivity'] = connectivity_results

            if output_format == 'json':
                self.stdout.write(json.dumps(config, indent=2, default=str))
            else:
                self.print_validation_results(config, env_config)

        except EnvironmentConfigError as e:
            if output_format == 'json':
                error_data = {
                    'status': 'error',
                    'errors': str(e).split('\n'),
                    'warnings': env_config.warnings
                }
                self.stdout.write(json.dumps(error_data, indent=2))
            else:
                self.stdout.write(
                    self.style.ERROR(f"Environment validation failed:\n{e}")
                )
            sys.exit(1)

    def print_validation_results(self, config: dict, env_config: EnvironmentConfig):
        """Print validation results in human-readable format."""
        self.stdout.write(
            self.style.SUCCESS("✓ Environment configuration validation passed")
        )
        
        # Environment info
        environment = config.get('environment', 'unknown')
        self.stdout.write(f"\nEnvironment: {environment}")
        
        # Database info
        db_config = config.get('database', {})
        if db_config.get('ENGINE') == 'django.db.backends.postgresql':
            self.stdout.write(f"Database: PostgreSQL ({db_config.get('HOST')}:{db_config.get('PORT')})")
        else:
            self.stdout.write("Database: SQLite (development)")
            
        # Redis info
        redis_config = config.get('redis', {})
        self.stdout.write(f"Redis: {redis_config.get('host')}:{redis_config.get('port')}")
        
        # Security info
        security_config = config.get('security', {})
        self.stdout.write(f"Debug mode: {'enabled' if security_config.get('debug') else 'disabled'}")
        self.stdout.write(f"TLS/SSL: {'enabled' if security_config.get('use_tls') else 'disabled'}")
        
        # Warnings
        if env_config.warnings:
            self.stdout.write(self.style.WARNING("\nWarnings:"))
            for warning in env_config.warnings:
                self.stdout.write(f"  - {warning}")

    def audit_secrets(self, output_format: str):
        """Perform security audit of secrets."""
        base_dir = Path(settings.BASE_DIR)
        secrets_manager = SecretsManager(base_dir)
        
        audit_results = secrets_manager.audit_secrets()
        
        if output_format == 'json':
            self.stdout.write(json.dumps(audit_results, indent=2))
        else:
            self.print_audit_results(audit_results)

    def print_audit_results(self, audit_results: dict):
        """Print audit results in human-readable format."""
        self.stdout.write(
            self.style.SUCCESS("🔍 Security Audit Results")
        )
        
        self.stdout.write(f"\nEnvironment: {audit_results['environment']}")
        self.stdout.write(f"Timestamp: {audit_results['timestamp']}")
        
        # Secrets found
        secrets_found = audit_results.get('secrets_found', [])
        self.stdout.write(f"\n✓ Secrets configured: {len(secrets_found)}")
        for secret in secrets_found:
            self.stdout.write(f"  - {secret['name']}: {secret['length']} chars ({secret['masked_value']})")
        
        # Missing secrets
        missing_secrets = audit_results.get('missing_secrets', [])
        if missing_secrets:
            self.stdout.write(self.style.WARNING(f"\n⚠ Missing secrets: {len(missing_secrets)}"))
            for secret in missing_secrets:
                self.stdout.write(f"  - {secret}")
        
        # Weak secrets
        weak_secrets = audit_results.get('weak_secrets', [])
        if weak_secrets:
            self.stdout.write(self.style.ERROR(f"\n❌ Weak secrets: {len(weak_secrets)}"))
            for secret in weak_secrets:
                self.stdout.write(f"  - {secret['name']}: {secret['issue']}")
        
        # Recommendations
        recommendations = audit_results.get('recommendations', [])
        if recommendations:
            self.stdout.write(self.style.WARNING("\n📋 Recommendations:"))
            for rec in recommendations:
                self.stdout.write(f"  - {rec}")
        else:
            self.stdout.write(self.style.SUCCESS("\n✓ No security recommendations"))

    def export_secrets_template(self):
        """Export Coolify secrets template."""
        base_dir = Path(settings.BASE_DIR)
        secrets_manager = SecretsManager(base_dir)
        
        template = secrets_manager.export_secrets_template()
        self.stdout.write(template)
        
        # Also provide Coolify-specific instructions
        self.stdout.write("\n" + "="*60)
        self.stdout.write("COOLIFY DEPLOYMENT INSTRUCTIONS")
        self.stdout.write("="*60)
        self.stdout.write("\n1. Copy the above secrets to Coolify's Secrets management")
        self.stdout.write("2. Replace placeholder values with generated secure values")
        self.stdout.write("3. Configure environment variables in Coolify's Environment tab")
        self.stdout.write("4. See docs/COOLIFY_ENVIRONMENT_SETUP.md for detailed instructions")
        self.stdout.write("5. Run 'python manage.py validate_environment' after deployment")
        self.stdout.write("\nGeneration commands:")
        self.stdout.write("  Django Secret: python -c \"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())\"")
        self.stdout.write("  Secure Password: openssl rand -base64 32")
        self.stdout.write("  Redis Password: openssl rand -base64 24")

    def test_connectivity(self, config: dict) -> dict:
        """Test connectivity to external services."""
        results = {}
        
        # Test database connectivity
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            results['database'] = {'status': 'connected', 'error': None}
        except Exception as e:
            results['database'] = {'status': 'failed', 'error': str(e)}
        
        # Test Redis connectivity
        try:
            import redis
            redis_config = config.get('redis', {})
            r = redis.Redis(
                host=redis_config.get('host', 'localhost'),
                port=redis_config.get('port', 6379),
                password=redis_config.get('password') or None,
                decode_responses=True
            )
            r.ping()
            results['redis'] = {'status': 'connected', 'error': None}
        except Exception as e:
            results['redis'] = {'status': 'failed', 'error': str(e)}
        
        # Test email configuration
        try:
            from django.core.mail import get_connection
            email_config = config.get('email', {})
            if email_config.get('user') and email_config.get('password'):
                connection = get_connection()
                connection.open()
                connection.close()
                results['email'] = {'status': 'connected', 'error': None}
            else:
                results['email'] = {'status': 'not_configured', 'error': 'No credentials provided'}
        except Exception as e:
            results['email'] = {'status': 'failed', 'error': str(e)}
        
        return results
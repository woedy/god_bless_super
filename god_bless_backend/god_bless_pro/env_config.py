"""
Environment Configuration Management for God Bless America Platform

This module provides centralized environment variable management with validation,
type conversion, and secure secret handling for Coolify deployment.
"""

import os
import sys
from typing import Any, Dict, List, Optional, Union, Callable
from pathlib import Path
import logging
from .secrets_manager import SecretsManager

logger = logging.getLogger(__name__)


class EnvironmentConfigError(Exception):
    """Raised when environment configuration is invalid or missing."""
    pass


class EnvironmentConfig:
    """
    Centralized environment configuration management with validation.
    
    Provides type-safe environment variable access with validation,
    default values, and comprehensive error reporting.
    """
    
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self._validated_vars: Dict[str, Any] = {}
        self.secrets_manager = SecretsManager()
        
    def get_env(
        self,
        key: str,
        default: Any = None,
        required: bool = False,
        var_type: type = str,
        validator: Optional[Callable] = None,
        description: str = ""
    ) -> Any:
        """
        Get environment variable with validation and type conversion.
        
        Args:
            key: Environment variable name
            default: Default value if not set
            required: Whether the variable is required
            var_type: Expected type (str, int, bool, list)
            validator: Optional validation function
            description: Description for documentation
            
        Returns:
            Converted and validated environment variable value
            
        Raises:
            EnvironmentConfigError: If required variable is missing or invalid
        """
        raw_value = os.environ.get(key)
        
        # Handle required variables
        if required and raw_value is None:
            error_msg = f"Required environment variable '{key}' is not set"
            if description:
                error_msg += f" - {description}"
            self.errors.append(error_msg)
            return default
            
        # Use default if not set
        if raw_value is None:
            self._validated_vars[key] = default
            return default
            
        # Type conversion
        try:
            if var_type == bool:
                converted_value = self._convert_bool(raw_value)
            elif var_type == int:
                converted_value = int(raw_value)
            elif var_type == float:
                converted_value = float(raw_value)
            elif var_type == list:
                converted_value = self._convert_list(raw_value)
            else:
                converted_value = raw_value
                
        except (ValueError, TypeError) as e:
            error_msg = f"Invalid type for '{key}': expected {var_type.__name__}, got '{raw_value}'"
            if description:
                error_msg += f" - {description}"
            self.errors.append(error_msg)
            return default
            
        # Custom validation
        if validator:
            try:
                if not validator(converted_value):
                    error_msg = f"Validation failed for '{key}': '{converted_value}'"
                    if description:
                        error_msg += f" - {description}"
                    self.errors.append(error_msg)
                    return default
            except Exception as e:
                error_msg = f"Validator error for '{key}': {str(e)}"
                self.errors.append(error_msg)
                return default
                
        self._validated_vars[key] = converted_value
        return converted_value
        
    def _convert_bool(self, value: str) -> bool:
        """Convert string to boolean."""
        return value.lower() in ('true', '1', 'yes', 'on', 'enabled')
        
    def _convert_list(self, value: str, separator: str = ',') -> List[str]:
        """Convert comma-separated string to list."""
        return [item.strip() for item in value.split(separator) if item.strip()]
        
    def validate_database_config(self) -> Dict[str, Any]:
        """Validate database configuration."""
        config = {}
        
        # Database engine selection
        use_postgres = self.get_env('USE_POSTGRES', False, var_type=bool)
        
        if use_postgres:
            # Use secrets manager for sensitive database credentials
            db_password = self.secrets_manager.get_secret('POSTGRES_PASSWORD', required=True)
            
            config.update({
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': self.get_env('POSTGRES_DB', required=True, 
                                   description="PostgreSQL database name"),
                'USER': self.get_env('POSTGRES_USER', required=True,
                                   description="PostgreSQL username"),
                'PASSWORD': db_password,
                'HOST': self.get_env('POSTGRES_HOST', 'localhost',
                                   description="PostgreSQL host"),
                'PORT': self.get_env('POSTGRES_PORT', 5432, var_type=int,
                                   description="PostgreSQL port"),
                'OPTIONS': {
                    'sslmode': self.get_env('POSTGRES_SSL_MODE', 'prefer'),
                    'connect_timeout': self.get_env('DB_CONNECT_TIMEOUT', 10, var_type=int),
                },
                'CONN_MAX_AGE': self.get_env('DB_CONN_MAX_AGE', 300, var_type=int),
                'CONN_HEALTH_CHECKS': self.get_env('DB_CONN_HEALTH_CHECKS', True, var_type=bool),
            })
        else:
            # SQLite for development
            config.update({
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': self.base_dir / 'db.sqlite3',
            })
            
        return config
        
    def validate_redis_config(self) -> Dict[str, str]:
        """Validate Redis configuration."""
        redis_host = self.get_env('REDIS_HOST', 'localhost')
        redis_port = self.get_env('REDIS_PORT', 6379, var_type=int)
        
        # Use secrets manager for Redis password
        redis_password = self.secrets_manager.get_secret('REDIS_PASSWORD', '', required=False)
        
        # Build Redis URL
        if redis_password:
            redis_url = f"redis://:{redis_password}@{redis_host}:{redis_port}"
        else:
            redis_url = f"redis://{redis_host}:{redis_port}"
            
        return {
            'host': redis_host,
            'port': redis_port,
            'password': redis_password,
            'url': redis_url,
        }
        
    def validate_celery_config(self) -> Dict[str, str]:
        """Validate Celery configuration."""
        redis_config = self.validate_redis_config()
        
        # Allow custom broker/backend URLs or use Redis
        broker_url = self.get_env('CELERY_BROKER_URL', f"{redis_config['url']}/0")
        result_backend = self.get_env('CELERY_RESULT_BACKEND', f"{redis_config['url']}/0")
        
        return {
            'broker_url': broker_url,
            'result_backend': result_backend,
        }
        
    def validate_email_config(self) -> Dict[str, Any]:
        """Validate email configuration."""
        # Use secrets manager for email password
        email_password = self.secrets_manager.get_secret('EMAIL_HOST_PASSWORD', '', required=False)
        
        return {
            'host': self.get_env('EMAIL_HOST', 'localhost'),
            'port': self.get_env('EMAIL_PORT', 587, var_type=int),
            'user': self.get_env('EMAIL_HOST_USER', ''),
            'password': email_password,
            'use_tls': self.get_env('EMAIL_USE_TLS', True, var_type=bool),
            'use_ssl': self.get_env('EMAIL_USE_SSL', False, var_type=bool),
            'default_from': self.get_env('DEFAULT_FROM_EMAIL', 'noreply@localhost'),
        }
        
    def validate_security_config(self) -> Dict[str, Any]:
        """Validate security configuration."""
        debug = self.get_env('DEBUG', False, var_type=bool)
        
        # Use secrets manager for sensitive values
        secret_key = self.secrets_manager.get_secret('SECRET_KEY', required=True)
        if secret_key and len(secret_key) < 50:
            self.errors.append("SECRET_KEY must be at least 50 characters long")
        
        return {
            'secret_key': secret_key,
            'debug': debug,
            'allowed_hosts': self.get_env('ALLOWED_HOSTS', ['localhost'], var_type=list),
            'cors_origins': self.get_env('CORS_ALLOWED_ORIGINS', [], var_type=list),
            'csrf_trusted_origins': self.get_env('CSRF_TRUSTED_ORIGINS', [], var_type=list),
            'secure_ssl_redirect': self.get_env('SECURE_SSL_REDIRECT', not debug, var_type=bool),
            'session_cookie_secure': self.get_env('SESSION_COOKIE_SECURE', not debug, var_type=bool),
            'csrf_cookie_secure': self.get_env('CSRF_COOKIE_SECURE', not debug, var_type=bool),
            'use_tls': self.get_env('USE_TLS', not debug, var_type=bool),
        }
        
    def validate_logging_config(self) -> Dict[str, Any]:
        """Validate logging configuration."""
        return {
            'level': self.get_env('LOG_LEVEL', 'INFO',
                                validator=lambda x: x.upper() in ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']),
            'django_level': self.get_env('DJANGO_LOG_LEVEL', 'INFO'),
            'celery_level': self.get_env('CELERY_LOG_LEVEL', 'INFO'),
            'sentry_dsn': self.get_env('SENTRY_DSN', ''),
        }
        
    def validate_performance_config(self) -> Dict[str, Any]:
        """Validate performance configuration."""
        return {
            'cache_ttl': self.get_env('CACHE_TTL', 300, var_type=int),
            'session_cache_alias': self.get_env('SESSION_CACHE_ALIAS', 'default'),
            'static_url': self.get_env('STATIC_URL', '/static/'),
            'media_url': self.get_env('MEDIA_URL', '/media/'),
        }
        
    def validate_monitoring_config(self) -> Dict[str, Any]:
        """Validate monitoring configuration."""
        return {
            'health_check_interval': self.get_env('HEALTH_CHECK_INTERVAL', 30, var_type=int),
            'metrics_enabled': self.get_env('METRICS_ENABLED', True, var_type=bool),
            'flower_user': self.get_env('FLOWER_USER', 'admin'),
            'flower_password': self.get_env('FLOWER_PASSWORD', ''),
        }
        
    def validate_backup_config(self) -> Dict[str, Any]:
        """Validate backup configuration."""
        return {
            'enabled': self.get_env('BACKUP_ENABLED', True, var_type=bool),
            'retention_days': self.get_env('BACKUP_RETENTION_DAYS', 30, var_type=int),
            'schedule': self.get_env('BACKUP_SCHEDULE', '0 2 * * *'),
        }
        
    def validate_all(self) -> Dict[str, Any]:
        """
        Validate all configuration sections.
        
        Returns:
            Dictionary containing all validated configuration
            
        Raises:
            EnvironmentConfigError: If validation fails
        """
        config = {
            'database': self.validate_database_config(),
            'redis': self.validate_redis_config(),
            'celery': self.validate_celery_config(),
            'email': self.validate_email_config(),
            'security': self.validate_security_config(),
            'logging': self.validate_logging_config(),
            'performance': self.validate_performance_config(),
            'monitoring': self.validate_monitoring_config(),
            'backup': self.validate_backup_config(),
        }
        
        # Environment-specific settings
        environment = self.get_env('ENVIRONMENT', 'development')
        config['environment'] = environment
        
        # Initial setup flags
        superuser_password = self.secrets_manager.get_secret('DJANGO_SUPERUSER_PASSWORD', '', required=False)
        config['setup'] = {
            'create_superuser': self.get_env('CREATE_SUPERUSER', False, var_type=bool),
            'superuser_username': self.get_env('DJANGO_SUPERUSER_USERNAME', 'admin'),
            'superuser_email': self.get_env('DJANGO_SUPERUSER_EMAIL', 'admin@localhost'),
            'superuser_password': superuser_password,
            'load_initial_data': self.get_env('LOAD_INITIAL_DATA', False, var_type=bool),
        }
        
        # Report validation results
        if self.errors:
            error_msg = "Environment configuration validation failed:\n" + "\n".join(f"  - {error}" for error in self.errors)
            logger.error(error_msg)
            raise EnvironmentConfigError(error_msg)
            
        if self.warnings:
            warning_msg = "Environment configuration warnings:\n" + "\n".join(f"  - {warning}" for warning in self.warnings)
            logger.warning(warning_msg)
            
        logger.info(f"Environment configuration validated successfully for {environment} environment")
        return config
        
    def get_required_variables(self) -> List[str]:
        """Get list of required environment variables."""
        required_vars = [
            'SECRET_KEY',
            'POSTGRES_DB',
            'POSTGRES_USER', 
            'POSTGRES_PASSWORD',
        ]
        
        # Add conditional requirements
        if self.get_env('USE_POSTGRES', True, var_type=bool):
            required_vars.extend(['POSTGRES_HOST'])
            
        if self.get_env('EMAIL_HOST_USER'):
            required_vars.extend(['EMAIL_HOST_PASSWORD'])
            
        return required_vars
        
    def generate_coolify_config(self, domain: str) -> Dict[str, Any]:
        """Generate Coolify-specific configuration."""
        return {
            'environment_variables': {
                # Core settings
                'ENVIRONMENT': 'production',
                'DEBUG': 'false',
                'DJANGO_SETTINGS_MODULE': 'god_bless_pro.settings',
                
                # Domain configuration
                'ALLOWED_HOSTS': f'{domain},www.{domain}',
                'CORS_ALLOWED_ORIGINS': f'https://{domain},https://www.{domain}',
                'CSRF_TRUSTED_ORIGINS': f'https://{domain},https://www.{domain}',
                
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
                'VITE_API_URL': f'https://{domain}/api',
                'VITE_WS_URL': f'wss://{domain}/ws',
                'VITE_APP_NAME': 'God Bless America Platform',
                'VITE_VERSION': '1.0.0',
                'VITE_ENVIRONMENT': 'production',
                
                # Security
                'SECURE_SSL_REDIRECT': 'true',
                'USE_TLS': 'true',
                'SESSION_COOKIE_SECURE': 'true',
                'CSRF_COOKIE_SECURE': 'true',
                
                # Performance
                'CACHE_TTL': '300',
                'STATIC_URL': '/static/',
                'MEDIA_URL': '/media/',
                
                # Logging
                'LOG_LEVEL': 'INFO',
                'DJANGO_LOG_LEVEL': 'INFO',
                'CELERY_LOG_LEVEL': 'INFO',
                
                # Email
                'EMAIL_HOST': 'smtp.gmail.com',
                'EMAIL_PORT': '587',
                'EMAIL_USE_TLS': 'true',
                'DEFAULT_FROM_EMAIL': f'God Bless Platform <noreply@{domain}>',
                
                # Initial setup
                'CREATE_SUPERUSER': 'false',
                'DJANGO_SUPERUSER_USERNAME': 'admin',
                'DJANGO_SUPERUSER_EMAIL': f'admin@{domain}',
                'LOAD_INITIAL_DATA': 'false',
            },
            'required_secrets': [
                'SECRET_KEY',
                'POSTGRES_PASSWORD',
                'REDIS_PASSWORD',
            ],
            'optional_secrets': [
                'EMAIL_HOST_PASSWORD',
                'DJANGO_SUPERUSER_PASSWORD',
                'FLOWER_PASSWORD',
            ],
            'services': {
                'database': 'postgresql:15-alpine',
                'redis': 'redis:7-alpine',
                'backend': 'custom-build',
                'frontend': 'custom-build',
                'nginx': 'nginx:alpine',
            }
        }
        
    def generate_documentation(self) -> str:
        """Generate environment variable documentation."""
        doc = """# Environment Variables Documentation

This document describes all environment variables used by the God Bless America platform.

## Required Variables

### Database Configuration
- `POSTGRES_DB`: PostgreSQL database name
- `POSTGRES_USER`: PostgreSQL username  
- `POSTGRES_PASSWORD`: PostgreSQL password (use Coolify secrets)
- `POSTGRES_HOST`: PostgreSQL host (default: database)
- `POSTGRES_PORT`: PostgreSQL port (default: 5432)
- `USE_POSTGRES`: Enable PostgreSQL (default: true for production)

### Security Configuration
- `SECRET_KEY`: Django secret key (minimum 50 characters, use Coolify secrets)

## Optional Variables

### Application Configuration
- `DEBUG`: Enable debug mode (default: false for production)
- `ENVIRONMENT`: Deployment environment (production recommended)
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of CORS origins
- `CSRF_TRUSTED_ORIGINS`: Comma-separated list of CSRF trusted origins

### Redis Configuration
- `REDIS_HOST`: Redis host (default: redis)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (use Coolify secrets)

### Frontend Configuration
- `VITE_API_URL`: Frontend API URL (https://yourdomain.com/api)
- `VITE_WS_URL`: WebSocket URL (wss://yourdomain.com/ws)
- `VITE_APP_NAME`: Application name
- `VITE_VERSION`: Application version
- `VITE_ENVIRONMENT`: Frontend environment

### Email Configuration
- `EMAIL_HOST`: SMTP host (default: smtp.gmail.com)
- `EMAIL_PORT`: SMTP port (default: 587)
- `EMAIL_HOST_USER`: SMTP username
- `EMAIL_HOST_PASSWORD`: SMTP password (use Coolify secrets)
- `EMAIL_USE_TLS`: Use TLS (default: true)
- `DEFAULT_FROM_EMAIL`: Default from email address

### Security Settings
- `SECURE_SSL_REDIRECT`: Redirect HTTP to HTTPS (default: true)
- `SECURE_PROXY_SSL_HEADER`: SSL proxy header
- `USE_TLS`: Enable TLS/SSL (default: true)
- `SESSION_COOKIE_SECURE`: Secure session cookies (default: true)
- `CSRF_COOKIE_SECURE`: Secure CSRF cookies (default: true)
- `SECURE_HSTS_SECONDS`: HSTS max age (default: 31536000)

### Performance Configuration
- `CACHE_TTL`: Cache timeout in seconds (default: 300)
- `DB_CONN_MAX_AGE`: Database connection max age (default: 300)
- `DB_CONN_HEALTH_CHECKS`: Enable DB health checks (default: true)

### Logging Configuration
- `LOG_LEVEL`: Application logging level (default: INFO)
- `DJANGO_LOG_LEVEL`: Django logging level (default: INFO)
- `CELERY_LOG_LEVEL`: Celery logging level (default: INFO)
- `SENTRY_DSN`: Sentry error tracking DSN (optional)

### Backup Configuration
- `BACKUP_ENABLED`: Enable automated backups (default: true)
- `BACKUP_RETENTION_DAYS`: Backup retention period (default: 30)
- `BACKUP_SCHEDULE`: Backup cron schedule (default: 0 2 * * *)

### Initial Setup (First Deployment Only)
- `CREATE_SUPERUSER`: Create superuser on startup (default: false)
- `DJANGO_SUPERUSER_USERNAME`: Superuser username (default: admin)
- `DJANGO_SUPERUSER_EMAIL`: Superuser email
- `DJANGO_SUPERUSER_PASSWORD`: Superuser password (use Coolify secrets)
- `LOAD_INITIAL_DATA`: Load initial data fixtures (default: false)

### Monitoring Configuration
- `FLOWER_USER`: Flower monitoring username (default: admin)
- `FLOWER_PASSWORD`: Flower monitoring password (use Coolify secrets)

## Coolify-Specific Notes

### Secrets Management
The following variables should be configured as secrets in Coolify:
- `SECRET_KEY`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `EMAIL_HOST_PASSWORD`
- `DJANGO_SUPERUSER_PASSWORD`
- `FLOWER_PASSWORD`

### Domain Configuration
Replace `yourdomain.com` with your actual domain in:
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `VITE_API_URL`
- `VITE_WS_URL`
- `DEFAULT_FROM_EMAIL`

### Service Names
Use these service names for internal communication:
- Database: `database`
- Redis: `redis`
- Backend: `backend`
- Frontend: `frontend`

### Validation
After deployment, validate configuration with:
```bash
python manage.py validate_environment
python manage.py validate_environment --audit
python manage.py validate_environment --check-connectivity
```
"""
        return doc


def get_environment_config(base_dir: Path) -> Dict[str, Any]:
    """
    Get validated environment configuration.
    
    Args:
        base_dir: Django project base directory
        
    Returns:
        Validated configuration dictionary
        
    Raises:
        EnvironmentConfigError: If validation fails
    """
    env_config = EnvironmentConfig(base_dir)
    return env_config.validate_all()
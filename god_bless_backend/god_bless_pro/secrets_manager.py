"""
Secrets management for the God Bless platform.
Implements secure handling of sensitive configuration data.
"""

import os
import base64
import hashlib
import secrets
from typing import Optional, Dict, Any
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)


class SecretsManager:
    """Manages application secrets and sensitive configuration"""
    
    def __init__(self, base_dir=None):
        self._encryption_key = None
        self._secrets_cache = {}
        self._base_dir = base_dir
    
    def get_secret(self, key: str, default: Optional[str] = None, required: bool = True) -> Optional[str]:
        """
        Get a secret value from environment variables with validation
        
        Args:
            key: Environment variable name
            default: Default value if not found
            required: Whether the secret is required
            
        Returns:
            Secret value or None if not found and not required
            
        Raises:
            ImproperlyConfigured: If required secret is missing
        """
        # Check cache first
        if key in self._secrets_cache:
            return self._secrets_cache[key]
        
        # Get from environment
        value = os.environ.get(key, default)
        
        if required and not value:
            raise ImproperlyConfigured(f"Required secret '{key}' is not set")
        
        if value:
            # Validate secret format
            self._validate_secret(key, value)
            
            # Cache the secret
            self._secrets_cache[key] = value
            
            logger.info(f"Secret '{key}' loaded successfully")
        
        return value
    
    def get_database_url(self) -> str:
        """Get database connection URL with proper validation"""
        db_host = self.get_secret('POSTGRES_HOST', 'database')
        db_port = self.get_secret('POSTGRES_PORT', '5432')
        db_name = self.get_secret('POSTGRES_DB', required=True)
        db_user = self.get_secret('POSTGRES_USER', required=True)
        db_password = self.get_secret('POSTGRES_PASSWORD', required=True)
        
        # Validate database credentials
        if len(db_password) < 12:
            logger.warning("Database password is shorter than recommended (12 characters)")
        
        return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    def get_redis_url(self) -> str:
        """Get Redis connection URL with proper validation"""
        redis_host = self.get_secret('REDIS_HOST', 'redis')
        redis_port = self.get_secret('REDIS_PORT', '6379')
        redis_password = self.get_secret('REDIS_PASSWORD', required=True)
        
        # Validate Redis password
        if len(redis_password) < 12:
            logger.warning("Redis password is shorter than recommended (12 characters)")
        
        return f"redis://:{redis_password}@{redis_host}:{redis_port}"
    
    def get_secret_key(self) -> str:
        """Get Django secret key with validation"""
        secret_key = self.get_secret('SECRET_KEY', required=True)
        
        # Validate secret key
        if len(secret_key) < 50:
            raise ImproperlyConfigured("Django SECRET_KEY must be at least 50 characters long")
        
        return secret_key
    
    def get_email_config(self) -> Dict[str, Any]:
        """Get email configuration with validation"""
        return {
            'host': self.get_secret('EMAIL_HOST', required=True),
            'user': self.get_secret('EMAIL_HOST_USER', required=True),
            'password': self.get_secret('EMAIL_HOST_PASSWORD', required=True),
            'port': int(self.get_secret('EMAIL_PORT', '587')),
            'use_tls': self.get_secret('EMAIL_USE_TLS', 'True').lower() == 'true',
            'use_ssl': self.get_secret('EMAIL_USE_SSL', 'False').lower() == 'true',
            'default_from': self.get_secret('DEFAULT_FROM_EMAIL', 'noreply@localhost'),
        }
    
    def get_security_config(self) -> Dict[str, Any]:
        """Get security configuration"""
        return {
            'allowed_hosts': self._parse_list(self.get_secret('ALLOWED_HOSTS', '*')),
            'cors_origins': self._parse_list(self.get_secret('CORS_ALLOWED_ORIGINS', '')),
            'csrf_trusted_origins': self._parse_list(self.get_secret('CSRF_TRUSTED_ORIGINS', '')),
            'secure_ssl_redirect': self.get_secret('SECURE_SSL_REDIRECT', 'True').lower() == 'true',
            'session_cookie_secure': self.get_secret('SESSION_COOKIE_SECURE', 'True').lower() == 'true',
            'csrf_cookie_secure': self.get_secret('CSRF_COOKIE_SECURE', 'True').lower() == 'true',
            'use_tls': self.get_secret('USE_TLS', 'True').lower() == 'true',
        }
    
    def generate_secret_key(self) -> str:
        """Generate a new Django secret key"""
        return base64.urlsafe_b64encode(secrets.token_bytes(64)).decode('utf-8')
    
    def generate_password(self, length: int = 32) -> str:
        """Generate a secure random password"""
        alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def encrypt_secret(self, value: str, password: str) -> str:
        """Encrypt a secret value using a password"""
        # Derive key from password
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'god_bless_salt',  # In production, use a random salt
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        
        # Encrypt the value
        f = Fernet(key)
        encrypted = f.encrypt(value.encode())
        
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt_secret(self, encrypted_value: str, password: str) -> str:
        """Decrypt a secret value using a password"""
        # Derive key from password
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'god_bless_salt',  # In production, use a random salt
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        
        # Decrypt the value
        f = Fernet(key)
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_value.encode())
        decrypted = f.decrypt(encrypted_bytes)
        
        return decrypted.decode()
    
    def validate_environment(self) -> Dict[str, Any]:
        """Validate all environment variables and return status"""
        validation_results = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'secrets_found': [],
            'secrets_missing': []
        }
        
        # Required secrets
        required_secrets = [
            'SECRET_KEY',
            'POSTGRES_PASSWORD',
            'REDIS_PASSWORD',
            'EMAIL_HOST_PASSWORD',
        ]
        
        # Optional secrets with warnings
        optional_secrets = [
            'FLOWER_PASSWORD',
            'DJANGO_SUPERUSER_PASSWORD',
        ]
        
        # Check required secrets
        for secret in required_secrets:
            try:
                value = self.get_secret(secret, required=True)
                validation_results['secrets_found'].append(secret)
                
                # Validate secret strength
                if len(value) < 12:
                    validation_results['warnings'].append(
                        f"Secret '{secret}' is shorter than recommended (12 characters)"
                    )
                
            except ImproperlyConfigured as e:
                validation_results['valid'] = False
                validation_results['errors'].append(str(e))
                validation_results['secrets_missing'].append(secret)
        
        # Check optional secrets
        for secret in optional_secrets:
            value = self.get_secret(secret, required=False)
            if value:
                validation_results['secrets_found'].append(secret)
            else:
                validation_results['warnings'].append(
                    f"Optional secret '{secret}' is not set"
                )
        
        # Validate security configuration
        try:
            security_config = self.get_security_config()
            
            # Check ALLOWED_HOSTS
            if '*' in security_config['allowed_hosts']:
                validation_results['warnings'].append(
                    "ALLOWED_HOSTS contains '*' which is not recommended for production"
                )
            
            # Check CORS origins
            if not security_config['cors_origins']:
                validation_results['warnings'].append(
                    "CORS_ALLOWED_ORIGINS is not set, which may cause frontend issues"
                )
            
        except Exception as e:
            validation_results['errors'].append(f"Security configuration error: {str(e)}")
            validation_results['valid'] = False
        
        return validation_results
    
    def _validate_secret(self, key: str, value: str) -> None:
        """Validate a secret value"""
        # Check for common weak patterns
        weak_patterns = [
            'password',
            '123456',
            'admin',
            'secret',
            'changeme',
            'default',
        ]
        
        value_lower = value.lower()
        for pattern in weak_patterns:
            if pattern in value_lower:
                logger.warning(f"Secret '{key}' contains weak pattern: {pattern}")
        
        # Check minimum length for passwords
        if 'password' in key.lower() and len(value) < 12:
            logger.warning(f"Password secret '{key}' is shorter than recommended (12 characters)")
    
    def _parse_list(self, value: str) -> list:
        """Parse comma-separated list from environment variable"""
        if not value:
            return []
        
        return [item.strip() for item in value.split(',') if item.strip()]


# Global instance
secrets_manager = SecretsManager()


def get_secret(key: str, default: Optional[str] = None, required: bool = True) -> Optional[str]:
    """Convenience function to get a secret"""
    return secrets_manager.get_secret(key, default, required)


def validate_secrets() -> Dict[str, Any]:
    """Convenience function to validate all secrets"""
    return secrets_manager.validate_environment()
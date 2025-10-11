"""
Docker-specific configuration for SMTP rotation service
"""
import os
import logging
from django.conf import settings


def configure_smtp_logging():
    """Configure logging for SMTP rotation service in Docker environment"""

    # Use the correct logs directory path for Docker
    log_dir = '/god_bless_django/logs'

    # Ensure logs directory exists and is writable
    try:
        os.makedirs(log_dir, exist_ok=True)

        # Test if we can write to the logs directory
        test_file = os.path.join(log_dir, 'test_smtp.log')
        with open(test_file, 'w') as f:
            f.write('test')

        # If successful, configure file logging
        smtp_logger = logging.getLogger('smtps.rotation_service')
        smtp_logger.setLevel(logging.INFO)

        # File handler for SMTP logs
        smtp_handler = logging.FileHandler(os.path.join(log_dir, 'smtp_rotation.log'))
        smtp_handler.setLevel(logging.INFO)

        # Console handler for Docker logs
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)

        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        smtp_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)

        # Add handlers if not already added
        if not smtp_logger.handlers:
            smtp_logger.addHandler(smtp_handler)
            smtp_logger.addHandler(console_handler)

        # Clean up test file
        os.remove(test_file)

        return smtp_logger

    except (OSError, PermissionError):
        # If file logging fails, use console-only logging
        smtp_logger = logging.getLogger('smtps.rotation_service')
        smtp_logger.setLevel(logging.INFO)

        # Console handler only (for Docker logs)
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)

        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)

        # Add handler if not already added
        if not smtp_logger.handlers:
            smtp_logger.addHandler(console_handler)

        return smtp_logger


def get_smtp_health_check_settings():
    """Get SMTP health check settings from environment variables"""
    return {
        'health_check_interval': int(os.getenv('SMTP_HEALTH_CHECK_INTERVAL', 300)),  # 5 minutes
        'max_failures_threshold': int(os.getenv('SMTP_MAX_FAILURES', 3)),
        'connection_timeout': int(os.getenv('SMTP_CONNECTION_TIMEOUT', 15)),
        'cleanup_interval_hours': int(os.getenv('SMTP_CLEANUP_INTERVAL_HOURS', 24)),
        'performance_report_enabled': os.getenv('SMTP_PERFORMANCE_REPORTS', 'true').lower() == 'true',
    }


def get_redis_cache_settings():
    """Get Redis cache settings for SMTP rotation"""
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    redis_password = os.getenv('REDIS_PASSWORD', '')

    return {
        'host': redis_host,
        'port': redis_port,
        'password': redis_password,
        'db': int(os.getenv('SMTP_REDIS_DB', 1)),  # Use DB 1 for SMTP cache
        'key_prefix': 'smtp_rotation:',
        'default_timeout': int(os.getenv('SMTP_CACHE_TIMEOUT', 3600)),
    }


def is_docker_environment():
    """Check if running in Docker environment"""
    return os.path.exists('/.dockerenv') or os.getenv('ENVIRONMENT') == 'production'


def get_smtp_monitoring_config():
    """Get monitoring configuration for SMTP services"""
    return {
        'enable_health_checks': os.getenv('SMTP_ENABLE_HEALTH_CHECKS', 'true').lower() == 'true',
        'enable_performance_tracking': os.getenv('SMTP_ENABLE_PERFORMANCE_TRACKING', 'true').lower() == 'true',
        'enable_rotation_stats': os.getenv('SMTP_ENABLE_ROTATION_STATS', 'true').lower() == 'true',
        'alert_on_failures': os.getenv('SMTP_ALERT_ON_FAILURES', 'true').lower() == 'true',
        'alert_threshold_percentage': float(os.getenv('SMTP_ALERT_THRESHOLD', 80.0)),
    }

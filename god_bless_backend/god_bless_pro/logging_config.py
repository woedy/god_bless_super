"""
Logging configuration for the God Bless platform.
Provides structured logging with different handlers for different log levels.
"""

import os
from pathlib import Path

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent
LOGS_DIR = BASE_DIR / 'logs'

# Create logs directory if it doesn't exist
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {name} {module} {funcName} - {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '[{levelname}] {asctime} - {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'console_debug': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file_error': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'error.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'file_warning': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'warning.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'file_info': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'info.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'file_celery': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'celery.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'file_api': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'api.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file_error', 'file_warning'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['file_error', 'console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console', 'file_error'],
            'level': 'INFO',
            'propagate': False,
        },
        'celery': {
            'handlers': ['console', 'file_celery', 'file_error'],
            'level': 'INFO',
            'propagate': False,
        },
        'celery.task': {
            'handlers': ['console', 'file_celery', 'file_error'],
            'level': 'INFO',
            'propagate': False,
        },
        'god_bless_pro': {
            'handlers': ['console', 'file_api', 'file_error', 'file_warning'],
            'level': 'INFO',
            'propagate': False,
        },
        'phone_generator': {
            'handlers': ['console', 'file_api', 'file_error'],
            'level': 'INFO',
            'propagate': False,
        },
        'sms_sender': {
            'handlers': ['console', 'file_api', 'file_error'],
            'level': 'INFO',
            'propagate': False,
        },
        'tasks': {
            'handlers': ['console', 'file_celery', 'file_error'],
            'level': 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console', 'file_error'],
        'level': 'INFO',
    },
}


def get_logger(name):
    """
    Get a logger instance with the specified name.
    
    Usage:
        from god_bless_pro.logging_config import get_logger
        logger = get_logger(__name__)
        logger.info('This is an info message')
    """
    import logging
    return logging.getLogger(name)

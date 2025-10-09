"""
Celery Performance Configuration for God Bless America Platform
Optimized settings for production deployment with resource management
"""

import os
from celery import Celery
from kombu import Queue, Exchange

# Performance-optimized Celery configuration
CELERY_PERFORMANCE_CONFIG = {
    # Broker Configuration - Use Django settings, fallback to service name
    'broker_url': os.environ.get('CELERY_BROKER_URL', 'redis://redis:6379/0'),
    'result_backend': os.environ.get('CELERY_RESULT_BACKEND', 'redis://redis:6379/0'),
    
    # Connection Pool Optimization
    'broker_pool_limit': 20,
    'broker_connection_retry_on_startup': True,
    'broker_connection_retry': True,
    'broker_connection_max_retries': 10,
    
    # Task Configuration
    'task_serializer': 'json',
    'result_serializer': 'json',
    'accept_content': ['json'],
    'timezone': 'UTC',
    'enable_utc': True,
    
    # Performance Optimization
    'task_compression': 'gzip',
    'result_compression': 'gzip',
    'task_ignore_result': False,
    'task_store_eager_result': True,
    'task_track_started': True,
    'task_acks_late': True,
    'task_reject_on_worker_lost': True,
    
    # Worker Configuration
    'worker_prefetch_multiplier': int(os.environ.get('CELERY_WORKER_PREFETCH_MULTIPLIER', 2)),
    'worker_max_tasks_per_child': int(os.environ.get('CELERY_WORKER_MAX_TASKS_PER_CHILD', 1000)),
    'worker_max_memory_per_child': int(os.environ.get('CELERY_WORKER_MAX_MEMORY_PER_CHILD', 300000)),  # 300MB
    'worker_disable_rate_limits': False,
    'worker_enable_remote_control': True,
    'worker_send_task_events': True,
    'worker_hijack_root_logger': False,
    'worker_log_color': False,
    
    # Task Time Limits
    'task_time_limit': int(os.environ.get('CELERY_TASK_TIME_LIMIT', 1800)),  # 30 minutes
    'task_soft_time_limit': int(os.environ.get('CELERY_TASK_SOFT_TIME_LIMIT', 1500)),  # 25 minutes
    
    # Result Backend Configuration
    'result_expires': 3600,  # 1 hour
    'result_backend_transport_options': {
        'retry_on_timeout': True,
        'socket_keepalive': True,
        'socket_keepalive_options': {
            'TCP_KEEPIDLE': 1,
            'TCP_KEEPINTVL': 3,
            'TCP_KEEPCNT': 5,
        },
        'health_check_interval': 30,
    },
    
    # Queue Configuration with Priorities
    'task_default_queue': 'default',
    'task_default_exchange': 'default',
    'task_default_exchange_type': 'direct',
    'task_default_routing_key': 'default',
    
    # Queue Definitions
    'task_queues': (
        Queue('default', Exchange('default'), routing_key='default', priority=5),
        Queue('phone_generation', Exchange('phone_generation'), routing_key='phone_generation', priority=8),
        Queue('sms_sending', Exchange('sms_sending'), routing_key='sms_sending', priority=7),
        Queue('validation', Exchange('validation'), routing_key='validation', priority=6),
        Queue('projects', Exchange('projects'), routing_key='projects', priority=4),
        Queue('activities', Exchange('activities'), routing_key='activities', priority=3),
        Queue('dashboard', Exchange('dashboard'), routing_key='dashboard', priority=2),
        Queue('cleanup', Exchange('cleanup'), routing_key='cleanup', priority=1),
    ),
    
    # Task Routing
    'task_routes': {
        'phone_generator.*': {'queue': 'phone_generation', 'priority': 8},
        'sms_sender.*': {'queue': 'sms_sending', 'priority': 7},
        'phone_number_validator.*': {'queue': 'validation', 'priority': 6},
        'projects.*': {'queue': 'projects', 'priority': 4},
        'activities.*': {'queue': 'activities', 'priority': 3},
        'dashboard.*': {'queue': 'dashboard', 'priority': 2},
        'cleanup.*': {'queue': 'cleanup', 'priority': 1},
    },
    
    # Beat Scheduler Configuration
    'beat_scheduler': 'django_celery_beat.schedulers:DatabaseScheduler',
    'beat_schedule_filename': 'celerybeat-schedule',
    'beat_max_loop_interval': 300,  # 5 minutes
    
    # Monitoring and Events
    'send_events': True,
    'send_task_sent_event': True,
    'task_send_sent_event': True,
    
    # Security
    'task_always_eager': False,  # Never use in production
    'task_eager_propagates': False,
    
    # Error Handling
    'task_annotations': {
        '*': {
            'rate_limit': '100/m',  # Global rate limit
            'time_limit': 1800,     # 30 minutes
            'soft_time_limit': 1500, # 25 minutes
        },
        'phone_generator.*': {
            'rate_limit': '50/m',
            'time_limit': 600,      # 10 minutes for phone generation
            'soft_time_limit': 540,
        },
        'sms_sender.*': {
            'rate_limit': '30/m',
            'time_limit': 300,      # 5 minutes for SMS sending
            'soft_time_limit': 270,
        },
        'validation.*': {
            'rate_limit': '200/m',
            'time_limit': 60,       # 1 minute for validation
            'soft_time_limit': 50,
        },
    },
    
    # Redis-specific optimizations
    'redis_max_connections': 100,
    'redis_socket_timeout': 5.0,
    'redis_socket_connect_timeout': 5.0,
    'redis_retry_on_timeout': True,
    'redis_health_check_interval': 30,
}

# Worker autoscaling configuration
CELERY_WORKER_AUTOSCALE_CONFIG = {
    'max_concurrency': int(os.environ.get('CELERY_WORKER_AUTOSCALE_MAX', 16)),
    'min_concurrency': int(os.environ.get('CELERY_WORKER_AUTOSCALE_MIN', 4)),
    'scale_up_threshold': 0.8,    # Scale up when 80% of workers are busy
    'scale_down_threshold': 0.3,  # Scale down when 30% of workers are busy
    'scale_up_step': 2,           # Add 2 workers at a time
    'scale_down_step': 1,         # Remove 1 worker at a time
    'scale_interval': 60,         # Check every 60 seconds
}

# Memory management configuration
CELERY_MEMORY_CONFIG = {
    'worker_max_memory_per_child': int(os.environ.get('CELERY_WORKER_MAX_MEMORY_PER_CHILD', 300000)),  # 300MB
    'worker_memory_check_interval': 60,  # Check memory every 60 seconds
    'worker_memory_warning_threshold': 250000,  # Warn at 250MB
    'worker_memory_critical_threshold': 280000,  # Critical at 280MB
}

# Task retry configuration
CELERY_RETRY_CONFIG = {
    'task_default_retry_delay': 60,      # 1 minute
    'task_max_retries': 3,
    'task_retry_backoff': True,
    'task_retry_backoff_max': 600,       # 10 minutes max backoff
    'task_retry_jitter': True,
}

def get_optimized_celery_config():
    """Get the complete optimized Celery configuration."""
    config = CELERY_PERFORMANCE_CONFIG.copy()
    config.update({
        'worker_autoscale': CELERY_WORKER_AUTOSCALE_CONFIG,
        'memory_management': CELERY_MEMORY_CONFIG,
        'retry_policy': CELERY_RETRY_CONFIG,
    })
    return config

def apply_performance_config(celery_app):
    """Apply performance configuration to a Celery app instance."""
    config = get_optimized_celery_config()
    celery_app.config_from_object(config)
    return celery_app

# Example usage in celery.py:
# from .celery_performance import apply_performance_config
# app = apply_performance_config(app)
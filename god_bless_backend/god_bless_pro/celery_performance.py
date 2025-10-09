"""
Simple Celery Performance Configuration
Basic optimizations for production deployment
"""

import os

def apply_performance_config(celery_app):
    """Apply basic performance configuration to a Celery app instance."""
    
    # Simple configuration - let Django settings handle most of it
    celery_app.conf.update(
        # Basic optimizations
        task_acks_late=True,
        worker_prefetch_multiplier=2,
        task_compression='gzip',
        result_compression='gzip',
        
        # Time limits
        task_time_limit=1800,  # 30 minutes
        task_soft_time_limit=1500,  # 25 minutes
        
        # Result expiry
        result_expires=3600,  # 1 hour
        
        # Connection retry
        broker_connection_retry_on_startup=True,
        broker_connection_retry=True,
    )
    
    return celery_app
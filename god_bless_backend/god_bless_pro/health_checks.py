"""
Health check endpoints for monitoring service status
"""
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
from django.conf import settings
import redis
import time


def health_check(request):
    """
    Basic health check endpoint
    Returns 200 if service is running
    """
    return JsonResponse({
        'status': 'healthy',
        'service': 'god_bless_backend',
        'timestamp': time.time()
    })


def readiness_check(request):
    """
    Readiness check - verifies all dependencies are available
    Returns 200 if service is ready to accept traffic
    """
    checks = {
        'database': check_database(),
        'cache': check_cache(),
        'redis': check_redis(),
    }
    
    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503
    
    return JsonResponse({
        'status': 'ready' if all_healthy else 'not_ready',
        'checks': checks,
        'timestamp': time.time()
    }, status=status_code)


def liveness_check(request):
    """
    Liveness check - verifies service is alive
    Returns 200 if service is alive
    """
    return JsonResponse({
        'status': 'alive',
        'timestamp': time.time()
    })


def check_database():
    """Check database connectivity"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True
    except Exception as e:
        return False


def check_cache():
    """Check cache connectivity"""
    try:
        cache.set('health_check', 'ok', 10)
        value = cache.get('health_check')
        return value == 'ok'
    except Exception as e:
        return False


def check_redis():
    """Check Redis connectivity"""
    try:
        if hasattr(settings, 'REDIS_HOST') and settings.REDIS_HOST:
            r = redis.Redis(
                host=settings.REDIS_HOST,
                port=int(getattr(settings, 'REDIS_PORT', 6379)),
                password=getattr(settings, 'REDIS_PASSWORD', None),
                socket_connect_timeout=5
            )
            r.ping()
            return True
        return True  # Redis not configured, skip check
    except Exception as e:
        return False


def metrics(request):
    """
    Basic metrics endpoint
    Returns system metrics for monitoring
    """
    import psutil
    import os
    
    try:
        process = psutil.Process(os.getpid())
        
        metrics_data = {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory': {
                'total': psutil.virtual_memory().total,
                'available': psutil.virtual_memory().available,
                'percent': psutil.virtual_memory().percent,
                'process_memory': process.memory_info().rss,
            },
            'disk': {
                'total': psutil.disk_usage('/').total,
                'used': psutil.disk_usage('/').used,
                'free': psutil.disk_usage('/').free,
                'percent': psutil.disk_usage('/').percent,
            },
            'connections': {
                'database': check_database(),
                'cache': check_cache(),
                'redis': check_redis(),
            },
            'timestamp': time.time()
        }
        
        return JsonResponse(metrics_data)
    except Exception as e:
        return JsonResponse({
            'error': str(e),
            'timestamp': time.time()
        }, status=500)

"""
Monitoring and health check views for comprehensive system monitoring
Provides detailed health status, metrics, and alerting endpoints
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from django.db import connection
import json
import os
import time
import logging
import psutil
import redis
import subprocess
from datetime import datetime, timedelta
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET"])
def system_health_dashboard(request):
    """
    Comprehensive system health dashboard endpoint
    Returns detailed health status for all system components
    """
    try:
        health_data = {
            'timestamp': timezone.now().isoformat(),
            'overall_status': 'healthy',
            'services': {},
            'system_metrics': {},
            'alerts': []
        }
        
        # Check all services
        services_status = check_all_services()
        health_data['services'] = services_status
        
        # Collect system metrics
        system_metrics = collect_system_metrics()
        health_data['system_metrics'] = system_metrics
        
        # Generate alerts
        alerts = generate_health_alerts(services_status, system_metrics)
        health_data['alerts'] = alerts
        
        # Calculate overall status
        overall_status = calculate_overall_health_status(services_status)
        health_data['overall_status'] = overall_status
        
        # Cache the results for 30 seconds to avoid excessive computation
        cache.set('system_health_dashboard', health_data, 30)
        
        status_code = 200
        if overall_status in ['critical', 'unhealthy']:
            status_code = 503
        elif overall_status == 'warning':
            status_code = 200  # Still operational but with warnings
        
        return JsonResponse(health_data, status=status_code)
        
    except Exception as e:
        logger.error(f"System health dashboard failed: {e}")
        return JsonResponse({
            'status': 'error',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def service_health_details(request, service_name):
    """
    Detailed health information for a specific service
    """
    try:
        service_checks = {
            'database': check_database_health,
            'redis': check_redis_health,
            'cache': check_cache_health,
            'celery': check_celery_health,
            'system': check_system_health,
            'nginx': check_nginx_health
        }
        
        if service_name not in service_checks:
            return JsonResponse({
                'error': f'Unknown service: {service_name}',
                'available_services': list(service_checks.keys())
            }, status=404)
        
        check_function = service_checks[service_name]
        service_health = check_function()
        
        return JsonResponse({
            'service': service_name,
            'timestamp': timezone.now().isoformat(),
            'health': service_health
        })
        
    except Exception as e:
        logger.error(f"Service health details failed for {service_name}: {e}")
        return JsonResponse({
            'service': service_name,
            'status': 'error',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def health_metrics_endpoint(request):
    """
    Prometheus-compatible metrics endpoint
    Returns metrics in Prometheus format
    """
    try:
        metrics = []
        
        # System metrics
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        metrics.extend([
            f'system_cpu_usage_percent {cpu_percent}',
            f'system_memory_usage_percent {memory.percent}',
            f'system_memory_available_bytes {memory.available}',
            f'system_disk_usage_percent {(disk.used / disk.total) * 100}',
            f'system_disk_free_bytes {disk.free}'
        ])
        
        # Database metrics
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM django_session")
                session_count = cursor.fetchone()[0]
                metrics.append(f'database_active_sessions {session_count}')
                
                # Database connection pool metrics
                db_connections = len(connection.queries)
                metrics.append(f'database_query_count {db_connections}')
        except Exception as e:
            logger.warning(f"Failed to collect database metrics: {e}")
        
        # Redis metrics
        try:
            redis_client = get_redis_client()
            if redis_client:
                info = redis_client.info()
                metrics.extend([
                    f'redis_connected_clients {info.get("connected_clients", 0)}',
                    f'redis_used_memory_bytes {info.get("used_memory", 0)}',
                    f'redis_keyspace_hits {info.get("keyspace_hits", 0)}',
                    f'redis_keyspace_misses {info.get("keyspace_misses", 0)}'
                ])
        except Exception as e:
            logger.warning(f"Failed to collect Redis metrics: {e}")
        
        # Service health metrics (1 = healthy, 0 = unhealthy)
        services_status = check_all_services()
        for service, status in services_status.items():
            health_value = 1 if status.get('status') == 'healthy' else 0
            metrics.append(f'service_health{{service="{service}"}} {health_value}')
        
        # Add timestamp
        timestamp = int(time.time() * 1000)
        metrics_text = '\n'.join(metrics) + f'\n# TIMESTAMP {timestamp}\n'
        
        return JsonResponse({
            'metrics': metrics_text,
            'timestamp': timezone.now().isoformat(),
            'format': 'prometheus'
        })
        
    except Exception as e:
        logger.error(f"Health metrics endpoint failed: {e}")
        return JsonResponse({
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def alerts_endpoint(request):
    """
    Active alerts endpoint for monitoring systems
    """
    try:
        # Get current system status
        services_status = check_all_services()
        system_metrics = collect_system_metrics()
        
        # Generate alerts
        alerts = generate_health_alerts(services_status, system_metrics)
        
        # Filter alerts by severity if requested
        severity_filter = request.GET.get('severity')
        if severity_filter:
            alerts = [alert for alert in alerts if alert['severity'] == severity_filter]
        
        return JsonResponse({
            'alerts': alerts,
            'total_count': len(alerts),
            'timestamp': timezone.now().isoformat(),
            'severity_counts': {
                'critical': len([a for a in alerts if a['severity'] == 'critical']),
                'high': len([a for a in alerts if a['severity'] == 'high']),
                'medium': len([a for a in alerts if a['severity'] == 'medium']),
                'low': len([a for a in alerts if a['severity'] == 'low'])
            }
        })
        
    except Exception as e:
        logger.error(f"Alerts endpoint failed: {e}")
        return JsonResponse({
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=500)


def check_all_services() -> Dict[str, Dict[str, Any]]:
    """Check health of all system services"""
    services = {}
    
    # Core infrastructure
    services['database'] = check_database_health()
    services['redis'] = check_redis_health()
    services['cache'] = check_cache_health()
    
    # Application services
    services['celery_workers'] = check_celery_workers_health()
    services['celery_beat'] = check_celery_beat_health()
    
    # System resources
    services['system_resources'] = check_system_health()
    services['disk_space'] = check_disk_health()
    
    return services


def check_database_health() -> Dict[str, Any]:
    """Check database health with detailed metrics"""
    try:
        start_time = time.time()
        
        with connection.cursor() as cursor:
            # Basic connectivity test
            cursor.execute("SELECT 1")
            cursor.fetchone()
            
            # Get database statistics
            cursor.execute("SELECT COUNT(*) FROM django_session")
            session_count = cursor.fetchone()[0]
            
            # Check database size
            cursor.execute("""
                SELECT pg_size_pretty(pg_database_size(current_database())),
                       pg_database_size(current_database())
            """)
            size_pretty, size_bytes = cursor.fetchone()
            
            # Check connection count
            cursor.execute("""
                SELECT count(*) FROM pg_stat_activity 
                WHERE state = 'active'
            """)
            active_connections = cursor.fetchone()[0]
        
        response_time = time.time() - start_time
        
        return {
            'status': 'healthy',
            'response_time_ms': round(response_time * 1000, 2),
            'metrics': {
                'active_sessions': session_count,
                'database_size': size_pretty,
                'database_size_bytes': size_bytes,
                'active_connections': active_connections
            },
            'last_check': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'last_check': timezone.now().isoformat()
        }


def check_redis_health() -> Dict[str, Any]:
    """Check Redis health with detailed metrics"""
    try:
        start_time = time.time()
        redis_client = get_redis_client()
        
        if not redis_client:
            return {
                'status': 'unhealthy',
                'error': 'Redis client not configured',
                'last_check': timezone.now().isoformat()
            }
        
        # Test basic operations
        redis_client.ping()
        redis_client.set('health_check_redis', 'ok', ex=10)
        value = redis_client.get('health_check_redis')
        
        # Get Redis info
        info = redis_client.info()
        
        response_time = time.time() - start_time
        
        return {
            'status': 'healthy',
            'response_time_ms': round(response_time * 1000, 2),
            'metrics': {
                'connected_clients': info.get('connected_clients', 0),
                'used_memory': info.get('used_memory_human', 'unknown'),
                'used_memory_bytes': info.get('used_memory', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'uptime_seconds': info.get('uptime_in_seconds', 0)
            },
            'last_check': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'last_check': timezone.now().isoformat()
        }


def check_cache_health() -> Dict[str, Any]:
    """Check Django cache health"""
    try:
        start_time = time.time()
        
        # Test cache operations
        test_key = 'health_check_cache'
        test_value = f'test_{int(time.time())}'
        
        cache.set(test_key, test_value, 10)
        retrieved_value = cache.get(test_key)
        
        response_time = time.time() - start_time
        
        if retrieved_value == test_value:
            return {
                'status': 'healthy',
                'response_time_ms': round(response_time * 1000, 2),
                'last_check': timezone.now().isoformat()
            }
        else:
            return {
                'status': 'unhealthy',
                'error': 'Cache value mismatch',
                'last_check': timezone.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'last_check': timezone.now().isoformat()
        }


def check_celery_workers_health() -> Dict[str, Any]:
    """Check Celery workers health"""
    try:
        from celery import Celery
        
        celery_app = Celery('god_bless_pro')
        celery_app.config_from_object('django.conf:settings', namespace='CELERY')
        
        inspect = celery_app.control.inspect()
        stats = inspect.stats()
        active_tasks = inspect.active()
        
        if stats:
            worker_count = len(stats)
            total_active_tasks = sum(len(tasks) for tasks in active_tasks.values()) if active_tasks else 0
            
            return {
                'status': 'healthy',
                'metrics': {
                    'worker_count': worker_count,
                    'active_tasks': total_active_tasks,
                    'workers': list(stats.keys())
                },
                'last_check': timezone.now().isoformat()
            }
        else:
            return {
                'status': 'unhealthy',
                'error': 'No Celery workers responding',
                'last_check': timezone.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Celery workers health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'last_check': timezone.now().isoformat()
        }


def check_celery_beat_health() -> Dict[str, Any]:
    """Check Celery beat scheduler health"""
    try:
        # Check if beat process is running
        beat_running = False
        beat_pid = None
        
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = ' '.join(proc.info['cmdline'] or [])
                if 'celery' in cmdline and 'beat' in cmdline:
                    beat_running = True
                    beat_pid = proc.info['pid']
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        if beat_running:
            return {
                'status': 'healthy',
                'metrics': {
                    'process_id': beat_pid,
                    'running': True
                },
                'last_check': timezone.now().isoformat()
            }
        else:
            return {
                'status': 'unhealthy',
                'error': 'Celery beat scheduler not running',
                'last_check': timezone.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Celery beat health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'last_check': timezone.now().isoformat()
        }


def check_system_health() -> Dict[str, Any]:
    """Check system resource health"""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory usage
        memory = psutil.virtual_memory()
        
        # Load average (Unix systems)
        try:
            load_avg = os.getloadavg()
        except (OSError, AttributeError):
            load_avg = [0, 0, 0]  # Windows doesn't have load average
        
        # Determine status
        status = 'healthy'
        if cpu_percent > 80 or memory.percent > 85:
            status = 'warning'
        if cpu_percent > 95 or memory.percent > 95:
            status = 'critical'
        
        return {
            'status': status,
            'metrics': {
                'cpu': {
                    'usage_percent': round(cpu_percent, 2),
                    'core_count': cpu_count,
                    'load_average': load_avg
                },
                'memory': {
                    'usage_percent': round(memory.percent, 2),
                    'available_gb': round(memory.available / (1024**3), 2),
                    'total_gb': round(memory.total / (1024**3), 2),
                    'used_gb': round(memory.used / (1024**3), 2)
                }
            },
            'last_check': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"System health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'last_check': timezone.now().isoformat()
        }


def check_disk_health() -> Dict[str, Any]:
    """Check disk space health"""
    try:
        disk_usage = psutil.disk_usage('/')
        used_percent = (disk_usage.used / disk_usage.total) * 100
        
        # Determine status
        status = 'healthy'
        if used_percent > 80:
            status = 'warning'
        if used_percent > 90:
            status = 'critical'
        
        return {
            'status': status,
            'metrics': {
                'used_percent': round(used_percent, 2),
                'free_gb': round(disk_usage.free / (1024**3), 2),
                'total_gb': round(disk_usage.total / (1024**3), 2),
                'used_gb': round(disk_usage.used / (1024**3), 2)
            },
            'last_check': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Disk health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'last_check': timezone.now().isoformat()
        }


def check_nginx_health() -> Dict[str, Any]:
    """Check Nginx health by testing internal endpoint"""
    try:
        import requests
        
        response = requests.get('http://localhost/health', timeout=5)
        
        if response.status_code == 200:
            return {
                'status': 'healthy',
                'response_time_ms': round(response.elapsed.total_seconds() * 1000, 2),
                'last_check': timezone.now().isoformat()
            }
        else:
            return {
                'status': 'unhealthy',
                'error': f'HTTP {response.status_code}',
                'last_check': timezone.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Nginx health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'last_check': timezone.now().isoformat()
        }


def collect_system_metrics() -> Dict[str, Any]:
    """Collect comprehensive system metrics"""
    try:
        # Process information
        process_count = len(psutil.pids())
        
        # Network statistics
        net_io = psutil.net_io_counters()
        
        # Disk I/O statistics
        disk_io = psutil.disk_io_counters()
        
        return {
            'processes': {
                'total_count': process_count
            },
            'network': {
                'bytes_sent': net_io.bytes_sent if net_io else 0,
                'bytes_recv': net_io.bytes_recv if net_io else 0,
                'packets_sent': net_io.packets_sent if net_io else 0,
                'packets_recv': net_io.packets_recv if net_io else 0
            },
            'disk_io': {
                'read_bytes': disk_io.read_bytes if disk_io else 0,
                'write_bytes': disk_io.write_bytes if disk_io else 0,
                'read_count': disk_io.read_count if disk_io else 0,
                'write_count': disk_io.write_count if disk_io else 0
            },
            'uptime_seconds': time.time() - psutil.boot_time()
        }
        
    except Exception as e:
        logger.error(f"Failed to collect system metrics: {e}")
        return {'error': str(e)}


def generate_health_alerts(services_status: Dict[str, Dict], system_metrics: Dict) -> List[Dict[str, Any]]:
    """Generate alerts based on health status"""
    alerts = []
    
    # Service alerts
    for service_name, service_data in services_status.items():
        status = service_data.get('status', 'unknown')
        
        if status == 'critical':
            alerts.append({
                'severity': 'critical',
                'service': service_name,
                'message': f'{service_name} is in critical state',
                'details': service_data.get('error', 'Critical health check failure'),
                'timestamp': timezone.now().isoformat()
            })
        elif status == 'unhealthy':
            alerts.append({
                'severity': 'high',
                'service': service_name,
                'message': f'{service_name} is unhealthy',
                'details': service_data.get('error', 'Health check failed'),
                'timestamp': timezone.now().isoformat()
            })
        elif status == 'warning':
            alerts.append({
                'severity': 'medium',
                'service': service_name,
                'message': f'{service_name} has warnings',
                'details': service_data.get('error', 'Health check warning'),
                'timestamp': timezone.now().isoformat()
            })
    
    # System resource alerts
    system_service = services_status.get('system_resources', {})
    if system_service.get('status') == 'warning':
        metrics = system_service.get('metrics', {})
        cpu_usage = metrics.get('cpu', {}).get('usage_percent', 0)
        memory_usage = metrics.get('memory', {}).get('usage_percent', 0)
        
        if cpu_usage > 80:
            alerts.append({
                'severity': 'medium',
                'service': 'system_resources',
                'message': f'High CPU usage: {cpu_usage}%',
                'details': f'CPU usage is above 80% threshold',
                'timestamp': timezone.now().isoformat()
            })
        
        if memory_usage > 85:
            alerts.append({
                'severity': 'medium',
                'service': 'system_resources',
                'message': f'High memory usage: {memory_usage}%',
                'details': f'Memory usage is above 85% threshold',
                'timestamp': timezone.now().isoformat()
            })
    
    # Disk space alerts
    disk_service = services_status.get('disk_space', {})
    if disk_service.get('status') in ['warning', 'critical']:
        metrics = disk_service.get('metrics', {})
        used_percent = metrics.get('used_percent', 0)
        
        severity = 'high' if used_percent > 90 else 'medium'
        alerts.append({
            'severity': severity,
            'service': 'disk_space',
            'message': f'Low disk space: {used_percent}% used',
            'details': f'Disk usage is above threshold',
            'timestamp': timezone.now().isoformat()
        })
    
    return alerts


def calculate_overall_health_status(services_status: Dict[str, Dict]) -> str:
    """Calculate overall system health status"""
    statuses = [service.get('status', 'unknown') for service in services_status.values()]
    
    if 'critical' in statuses:
        return 'critical'
    elif 'unhealthy' in statuses:
        return 'unhealthy'
    elif 'warning' in statuses:
        return 'warning'
    elif all(status == 'healthy' for status in statuses):
        return 'healthy'
    else:
        return 'unknown'


def get_redis_client():
    """Get Redis client instance"""
    try:
        return redis.Redis(
            host=getattr(settings, 'REDIS_HOST', 'localhost'),
            port=getattr(settings, 'REDIS_PORT', 6379),
            password=getattr(settings, 'REDIS_PASSWORD', None),
            socket_connect_timeout=5
        )
    except Exception as e:
        logger.error(f"Failed to create Redis client: {e}")
        return None
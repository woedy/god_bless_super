#!/usr/bin/env python3
"""
Comprehensive health monitoring script for God Bless platform
Provides system-wide health checks, metrics collection, and alerting
"""

import os
import sys
import json
import time
import logging
import requests
import psutil
import redis
import psycopg2
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add Django project to path
sys.path.append(str(Path(__file__).parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')

import django
django.setup()

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from celery import Celery

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/health_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class HealthMonitor:
    """Comprehensive health monitoring for all system components"""
    
    def __init__(self):
        self.checks = {}
        self.metrics = {}
        self.alerts = []
        self.start_time = time.time()
        
    def run_all_checks(self) -> Dict[str, Any]:
        """Run all health checks and return comprehensive status"""
        logger.info("Starting comprehensive health check...")
        
        # Core infrastructure checks
        self.check_database()
        self.check_redis()
        self.check_cache()
        
        # Application service checks
        self.check_django_app()
        self.check_celery_workers()
        self.check_celery_beat()
        
        # System resource checks
        self.check_system_resources()
        self.check_disk_space()
        self.check_network_connectivity()
        
        # External service checks
        self.check_nginx_proxy()
        self.check_frontend_services()
        
        # Generate overall health status
        overall_status = self.calculate_overall_status()
        
        # Collect metrics
        self.collect_system_metrics()
        
        # Generate alerts if needed
        self.generate_alerts()
        
        result = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': overall_status,
            'checks': self.checks,
            'metrics': self.metrics,
            'alerts': self.alerts,
            'execution_time': time.time() - self.start_time
        }
        
        logger.info(f"Health check completed. Overall status: {overall_status}")
        return result
    
    def check_database(self):
        """Check PostgreSQL database connectivity and performance"""
        try:
            start_time = time.time()
            
            # Test basic connectivity
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            # Test query performance
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM django_session")
                session_count = cursor.fetchone()[0]
            
            # Check database size
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT pg_size_pretty(pg_database_size(current_database()))
                """)
                db_size = cursor.fetchone()[0]
            
            response_time = time.time() - start_time
            
            self.checks['database'] = {
                'status': 'healthy',
                'response_time': response_time,
                'session_count': session_count,
                'database_size': db_size,
                'details': 'Database connectivity and queries working normally'
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            self.checks['database'] = {
                'status': 'unhealthy',
                'error': str(e),
                'details': 'Database connectivity failed'
            }
    
    def check_redis(self):
        """Check Redis connectivity and performance"""
        try:
            start_time = time.time()
            
            # Connect to Redis
            redis_client = redis.Redis(
                host=getattr(settings, 'REDIS_HOST', 'localhost'),
                port=getattr(settings, 'REDIS_PORT', 6379),
                password=getattr(settings, 'REDIS_PASSWORD', None),
                socket_connect_timeout=5
            )
            
            # Test basic operations
            redis_client.ping()
            redis_client.set('health_check', 'ok', ex=10)
            value = redis_client.get('health_check')
            
            # Get Redis info
            info = redis_client.info()
            memory_usage = info.get('used_memory_human', 'unknown')
            connected_clients = info.get('connected_clients', 0)
            
            response_time = time.time() - start_time
            
            self.checks['redis'] = {
                'status': 'healthy',
                'response_time': response_time,
                'memory_usage': memory_usage,
                'connected_clients': connected_clients,
                'details': 'Redis connectivity and operations working normally'
            }
            
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            self.checks['redis'] = {
                'status': 'unhealthy',
                'error': str(e),
                'details': 'Redis connectivity failed'
            }
    
    def check_cache(self):
        """Check Django cache system"""
        try:
            start_time = time.time()
            
            # Test cache operations
            cache.set('health_check_cache', 'working', 10)
            value = cache.get('health_check_cache')
            
            if value == 'working':
                response_time = time.time() - start_time
                self.checks['cache'] = {
                    'status': 'healthy',
                    'response_time': response_time,
                    'details': 'Django cache system working normally'
                }
            else:
                self.checks['cache'] = {
                    'status': 'unhealthy',
                    'details': 'Cache value mismatch'
                }
                
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            self.checks['cache'] = {
                'status': 'unhealthy',
                'error': str(e),
                'details': 'Django cache system failed'
            }
    
    def check_django_app(self):
        """Check Django application health"""
        try:
            # Test Django app endpoint
            response = requests.get(
                'http://localhost:8000/api/health/',
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.checks['django_app'] = {
                    'status': 'healthy',
                    'response_time': response.elapsed.total_seconds(),
                    'details': 'Django application responding normally',
                    'app_data': data
                }
            else:
                self.checks['django_app'] = {
                    'status': 'unhealthy',
                    'status_code': response.status_code,
                    'details': 'Django application returned non-200 status'
                }
                
        except Exception as e:
            logger.error(f"Django app health check failed: {e}")
            self.checks['django_app'] = {
                'status': 'unhealthy',
                'error': str(e),
                'details': 'Django application not responding'
            }
    
    def check_celery_workers(self):
        """Check Celery worker status"""
        try:
            # Initialize Celery app
            celery_app = Celery('god_bless_pro')
            celery_app.config_from_object('django.conf:settings', namespace='CELERY')
            
            # Get worker stats
            inspect = celery_app.control.inspect()
            stats = inspect.stats()
            active_tasks = inspect.active()
            
            if stats:
                worker_count = len(stats)
                total_active_tasks = sum(len(tasks) for tasks in active_tasks.values()) if active_tasks else 0
                
                self.checks['celery_workers'] = {
                    'status': 'healthy',
                    'worker_count': worker_count,
                    'active_tasks': total_active_tasks,
                    'details': f'{worker_count} workers active with {total_active_tasks} tasks',
                    'worker_stats': stats
                }
            else:
                self.checks['celery_workers'] = {
                    'status': 'unhealthy',
                    'details': 'No Celery workers responding'
                }
                
        except Exception as e:
            logger.error(f"Celery workers health check failed: {e}")
            self.checks['celery_workers'] = {
                'status': 'unhealthy',
                'error': str(e),
                'details': 'Celery workers check failed'
            }
    
    def check_celery_beat(self):
        """Check Celery beat scheduler status"""
        try:
            # Check if beat process is running
            beat_running = False
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    cmdline = ' '.join(proc.info['cmdline'] or [])
                    if 'celery' in cmdline and 'beat' in cmdline:
                        beat_running = True
                        break
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            if beat_running:
                self.checks['celery_beat'] = {
                    'status': 'healthy',
                    'details': 'Celery beat scheduler is running'
                }
            else:
                self.checks['celery_beat'] = {
                    'status': 'unhealthy',
                    'details': 'Celery beat scheduler not found'
                }
                
        except Exception as e:
            logger.error(f"Celery beat health check failed: {e}")
            self.checks['celery_beat'] = {
                'status': 'unhealthy',
                'error': str(e),
                'details': 'Celery beat check failed'
            }
    
    def check_system_resources(self):
        """Check system resource usage"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_available = memory.available / (1024**3)  # GB
            
            # Load average (Unix systems)
            try:
                load_avg = os.getloadavg()
            except (OSError, AttributeError):
                load_avg = [0, 0, 0]  # Windows doesn't have load average
            
            # Determine status based on thresholds
            status = 'healthy'
            if cpu_percent > 80 or memory_percent > 85:
                status = 'warning'
            if cpu_percent > 95 or memory_percent > 95:
                status = 'critical'
            
            self.checks['system_resources'] = {
                'status': status,
                'cpu': {
                    'usage_percent': cpu_percent,
                    'core_count': cpu_count,
                    'load_average': load_avg
                },
                'memory': {
                    'usage_percent': memory_percent,
                    'available_gb': round(memory_available, 2),
                    'total_gb': round(memory.total / (1024**3), 2)
                },
                'details': f'CPU: {cpu_percent}%, Memory: {memory_percent}%'
            }
            
        except Exception as e:
            logger.error(f"System resources health check failed: {e}")
            self.checks['system_resources'] = {
                'status': 'unhealthy',
                'error': str(e),
                'details': 'System resources check failed'
            }
    
    def check_disk_space(self):
        """Check disk space usage"""
        try:
            disk_usage = psutil.disk_usage('/')
            used_percent = (disk_usage.used / disk_usage.total) * 100
            free_gb = disk_usage.free / (1024**3)
            
            # Determine status based on usage
            status = 'healthy'
            if used_percent > 80:
                status = 'warning'
            if used_percent > 90:
                status = 'critical'
            
            self.checks['disk_space'] = {
                'status': status,
                'used_percent': round(used_percent, 2),
                'free_gb': round(free_gb, 2),
                'total_gb': round(disk_usage.total / (1024**3), 2),
                'details': f'Disk usage: {used_percent:.1f}%, {free_gb:.1f}GB free'
            }
            
        except Exception as e:
            logger.error(f"Disk space health check failed: {e}")
            self.checks['disk_space'] = {
                'status': 'unhealthy',
                'error': str(e),
                'details': 'Disk space check failed'
            }
    
    def check_network_connectivity(self):
        """Check network connectivity to external services"""
        try:
            # Test DNS resolution
            import socket
            socket.gethostbyname('google.com')
            
            # Test HTTP connectivity
            response = requests.get('https://httpbin.org/status/200', timeout=5)
            
            if response.status_code == 200:
                self.checks['network'] = {
                    'status': 'healthy',
                    'details': 'Network connectivity working normally'
                }
            else:
                self.checks['network'] = {
                    'status': 'warning',
                    'details': 'Network connectivity issues detected'
                }
                
        except Exception as e:
            logger.error(f"Network connectivity health check failed: {e}")
            self.checks['network'] = {
                'status': 'unhealthy',
                'error': str(e),
                'details': 'Network connectivity failed'
            }
    
    def check_nginx_proxy(self):
        """Check Nginx reverse proxy status"""
        try:
            # Test Nginx health endpoint
            response = requests.get('http://localhost/health', timeout=5)
            
            if response.status_code == 200:
                self.checks['nginx'] = {
                    'status': 'healthy',
                    'response_time': response.elapsed.total_seconds(),
                    'details': 'Nginx proxy responding normally'
                }
            else:
                self.checks['nginx'] = {
                    'status': 'unhealthy',
                    'status_code': response.status_code,
                    'details': 'Nginx proxy returned non-200 status'
                }
                
        except Exception as e:
            logger.error(f"Nginx health check failed: {e}")
            self.checks['nginx'] = {
                'status': 'unhealthy',
                'error': str(e),
                'details': 'Nginx proxy not responding'
            }
    
    def check_frontend_services(self):
        """Check frontend service status"""
        frontend_services = [
            ('frontend', 'http://frontend:8080/health'),
            ('platform', 'http://platform:8080/health')
        ]
        
        for service_name, url in frontend_services:
            try:
                response = requests.get(url, timeout=5)
                
                if response.status_code == 200:
                    self.checks[f'{service_name}_frontend'] = {
                        'status': 'healthy',
                        'response_time': response.elapsed.total_seconds(),
                        'details': f'{service_name} frontend responding normally'
                    }
                else:
                    self.checks[f'{service_name}_frontend'] = {
                        'status': 'unhealthy',
                        'status_code': response.status_code,
                        'details': f'{service_name} frontend returned non-200 status'
                    }
                    
            except Exception as e:
                logger.error(f"{service_name} frontend health check failed: {e}")
                self.checks[f'{service_name}_frontend'] = {
                    'status': 'unhealthy',
                    'error': str(e),
                    'details': f'{service_name} frontend not responding'
                }
    
    def calculate_overall_status(self) -> str:
        """Calculate overall system health status"""
        statuses = [check.get('status', 'unknown') for check in self.checks.values()]
        
        if 'critical' in statuses or 'unhealthy' in statuses:
            return 'unhealthy'
        elif 'warning' in statuses:
            return 'warning'
        elif all(status == 'healthy' for status in statuses):
            return 'healthy'
        else:
            return 'unknown'
    
    def collect_system_metrics(self):
        """Collect detailed system metrics"""
        try:
            # Process information
            process_count = len(psutil.pids())
            
            # Network statistics
            net_io = psutil.net_io_counters()
            
            # Disk I/O statistics
            disk_io = psutil.disk_io_counters()
            
            self.metrics = {
                'system': {
                    'process_count': process_count,
                    'boot_time': psutil.boot_time(),
                    'uptime_seconds': time.time() - psutil.boot_time()
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
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            self.metrics = {'error': str(e)}
    
    def generate_alerts(self):
        """Generate alerts based on health check results"""
        for service, check in self.checks.items():
            status = check.get('status', 'unknown')
            
            if status in ['unhealthy', 'critical']:
                self.alerts.append({
                    'severity': 'critical' if status == 'critical' else 'high',
                    'service': service,
                    'message': check.get('details', 'Service health check failed'),
                    'timestamp': datetime.now().isoformat()
                })
            elif status == 'warning':
                self.alerts.append({
                    'severity': 'medium',
                    'service': service,
                    'message': check.get('details', 'Service health warning'),
                    'timestamp': datetime.now().isoformat()
                })
    
    def save_results(self, results: Dict[str, Any], output_file: Optional[str] = None):
        """Save health check results to file"""
        if not output_file:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f'/app/logs/health_check_{timestamp}.json'
        
        try:
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2, default=str)
            logger.info(f"Health check results saved to {output_file}")
        except Exception as e:
            logger.error(f"Failed to save health check results: {e}")


def main():
    """Main function to run health monitoring"""
    monitor = HealthMonitor()
    results = monitor.run_all_checks()
    
    # Save results
    monitor.save_results(results)
    
    # Print summary
    print(f"Overall Status: {results['overall_status']}")
    print(f"Execution Time: {results['execution_time']:.2f} seconds")
    print(f"Alerts Generated: {len(results['alerts'])}")
    
    # Exit with appropriate code
    if results['overall_status'] in ['unhealthy', 'critical']:
        sys.exit(1)
    elif results['overall_status'] == 'warning':
        sys.exit(2)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
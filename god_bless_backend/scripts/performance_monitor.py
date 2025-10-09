#!/usr/bin/env python3
"""
Performance monitoring script for God Bless America platform.
This script monitors system performance metrics and provides optimization recommendations.
"""

import os
import sys
import time
import psutil
import redis
import psycopg2
from datetime import datetime, timedelta
import json
import logging

# Add Django settings to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')

import django
django.setup()

from django.core.cache import cache
from django.db import connection
from celery import Celery

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/performance_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Monitor system performance and provide optimization recommendations."""
    
    def __init__(self):
        self.redis_client = None
        self.db_connection = None
        self.celery_app = None
        self.metrics = {}
        
    def connect_services(self):
        """Connect to Redis, PostgreSQL, and Celery."""
        try:
            # Connect to Redis
            redis_host = os.environ.get('REDIS_HOST', 'localhost')
            redis_port = int(os.environ.get('REDIS_PORT', 6379))
            redis_password = os.environ.get('REDIS_PASSWORD', '')
            
            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                password=redis_password if redis_password else None,
                decode_responses=True
            )
            self.redis_client.ping()
            logger.info("Connected to Redis successfully")
            
            # Connect to PostgreSQL
            db_config = {
                'host': os.environ.get('POSTGRES_HOST', 'localhost'),
                'port': int(os.environ.get('POSTGRES_PORT', 5432)),
                'database': os.environ.get('POSTGRES_DB', 'god_bless_db'),
                'user': os.environ.get('POSTGRES_USER', 'god_bless_user'),
                'password': os.environ.get('POSTGRES_PASSWORD', ''),
            }
            
            self.db_connection = psycopg2.connect(**db_config)
            logger.info("Connected to PostgreSQL successfully")
            
            # Connect to Celery
            broker_url = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
            self.celery_app = Celery('god_bless_pro', broker=broker_url)
            logger.info("Connected to Celery successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to services: {e}")
            
    def get_system_metrics(self):
        """Get system-level performance metrics."""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else (0, 0, 0)
            
            # Memory metrics
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_io = psutil.disk_io_counters()
            
            # Network metrics
            network_io = psutil.net_io_counters()
            
            self.metrics['system'] = {
                'timestamp': datetime.now().isoformat(),
                'cpu': {
                    'percent': cpu_percent,
                    'count': cpu_count,
                    'load_avg': load_avg
                },
                'memory': {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent,
                    'used': memory.used,
                    'free': memory.free
                },
                'swap': {
                    'total': swap.total,
                    'used': swap.used,
                    'free': swap.free,
                    'percent': swap.percent
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': disk.percent,
                    'read_bytes': disk_io.read_bytes if disk_io else 0,
                    'write_bytes': disk_io.write_bytes if disk_io else 0
                },
                'network': {
                    'bytes_sent': network_io.bytes_sent,
                    'bytes_recv': network_io.bytes_recv,
                    'packets_sent': network_io.packets_sent,
                    'packets_recv': network_io.packets_recv
                }
            }
            
            logger.info(f"System metrics collected - CPU: {cpu_percent}%, Memory: {memory.percent}%")
            
        except Exception as e:
            logger.error(f"Failed to get system metrics: {e}")
            
    def get_redis_metrics(self):
        """Get Redis performance metrics."""
        try:
            if not self.redis_client:
                return
                
            info = self.redis_client.info()
            
            self.metrics['redis'] = {
                'timestamp': datetime.now().isoformat(),
                'memory': {
                    'used_memory': info.get('used_memory', 0),
                    'used_memory_human': info.get('used_memory_human', '0B'),
                    'used_memory_peak': info.get('used_memory_peak', 0),
                    'used_memory_peak_human': info.get('used_memory_peak_human', '0B'),
                    'maxmemory': info.get('maxmemory', 0),
                    'maxmemory_human': info.get('maxmemory_human', '0B')
                },
                'connections': {
                    'connected_clients': info.get('connected_clients', 0),
                    'blocked_clients': info.get('blocked_clients', 0),
                    'total_connections_received': info.get('total_connections_received', 0)
                },
                'commands': {
                    'total_commands_processed': info.get('total_commands_processed', 0),
                    'instantaneous_ops_per_sec': info.get('instantaneous_ops_per_sec', 0)
                },
                'keyspace': {
                    'db0': info.get('db0', {}),
                    'db1': info.get('db1', {}),
                    'db2': info.get('db2', {}),
                    'db3': info.get('db3', {}),
                    'db4': info.get('db4', {})
                },
                'persistence': {
                    'rdb_last_save_time': info.get('rdb_last_save_time', 0),
                    'rdb_changes_since_last_save': info.get('rdb_changes_since_last_save', 0),
                    'aof_enabled': info.get('aof_enabled', 0)
                }
            }
            
            logger.info(f"Redis metrics collected - Memory: {info.get('used_memory_human', '0B')}, "
                       f"Clients: {info.get('connected_clients', 0)}")
            
        except Exception as e:
            logger.error(f"Failed to get Redis metrics: {e}")
            
    def get_database_metrics(self):
        """Get PostgreSQL performance metrics."""
        try:
            if not self.db_connection:
                return
                
            cursor = self.db_connection.cursor()
            
            # Get database size
            cursor.execute("SELECT pg_database_size(current_database());")
            db_size = cursor.fetchone()[0]
            
            # Get connection count
            cursor.execute("SELECT count(*) FROM pg_stat_activity;")
            connection_count = cursor.fetchone()[0]
            
            # Get table statistics
            cursor.execute("""
                SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
                FROM pg_stat_user_tables
                ORDER BY n_live_tup DESC
                LIMIT 10;
            """)
            table_stats = cursor.fetchall()
            
            # Get index usage
            cursor.execute("""
                SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
                FROM pg_stat_user_indexes
                ORDER BY idx_tup_read DESC
                LIMIT 10;
            """)
            index_stats = cursor.fetchall()
            
            # Get slow queries (if pg_stat_statements is enabled)
            try:
                cursor.execute("""
                    SELECT query, calls, total_time, mean_time, rows
                    FROM pg_stat_statements
                    ORDER BY mean_time DESC
                    LIMIT 5;
                """)
                slow_queries = cursor.fetchall()
            except:
                slow_queries = []
            
            self.metrics['database'] = {
                'timestamp': datetime.now().isoformat(),
                'size': db_size,
                'connections': connection_count,
                'table_stats': [
                    {
                        'schema': row[0],
                        'table': row[1],
                        'inserts': row[2],
                        'updates': row[3],
                        'deletes': row[4],
                        'live_tuples': row[5],
                        'dead_tuples': row[6]
                    } for row in table_stats
                ],
                'index_stats': [
                    {
                        'schema': row[0],
                        'table': row[1],
                        'index': row[2],
                        'reads': row[3],
                        'fetches': row[4]
                    } for row in index_stats
                ],
                'slow_queries': [
                    {
                        'query': row[0][:100] + '...' if len(row[0]) > 100 else row[0],
                        'calls': row[1],
                        'total_time': row[2],
                        'mean_time': row[3],
                        'rows': row[4]
                    } for row in slow_queries
                ]
            }
            
            logger.info(f"Database metrics collected - Size: {db_size / 1024 / 1024:.2f}MB, "
                       f"Connections: {connection_count}")
            
        except Exception as e:
            logger.error(f"Failed to get database metrics: {e}")
            
    def get_celery_metrics(self):
        """Get Celery performance metrics."""
        try:
            if not self.celery_app:
                return
                
            # Get active tasks
            inspect = self.celery_app.control.inspect()
            active_tasks = inspect.active()
            scheduled_tasks = inspect.scheduled()
            reserved_tasks = inspect.reserved()
            
            # Get worker statistics
            stats = inspect.stats()
            
            self.metrics['celery'] = {
                'timestamp': datetime.now().isoformat(),
                'active_tasks': len(active_tasks.get('celery@worker', [])) if active_tasks else 0,
                'scheduled_tasks': len(scheduled_tasks.get('celery@worker', [])) if scheduled_tasks else 0,
                'reserved_tasks': len(reserved_tasks.get('celery@worker', [])) if reserved_tasks else 0,
                'worker_stats': stats
            }
            
            logger.info(f"Celery metrics collected - Active tasks: "
                       f"{self.metrics['celery']['active_tasks']}")
            
        except Exception as e:
            logger.error(f"Failed to get Celery metrics: {e}")
            
    def get_django_cache_metrics(self):
        """Get Django cache performance metrics."""
        try:
            # Test cache performance
            start_time = time.time()
            cache.set('performance_test', 'test_value', 60)
            set_time = time.time() - start_time
            
            start_time = time.time()
            value = cache.get('performance_test')
            get_time = time.time() - start_time
            
            # Get cache statistics if available
            try:
                cache_stats = cache._cache.get_stats()
            except:
                cache_stats = {}
            
            self.metrics['django_cache'] = {
                'timestamp': datetime.now().isoformat(),
                'set_time': set_time,
                'get_time': get_time,
                'stats': cache_stats
            }
            
            logger.info(f"Django cache metrics collected - Set: {set_time:.4f}s, Get: {get_time:.4f}s")
            
        except Exception as e:
            logger.error(f"Failed to get Django cache metrics: {e}")
            
    def analyze_performance(self):
        """Analyze performance metrics and provide recommendations."""
        recommendations = []
        
        # Analyze system metrics
        if 'system' in self.metrics:
            system = self.metrics['system']
            
            if system['cpu']['percent'] > 80:
                recommendations.append({
                    'type': 'warning',
                    'component': 'system',
                    'message': f"High CPU usage: {system['cpu']['percent']}%",
                    'recommendation': "Consider scaling up CPU resources or optimizing application code"
                })
                
            if system['memory']['percent'] > 85:
                recommendations.append({
                    'type': 'warning',
                    'component': 'system',
                    'message': f"High memory usage: {system['memory']['percent']}%",
                    'recommendation': "Consider increasing memory or optimizing memory usage"
                })
                
            if system['disk']['percent'] > 90:
                recommendations.append({
                    'type': 'critical',
                    'component': 'system',
                    'message': f"High disk usage: {system['disk']['percent']}%",
                    'recommendation': "Urgent: Clean up disk space or add more storage"
                })
        
        # Analyze Redis metrics
        if 'redis' in self.metrics:
            redis_metrics = self.metrics['redis']
            
            if redis_metrics['memory']['maxmemory'] > 0:
                memory_usage = (redis_metrics['memory']['used_memory'] / 
                              redis_metrics['memory']['maxmemory']) * 100
                if memory_usage > 90:
                    recommendations.append({
                        'type': 'warning',
                        'component': 'redis',
                        'message': f"Redis memory usage: {memory_usage:.1f}%",
                        'recommendation': "Consider increasing Redis maxmemory or optimizing cache usage"
                    })
        
        # Analyze database metrics
        if 'database' in self.metrics:
            db_metrics = self.metrics['database']
            
            if db_metrics['connections'] > 250:  # Assuming max_connections is 300
                recommendations.append({
                    'type': 'warning',
                    'component': 'database',
                    'message': f"High database connections: {db_metrics['connections']}",
                    'recommendation': "Consider connection pooling or increasing max_connections"
                })
                
            # Check for tables with high dead tuple ratio
            for table in db_metrics['table_stats']:
                if table['live_tuples'] > 0:
                    dead_ratio = table['dead_tuples'] / table['live_tuples']
                    if dead_ratio > 0.2:  # More than 20% dead tuples
                        recommendations.append({
                            'type': 'info',
                            'component': 'database',
                            'message': f"Table {table['table']} has high dead tuple ratio: {dead_ratio:.2f}",
                            'recommendation': "Consider running VACUUM ANALYZE on this table"
                        })
        
        self.metrics['recommendations'] = recommendations
        
        # Log recommendations
        for rec in recommendations:
            level = logging.WARNING if rec['type'] == 'warning' else logging.CRITICAL if rec['type'] == 'critical' else logging.INFO
            logger.log(level, f"{rec['component'].upper()}: {rec['message']} - {rec['recommendation']}")
    
    def save_metrics(self):
        """Save metrics to file and cache."""
        try:
            # Save to file
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'/app/logs/performance_metrics_{timestamp}.json'
            
            with open(filename, 'w') as f:
                json.dump(self.metrics, f, indent=2, default=str)
            
            # Save to cache for dashboard
            cache.set('performance_metrics', self.metrics, 300)  # 5 minutes
            
            logger.info(f"Metrics saved to {filename}")
            
        except Exception as e:
            logger.error(f"Failed to save metrics: {e}")
    
    def run_monitoring_cycle(self):
        """Run a complete monitoring cycle."""
        logger.info("Starting performance monitoring cycle")
        
        self.connect_services()
        self.get_system_metrics()
        self.get_redis_metrics()
        self.get_database_metrics()
        self.get_celery_metrics()
        self.get_django_cache_metrics()
        self.analyze_performance()
        self.save_metrics()
        
        logger.info("Performance monitoring cycle completed")
        
        # Print summary
        if 'recommendations' in self.metrics:
            print(f"\n=== Performance Summary ===")
            print(f"Timestamp: {datetime.now().isoformat()}")
            print(f"Recommendations: {len(self.metrics['recommendations'])}")
            
            for rec in self.metrics['recommendations']:
                print(f"  [{rec['type'].upper()}] {rec['component']}: {rec['message']}")
        
        return self.metrics

def main():
    """Main function to run performance monitoring."""
    monitor = PerformanceMonitor()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--continuous':
        # Run continuously
        interval = int(sys.argv[2]) if len(sys.argv) > 2 else 300  # Default 5 minutes
        logger.info(f"Starting continuous monitoring with {interval}s interval")
        
        while True:
            try:
                monitor.run_monitoring_cycle()
                time.sleep(interval)
            except KeyboardInterrupt:
                logger.info("Monitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in monitoring cycle: {e}")
                time.sleep(60)  # Wait 1 minute before retrying
    else:
        # Run once
        monitor.run_monitoring_cycle()

if __name__ == '__main__':
    main()
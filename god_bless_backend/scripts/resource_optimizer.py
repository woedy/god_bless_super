#!/usr/bin/env python3
"""
Resource Optimization Script for God Bless America Platform
Monitors and optimizes resource usage across all services
"""

import os
import sys
import time
import psutil
import redis
import psycopg2
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any

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
        logging.FileHandler('/app/logs/resource_optimizer.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ResourceOptimizer:
    """Optimize resource usage across all platform services."""
    
    def __init__(self):
        self.redis_client = None
        self.db_connection = None
        self.celery_app = None
        self.optimization_results = {}
        
    def connect_services(self):
        """Connect to all services for optimization."""
        try:
            # Redis connection
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
            
            # PostgreSQL connection
            db_config = {
                'host': os.environ.get('POSTGRES_HOST', 'localhost'),
                'port': int(os.environ.get('POSTGRES_PORT', 5432)),
                'database': os.environ.get('POSTGRES_DB', 'god_bless_db'),
                'user': os.environ.get('POSTGRES_USER', 'god_bless_user'),
                'password': os.environ.get('POSTGRES_PASSWORD', ''),
            }
            self.db_connection = psycopg2.connect(**db_config)
            
            # Celery connection
            broker_url = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
            self.celery_app = Celery('god_bless_pro', broker=broker_url)
            
            logger.info("Connected to all services successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to services: {e}")
            
    def optimize_redis_memory(self):
        """Optimize Redis memory usage."""
        try:
            if not self.redis_client:
                return
                
            info = self.redis_client.info()
            used_memory = info.get('used_memory', 0)
            maxmemory = info.get('maxmemory', 0)
            
            optimizations = []
            
            # Check memory usage
            if maxmemory > 0:
                memory_usage_percent = (used_memory / maxmemory) * 100
                
                if memory_usage_percent > 85:
                    # Aggressive cleanup
                    optimizations.append("High memory usage detected - performing cleanup")
                    
                    # Clean expired keys
                    expired_keys = self.redis_client.eval("""
                        local keys = redis.call('keys', '*')
                        local expired = 0
                        for i=1,#keys do
                            if redis.call('ttl', keys[i]) == -1 then
                                expired = expired + 1
                            end
                        end
                        return expired
                    """, 0)
                    
                    if expired_keys > 100:
                        # Set TTL for keys without expiration
                        self.redis_client.eval("""
                            local keys = redis.call('keys', '*')
                            for i=1,#keys do
                                if redis.call('ttl', keys[i]) == -1 then
                                    redis.call('expire', keys[i], 3600)
                                end
                            end
                        """, 0)
                        optimizations.append(f"Set TTL for {expired_keys} keys without expiration")
                    
                    # Clean old cache entries
                    cache_patterns = ['godbless:*', 'godbless_session:*', 'godbless_api:*']
                    for pattern in cache_patterns:
                        keys = self.redis_client.keys(pattern)
                        old_keys = []
                        for key in keys[:100]:  # Limit to avoid blocking
                            ttl = self.redis_client.ttl(key)
                            if ttl > 3600:  # Keys with more than 1 hour TTL
                                old_keys.append(key)
                        
                        if old_keys:
                            self.redis_client.delete(*old_keys)
                            optimizations.append(f"Cleaned {len(old_keys)} old cache keys for pattern {pattern}")
                
                elif memory_usage_percent > 70:
                    # Moderate cleanup
                    optimizations.append("Moderate memory usage - performing maintenance")
                    
                    # Optimize data structures
                    self.redis_client.config_set('hash-max-ziplist-entries', '512')
                    self.redis_client.config_set('hash-max-ziplist-value', '64')
                    self.redis_client.config_set('list-max-ziplist-size', '-2')
                    self.redis_client.config_set('set-max-intset-entries', '512')
                    optimizations.append("Optimized Redis data structure settings")
            
            # Optimize connection pool
            connected_clients = info.get('connected_clients', 0)
            if connected_clients > 80:  # High connection count
                # Reduce idle timeout
                self.redis_client.config_set('timeout', '300')
                optimizations.append("Reduced client timeout to manage connections")
            
            self.optimization_results['redis'] = {
                'timestamp': datetime.now().isoformat(),
                'memory_usage_mb': used_memory / 1024 / 1024,
                'memory_usage_percent': (used_memory / maxmemory * 100) if maxmemory > 0 else 0,
                'connected_clients': connected_clients,
                'optimizations': optimizations
            }
            
            logger.info(f"Redis optimization completed: {len(optimizations)} optimizations applied")
            
        except Exception as e:
            logger.error(f"Redis optimization failed: {e}")
            
    def optimize_database_performance(self):
        """Optimize database performance."""
        try:
            if not self.db_connection:
                return
                
            cursor = self.db_connection.cursor()
            optimizations = []
            
            # Analyze table bloat
            cursor.execute("""
                SELECT schemaname, tablename, n_dead_tup, n_live_tup,
                       CASE WHEN n_live_tup > 0 
                            THEN n_dead_tup::float / n_live_tup::float 
                            ELSE 0 END as dead_ratio
                FROM pg_stat_user_tables
                WHERE n_live_tup > 1000
                ORDER BY dead_ratio DESC
                LIMIT 10;
            """)
            bloated_tables = cursor.fetchall()
            
            vacuum_candidates = []
            for table in bloated_tables:
                schema, table_name, dead_tup, live_tup, dead_ratio = table
                if dead_ratio > 0.2:  # More than 20% dead tuples
                    vacuum_candidates.append(f"{schema}.{table_name}")
                    
            if vacuum_candidates:
                optimizations.append(f"Identified {len(vacuum_candidates)} tables needing VACUUM")
                
                # Perform VACUUM on heavily bloated tables
                for table_name in vacuum_candidates[:3]:  # Limit to 3 tables per run
                    try:
                        cursor.execute(f"VACUUM ANALYZE {table_name};")
                        self.db_connection.commit()
                        optimizations.append(f"VACUUM ANALYZE completed for {table_name}")
                    except Exception as e:
                        logger.warning(f"VACUUM failed for {table_name}: {e}")
                        self.db_connection.rollback()
            
            # Analyze index usage
            cursor.execute("""
                SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
                FROM pg_stat_user_indexes
                WHERE idx_tup_read = 0 AND idx_tup_fetch = 0
                ORDER BY pg_relation_size(indexrelid) DESC
                LIMIT 5;
            """)
            unused_indexes = cursor.fetchall()
            
            if unused_indexes:
                optimizations.append(f"Found {len(unused_indexes)} potentially unused indexes")
                # Note: Don't automatically drop indexes, just report
            
            # Check connection count
            cursor.execute("SELECT count(*) FROM pg_stat_activity;")
            connection_count = cursor.fetchone()[0]
            
            if connection_count > 250:  # High connection count
                optimizations.append(f"High connection count detected: {connection_count}")
                
                # Kill idle connections older than 1 hour
                cursor.execute("""
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE state = 'idle'
                    AND state_change < now() - interval '1 hour'
                    AND pid <> pg_backend_pid();
                """)
                terminated = cursor.rowcount
                self.db_connection.commit()
                
                if terminated > 0:
                    optimizations.append(f"Terminated {terminated} idle connections")
            
            # Update table statistics
            cursor.execute("ANALYZE;")
            self.db_connection.commit()
            optimizations.append("Updated table statistics with ANALYZE")
            
            self.optimization_results['database'] = {
                'timestamp': datetime.now().isoformat(),
                'connection_count': connection_count,
                'bloated_tables': len(vacuum_candidates),
                'unused_indexes': len(unused_indexes),
                'optimizations': optimizations
            }
            
            logger.info(f"Database optimization completed: {len(optimizations)} optimizations applied")
            
        except Exception as e:
            logger.error(f"Database optimization failed: {e}")
            
    def optimize_celery_workers(self):
        """Optimize Celery worker performance."""
        try:
            if not self.celery_app:
                return
                
            inspect = self.celery_app.control.inspect()
            optimizations = []
            
            # Get worker statistics
            stats = inspect.stats()
            active_tasks = inspect.active()
            reserved_tasks = inspect.reserved()
            
            if stats:
                for worker, worker_stats in stats.items():
                    pool_processes = worker_stats.get('pool', {}).get('processes', [])
                    
                    # Check worker memory usage
                    if 'rusage' in worker_stats:
                        memory_usage = worker_stats['rusage'].get('maxrss', 0)
                        if memory_usage > 300000:  # 300MB
                            optimizations.append(f"High memory usage in worker {worker}: {memory_usage}KB")
                            
                            # Restart worker if memory is too high
                            if memory_usage > 500000:  # 500MB
                                try:
                                    self.celery_app.control.pool_restart([worker])
                                    optimizations.append(f"Restarted worker {worker} due to high memory usage")
                                except Exception as e:
                                    logger.warning(f"Failed to restart worker {worker}: {e}")
                    
                    # Check task queue lengths
                    active_count = len(active_tasks.get(worker, []))
                    reserved_count = len(reserved_tasks.get(worker, []))
                    
                    if active_count > 10:  # High active task count
                        optimizations.append(f"High active task count in worker {worker}: {active_count}")
                    
                    if reserved_count > 20:  # High reserved task count
                        optimizations.append(f"High reserved task count in worker {worker}: {reserved_count}")
            
            # Purge old task results
            try:
                self.celery_app.control.purge()
                optimizations.append("Purged old task results from broker")
            except Exception as e:
                logger.warning(f"Failed to purge task results: {e}")
            
            # Clean up expired task results in Redis
            if self.redis_client:
                try:
                    # Remove expired celery results
                    pattern = "celery-task-meta-*"
                    keys = self.redis_client.keys(pattern)
                    expired_keys = []
                    
                    for key in keys[:100]:  # Limit to avoid blocking
                        ttl = self.redis_client.ttl(key)
                        if ttl == -1:  # No expiration set
                            expired_keys.append(key)
                    
                    if expired_keys:
                        self.redis_client.delete(*expired_keys)
                        optimizations.append(f"Cleaned {len(expired_keys)} expired task results")
                        
                except Exception as e:
                    logger.warning(f"Failed to clean task results: {e}")
            
            self.optimization_results['celery'] = {
                'timestamp': datetime.now().isoformat(),
                'worker_count': len(stats) if stats else 0,
                'total_active_tasks': sum(len(tasks) for tasks in active_tasks.values()) if active_tasks else 0,
                'total_reserved_tasks': sum(len(tasks) for tasks in reserved_tasks.values()) if reserved_tasks else 0,
                'optimizations': optimizations
            }
            
            logger.info(f"Celery optimization completed: {len(optimizations)} optimizations applied")
            
        except Exception as e:
            logger.error(f"Celery optimization failed: {e}")
            
    def optimize_system_resources(self):
        """Optimize system-level resources."""
        try:
            optimizations = []
            
            # Check system memory
            memory = psutil.virtual_memory()
            if memory.percent > 85:
                optimizations.append(f"High system memory usage: {memory.percent}%")
                
                # Clear system caches (if running as root)
                try:
                    os.system("sync && echo 1 > /proc/sys/vm/drop_caches")
                    optimizations.append("Cleared system page cache")
                except:
                    pass
            
            # Check disk usage
            disk = psutil.disk_usage('/')
            if disk.percent > 90:
                optimizations.append(f"High disk usage: {disk.percent}%")
                
                # Clean up log files older than 7 days
                log_dirs = ['/app/logs', '/var/log/nginx']
                for log_dir in log_dirs:
                    if os.path.exists(log_dir):
                        try:
                            os.system(f"find {log_dir} -name '*.log' -mtime +7 -delete")
                            optimizations.append(f"Cleaned old log files in {log_dir}")
                        except:
                            pass
            
            # Check CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            if cpu_percent > 80:
                optimizations.append(f"High CPU usage: {cpu_percent}%")
                
                # Get top CPU processes
                processes = []
                for proc in psutil.process_iter(['pid', 'name', 'cpu_percent']):
                    try:
                        proc_info = proc.info
                        if proc_info['cpu_percent'] > 10:
                            processes.append(proc_info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                
                if processes:
                    processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
                    top_processes = processes[:3]
                    optimizations.append(f"Top CPU processes: {top_processes}")
            
            self.optimization_results['system'] = {
                'timestamp': datetime.now().isoformat(),
                'memory_percent': memory.percent,
                'disk_percent': disk.percent,
                'cpu_percent': cpu_percent,
                'optimizations': optimizations
            }
            
            logger.info(f"System optimization completed: {len(optimizations)} optimizations applied")
            
        except Exception as e:
            logger.error(f"System optimization failed: {e}")
            
    def save_optimization_results(self):
        """Save optimization results."""
        try:
            # Save to file
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'/app/logs/resource_optimization_{timestamp}.json'
            
            with open(filename, 'w') as f:
                json.dump(self.optimization_results, f, indent=2, default=str)
            
            # Save to cache for monitoring
            cache.set('resource_optimization_results', self.optimization_results, 1800)  # 30 minutes
            
            logger.info(f"Optimization results saved to {filename}")
            
        except Exception as e:
            logger.error(f"Failed to save optimization results: {e}")
            
    def run_optimization_cycle(self):
        """Run a complete resource optimization cycle."""
        logger.info("Starting resource optimization cycle")
        
        self.connect_services()
        self.optimize_redis_memory()
        self.optimize_database_performance()
        self.optimize_celery_workers()
        self.optimize_system_resources()
        self.save_optimization_results()
        
        logger.info("Resource optimization cycle completed")
        
        # Print summary
        total_optimizations = sum(
            len(result.get('optimizations', []))
            for result in self.optimization_results.values()
        )
        
        print(f"\n=== Resource Optimization Summary ===")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print(f"Total optimizations applied: {total_optimizations}")
        
        for service, result in self.optimization_results.items():
            optimizations = result.get('optimizations', [])
            if optimizations:
                print(f"\n{service.upper()}:")
                for opt in optimizations:
                    print(f"  - {opt}")
        
        return self.optimization_results

def main():
    """Main function to run resource optimization."""
    optimizer = ResourceOptimizer()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--continuous':
        # Run continuously
        interval = int(sys.argv[2]) if len(sys.argv) > 2 else 1800  # Default 30 minutes
        logger.info(f"Starting continuous optimization with {interval}s interval")
        
        while True:
            try:
                optimizer.run_optimization_cycle()
                time.sleep(interval)
            except KeyboardInterrupt:
                logger.info("Optimization stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in optimization cycle: {e}")
                time.sleep(300)  # Wait 5 minutes before retrying
    else:
        # Run once
        optimizer.run_optimization_cycle()

if __name__ == '__main__':
    main()
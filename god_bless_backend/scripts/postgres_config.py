#!/usr/bin/env python
"""
PostgreSQL Configuration and Performance Tuning for God Bless America Platform

This script provides PostgreSQL configuration optimization, performance tuning,
and monitoring capabilities for production deployments.
"""

import os
import sys
import logging
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# Add Django project to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')

import django
django.setup()

from django.db import connection
from django.conf import settings
from god_bless_pro.env_config import get_environment_config

logger = logging.getLogger(__name__)


class PostgreSQLConfigurator:
    """
    Handles PostgreSQL configuration, optimization, and monitoring.
    """
    
    def __init__(self):
        self.base_dir = Path(__file__).parent.parent
        self.env_config = get_environment_config(self.base_dir)
        self.db_config = self.env_config.get('database', {})
        
        if self.db_config.get('ENGINE') != 'django.db.backends.postgresql':
            raise ValueError("PostgreSQL configurator only supports PostgreSQL databases")
            
    def get_database_info(self) -> Dict[str, Any]:
        """
        Get comprehensive database information.
        
        Returns:
            Dictionary containing database information
        """
        info = {}
        
        try:
            with connection.cursor() as cursor:
                # Basic database info
                cursor.execute("SELECT version()")
                info['version'] = cursor.fetchone()[0]
                
                cursor.execute("SELECT current_database()")
                info['database_name'] = cursor.fetchone()[0]
                
                cursor.execute("SELECT current_user")
                info['current_user'] = cursor.fetchone()[0]
                
                # Database size
                cursor.execute("SELECT pg_size_pretty(pg_database_size(current_database()))")
                info['database_size'] = cursor.fetchone()[0]
                
                # Connection info
                cursor.execute("SELECT count(*) FROM pg_stat_activity")
                info['active_connections'] = cursor.fetchone()[0]
                
                cursor.execute("SHOW max_connections")
                info['max_connections'] = cursor.fetchone()[0]
                
                # Table statistics
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """)
                info['tables_count'] = cursor.fetchone()[0]
                
                # Index statistics
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM pg_indexes 
                    WHERE schemaname = 'public'
                """)
                info['indexes_count'] = cursor.fetchone()[0]
                
                # Memory settings
                cursor.execute("SHOW shared_buffers")
                info['shared_buffers'] = cursor.fetchone()[0]
                
                cursor.execute("SHOW work_mem")
                info['work_mem'] = cursor.fetchone()[0]
                
                cursor.execute("SHOW maintenance_work_mem")
                info['maintenance_work_mem'] = cursor.fetchone()[0]
                
                # Performance settings
                cursor.execute("SHOW effective_cache_size")
                info['effective_cache_size'] = cursor.fetchone()[0]
                
                cursor.execute("SHOW random_page_cost")
                info['random_page_cost'] = cursor.fetchone()[0]
                
                cursor.execute("SHOW checkpoint_completion_target")
                info['checkpoint_completion_target'] = cursor.fetchone()[0]
                
        except Exception as e:
            logger.error(f"Failed to get database info: {e}")
            
        return info
        
    def get_performance_metrics(self) -> Dict[str, Any]:
        """
        Get database performance metrics.
        
        Returns:
            Dictionary containing performance metrics
        """
        metrics = {}
        
        try:
            with connection.cursor() as cursor:
                # Query performance
                cursor.execute("""
                    SELECT 
                        calls,
                        total_time,
                        mean_time,
                        rows
                    FROM pg_stat_statements 
                    ORDER BY total_time DESC 
                    LIMIT 1
                """)
                
                result = cursor.fetchone()
                if result:
                    metrics['top_query'] = {
                        'calls': result[0],
                        'total_time': result[1],
                        'mean_time': result[2],
                        'rows': result[3]
                    }
                    
                # Table statistics
                cursor.execute("""
                    SELECT 
                        schemaname,
                        tablename,
                        seq_scan,
                        seq_tup_read,
                        idx_scan,
                        idx_tup_fetch,
                        n_tup_ins,
                        n_tup_upd,
                        n_tup_del
                    FROM pg_stat_user_tables
                    ORDER BY seq_scan DESC
                    LIMIT 10
                """)
                
                metrics['table_stats'] = []
                for row in cursor.fetchall():
                    metrics['table_stats'].append({
                        'schema': row[0],
                        'table': row[1],
                        'seq_scan': row[2],
                        'seq_tup_read': row[3],
                        'idx_scan': row[4],
                        'idx_tup_fetch': row[5],
                        'inserts': row[6],
                        'updates': row[7],
                        'deletes': row[8]
                    })
                    
                # Index usage
                cursor.execute("""
                    SELECT 
                        schemaname,
                        tablename,
                        indexname,
                        idx_scan,
                        idx_tup_read,
                        idx_tup_fetch
                    FROM pg_stat_user_indexes
                    WHERE idx_scan = 0
                    ORDER BY schemaname, tablename
                """)
                
                metrics['unused_indexes'] = []
                for row in cursor.fetchall():
                    metrics['unused_indexes'].append({
                        'schema': row[0],
                        'table': row[1],
                        'index': row[2],
                        'scans': row[3]
                    })
                    
                # Database activity
                cursor.execute("""
                    SELECT 
                        state,
                        COUNT(*) as count
                    FROM pg_stat_activity
                    WHERE state IS NOT NULL
                    GROUP BY state
                """)
                
                metrics['connection_states'] = {}
                for row in cursor.fetchall():
                    metrics['connection_states'][row[0]] = row[1]
                    
        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            
        return metrics
        
    def analyze_performance(self) -> Dict[str, Any]:
        """
        Analyze database performance and provide recommendations.
        
        Returns:
            Dictionary containing analysis results and recommendations
        """
        analysis = {
            'recommendations': [],
            'warnings': [],
            'optimizations': []
        }
        
        try:
            info = self.get_database_info()
            metrics = self.get_performance_metrics()
            
            # Check connection usage
            active_connections = info.get('active_connections', 0)
            max_connections = int(info.get('max_connections', 100))
            
            connection_usage = (active_connections / max_connections) * 100
            
            if connection_usage > 80:
                analysis['warnings'].append(
                    f"High connection usage: {connection_usage:.1f}% ({active_connections}/{max_connections})"
                )
                analysis['recommendations'].append("Consider connection pooling with PgBouncer")
                
            # Check for unused indexes
            unused_indexes = metrics.get('unused_indexes', [])
            if unused_indexes:
                analysis['warnings'].append(f"Found {len(unused_indexes)} unused indexes")
                analysis['optimizations'].append("Consider dropping unused indexes to improve write performance")
                
            # Check for tables with high sequential scans
            table_stats = metrics.get('table_stats', [])
            for table_stat in table_stats[:5]:  # Check top 5 tables
                seq_scans = table_stat.get('seq_scan', 0)
                idx_scans = table_stat.get('idx_scan', 0)
                
                if seq_scans > idx_scans and seq_scans > 1000:
                    analysis['warnings'].append(
                        f"Table {table_stat['table']} has high sequential scans: {seq_scans}"
                    )
                    analysis['recommendations'].append(
                        f"Consider adding indexes to table {table_stat['table']}"
                    )
                    
            # Memory configuration recommendations
            shared_buffers = info.get('shared_buffers', '')
            if 'MB' in shared_buffers:
                buffer_mb = int(shared_buffers.replace('MB', ''))
                if buffer_mb < 256:
                    analysis['recommendations'].append(
                        "Consider increasing shared_buffers to at least 256MB for better performance"
                    )
                    
        except Exception as e:
            logger.error(f"Performance analysis failed: {e}")
            analysis['warnings'].append(f"Analysis failed: {str(e)}")
            
        return analysis
        
    def optimize_database(self) -> bool:
        """
        Apply database optimizations.
        
        Returns:
            True if optimizations were applied successfully
        """
        try:
            logger.info("Applying database optimizations...")
            
            with connection.cursor() as cursor:
                # Update table statistics
                logger.info("Updating table statistics...")
                cursor.execute("ANALYZE;")
                
                # Vacuum database
                logger.info("Vacuuming database...")
                cursor.execute("VACUUM (ANALYZE);")
                
                # Reindex if needed
                logger.info("Reindexing database...")
                cursor.execute("REINDEX DATABASE %s;" % connection.settings_dict['NAME'])
                
            logger.info("Database optimizations completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Database optimization failed: {e}")
            return False
            
    def create_performance_indexes(self) -> bool:
        """
        Create performance-oriented indexes for common queries.
        
        Returns:
            True if indexes were created successfully
        """
        try:
            logger.info("Creating performance indexes...")
            
            with connection.cursor() as cursor:
                # Common Django indexes
                indexes = [
                    # Auth and session indexes
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_user_username_active ON auth_user(username) WHERE is_active = true;",
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_user_email_active ON auth_user(email) WHERE is_active = true;",
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_django_session_expire_date ON django_session(expire_date) WHERE expire_date > NOW();",
                    
                    # Activity logging indexes
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_activity_timestamp ON activities_activity(timestamp);",
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_activity_user_timestamp ON activities_activity(user_id, timestamp);",
                    
                    # Project management indexes
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_project_created_at ON projects_project(created_at);",
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_project_user_created ON projects_project(user_id, created_at);",
                    
                    # Phone number indexes
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_generator_phonenumber_created ON phone_generator_phonenumber(created_at);",
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_generator_phonenumber_project ON phone_generator_phonenumber(project_id);",
                    
                    # Task indexes
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_task_status ON tasks_task(status);",
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_task_created_status ON tasks_task(created_at, status);",
                ]
                
                for index_sql in indexes:
                    try:
                        logger.info(f"Creating index: {index_sql.split('idx_')[1].split(' ')[0]}")
                        cursor.execute(index_sql)
                    except Exception as e:
                        # Index might already exist or table might not exist
                        logger.debug(f"Index creation skipped: {e}")
                        
            logger.info("Performance indexes created successfully")
            return True
            
        except Exception as e:
            logger.error(f"Index creation failed: {e}")
            return False
            
    def generate_config_recommendations(self) -> str:
        """
        Generate PostgreSQL configuration recommendations.
        
        Returns:
            String containing configuration recommendations
        """
        info = self.get_database_info()
        
        config = f"""# PostgreSQL Configuration Recommendations
# Generated for God Bless America Platform

# Memory Configuration
shared_buffers = 256MB                    # 25% of available RAM (adjust based on system)
work_mem = 4MB                           # Memory for sorting and hash operations
maintenance_work_mem = 64MB              # Memory for maintenance operations
effective_cache_size = 1GB               # Estimate of OS cache size

# Connection Configuration
max_connections = 200                    # Maximum concurrent connections
shared_preload_libraries = 'pg_stat_statements'  # Enable query statistics

# Write-Ahead Logging (WAL) Configuration
wal_buffers = 16MB                       # WAL buffer size
checkpoint_completion_target = 0.9       # Spread checkpoints over time
checkpoint_timeout = 10min               # Maximum time between checkpoints

# Query Planner Configuration
random_page_cost = 1.1                   # Cost of random page access (SSD optimized)
effective_io_concurrency = 200          # Number of concurrent I/O operations

# Logging Configuration
log_min_duration_statement = 1000        # Log slow queries (1 second)
log_checkpoints = on                     # Log checkpoint activity
log_connections = on                     # Log connections
log_disconnections = on                  # Log disconnections
log_lock_waits = on                      # Log lock waits

# Performance Monitoring
track_activities = on                    # Track running queries
track_counts = on                        # Track table/index statistics
track_io_timing = on                     # Track I/O timing
track_functions = all                    # Track function calls

# Autovacuum Configuration
autovacuum = on                          # Enable autovacuum
autovacuum_max_workers = 3               # Number of autovacuum workers
autovacuum_naptime = 1min                # Time between autovacuum runs

# Current Database Information:
# Version: {info.get('version', 'Unknown')}
# Database: {info.get('database_name', 'Unknown')}
# Size: {info.get('database_size', 'Unknown')}
# Tables: {info.get('tables_count', 'Unknown')}
# Indexes: {info.get('indexes_count', 'Unknown')}
# Active Connections: {info.get('active_connections', 'Unknown')}/{info.get('max_connections', 'Unknown')}

# Notes:
# - Adjust memory settings based on available system RAM
# - Monitor performance after applying changes
# - Use pg_stat_statements extension for query analysis
# - Consider connection pooling with PgBouncer for high-traffic applications
"""
        
        return config
        
    def health_check(self) -> Dict[str, Any]:
        """
        Perform comprehensive database health check.
        
        Returns:
            Dictionary containing health check results
        """
        health = {
            'status': 'healthy',
            'checks': {},
            'warnings': [],
            'errors': []
        }
        
        try:
            # Connection test
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                health['checks']['connection'] = 'OK'
                
                # Database size check
                cursor.execute("SELECT pg_database_size(current_database())")
                db_size_bytes = cursor.fetchone()[0]
                db_size_gb = db_size_bytes / (1024**3)
                
                health['checks']['database_size'] = f"{db_size_gb:.2f} GB"
                
                if db_size_gb > 10:  # Warning if database > 10GB
                    health['warnings'].append(f"Large database size: {db_size_gb:.2f} GB")
                    
                # Connection count check
                cursor.execute("SELECT count(*) FROM pg_stat_activity")
                active_connections = cursor.fetchone()[0]
                
                cursor.execute("SHOW max_connections")
                max_connections = int(cursor.fetchone()[0])
                
                connection_usage = (active_connections / max_connections) * 100
                health['checks']['connections'] = f"{active_connections}/{max_connections} ({connection_usage:.1f}%)"
                
                if connection_usage > 80:
                    health['warnings'].append(f"High connection usage: {connection_usage:.1f}%")
                    
                # Lock check
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM pg_locks 
                    WHERE NOT granted
                """)
                blocked_queries = cursor.fetchone()[0]
                
                health['checks']['blocked_queries'] = blocked_queries
                
                if blocked_queries > 0:
                    health['warnings'].append(f"{blocked_queries} blocked queries detected")
                    
                # Long running queries check
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM pg_stat_activity 
                    WHERE state = 'active' 
                    AND query_start < NOW() - INTERVAL '5 minutes'
                """)
                long_queries = cursor.fetchone()[0]
                
                health['checks']['long_running_queries'] = long_queries
                
                if long_queries > 0:
                    health['warnings'].append(f"{long_queries} long-running queries detected")
                    
        except Exception as e:
            health['status'] = 'unhealthy'
            health['errors'].append(f"Health check failed: {str(e)}")
            
        # Set overall status
        if health['errors']:
            health['status'] = 'unhealthy'
        elif health['warnings']:
            health['status'] = 'warning'
            
        return health


def main():
    """Main entry point for PostgreSQL configuration operations."""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] %(levelname)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    if len(sys.argv) < 2:
        print("Usage: python postgres_config.py <command>")
        print("Commands:")
        print("  info              - Show database information")
        print("  metrics           - Show performance metrics")
        print("  analyze           - Analyze performance and provide recommendations")
        print("  optimize          - Apply database optimizations")
        print("  indexes           - Create performance indexes")
        print("  config            - Generate configuration recommendations")
        print("  health            - Perform health check")
        sys.exit(1)
        
    command = sys.argv[1]
    configurator = PostgreSQLConfigurator()
    
    try:
        if command == 'info':
            info = configurator.get_database_info()
            print("Database Information:")
            for key, value in info.items():
                print(f"  {key}: {value}")
                
        elif command == 'metrics':
            metrics = configurator.get_performance_metrics()
            print("Performance Metrics:")
            
            if 'top_query' in metrics:
                print("  Top Query:")
                for key, value in metrics['top_query'].items():
                    print(f"    {key}: {value}")
                    
            if 'connection_states' in metrics:
                print("  Connection States:")
                for state, count in metrics['connection_states'].items():
                    print(f"    {state}: {count}")
                    
            if 'unused_indexes' in metrics:
                print(f"  Unused Indexes: {len(metrics['unused_indexes'])}")
                
        elif command == 'analyze':
            analysis = configurator.analyze_performance()
            
            if analysis['warnings']:
                print("Warnings:")
                for warning in analysis['warnings']:
                    print(f"  - {warning}")
                    
            if analysis['recommendations']:
                print("Recommendations:")
                for rec in analysis['recommendations']:
                    print(f"  - {rec}")
                    
            if analysis['optimizations']:
                print("Optimizations:")
                for opt in analysis['optimizations']:
                    print(f"  - {opt}")
                    
        elif command == 'optimize':
            success = configurator.optimize_database()
            sys.exit(0 if success else 1)
            
        elif command == 'indexes':
            success = configurator.create_performance_indexes()
            sys.exit(0 if success else 1)
            
        elif command == 'config':
            config = configurator.generate_config_recommendations()
            print(config)
            
        elif command == 'health':
            health = configurator.health_check()
            
            print(f"Database Health: {health['status'].upper()}")
            
            if health['checks']:
                print("Checks:")
                for check, result in health['checks'].items():
                    print(f"  {check}: {result}")
                    
            if health['warnings']:
                print("Warnings:")
                for warning in health['warnings']:
                    print(f"  - {warning}")
                    
            if health['errors']:
                print("Errors:")
                for error in health['errors']:
                    print(f"  - {error}")
                    
            sys.exit(0 if health['status'] != 'unhealthy' else 1)
            
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Command failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
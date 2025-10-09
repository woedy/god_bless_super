#!/usr/bin/env python3
"""
Performance optimization script for God Bless America platform.
This script applies various performance optimizations to the system.
"""

import os
import sys
import subprocess
import logging
from datetime import datetime

# Add Django settings to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')

import django
django.setup()

from django.core.management import call_command
from django.core.cache import cache
from django.db import connection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/performance_optimization.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class PerformanceOptimizer:
    """Apply performance optimizations to the system."""
    
    def __init__(self):
        self.optimizations_applied = []
        
    def optimize_database(self):
        """Apply database performance optimizations."""
        logger.info("Starting database optimizations...")
        
        try:
            with connection.cursor() as cursor:
                # Update table statistics
                logger.info("Updating table statistics...")
                cursor.execute("ANALYZE;")
                self.optimizations_applied.append("Database statistics updated")
                
                # Vacuum analyze all tables
                logger.info("Running VACUUM ANALYZE...")
                cursor.execute("VACUUM ANALYZE;")
                self.optimizations_applied.append("Database vacuum completed")
                
                # Check for unused indexes
                logger.info("Checking for unused indexes...")
                cursor.execute("""
                    SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
                    FROM pg_stat_user_indexes
                    WHERE idx_tup_read = 0 AND idx_tup_fetch = 0;
                """)
                unused_indexes = cursor.fetchall()
                
                if unused_indexes:
                    logger.warning(f"Found {len(unused_indexes)} potentially unused indexes")
                    for index in unused_indexes:
                        logger.warning(f"  Unused index: {index[2]} on {index[1]}")
                
                # Check for missing indexes on foreign keys
                logger.info("Checking for missing indexes on foreign keys...")
                cursor.execute("""
                    SELECT c.conrelid::regclass AS table_name,
                           a.attname AS column_name,
                           c.conname AS constraint_name
                    FROM pg_constraint c
                    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
                    WHERE c.contype = 'f'
                    AND NOT EXISTS (
                        SELECT 1 FROM pg_index i
                        WHERE i.indrelid = c.conrelid
                        AND a.attnum = ANY(i.indkey)
                    );
                """)
                missing_indexes = cursor.fetchall()
                
                if missing_indexes:
                    logger.warning(f"Found {len(missing_indexes)} foreign keys without indexes")
                    for fk in missing_indexes:
                        logger.warning(f"  Missing index: {fk[1]} on {fk[0]}")
                
                # Reset query statistics
                try:
                    cursor.execute("SELECT pg_stat_statements_reset();")
                    self.optimizations_applied.append("Query statistics reset")
                except:
                    logger.info("pg_stat_statements not available")
                
        except Exception as e:
            logger.error(f"Database optimization failed: {e}")
            
    def optimize_cache(self):
        """Apply cache performance optimizations."""
        logger.info("Starting cache optimizations...")
        
        try:
            # Clear expired cache entries
            logger.info("Clearing expired cache entries...")
            cache.clear()
            self.optimizations_applied.append("Cache cleared")
            
            # Warm up critical cache entries
            logger.info("Warming up critical cache entries...")
            
            # Cache frequently accessed data
            from django.contrib.auth import get_user_model
            from projects.models import Project
            
            User = get_user_model()
            
            # Cache user count
            user_count = User.objects.count()
            cache.set('user_count', user_count, 3600)
            
            # Cache project count
            project_count = Project.objects.count()
            cache.set('project_count', project_count, 3600)
            
            # Cache active projects
            active_projects = list(Project.objects.filter(is_active=True).values('id', 'name'))
            cache.set('active_projects', active_projects, 1800)
            
            self.optimizations_applied.append("Critical cache entries warmed up")
            
        except Exception as e:
            logger.error(f"Cache optimization failed: {e}")
            
    def optimize_static_files(self):
        """Optimize static files."""
        logger.info("Starting static file optimizations...")
        
        try:
            # Collect static files
            logger.info("Collecting static files...")
            call_command('collectstatic', '--noinput', verbosity=0)
            self.optimizations_applied.append("Static files collected")
            
            # Compress static files if django-compressor is available
            try:
                call_command('compress', '--force')
                self.optimizations_applied.append("Static files compressed")
            except:
                logger.info("django-compressor not available")
                
        except Exception as e:
            logger.error(f"Static file optimization failed: {e}")
            
    def optimize_sessions(self):
        """Clean up expired sessions."""
        logger.info("Starting session cleanup...")
        
        try:
            # Clean expired sessions
            call_command('clearsessions')
            self.optimizations_applied.append("Expired sessions cleaned")
            
        except Exception as e:
            logger.error(f"Session cleanup failed: {e}")
            
    def optimize_logs(self):
        """Optimize log files."""
        logger.info("Starting log optimization...")
        
        try:
            log_dir = '/app/logs'
            if os.path.exists(log_dir):
                # Compress old log files
                for filename in os.listdir(log_dir):
                    if filename.endswith('.log') and os.path.getsize(os.path.join(log_dir, filename)) > 10 * 1024 * 1024:  # 10MB
                        logger.info(f"Compressing large log file: {filename}")
                        subprocess.run(['gzip', os.path.join(log_dir, filename)], check=False)
                
                self.optimizations_applied.append("Large log files compressed")
                
        except Exception as e:
            logger.error(f"Log optimization failed: {e}")
            
    def check_system_resources(self):
        """Check system resources and provide recommendations."""
        logger.info("Checking system resources...")
        
        try:
            import psutil
            
            # Check memory usage
            memory = psutil.virtual_memory()
            if memory.percent > 85:
                logger.warning(f"High memory usage: {memory.percent}%")
                logger.warning("Consider increasing memory or optimizing memory usage")
            
            # Check disk usage
            disk = psutil.disk_usage('/')
            if disk.percent > 90:
                logger.critical(f"Critical disk usage: {disk.percent}%")
                logger.critical("Urgent: Clean up disk space or add more storage")
            elif disk.percent > 80:
                logger.warning(f"High disk usage: {disk.percent}%")
                logger.warning("Consider cleaning up disk space")
            
            # Check CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            if cpu_percent > 80:
                logger.warning(f"High CPU usage: {cpu_percent}%")
                logger.warning("Consider optimizing CPU-intensive operations")
            
            self.optimizations_applied.append("System resources checked")
            
        except ImportError:
            logger.warning("psutil not available for system resource checking")
        except Exception as e:
            logger.error(f"System resource check failed: {e}")
            
    def generate_optimization_report(self):
        """Generate optimization report."""
        logger.info("Generating optimization report...")
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'optimizations_applied': self.optimizations_applied,
            'total_optimizations': len(self.optimizations_applied)
        }
        
        # Save report to file
        report_file = f'/app/logs/optimization_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        
        try:
            import json
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2)
            
            logger.info(f"Optimization report saved to {report_file}")
            
        except Exception as e:
            logger.error(f"Failed to save optimization report: {e}")
        
        return report
    
    def run_all_optimizations(self):
        """Run all performance optimizations."""
        logger.info("Starting comprehensive performance optimization...")
        
        start_time = datetime.now()
        
        # Run optimizations
        self.optimize_database()
        self.optimize_cache()
        self.optimize_static_files()
        self.optimize_sessions()
        self.optimize_logs()
        self.check_system_resources()
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info(f"Performance optimization completed in {duration:.2f} seconds")
        logger.info(f"Applied {len(self.optimizations_applied)} optimizations:")
        
        for optimization in self.optimizations_applied:
            logger.info(f"  ✓ {optimization}")
        
        # Generate report
        report = self.generate_optimization_report()
        
        return report

def main():
    """Main function to run performance optimizations."""
    optimizer = PerformanceOptimizer()
    
    if len(sys.argv) > 1:
        optimization_type = sys.argv[1].lower()
        
        if optimization_type == 'database':
            optimizer.optimize_database()
        elif optimization_type == 'cache':
            optimizer.optimize_cache()
        elif optimization_type == 'static':
            optimizer.optimize_static_files()
        elif optimization_type == 'sessions':
            optimizer.optimize_sessions()
        elif optimization_type == 'logs':
            optimizer.optimize_logs()
        elif optimization_type == 'resources':
            optimizer.check_system_resources()
        elif optimization_type == 'all':
            optimizer.run_all_optimizations()
        else:
            print("Usage: python optimize_performance.py [database|cache|static|sessions|logs|resources|all]")
            sys.exit(1)
    else:
        # Run all optimizations by default
        optimizer.run_all_optimizations()

if __name__ == '__main__':
    main()
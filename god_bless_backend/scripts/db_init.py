#!/usr/bin/env python
"""
Database Initialization Script for God Bless America Platform

This script handles automated database setup, migration execution,
and initial data loading for production deployments.
"""

import os
import sys
import time
import logging
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

# Add Django project to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')

import django
django.setup()

from django.core.management import execute_from_command_line, call_command
from django.db import connection, transaction
from django.contrib.auth import get_user_model
from django.conf import settings
from god_bless_pro.env_config import get_environment_config

logger = logging.getLogger(__name__)


class DatabaseInitializer:
    """
    Handles database initialization, migrations, and setup tasks.
    """
    
    def __init__(self):
        self.base_dir = Path(__file__).parent.parent
        self.env_config = get_environment_config(self.base_dir)
        self.db_config = self.env_config.get('database', {})
        self.setup_config = self.env_config.get('setup', {})
        
    def wait_for_database(self, timeout: int = 120) -> bool:
        """
        Wait for database to become available.
        
        Args:
            timeout: Maximum time to wait in seconds
            
        Returns:
            True if database is available, False if timeout
        """
        logger.info("Waiting for database connection...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    result = cursor.fetchone()
                    if result and result[0] == 1:
                        logger.info("Database connection established successfully")
                        return True
            except Exception as e:
                logger.debug(f"Database not ready: {e}")
                time.sleep(2)
                
        logger.error(f"Database connection timeout after {timeout} seconds")
        return False
        
    def check_database_exists(self) -> bool:
        """
        Check if database exists and is accessible.
        
        Returns:
            True if database exists and is accessible
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT current_database()")
                db_name = cursor.fetchone()[0]
                logger.info(f"Connected to database: {db_name}")
                return True
        except Exception as e:
            logger.error(f"Database check failed: {e}")
            return False
            
    def get_migration_status(self) -> Dict[str, List[str]]:
        """
        Get current migration status for all apps.
        
        Returns:
            Dictionary mapping app names to lists of applied migrations
        """
        try:
            from django.db.migrations.executor import MigrationExecutor
            executor = MigrationExecutor(connection)
            
            # Get all applied migrations
            applied_migrations = executor.loader.applied_migrations
            
            # Group by app
            status = {}
            for app_label, migration_name in applied_migrations:
                if app_label not in status:
                    status[app_label] = []
                status[app_label].append(migration_name)
                
            return status
        except Exception as e:
            logger.error(f"Failed to get migration status: {e}")
            return {}
            
    def run_migrations(self, verbosity: int = 1) -> bool:
        """
        Run database migrations.
        
        Args:
            verbosity: Migration output verbosity level
            
        Returns:
            True if migrations completed successfully
        """
        try:
            logger.info("Starting database migrations...")
            
            # Check for pending migrations first
            call_command('showmigrations', verbosity=0)
            
            # Run migrations
            call_command('migrate', verbosity=verbosity, interactive=False)
            
            logger.info("Database migrations completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return False
            
    def create_superuser(self) -> bool:
        """
        Create superuser if configured and doesn't exist.
        
        Returns:
            True if superuser was created or already exists
        """
        if not self.setup_config.get('create_superuser', False):
            logger.info("Superuser creation disabled")
            return True
            
        try:
            User = get_user_model()
            username = self.setup_config.get('superuser_username', 'admin')
            email = self.setup_config.get('superuser_email', 'admin@localhost')
            password = self.setup_config.get('superuser_password')
            
            if not password:
                logger.warning("Superuser password not provided, skipping creation")
                return True
                
            if User.objects.filter(username=username).exists():
                logger.info(f"Superuser '{username}' already exists")
                return True
                
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            
            logger.info(f"Superuser '{username}' created successfully")
            return True
            
        except Exception as e:
            logger.error(f"Superuser creation failed: {e}")
            return False
            
    def load_initial_data(self) -> bool:
        """
        Load initial data fixtures if configured.
        
        Returns:
            True if data was loaded successfully or not needed
        """
        if not self.setup_config.get('load_initial_data', False):
            logger.info("Initial data loading disabled")
            return True
            
        try:
            # Look for fixture files
            fixtures_dir = self.base_dir / 'fixtures'
            if not fixtures_dir.exists():
                logger.info("No fixtures directory found")
                return True
                
            fixture_files = list(fixtures_dir.glob('*.json'))
            if not fixture_files:
                logger.info("No fixture files found")
                return True
                
            logger.info(f"Loading {len(fixture_files)} fixture files...")
            
            for fixture_file in fixture_files:
                logger.info(f"Loading fixture: {fixture_file.name}")
                call_command('loaddata', str(fixture_file), verbosity=1)
                
            logger.info("Initial data loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Initial data loading failed: {e}")
            return False
            
    def optimize_database(self) -> bool:
        """
        Apply database optimizations for production.
        
        Returns:
            True if optimizations were applied successfully
        """
        if self.db_config.get('ENGINE') != 'django.db.backends.postgresql':
            logger.info("Database optimizations only available for PostgreSQL")
            return True
            
        try:
            logger.info("Applying database optimizations...")
            
            with connection.cursor() as cursor:
                # Update table statistics
                cursor.execute("ANALYZE;")
                
                # Vacuum database (non-blocking)
                cursor.execute("VACUUM (ANALYZE);")
                
                logger.info("Database optimizations completed")
                return True
                
        except Exception as e:
            logger.error(f"Database optimization failed: {e}")
            return False
            
    def validate_database_setup(self) -> Dict[str, Any]:
        """
        Validate database setup and configuration.
        
        Returns:
            Dictionary containing validation results
        """
        results = {
            'database_accessible': False,
            'migrations_applied': False,
            'superuser_exists': False,
            'tables_count': 0,
            'database_size': 'unknown',
            'errors': [],
            'warnings': []
        }
        
        try:
            # Check database accessibility
            results['database_accessible'] = self.check_database_exists()
            
            if results['database_accessible']:
                # Check migrations
                migration_status = self.get_migration_status()
                results['migrations_applied'] = len(migration_status) > 0
                
                # Check superuser (using custom User model field)
                User = get_user_model()
                results['superuser_exists'] = User.objects.filter(admin=True).exists()
                
                # Get table count
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT COUNT(*) 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public'
                    """)
                    results['tables_count'] = cursor.fetchone()[0]
                    
                    # Get database size (PostgreSQL only)
                    if self.db_config.get('ENGINE') == 'django.db.backends.postgresql':
                        cursor.execute("""
                            SELECT pg_size_pretty(pg_database_size(current_database()))
                        """)
                        results['database_size'] = cursor.fetchone()[0]
                        
        except Exception as e:
            results['errors'].append(f"Validation error: {str(e)}")
            
        return results
        
    def initialize_database(self) -> bool:
        """
        Complete database initialization process.
        
        Returns:
            True if initialization completed successfully
        """
        logger.info("Starting database initialization...")
        
        try:
            # Step 1: Wait for database
            if not self.wait_for_database():
                return False
                
            # Step 2: Check database accessibility
            if not self.check_database_exists():
                return False
                
            # Step 3: Run migrations
            if not self.run_migrations():
                return False
                
            # Step 4: Create superuser
            if not self.create_superuser():
                return False
                
            # Step 5: Load initial data
            if not self.load_initial_data():
                return False
                
            # Step 6: Optimize database
            if not self.optimize_database():
                logger.warning("Database optimization failed, continuing...")
                
            # Step 7: Validate setup
            validation_results = self.validate_database_setup()
            
            if validation_results['errors']:
                logger.error("Database validation failed:")
                for error in validation_results['errors']:
                    logger.error(f"  - {error}")
                return False
                
            logger.info("Database initialization completed successfully")
            logger.info(f"Tables created: {validation_results['tables_count']}")
            logger.info(f"Database size: {validation_results['database_size']}")
            
            return True
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            return False


def main():
    """Main entry point for database initialization."""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] %(levelname)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Initialize database
    initializer = DatabaseInitializer()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'wait':
            # Just wait for database
            success = initializer.wait_for_database()
            sys.exit(0 if success else 1)
            
        elif command == 'migrate':
            # Just run migrations
            success = initializer.run_migrations()
            sys.exit(0 if success else 1)
            
        elif command == 'validate':
            # Validate database setup
            results = initializer.validate_database_setup()
            print("Database Validation Results:")
            for key, value in results.items():
                if key not in ['errors', 'warnings']:
                    print(f"  {key}: {value}")
                    
            if results['errors']:
                print("Errors:")
                for error in results['errors']:
                    print(f"  - {error}")
                    
            if results['warnings']:
                print("Warnings:")
                for warning in results['warnings']:
                    print(f"  - {warning}")
                    
            sys.exit(0 if not results['errors'] else 1)
            
        else:
            print(f"Unknown command: {command}")
            print("Available commands: wait, migrate, validate")
            sys.exit(1)
    else:
        # Full initialization
        success = initializer.initialize_database()
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
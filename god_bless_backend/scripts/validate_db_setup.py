#!/usr/bin/env python
"""
Database Setup Validation Script

This script validates that all database setup components are working correctly
in the Docker environment.
"""

import os
import sys
import logging
from pathlib import Path

# Add Django project to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')

import django
django.setup()

from django.core.management import call_command
from django.db import connection
from django.test.utils import get_runner
from django.conf import settings

logger = logging.getLogger(__name__)


def validate_database_connection():
    """Test database connection."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result and result[0] == 1:
                print("✓ Database connection successful")
                return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False


def validate_migrations():
    """Check if all migrations are applied."""
    try:
        from django.db.migrations.executor import MigrationExecutor
        executor = MigrationExecutor(connection)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        
        if not plan:
            print("✓ All migrations are applied")
            return True
        else:
            print(f"✗ {len(plan)} pending migrations found")
            return False
    except Exception as e:
        print(f"✗ Migration check failed: {e}")
        return False


def validate_database_extensions():
    """Check if required PostgreSQL extensions are installed."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT extname FROM pg_extension 
                WHERE extname IN ('uuid-ossp', 'pg_stat_statements', 'pg_trgm')
            """)
            extensions = [row[0] for row in cursor.fetchall()]
            
            required_extensions = ['uuid-ossp', 'pg_stat_statements', 'pg_trgm']
            missing_extensions = set(required_extensions) - set(extensions)
            
            if not missing_extensions:
                print("✓ All required PostgreSQL extensions are installed")
                return True
            else:
                print(f"✗ Missing extensions: {', '.join(missing_extensions)}")
                return False
    except Exception as e:
        print(f"✗ Extension check failed: {e}")
        return False


def validate_backup_system():
    """Test backup system functionality."""
    try:
        from db_backup import DatabaseBackupManager
        
        backup_manager = DatabaseBackupManager()
        
        # Check if backup directory is accessible
        if backup_manager.active_backup_dir.exists():
            print("✓ Backup directory is accessible")
        else:
            print("✗ Backup directory is not accessible")
            return False
            
        # Test database connection for backup
        db_params = backup_manager._get_db_connection_params()
        if db_params['database'] and db_params['username']:
            print("✓ Backup system database configuration is valid")
            return True
        else:
            print("✗ Backup system database configuration is invalid")
            return False
            
    except Exception as e:
        print(f"✗ Backup system validation failed: {e}")
        return False


def validate_performance_monitoring():
    """Test performance monitoring capabilities."""
    try:
        with connection.cursor() as cursor:
            # Test custom views
            cursor.execute("SELECT * FROM db_performance_summary LIMIT 1")
            result = cursor.fetchone()
            
            if result:
                print("✓ Performance monitoring views are working")
                return True
            else:
                print("✗ Performance monitoring views are not working")
                return False
    except Exception as e:
        print(f"✗ Performance monitoring validation failed: {e}")
        return False


def validate_backup_metadata():
    """Test backup metadata system."""
    try:
        with connection.cursor() as cursor:
            # Check if backup_metadata table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'backup_metadata'
                )
            """)
            
            table_exists = cursor.fetchone()[0]
            
            if table_exists:
                print("✓ Backup metadata table exists")
                
                # Test backup logging function
                cursor.execute("""
                    SELECT log_backup_operation(
                        'test_backup',
                        '/test/path',
                        1024,
                        current_database(),
                        'test',
                        true,
                        '{"test": true}'::jsonb
                    )
                """)
                
                backup_id = cursor.fetchone()[0]
                
                if backup_id:
                    print("✓ Backup logging function is working")
                    
                    # Clean up test record
                    cursor.execute("DELETE FROM backup_metadata WHERE id = %s", [backup_id])
                    
                    return True
                else:
                    print("✗ Backup logging function failed")
                    return False
            else:
                print("✗ Backup metadata table does not exist")
                return False
                
    except Exception as e:
        print(f"✗ Backup metadata validation failed: {e}")
        return False


def validate_django_management_commands():
    """Test Django management commands."""
    try:
        # Test db_manage command
        from django.core.management import get_commands
        commands = get_commands()
        
        if 'db_manage' in commands:
            print("✓ Django db_manage command is available")
            return True
        else:
            print("✗ Django db_manage command is not available")
            return False
            
    except Exception as e:
        print(f"✗ Django management command validation failed: {e}")
        return False


def main():
    """Run all validation tests."""
    print("Database Setup Validation")
    print("=" * 50)
    
    tests = [
        ("Database Connection", validate_database_connection),
        ("Migrations", validate_migrations),
        ("PostgreSQL Extensions", validate_database_extensions),
        ("Backup System", validate_backup_system),
        ("Performance Monitoring", validate_performance_monitoring),
        ("Backup Metadata", validate_backup_metadata),
        ("Django Management Commands", validate_django_management_commands),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\nTesting {test_name}...")
        try:
            if test_func():
                passed += 1
        except Exception as e:
            print(f"✗ {test_name} validation failed with exception: {e}")
    
    print("\n" + "=" * 50)
    print(f"Validation Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✓ All database setup components are working correctly!")
        sys.exit(0)
    else:
        print("✗ Some database setup components need attention.")
        sys.exit(1)


if __name__ == '__main__':
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] %(levelname)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    main()
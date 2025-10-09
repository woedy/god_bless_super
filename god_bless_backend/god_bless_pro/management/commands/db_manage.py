"""
Django management command for database operations.

This command provides a unified interface for database management operations
including initialization, backup, restoration, and health checks.
"""

import sys
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

# Add scripts directory to path
scripts_dir = Path(settings.BASE_DIR) / 'scripts'
sys.path.insert(0, str(scripts_dir))

try:
    from db_init import DatabaseInitializer
    from db_backup import DatabaseBackupManager
    from postgres_config import PostgreSQLConfigurator
except ImportError as e:
    raise CommandError(f"Failed to import database management modules: {e}")


class Command(BaseCommand):
    help = 'Database management operations for God Bless America Platform'

    def add_arguments(self, parser):
        subparsers = parser.add_subparsers(dest='operation', help='Database operation to perform')
        
        # Initialize database
        init_parser = subparsers.add_parser('init', help='Initialize database with migrations and setup')
        init_parser.add_argument('--create-superuser', action='store_true', 
                               help='Create superuser during initialization')
        init_parser.add_argument('--load-data', action='store_true',
                               help='Load initial data fixtures')
        
        # Backup operations
        backup_parser = subparsers.add_parser('backup', help='Create database backup')
        backup_parser.add_argument('--name', help='Custom backup name')
        backup_parser.add_argument('--no-compress', action='store_true',
                                 help='Do not compress backup file')
        
        # Restore operations
        restore_parser = subparsers.add_parser('restore', help='Restore database from backup')
        restore_parser.add_argument('backup_file', help='Path to backup file')
        restore_parser.add_argument('--drop-existing', action='store_true',
                                  help='Drop existing database before restore')
        
        # List backups
        subparsers.add_parser('list-backups', help='List available backups')
        
        # Cleanup backups
        cleanup_parser = subparsers.add_parser('cleanup', help='Clean up old backups')
        cleanup_parser.add_argument('--days', type=int, default=30,
                                  help='Retention period in days (default: 30)')
        
        # Verify backup
        verify_parser = subparsers.add_parser('verify', help='Verify backup integrity')
        verify_parser.add_argument('backup_file', help='Path to backup file to verify')
        
        # Health check
        subparsers.add_parser('health', help='Perform database health check')
        
        # Performance analysis
        subparsers.add_parser('analyze', help='Analyze database performance')
        
        # Optimize database
        subparsers.add_parser('optimize', help='Optimize database performance')
        
        # Create indexes
        subparsers.add_parser('create-indexes', help='Create performance indexes')
        
        # Database info
        subparsers.add_parser('info', help='Show database information')
        
        # Wait for database
        wait_parser = subparsers.add_parser('wait', help='Wait for database to become available')
        wait_parser.add_argument('--timeout', type=int, default=120,
                               help='Timeout in seconds (default: 120)')

    def handle(self, *args, **options):
        operation = options.get('operation')
        
        if not operation:
            self.print_help('manage.py', 'db_manage')
            return
            
        try:
            if operation == 'init':
                self._handle_init(options)
            elif operation == 'backup':
                self._handle_backup(options)
            elif operation == 'restore':
                self._handle_restore(options)
            elif operation == 'list-backups':
                self._handle_list_backups()
            elif operation == 'cleanup':
                self._handle_cleanup(options)
            elif operation == 'verify':
                self._handle_verify(options)
            elif operation == 'health':
                self._handle_health()
            elif operation == 'analyze':
                self._handle_analyze()
            elif operation == 'optimize':
                self._handle_optimize()
            elif operation == 'create-indexes':
                self._handle_create_indexes()
            elif operation == 'info':
                self._handle_info()
            elif operation == 'wait':
                self._handle_wait(options)
            else:
                raise CommandError(f"Unknown operation: {operation}")
                
        except Exception as e:
            raise CommandError(f"Operation failed: {str(e)}")

    def _handle_init(self, options):
        """Handle database initialization."""
        self.stdout.write("Initializing database...")
        
        initializer = DatabaseInitializer()
        
        # Override setup configuration if command line options provided
        if options.get('create_superuser'):
            initializer.setup_config['create_superuser'] = True
            
        if options.get('load_data'):
            initializer.setup_config['load_initial_data'] = True
            
        success = initializer.initialize_database()
        
        if success:
            self.stdout.write(
                self.style.SUCCESS("Database initialization completed successfully")
            )
        else:
            raise CommandError("Database initialization failed")

    def _handle_backup(self, options):
        """Handle database backup creation."""
        self.stdout.write("Creating database backup...")
        
        backup_manager = DatabaseBackupManager()
        
        backup_name = options.get('name')
        compress = not options.get('no_compress', False)
        
        backup_file = backup_manager.create_backup(backup_name, compress)
        
        if backup_file:
            self.stdout.write(
                self.style.SUCCESS(f"Backup created successfully: {backup_file}")
            )
        else:
            raise CommandError("Backup creation failed")

    def _handle_restore(self, options):
        """Handle database restoration."""
        backup_file = Path(options['backup_file'])
        drop_existing = options.get('drop_existing', False)
        
        if not backup_file.exists():
            raise CommandError(f"Backup file not found: {backup_file}")
            
        self.stdout.write(f"Restoring database from: {backup_file}")
        
        if drop_existing:
            self.stdout.write(
                self.style.WARNING("WARNING: This will drop the existing database!")
            )
            confirm = input("Are you sure you want to continue? (yes/no): ")
            if confirm.lower() != 'yes':
                self.stdout.write("Restore cancelled")
                return
                
        backup_manager = DatabaseBackupManager()
        success = backup_manager.restore_backup(backup_file, drop_existing)
        
        if success:
            self.stdout.write(
                self.style.SUCCESS("Database restored successfully")
            )
        else:
            raise CommandError("Database restoration failed")

    def _handle_list_backups(self):
        """Handle listing available backups."""
        backup_manager = DatabaseBackupManager()
        backups = backup_manager.list_backups()
        
        if not backups:
            self.stdout.write("No backups found")
            return
            
        self.stdout.write(f"Found {len(backups)} backups:")
        
        for backup in backups:
            size_mb = backup['size'] / (1024 * 1024)
            compressed = " (compressed)" if backup['compressed'] else ""
            
            self.stdout.write(
                f"  {backup['name']}: {size_mb:.1f} MB, {backup['created']}{compressed}"
            )

    def _handle_cleanup(self, options):
        """Handle backup cleanup."""
        retention_days = options.get('days', 30)
        
        self.stdout.write(f"Cleaning up backups older than {retention_days} days...")
        
        backup_manager = DatabaseBackupManager()
        deleted_count = backup_manager.cleanup_old_backups(retention_days)
        
        self.stdout.write(
            self.style.SUCCESS(f"Cleanup completed: {deleted_count} backups deleted")
        )

    def _handle_verify(self, options):
        """Handle backup verification."""
        backup_file = Path(options['backup_file'])
        
        if not backup_file.exists():
            raise CommandError(f"Backup file not found: {backup_file}")
            
        self.stdout.write(f"Verifying backup: {backup_file}")
        
        backup_manager = DatabaseBackupManager()
        results = backup_manager.verify_backup(backup_file)
        
        self.stdout.write(f"Backup verification results:")
        self.stdout.write(f"  Valid: {results['valid']}")
        self.stdout.write(f"  Size: {results['size']:,} bytes")
        self.stdout.write(f"  Tables: {results['tables_count']}")
        
        if results['errors']:
            self.stdout.write(self.style.ERROR("Errors:"))
            for error in results['errors']:
                self.stdout.write(f"  - {error}")
                
        if results['warnings']:
            self.stdout.write(self.style.WARNING("Warnings:"))
            for warning in results['warnings']:
                self.stdout.write(f"  - {warning}")
                
        if not results['valid']:
            raise CommandError("Backup verification failed")

    def _handle_health(self):
        """Handle database health check."""
        self.stdout.write("Performing database health check...")
        
        configurator = PostgreSQLConfigurator()
        health = configurator.health_check()
        
        status_style = self.style.SUCCESS if health['status'] == 'healthy' else \
                      self.style.WARNING if health['status'] == 'warning' else \
                      self.style.ERROR
        
        self.stdout.write(f"Database Health: {status_style(health['status'].upper())}")
        
        if health['checks']:
            self.stdout.write("Checks:")
            for check, result in health['checks'].items():
                self.stdout.write(f"  {check}: {result}")
                
        if health['warnings']:
            self.stdout.write(self.style.WARNING("Warnings:"))
            for warning in health['warnings']:
                self.stdout.write(f"  - {warning}")
                
        if health['errors']:
            self.stdout.write(self.style.ERROR("Errors:"))
            for error in health['errors']:
                self.stdout.write(f"  - {error}")

    def _handle_analyze(self):
        """Handle database performance analysis."""
        self.stdout.write("Analyzing database performance...")
        
        configurator = PostgreSQLConfigurator()
        analysis = configurator.analyze_performance()
        
        if analysis['warnings']:
            self.stdout.write(self.style.WARNING("Warnings:"))
            for warning in analysis['warnings']:
                self.stdout.write(f"  - {warning}")
                
        if analysis['recommendations']:
            self.stdout.write("Recommendations:")
            for rec in analysis['recommendations']:
                self.stdout.write(f"  - {rec}")
                
        if analysis['optimizations']:
            self.stdout.write("Optimizations:")
            for opt in analysis['optimizations']:
                self.stdout.write(f"  - {opt}")

    def _handle_optimize(self):
        """Handle database optimization."""
        self.stdout.write("Optimizing database...")
        
        configurator = PostgreSQLConfigurator()
        success = configurator.optimize_database()
        
        if success:
            self.stdout.write(
                self.style.SUCCESS("Database optimization completed successfully")
            )
        else:
            raise CommandError("Database optimization failed")

    def _handle_create_indexes(self):
        """Handle performance index creation."""
        self.stdout.write("Creating performance indexes...")
        
        configurator = PostgreSQLConfigurator()
        success = configurator.create_performance_indexes()
        
        if success:
            self.stdout.write(
                self.style.SUCCESS("Performance indexes created successfully")
            )
        else:
            raise CommandError("Index creation failed")

    def _handle_info(self):
        """Handle database information display."""
        configurator = PostgreSQLConfigurator()
        info = configurator.get_database_info()
        
        self.stdout.write("Database Information:")
        for key, value in info.items():
            self.stdout.write(f"  {key}: {value}")

    def _handle_wait(self, options):
        """Handle waiting for database availability."""
        timeout = options.get('timeout', 120)
        
        self.stdout.write(f"Waiting for database (timeout: {timeout}s)...")
        
        initializer = DatabaseInitializer()
        success = initializer.wait_for_database(timeout)
        
        if success:
            self.stdout.write(
                self.style.SUCCESS("Database is available")
            )
        else:
            raise CommandError(f"Database not available after {timeout} seconds")
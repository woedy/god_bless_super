#!/usr/bin/env python
"""
Database Backup and Recovery System for God Bless America Platform

This script provides automated database backup, restoration, and maintenance
capabilities for PostgreSQL databases in production environments.
"""

import os
import sys
import time
import gzip
import shutil
import logging
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# Add Django project to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')

import django
django.setup()

from django.conf import settings
from god_bless_pro.env_config import get_environment_config

logger = logging.getLogger(__name__)


class DatabaseBackupManager:
    """
    Manages database backup, restoration, and maintenance operations.
    """
    
    def __init__(self):
        self.base_dir = Path(__file__).parent.parent
        self.env_config = get_environment_config(self.base_dir)
        self.db_config = self.env_config.get('database', {})
        self.backup_config = self.env_config.get('backup', {})
        
        # Backup directory setup
        self.backup_dir = Path('/backups')  # Docker volume mount point
        self.local_backup_dir = self.base_dir / 'backups'
        
        # Use Docker volume if available, otherwise local directory
        if self.backup_dir.exists() and os.access(self.backup_dir, os.W_OK):
            self.active_backup_dir = self.backup_dir
        else:
            self.active_backup_dir = self.local_backup_dir
            self.active_backup_dir.mkdir(exist_ok=True)
            
        # Database connection parameters
        self.db_params = self._get_db_connection_params()
        
    def _get_db_connection_params(self) -> Dict[str, str]:
        """Get database connection parameters from configuration."""
        if self.db_config.get('ENGINE') != 'django.db.backends.postgresql':
            raise ValueError("Backup system only supports PostgreSQL databases")
            
        return {
            'host': self.db_config.get('HOST', 'localhost'),
            'port': str(self.db_config.get('PORT', 5432)),
            'database': self.db_config.get('NAME', ''),
            'username': self.db_config.get('USER', ''),
            'password': self.db_config.get('PASSWORD', ''),
        }
        
    def _run_pg_command(self, command: List[str], input_data: Optional[str] = None) -> Tuple[bool, str, str]:
        """
        Run PostgreSQL command with proper environment setup.
        
        Args:
            command: Command and arguments to run
            input_data: Optional input data for the command
            
        Returns:
            Tuple of (success, stdout, stderr)
        """
        env = os.environ.copy()
        env['PGPASSWORD'] = self.db_params['password']
        env['PGHOST'] = self.db_params['host']
        env['PGPORT'] = self.db_params['port']
        env['PGUSER'] = self.db_params['username']
        env['PGDATABASE'] = self.db_params['database']
        
        try:
            process = subprocess.run(
                command,
                input=input_data,
                text=True,
                capture_output=True,
                env=env,
                timeout=3600  # 1 hour timeout
            )
            
            return process.returncode == 0, process.stdout, process.stderr
            
        except subprocess.TimeoutExpired:
            return False, "", "Command timed out after 1 hour"
        except Exception as e:
            return False, "", str(e)
            
    def create_backup(self, backup_name: Optional[str] = None, compress: bool = True) -> Optional[Path]:
        """
        Create a database backup.
        
        Args:
            backup_name: Optional custom backup name
            compress: Whether to compress the backup
            
        Returns:
            Path to created backup file, or None if failed
        """
        if not backup_name:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_name = f"backup_{self.db_params['database']}_{timestamp}"
            
        backup_file = self.active_backup_dir / f"{backup_name}.sql"
        
        logger.info(f"Creating database backup: {backup_file}")
        
        try:
            # Create pg_dump command
            dump_command = [
                'pg_dump',
                '--verbose',
                '--no-password',
                '--format=custom',
                '--compress=9',
                '--no-privileges',
                '--no-owner',
                '--file', str(backup_file)
            ]
            
            # Run backup
            success, stdout, stderr = self._run_pg_command(dump_command)
            
            if not success:
                logger.error(f"Backup failed: {stderr}")
                return None
                
            if not backup_file.exists():
                logger.error("Backup file was not created")
                return None
                
            # Compress if requested and not already compressed
            if compress and not backup_file.name.endswith('.gz'):
                compressed_file = backup_file.with_suffix('.sql.gz')
                
                with open(backup_file, 'rb') as f_in:
                    with gzip.open(compressed_file, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                        
                backup_file.unlink()  # Remove uncompressed file
                backup_file = compressed_file
                
            # Get backup size
            backup_size = backup_file.stat().st_size
            logger.info(f"Backup created successfully: {backup_file} ({backup_size:,} bytes)")
            
            # Create backup metadata
            self._create_backup_metadata(backup_file, backup_size)
            
            return backup_file
            
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            return None
            
    def restore_backup(self, backup_file: Path, drop_existing: bool = False) -> bool:
        """
        Restore database from backup.
        
        Args:
            backup_file: Path to backup file
            drop_existing: Whether to drop existing database first
            
        Returns:
            True if restoration was successful
        """
        if not backup_file.exists():
            logger.error(f"Backup file not found: {backup_file}")
            return False
            
        logger.info(f"Restoring database from backup: {backup_file}")
        
        try:
            # Decompress if needed
            temp_file = None
            restore_file = backup_file
            
            if backup_file.name.endswith('.gz'):
                temp_file = backup_file.with_suffix('')
                with gzip.open(backup_file, 'rb') as f_in:
                    with open(temp_file, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                restore_file = temp_file
                
            # Drop existing database if requested
            if drop_existing:
                logger.warning("Dropping existing database...")
                drop_command = ['dropdb', '--if-exists', self.db_params['database']]
                success, stdout, stderr = self._run_pg_command(drop_command)
                
                if not success:
                    logger.error(f"Failed to drop database: {stderr}")
                    return False
                    
                # Create new database
                create_command = ['createdb', self.db_params['database']]
                success, stdout, stderr = self._run_pg_command(create_command)
                
                if not success:
                    logger.error(f"Failed to create database: {stderr}")
                    return False
                    
            # Restore from backup
            restore_command = [
                'pg_restore',
                '--verbose',
                '--no-password',
                '--clean',
                '--if-exists',
                '--no-privileges',
                '--no-owner',
                '--dbname', self.db_params['database'],
                str(restore_file)
            ]
            
            success, stdout, stderr = self._run_pg_command(restore_command)
            
            # Clean up temporary file
            if temp_file and temp_file.exists():
                temp_file.unlink()
                
            if not success:
                logger.error(f"Restore failed: {stderr}")
                return False
                
            logger.info("Database restored successfully")
            return True
            
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            return False
            
    def list_backups(self) -> List[Dict[str, Any]]:
        """
        List available backups with metadata.
        
        Returns:
            List of backup information dictionaries
        """
        backups = []
        
        for backup_file in self.active_backup_dir.glob('backup_*.sql*'):
            try:
                stat = backup_file.stat()
                
                # Try to load metadata
                metadata_file = backup_file.with_suffix('.metadata.json')
                metadata = {}
                
                if metadata_file.exists():
                    import json
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                        
                backup_info = {
                    'name': backup_file.name,
                    'path': str(backup_file),
                    'size': stat.st_size,
                    'created': datetime.fromtimestamp(stat.st_mtime),
                    'compressed': backup_file.name.endswith('.gz'),
                    'metadata': metadata
                }
                
                backups.append(backup_info)
                
            except Exception as e:
                logger.warning(f"Failed to read backup info for {backup_file}: {e}")
                
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x['created'], reverse=True)
        return backups
        
    def cleanup_old_backups(self, retention_days: Optional[int] = None) -> int:
        """
        Clean up old backups based on retention policy.
        
        Args:
            retention_days: Number of days to retain backups
            
        Returns:
            Number of backups deleted
        """
        if retention_days is None:
            retention_days = self.backup_config.get('retention_days', 30)
            
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        deleted_count = 0
        
        logger.info(f"Cleaning up backups older than {retention_days} days")
        
        for backup_info in self.list_backups():
            if backup_info['created'] < cutoff_date:
                try:
                    backup_path = Path(backup_info['path'])
                    backup_path.unlink()
                    
                    # Remove metadata file if exists
                    metadata_file = backup_path.with_suffix('.metadata.json')
                    if metadata_file.exists():
                        metadata_file.unlink()
                        
                    logger.info(f"Deleted old backup: {backup_info['name']}")
                    deleted_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to delete backup {backup_info['name']}: {e}")
                    
        logger.info(f"Cleanup completed: {deleted_count} backups deleted")
        return deleted_count
        
    def verify_backup(self, backup_file: Path) -> Dict[str, Any]:
        """
        Verify backup integrity and contents.
        
        Args:
            backup_file: Path to backup file to verify
            
        Returns:
            Dictionary containing verification results
        """
        results = {
            'valid': False,
            'readable': False,
            'size': 0,
            'tables_count': 0,
            'errors': [],
            'warnings': []
        }
        
        try:
            if not backup_file.exists():
                results['errors'].append("Backup file does not exist")
                return results
                
            results['size'] = backup_file.stat().st_size
            
            if results['size'] == 0:
                results['errors'].append("Backup file is empty")
                return results
                
            # Test if file is readable
            if backup_file.name.endswith('.gz'):
                try:
                    with gzip.open(backup_file, 'rb') as f:
                        f.read(1024)  # Read first 1KB
                    results['readable'] = True
                except Exception as e:
                    results['errors'].append(f"Cannot read compressed backup: {e}")
                    return results
            else:
                results['readable'] = True
                
            # Use pg_restore to list contents
            list_command = [
                'pg_restore',
                '--list',
                '--no-password',
                str(backup_file)
            ]
            
            success, stdout, stderr = self._run_pg_command(list_command)
            
            if success:
                # Count tables in the backup
                table_lines = [line for line in stdout.split('\n') if 'TABLE DATA' in line]
                results['tables_count'] = len(table_lines)
                results['valid'] = True
            else:
                results['errors'].append(f"pg_restore list failed: {stderr}")
                
        except Exception as e:
            results['errors'].append(f"Verification failed: {str(e)}")
            
        return results
        
    def _create_backup_metadata(self, backup_file: Path, backup_size: int) -> None:
        """Create metadata file for backup."""
        try:
            import json
            from django.db import connection
            
            metadata = {
                'created': datetime.now().isoformat(),
                'database': self.db_params['database'],
                'size': backup_size,
                'compressed': backup_file.name.endswith('.gz'),
                'django_version': django.get_version(),
                'environment': os.environ.get('ENVIRONMENT', 'unknown')
            }
            
            # Get database statistics
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT COUNT(*) 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public'
                    """)
                    metadata['tables_count'] = cursor.fetchone()[0]
                    
                    cursor.execute("SELECT pg_database_size(current_database())")
                    metadata['database_size'] = cursor.fetchone()[0]
                    
            except Exception as e:
                logger.warning(f"Failed to get database statistics: {e}")
                
            metadata_file = backup_file.with_suffix('.metadata.json')
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
                
        except Exception as e:
            logger.warning(f"Failed to create backup metadata: {e}")
            
    def create_scheduled_backup(self) -> bool:
        """
        Create a scheduled backup with automatic cleanup.
        
        Returns:
            True if backup was created successfully
        """
        logger.info("Starting scheduled backup...")
        
        try:
            # Create backup
            backup_file = self.create_backup()
            
            if not backup_file:
                return False
                
            # Verify backup
            verification = self.verify_backup(backup_file)
            
            if not verification['valid']:
                logger.error("Backup verification failed:")
                for error in verification['errors']:
                    logger.error(f"  - {error}")
                return False
                
            # Cleanup old backups
            self.cleanup_old_backups()
            
            logger.info("Scheduled backup completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Scheduled backup failed: {e}")
            return False


def main():
    """Main entry point for backup operations."""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] %(levelname)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    if len(sys.argv) < 2:
        print("Usage: python db_backup.py <command> [options]")
        print("Commands:")
        print("  create [name]     - Create a new backup")
        print("  restore <file>    - Restore from backup file")
        print("  list              - List available backups")
        print("  cleanup [days]    - Clean up old backups")
        print("  verify <file>     - Verify backup integrity")
        print("  scheduled         - Run scheduled backup with cleanup")
        sys.exit(1)
        
    command = sys.argv[1]
    backup_manager = DatabaseBackupManager()
    
    try:
        if command == 'create':
            backup_name = sys.argv[2] if len(sys.argv) > 2 else None
            backup_file = backup_manager.create_backup(backup_name)
            sys.exit(0 if backup_file else 1)
            
        elif command == 'restore':
            if len(sys.argv) < 3:
                print("Error: Backup file path required")
                sys.exit(1)
            backup_file = Path(sys.argv[2])
            success = backup_manager.restore_backup(backup_file)
            sys.exit(0 if success else 1)
            
        elif command == 'list':
            backups = backup_manager.list_backups()
            print(f"Found {len(backups)} backups:")
            for backup in backups:
                size_mb = backup['size'] / (1024 * 1024)
                compressed = " (compressed)" if backup['compressed'] else ""
                print(f"  {backup['name']}: {size_mb:.1f} MB, {backup['created']}{compressed}")
                
        elif command == 'cleanup':
            retention_days = int(sys.argv[2]) if len(sys.argv) > 2 else None
            deleted_count = backup_manager.cleanup_old_backups(retention_days)
            print(f"Deleted {deleted_count} old backups")
            
        elif command == 'verify':
            if len(sys.argv) < 3:
                print("Error: Backup file path required")
                sys.exit(1)
            backup_file = Path(sys.argv[2])
            results = backup_manager.verify_backup(backup_file)
            
            print(f"Backup verification results for {backup_file.name}:")
            print(f"  Valid: {results['valid']}")
            print(f"  Size: {results['size']:,} bytes")
            print(f"  Tables: {results['tables_count']}")
            
            if results['errors']:
                print("  Errors:")
                for error in results['errors']:
                    print(f"    - {error}")
                    
            sys.exit(0 if results['valid'] else 1)
            
        elif command == 'scheduled':
            success = backup_manager.create_scheduled_backup()
            sys.exit(0 if success else 1)
            
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Command failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
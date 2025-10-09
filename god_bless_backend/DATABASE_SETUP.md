# Database Setup and Migration Automation

This document describes the automated database setup, migration, and backup system implemented for the God Bless America Platform's Coolify deployment.

## Overview

The database setup system provides:

- **Automated Database Initialization**: Automatic database setup with migrations on container startup
- **Performance Tuning**: Optimized PostgreSQL configuration for production workloads
- **Backup and Recovery**: Automated backup system with retention policies
- **Health Monitoring**: Comprehensive database health checks and performance monitoring
- **Management Commands**: Django management commands for database operations

## Components

### 1. Database Initialization (`scripts/db_init.py`)

Handles complete database initialization including:

- Database connectivity verification
- Migration execution
- Superuser creation (if configured)
- Initial data loading
- Database optimization
- Setup validation

**Usage:**
```bash
# Full initialization
python scripts/db_init.py

# Individual operations
python scripts/db_init.py wait      # Wait for database
python scripts/db_init.py migrate   # Run migrations only
python scripts/db_init.py validate  # Validate setup
```

### 2. Backup and Recovery System (`scripts/db_backup.py`)

Comprehensive backup system with:

- Automated backup creation with compression
- Backup verification and integrity checking
- Retention policy management
- Restoration capabilities
- Metadata tracking

**Usage:**
```bash
# Create backup
python scripts/db_backup.py create [backup_name]

# List backups
python scripts/db_backup.py list

# Restore backup
python scripts/db_backup.py restore /path/to/backup.sql.gz

# Verify backup
python scripts/db_backup.py verify /path/to/backup.sql.gz

# Cleanup old backups
python scripts/db_backup.py cleanup [retention_days]

# Scheduled backup (with cleanup)
python scripts/db_backup.py scheduled
```

### 3. PostgreSQL Configuration (`scripts/postgres_config.py`)

Performance tuning and monitoring:

- Database information and statistics
- Performance analysis and recommendations
- Index optimization
- Health checks
- Configuration generation

**Usage:**
```bash
# Database information
python scripts/postgres_config.py info

# Performance metrics
python scripts/postgres_config.py metrics

# Performance analysis
python scripts/postgres_config.py analyze

# Health check
python scripts/postgres_config.py health

# Apply optimizations
python scripts/postgres_config.py optimize

# Create performance indexes
python scripts/postgres_config.py indexes
```

### 4. Django Management Command (`god_bless_pro/management/commands/db_manage.py`)

Unified Django management interface:

```bash
# Database initialization
python manage.py db_manage init --create-superuser --load-data

# Backup operations
python manage.py db_manage backup --name production_backup
python manage.py db_manage list-backups
python manage.py db_manage restore backup_file.sql.gz

# Health and performance
python manage.py db_manage health
python manage.py db_manage analyze
python manage.py db_manage optimize

# Wait for database
python manage.py db_manage wait --timeout 120
```

### 5. Automated Backup Scheduler (`scripts/backup_cron.sh`)

Docker-compatible cron job for automated backups:

- Runs daily at 2 AM (configurable)
- Includes backup verification
- Automatic cleanup of old backups
- Webhook notifications (optional)
- Comprehensive logging

## Docker Integration

### Environment Variables

**Required:**
- `POSTGRES_DB`: Database name
- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_HOST`: Database host (usually 'database')

**Optional:**
- `CREATE_SUPERUSER`: Create superuser on startup (default: false)
- `DJANGO_SUPERUSER_USERNAME`: Superuser username (default: admin)
- `DJANGO_SUPERUSER_EMAIL`: Superuser email
- `DJANGO_SUPERUSER_PASSWORD`: Superuser password
- `LOAD_INITIAL_DATA`: Load initial fixtures (default: false)
- `BACKUP_ENABLED`: Enable automated backups (default: true)
- `BACKUP_RETENTION_DAYS`: Backup retention period (default: 30)
- `BACKUP_SUCCESS_WEBHOOK`: Webhook URL for backup success notifications
- `BACKUP_FAILURE_WEBHOOK`: Webhook URL for backup failure notifications

### PostgreSQL Performance Tuning

The system includes optimized PostgreSQL configuration:

```yaml
# Performance settings (configurable via environment variables)
POSTGRES_SHARED_BUFFERS: 256MB        # Memory for shared buffers
POSTGRES_WORK_MEM: 4MB                # Memory for sorting operations
POSTGRES_MAINTENANCE_WORK_MEM: 64MB   # Memory for maintenance operations
POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB    # Estimated OS cache size
POSTGRES_MAX_CONNECTIONS: 200         # Maximum connections
POSTGRES_CHECKPOINT_COMPLETION_TARGET: 0.9  # Checkpoint timing
POSTGRES_WAL_BUFFERS: 16MB            # WAL buffer size
POSTGRES_RANDOM_PAGE_COST: 1.1       # SSD-optimized random access cost
```

### Docker Compose Services

#### Main Database Service
```yaml
database:
  image: postgres:15-alpine
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - postgres_backups:/backups
    - ./god_bless_backend/scripts/postgres_init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
  environment:
    # Database and performance configuration
  command: >
    postgres [optimized configuration parameters]
```

#### Backup Scheduler Service
```yaml
backup_scheduler:
  build: ./god_bless_backend
  command: # Cron-based backup scheduler
  volumes:
    - postgres_backups:/backups
    - backend_logs:/app/logs
  profiles:
    - backup  # Optional service
```

## Database Schema Enhancements

### Performance Monitoring Views

The system creates monitoring views for performance tracking:

```sql
-- Database performance summary
SELECT * FROM db_performance_summary;

-- Table sizes
SELECT * FROM get_table_sizes();

-- Index usage statistics
SELECT * FROM get_index_usage();
```

### Backup Metadata System

Tracks backup operations with metadata:

```sql
-- Log backup operation
SELECT log_backup_operation(
    'backup_name',
    '/path/to/backup',
    backup_size,
    'database_name',
    'full',
    true,
    '{"metadata": "json"}'::jsonb
);

-- Cleanup old backup records
SELECT cleanup_backup_metadata();
```

### Performance Indexes

Automatically creates indexes for common queries:

- User authentication indexes
- Activity logging indexes
- Project management indexes
- Phone number indexes
- Task status indexes

## Validation and Testing

### Setup Validation

Run the validation script to verify all components:

```bash
python scripts/validate_db_setup.py
```

This validates:
- Database connectivity
- Migration status
- PostgreSQL extensions
- Backup system functionality
- Performance monitoring
- Backup metadata system
- Django management commands

### Health Checks

The system includes comprehensive health checks:

```bash
# Database health check
python manage.py db_manage health

# Performance analysis
python manage.py db_manage analyze

# Backup verification
python manage.py db_manage verify backup_file.sql.gz
```

## Monitoring and Alerting

### Log Files

- **Application logs**: `/app/logs/django/`
- **Backup logs**: `/app/logs/backup_cron.log`
- **Database logs**: PostgreSQL container logs

### Webhook Notifications

Configure webhook URLs for backup notifications:

```bash
# Success notifications
BACKUP_SUCCESS_WEBHOOK=https://your-webhook-url/success

# Failure notifications
BACKUP_FAILURE_WEBHOOK=https://your-webhook-url/failure
```

### Performance Metrics

Monitor key metrics:
- Database size and growth
- Connection usage
- Query performance
- Index usage
- Backup success/failure rates

## Troubleshooting

### Common Issues

1. **Database Connection Timeout**
   ```bash
   # Check database status
   docker-compose logs database
   
   # Wait for database
   python manage.py db_manage wait --timeout 120
   ```

2. **Migration Failures**
   ```bash
   # Check migration status
   python manage.py showmigrations
   
   # Run specific migration
   python manage.py migrate app_name migration_name
   ```

3. **Backup Failures**
   ```bash
   # Check backup logs
   tail -f /app/logs/backup_cron.log
   
   # Test backup manually
   python scripts/db_backup.py create test_backup
   ```

4. **Performance Issues**
   ```bash
   # Analyze performance
   python manage.py db_manage analyze
   
   # Apply optimizations
   python manage.py db_manage optimize
   ```

### Recovery Procedures

1. **Database Corruption**
   ```bash
   # Stop application
   docker-compose stop backend celery_worker celery_beat
   
   # Restore from backup
   python manage.py db_manage restore latest_backup.sql.gz --drop-existing
   
   # Restart application
   docker-compose start backend celery_worker celery_beat
   ```

2. **Data Loss**
   ```bash
   # List available backups
   python manage.py db_manage list-backups
   
   # Verify backup integrity
   python manage.py db_manage verify backup_file.sql.gz
   
   # Restore specific backup
   python manage.py db_manage restore backup_file.sql.gz
   ```

## Best Practices

### Backup Strategy

1. **Automated Daily Backups**: Enabled by default at 2 AM
2. **Retention Policy**: 30 days (configurable)
3. **Backup Verification**: Automatic integrity checking
4. **Off-site Storage**: Consider external backup storage for production

### Performance Optimization

1. **Regular Maintenance**: Weekly VACUUM and ANALYZE operations
2. **Index Monitoring**: Monitor unused indexes and query performance
3. **Connection Pooling**: Use PgBouncer for high-traffic applications
4. **Resource Monitoring**: Monitor memory and CPU usage

### Security Considerations

1. **Backup Encryption**: Consider encrypting backup files
2. **Access Control**: Limit database access to necessary services
3. **Audit Logging**: Enable comprehensive audit logging
4. **Secret Management**: Use Coolify secrets for sensitive configuration

## Coolify Deployment

### Required Secrets

Configure these secrets in Coolify:

- `SECRET_KEY`: Django secret key
- `POSTGRES_PASSWORD`: Database password
- `REDIS_PASSWORD`: Redis password (optional)
- `DJANGO_SUPERUSER_PASSWORD`: Admin password (optional)

### Environment Variables

Set these in Coolify environment configuration:

```bash
# Database
POSTGRES_DB=god_bless_db
POSTGRES_USER=god_bless_user
POSTGRES_HOST=database
USE_POSTGRES=true

# Backup
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30

# Performance
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_MAX_CONNECTIONS=200
```

### Service Profiles

Enable optional services:

```bash
# Enable backup scheduler
docker-compose --profile backup up -d

# Enable monitoring
docker-compose --profile monitoring up -d
```

This comprehensive database setup ensures reliable, performant, and maintainable database operations for the God Bless America Platform in production environments.
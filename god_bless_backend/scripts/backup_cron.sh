#!/bin/bash
#
# Automated Database Backup Script for Docker Environment
#
# This script is designed to run inside the Docker container for automated database backups.
# It handles backup creation, verification, and cleanup with proper logging.
#

set -e

# Configuration for Docker environment
LOG_DIR="/app/logs"
LOG_FILE="$LOG_DIR/backup_cron.log"
LOCK_FILE="/tmp/backup_cron.lock"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Function to log with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to cleanup on exit
cleanup() {
    if [ -f "$LOCK_FILE" ]; then
        rm -f "$LOCK_FILE"
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Check if another backup is running
if [ -f "$LOCK_FILE" ]; then
    log "ERROR: Another backup process is already running (lock file exists)"
    exit 1
fi

# Create lock file
echo $$ > "$LOCK_FILE"

log "Starting automated database backup in Docker container..."

# Change to app directory
cd /app

# Verify we're in Docker container
if [ ! -f "/.dockerenv" ]; then
    log "WARNING: Not running in Docker container"
fi

# Set Django settings module
export DJANGO_SETTINGS_MODULE="god_bless_pro.settings"

# Verify database connectivity before backup
log "Checking database connectivity..."
if ! python scripts/db_init.py wait; then
    log "ERROR: Database is not available"
    exit 1
fi

# Run backup with error handling
log "Starting backup process..."
if python scripts/db_backup.py scheduled >> "$LOG_FILE" 2>&1; then
    log "Automated backup completed successfully"
    
    # Optional: Send success notification via webhook
    if [ -n "$BACKUP_SUCCESS_WEBHOOK" ]; then
        log "Sending success notification..."
        curl -X POST "$BACKUP_SUCCESS_WEBHOOK" \
             -H "Content-Type: application/json" \
             -d "{\"status\": \"success\", \"message\": \"Database backup completed successfully\", \"timestamp\": \"$(date -Iseconds)\", \"container\": \"$(hostname)\"}" \
             >> "$LOG_FILE" 2>&1 || log "WARNING: Failed to send success notification"
    fi
    
    # Log backup statistics
    BACKUP_COUNT=$(ls -1 /backups/backup_*.sql* 2>/dev/null | wc -l || echo "0")
    BACKUP_SIZE=$(du -sh /backups 2>/dev/null | cut -f1 || echo "unknown")
    log "Backup statistics: $BACKUP_COUNT backups, total size: $BACKUP_SIZE"
    
    exit 0
else
    log "ERROR: Automated backup failed"
    
    # Optional: Send failure notification via webhook
    if [ -n "$BACKUP_FAILURE_WEBHOOK" ]; then
        log "Sending failure notification..."
        curl -X POST "$BACKUP_FAILURE_WEBHOOK" \
             -H "Content-Type: application/json" \
             -d "{\"status\": \"error\", \"message\": \"Database backup failed\", \"timestamp\": \"$(date -Iseconds)\", \"container\": \"$(hostname)\"}" \
             >> "$LOG_FILE" 2>&1 || log "WARNING: Failed to send failure notification"
    fi
    
    exit 1
fi
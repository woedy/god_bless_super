#!/bin/bash
"""
Automated performance optimization cron script.
This script runs performance optimizations on a schedule.
"""

# Set environment variables
export DJANGO_SETTINGS_MODULE=god_bless_pro.settings
export PYTHONPATH=/app

# Log file
LOG_FILE="/app/logs/performance_cron.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log_message "Starting automated performance optimization"

# Change to application directory
cd /app

# Run performance monitoring
log_message "Running performance monitoring..."
python scripts/performance_monitor.py >> "$LOG_FILE" 2>&1

# Run performance optimizations
log_message "Running performance optimizations..."
python scripts/optimize_performance.py all >> "$LOG_FILE" 2>&1

# Clean up old log files (keep last 30 days)
log_message "Cleaning up old log files..."
find /app/logs -name "*.log" -type f -mtime +30 -delete
find /app/logs -name "*.json" -type f -mtime +7 -delete

# Clean up old performance reports (keep last 7 days)
find /app/logs -name "performance_metrics_*.json" -type f -mtime +7 -delete
find /app/logs -name "optimization_report_*.json" -type f -mtime +7 -delete

log_message "Automated performance optimization completed"

# Check disk space and alert if low
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    log_message "CRITICAL: Disk usage is ${DISK_USAGE}% - immediate action required"
    # Send alert if webhook is configured
    if [ ! -z "$DISK_ALERT_WEBHOOK" ]; then
        curl -X POST "$DISK_ALERT_WEBHOOK" \
             -H "Content-Type: application/json" \
             -d "{\"text\":\"CRITICAL: Disk usage is ${DISK_USAGE}% on God Bless America platform\"}"
    fi
elif [ "$DISK_USAGE" -gt 80 ]; then
    log_message "WARNING: Disk usage is ${DISK_USAGE}% - consider cleanup"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    log_message "WARNING: Memory usage is ${MEMORY_USAGE}%"
fi

log_message "System health check completed"
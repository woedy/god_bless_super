#!/bin/bash
"""
Setup monitoring and alerting cron jobs for God Bless platform
This script configures automated health checks and alerting
"""

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOGS_DIR="$PROJECT_DIR/logs"
PYTHON_PATH="/usr/local/bin/python3"

# Ensure logs directory exists
mkdir -p "$LOGS_DIR"

# Create cron jobs
echo "Setting up monitoring cron jobs..."

# Create temporary cron file
TEMP_CRON=$(mktemp)

# Add existing cron jobs (if any)
crontab -l 2>/dev/null > "$TEMP_CRON" || true

# Remove existing monitoring jobs to avoid duplicates
sed -i '/# God Bless Health Monitor/d' "$TEMP_CRON"
sed -i '/health_monitor.py/d' "$TEMP_CRON"
sed -i '/alerting_system.py/d' "$TEMP_CRON"

# Add new monitoring jobs
cat >> "$TEMP_CRON" << EOF

# God Bless Health Monitor - Run every 5 minutes
*/5 * * * * cd $PROJECT_DIR && $PYTHON_PATH scripts/health_monitor.py >> $LOGS_DIR/health_monitor_cron.log 2>&1

# God Bless Alerting System - Run every 10 minutes
*/10 * * * * cd $PROJECT_DIR && $PYTHON_PATH scripts/alerting_system.py >> $LOGS_DIR/alerting_cron.log 2>&1

# Health Check Summary - Run every hour
0 * * * * cd $PROJECT_DIR && $PYTHON_PATH scripts/health_summary.py >> $LOGS_DIR/health_summary.log 2>&1

# Log Cleanup - Run daily at 2 AM
0 2 * * * find $LOGS_DIR -name "*.log" -type f -mtime +7 -delete

# Health Report - Run daily at 8 AM
0 8 * * * cd $PROJECT_DIR && $PYTHON_PATH scripts/daily_health_report.py >> $LOGS_DIR/daily_report.log 2>&1

EOF

# Install the cron jobs
crontab "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

echo "Monitoring cron jobs installed successfully!"
echo "Current cron jobs:"
crontab -l | grep -E "(health_monitor|alerting_system|health_summary|daily_health_report)" || echo "No monitoring jobs found"

# Create systemd service file for continuous monitoring (optional)
if command -v systemctl &> /dev/null; then
    echo "Creating systemd service for health monitoring..."
    
    cat > /tmp/god-bless-health-monitor.service << EOF
[Unit]
Description=God Bless Health Monitor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=$PYTHON_PATH $SCRIPT_DIR/health_monitor.py
Restart=always
RestartSec=300
StandardOutput=append:$LOGS_DIR/health_monitor_service.log
StandardError=append:$LOGS_DIR/health_monitor_service.log

[Install]
WantedBy=multi-user.target
EOF

    # Note: In production, you would copy this to /etc/systemd/system/
    echo "Systemd service file created at /tmp/god-bless-health-monitor.service"
    echo "To install: sudo cp /tmp/god-bless-health-monitor.service /etc/systemd/system/"
    echo "To enable: sudo systemctl enable god-bless-health-monitor.service"
    echo "To start: sudo systemctl start god-bless-health-monitor.service"
fi

echo "Monitoring setup complete!"
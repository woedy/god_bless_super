#!/usr/bin/env python3
"""
Alerting system for God Bless platform
Monitors health status and sends alerts via various channels
"""

import os
import sys
import json
import time
import logging
import requests
import smtplib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
try:
    from email.mime.text import MimeText
    from email.mime.multipart import MimeMultipart
except ImportError:
    # Fallback for systems where email modules might not be available
    MimeText = None
    MimeMultipart = None

# Add Django project to path
sys.path.append(str(Path(__file__).parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')

import django
django.setup()

from django.conf import settings
from django.core.cache import cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/alerting.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class AlertingSystem:
    """Comprehensive alerting system for health monitoring"""
    
    def __init__(self):
        self.config = self.load_alerting_config()
        self.alert_history = []
        self.suppressed_alerts = set()
        
    def load_alerting_config(self) -> Dict[str, Any]:
        """Load alerting configuration from environment and settings"""
        return {
            'email': {
                'enabled': os.environ.get('ALERTING_EMAIL_ENABLED', 'false').lower() == 'true',
                'smtp_host': os.environ.get('EMAIL_HOST', 'localhost'),
                'smtp_port': int(os.environ.get('EMAIL_PORT', 587)),
                'smtp_user': os.environ.get('EMAIL_HOST_USER', ''),
                'smtp_password': os.environ.get('EMAIL_HOST_PASSWORD', ''),
                'use_tls': os.environ.get('EMAIL_USE_TLS', 'true').lower() == 'true',
                'from_email': os.environ.get('ALERTING_FROM_EMAIL', 'alerts@godbless.local'),
                'to_emails': os.environ.get('ALERTING_TO_EMAILS', '').split(','),
                'subject_prefix': os.environ.get('ALERTING_EMAIL_PREFIX', '[God Bless Alert]')
            },
            'webhook': {
                'enabled': os.environ.get('ALERTING_WEBHOOK_ENABLED', 'false').lower() == 'true',
                'url': os.environ.get('ALERTING_WEBHOOK_URL', ''),
                'timeout': int(os.environ.get('ALERTING_WEBHOOK_TIMEOUT', 10)),
                'retry_count': int(os.environ.get('ALERTING_WEBHOOK_RETRY', 3))
            },
            'slack': {
                'enabled': os.environ.get('ALERTING_SLACK_ENABLED', 'false').lower() == 'true',
                'webhook_url': os.environ.get('SLACK_WEBHOOK_URL', ''),
                'channel': os.environ.get('SLACK_CHANNEL', '#alerts'),
                'username': os.environ.get('SLACK_USERNAME', 'God Bless Monitor')
            },
            'thresholds': {
                'cpu_warning': float(os.environ.get('ALERT_CPU_WARNING', 80)),
                'cpu_critical': float(os.environ.get('ALERT_CPU_CRITICAL', 95)),
                'memory_warning': float(os.environ.get('ALERT_MEMORY_WARNING', 85)),
                'memory_critical': float(os.environ.get('ALERT_MEMORY_CRITICAL', 95)),
                'disk_warning': float(os.environ.get('ALERT_DISK_WARNING', 80)),
                'disk_critical': float(os.environ.get('ALERT_DISK_CRITICAL', 90)),
                'response_time_warning': float(os.environ.get('ALERT_RESPONSE_TIME_WARNING', 5000)),  # ms
                'response_time_critical': float(os.environ.get('ALERT_RESPONSE_TIME_CRITICAL', 10000))  # ms
            },
            'suppression': {
                'enabled': os.environ.get('ALERT_SUPPRESSION_ENABLED', 'true').lower() == 'true',
                'window_minutes': int(os.environ.get('ALERT_SUPPRESSION_WINDOW', 15)),
                'max_alerts_per_service': int(os.environ.get('ALERT_MAX_PER_SERVICE', 3))
            }
        }
    
    def check_and_alert(self):
        """Main method to check system health and send alerts"""
        try:
            logger.info("Starting health check and alerting cycle...")
            
            # Get current health status
            health_status = self.get_system_health()
            
            if not health_status:
                logger.error("Failed to get system health status")
                return
            
            # Generate alerts based on health status
            alerts = self.generate_alerts(health_status)
            
            # Process and send alerts
            for alert in alerts:
                self.process_alert(alert)
            
            # Clean up old alert history
            self.cleanup_alert_history()
            
            logger.info(f"Alerting cycle completed. Processed {len(alerts)} alerts.")
            
        except Exception as e:
            logger.error(f"Alerting system error: {e}")
    
    def get_system_health(self) -> Optional[Dict[str, Any]]:
        """Get system health status from monitoring endpoint"""
        try:
            response = requests.get(
                'http://localhost:8000/api/monitoring/dashboard/',
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Health endpoint returned status {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get system health: {e}")
            return None
    
    def generate_alerts(self, health_status: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate alerts based on health status"""
        alerts = []
        
        # Use existing alerts from health status
        existing_alerts = health_status.get('alerts', [])
        alerts.extend(existing_alerts)
        
        # Generate additional alerts based on thresholds
        services = health_status.get('services', {})
        
        # System resource alerts
        system_resources = services.get('system_resources', {})
        if system_resources.get('status') in ['warning', 'critical']:
            metrics = system_resources.get('metrics', {})
            
            # CPU alerts
            cpu_usage = metrics.get('cpu', {}).get('usage_percent', 0)
            if cpu_usage >= self.config['thresholds']['cpu_critical']:
                alerts.append({
                    'severity': 'critical',
                    'service': 'system_resources',
                    'message': f'Critical CPU usage: {cpu_usage}%',
                    'details': f'CPU usage ({cpu_usage}%) exceeds critical threshold ({self.config["thresholds"]["cpu_critical"]}%)',
                    'timestamp': datetime.now().isoformat(),
                    'metric_value': cpu_usage,
                    'threshold': self.config['thresholds']['cpu_critical']
                })
            elif cpu_usage >= self.config['thresholds']['cpu_warning']:
                alerts.append({
                    'severity': 'medium',
                    'service': 'system_resources',
                    'message': f'High CPU usage: {cpu_usage}%',
                    'details': f'CPU usage ({cpu_usage}%) exceeds warning threshold ({self.config["thresholds"]["cpu_warning"]}%)',
                    'timestamp': datetime.now().isoformat(),
                    'metric_value': cpu_usage,
                    'threshold': self.config['thresholds']['cpu_warning']
                })
            
            # Memory alerts
            memory_usage = metrics.get('memory', {}).get('usage_percent', 0)
            if memory_usage >= self.config['thresholds']['memory_critical']:
                alerts.append({
                    'severity': 'critical',
                    'service': 'system_resources',
                    'message': f'Critical memory usage: {memory_usage}%',
                    'details': f'Memory usage ({memory_usage}%) exceeds critical threshold ({self.config["thresholds"]["memory_critical"]}%)',
                    'timestamp': datetime.now().isoformat(),
                    'metric_value': memory_usage,
                    'threshold': self.config['thresholds']['memory_critical']
                })
            elif memory_usage >= self.config['thresholds']['memory_warning']:
                alerts.append({
                    'severity': 'medium',
                    'service': 'system_resources',
                    'message': f'High memory usage: {memory_usage}%',
                    'details': f'Memory usage ({memory_usage}%) exceeds warning threshold ({self.config["thresholds"]["memory_warning"]}%)',
                    'timestamp': datetime.now().isoformat(),
                    'metric_value': memory_usage,
                    'threshold': self.config['thresholds']['memory_warning']
                })
        
        # Disk space alerts
        disk_space = services.get('disk_space', {})
        if disk_space.get('status') in ['warning', 'critical']:
            metrics = disk_space.get('metrics', {})
            disk_usage = metrics.get('used_percent', 0)
            
            if disk_usage >= self.config['thresholds']['disk_critical']:
                alerts.append({
                    'severity': 'critical',
                    'service': 'disk_space',
                    'message': f'Critical disk usage: {disk_usage}%',
                    'details': f'Disk usage ({disk_usage}%) exceeds critical threshold ({self.config["thresholds"]["disk_critical"]}%)',
                    'timestamp': datetime.now().isoformat(),
                    'metric_value': disk_usage,
                    'threshold': self.config['thresholds']['disk_critical']
                })
            elif disk_usage >= self.config['thresholds']['disk_warning']:
                alerts.append({
                    'severity': 'medium',
                    'service': 'disk_space',
                    'message': f'High disk usage: {disk_usage}%',
                    'details': f'Disk usage ({disk_usage}%) exceeds warning threshold ({self.config["thresholds"]["disk_warning"]}%)',
                    'timestamp': datetime.now().isoformat(),
                    'metric_value': disk_usage,
                    'threshold': self.config['thresholds']['disk_warning']
                })
        
        # Response time alerts
        for service_name, service_data in services.items():
            response_time_ms = service_data.get('response_time_ms', 0)
            if response_time_ms > 0:
                if response_time_ms >= self.config['thresholds']['response_time_critical']:
                    alerts.append({
                        'severity': 'high',
                        'service': service_name,
                        'message': f'Critical response time: {response_time_ms}ms',
                        'details': f'Service response time ({response_time_ms}ms) exceeds critical threshold ({self.config["thresholds"]["response_time_critical"]}ms)',
                        'timestamp': datetime.now().isoformat(),
                        'metric_value': response_time_ms,
                        'threshold': self.config['thresholds']['response_time_critical']
                    })
                elif response_time_ms >= self.config['thresholds']['response_time_warning']:
                    alerts.append({
                        'severity': 'medium',
                        'service': service_name,
                        'message': f'Slow response time: {response_time_ms}ms',
                        'details': f'Service response time ({response_time_ms}ms) exceeds warning threshold ({self.config["thresholds"]["response_time_warning"]}ms)',
                        'timestamp': datetime.now().isoformat(),
                        'metric_value': response_time_ms,
                        'threshold': self.config['thresholds']['response_time_warning']
                    })
        
        return alerts
    
    def process_alert(self, alert: Dict[str, Any]):
        """Process and send an individual alert"""
        try:
            # Check if alert should be suppressed
            if self.should_suppress_alert(alert):
                logger.info(f"Suppressing alert for {alert['service']}: {alert['message']}")
                return
            
            # Add to alert history
            self.alert_history.append({
                **alert,
                'processed_at': datetime.now().isoformat()
            })
            
            # Send alert via configured channels
            if self.config['email']['enabled']:
                self.send_email_alert(alert)
            
            if self.config['webhook']['enabled']:
                self.send_webhook_alert(alert)
            
            if self.config['slack']['enabled']:
                self.send_slack_alert(alert)
            
            logger.info(f"Processed alert: {alert['severity']} - {alert['service']} - {alert['message']}")
            
        except Exception as e:
            logger.error(f"Failed to process alert: {e}")
    
    def should_suppress_alert(self, alert: Dict[str, Any]) -> bool:
        """Check if alert should be suppressed based on configuration"""
        if not self.config['suppression']['enabled']:
            return False
        
        service = alert['service']
        severity = alert['severity']
        message = alert['message']
        
        # Create alert key for suppression tracking
        alert_key = f"{service}:{severity}:{message}"
        
        # Check if this exact alert was recently sent
        if alert_key in self.suppressed_alerts:
            return True
        
        # Check alert frequency for this service
        recent_alerts = [
            a for a in self.alert_history
            if a['service'] == service and
            datetime.fromisoformat(a['processed_at']) > 
            datetime.now() - timedelta(minutes=self.config['suppression']['window_minutes'])
        ]
        
        if len(recent_alerts) >= self.config['suppression']['max_alerts_per_service']:
            # Add to suppressed alerts
            self.suppressed_alerts.add(alert_key)
            return True
        
        return False
    
    def send_email_alert(self, alert: Dict[str, Any]):
        """Send alert via email"""
        try:
            if not MimeText or not MimeMultipart:
                logger.warning("Email modules not available - skipping email alert")
                return
                
            if not self.config['email']['to_emails'] or not self.config['email']['to_emails'][0]:
                logger.warning("No email recipients configured")
                return
            
            # Create email message
            msg = MimeMultipart()
            msg['From'] = self.config['email']['from_email']
            msg['To'] = ', '.join(self.config['email']['to_emails'])
            msg['Subject'] = f"{self.config['email']['subject_prefix']} {alert['severity'].upper()}: {alert['message']}"
            
            # Email body
            body = f"""
God Bless Platform Alert

Severity: {alert['severity'].upper()}
Service: {alert['service']}
Message: {alert['message']}
Details: {alert.get('details', 'No additional details')}
Timestamp: {alert['timestamp']}

System Information:
- Alert generated by monitoring system
- Check the monitoring dashboard for more details
- Contact system administrator if this is a critical issue

---
God Bless Platform Monitoring System
            """.strip()
            
            msg.attach(MimeText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(self.config['email']['smtp_host'], self.config['email']['smtp_port'])
            if self.config['email']['use_tls']:
                server.starttls()
            
            if self.config['email']['smtp_user'] and self.config['email']['smtp_password']:
                server.login(self.config['email']['smtp_user'], self.config['email']['smtp_password'])
            
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email alert sent for {alert['service']}")
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
    
    def send_webhook_alert(self, alert: Dict[str, Any]):
        """Send alert via webhook"""
        try:
            if not self.config['webhook']['url']:
                logger.warning("No webhook URL configured")
                return
            
            payload = {
                'alert': alert,
                'system': 'god_bless_platform',
                'environment': os.environ.get('ENVIRONMENT', 'production'),
                'timestamp': datetime.now().isoformat()
            }
            
            for attempt in range(self.config['webhook']['retry_count']):
                try:
                    response = requests.post(
                        self.config['webhook']['url'],
                        json=payload,
                        timeout=self.config['webhook']['timeout'],
                        headers={'Content-Type': 'application/json'}
                    )
                    
                    if response.status_code in [200, 201, 202]:
                        logger.info(f"Webhook alert sent for {alert['service']}")
                        break
                    else:
                        logger.warning(f"Webhook returned status {response.status_code}")
                        
                except requests.RequestException as e:
                    logger.warning(f"Webhook attempt {attempt + 1} failed: {e}")
                    if attempt == self.config['webhook']['retry_count'] - 1:
                        raise
                    time.sleep(2 ** attempt)  # Exponential backoff
            
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")
    
    def send_slack_alert(self, alert: Dict[str, Any]):
        """Send alert via Slack webhook"""
        try:
            if not self.config['slack']['webhook_url']:
                logger.warning("No Slack webhook URL configured")
                return
            
            # Determine color based on severity
            color_map = {
                'critical': '#FF0000',  # Red
                'high': '#FF6600',      # Orange
                'medium': '#FFCC00',    # Yellow
                'low': '#00FF00'        # Green
            }
            color = color_map.get(alert['severity'], '#808080')
            
            # Create Slack message
            payload = {
                'channel': self.config['slack']['channel'],
                'username': self.config['slack']['username'],
                'attachments': [{
                    'color': color,
                    'title': f"{alert['severity'].upper()}: {alert['message']}",
                    'fields': [
                        {
                            'title': 'Service',
                            'value': alert['service'],
                            'short': True
                        },
                        {
                            'title': 'Severity',
                            'value': alert['severity'].upper(),
                            'short': True
                        },
                        {
                            'title': 'Details',
                            'value': alert.get('details', 'No additional details'),
                            'short': False
                        },
                        {
                            'title': 'Timestamp',
                            'value': alert['timestamp'],
                            'short': True
                        }
                    ],
                    'footer': 'God Bless Platform Monitoring',
                    'ts': int(time.time())
                }]
            }
            
            response = requests.post(
                self.config['slack']['webhook_url'],
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"Slack alert sent for {alert['service']}")
            else:
                logger.warning(f"Slack webhook returned status {response.status_code}")
            
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
    
    def cleanup_alert_history(self):
        """Clean up old alert history"""
        try:
            # Keep only alerts from the last 24 hours
            cutoff_time = datetime.now() - timedelta(hours=24)
            
            self.alert_history = [
                alert for alert in self.alert_history
                if datetime.fromisoformat(alert['processed_at']) > cutoff_time
            ]
            
            # Clean up suppressed alerts (keep for suppression window only)
            suppression_cutoff = datetime.now() - timedelta(
                minutes=self.config['suppression']['window_minutes']
            )
            
            # Note: In a production system, you'd want to store suppression timestamps
            # For now, we'll clear the suppressed alerts set periodically
            if len(self.suppressed_alerts) > 100:  # Arbitrary limit
                self.suppressed_alerts.clear()
            
        except Exception as e:
            logger.error(f"Failed to cleanup alert history: {e}")


def main():
    """Main function to run alerting system"""
    alerting = AlertingSystem()
    alerting.check_and_alert()


if __name__ == '__main__':
    main()
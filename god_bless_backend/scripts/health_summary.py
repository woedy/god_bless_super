#!/usr/bin/env python3
"""
Health summary generator for God Bless platform
Generates periodic health summaries and reports
"""

import os
import sys
import json
import time
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional

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
        logging.FileHandler('/app/logs/health_summary.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class HealthSummaryGenerator:
    """Generate comprehensive health summaries and reports"""
    
    def __init__(self):
        self.logs_dir = Path('/app/logs')
        self.reports_dir = self.logs_dir / 'reports'
        self.reports_dir.mkdir(exist_ok=True)
        
    def generate_hourly_summary(self):
        """Generate hourly health summary"""
        try:
            logger.info("Generating hourly health summary...")
            
            # Collect health data from recent logs
            health_data = self.collect_recent_health_data(hours=1)
            
            # Generate summary
            summary = {
                'timestamp': datetime.now().isoformat(),
                'period': 'hourly',
                'duration_hours': 1,
                'overall_status': self.calculate_period_status(health_data),
                'service_availability': self.calculate_service_availability(health_data),
                'performance_metrics': self.calculate_performance_metrics(health_data),
                'alert_summary': self.summarize_alerts(health_data),
                'trends': self.analyze_trends(health_data)
            }
            
            # Save summary
            timestamp = datetime.now().strftime('%Y%m%d_%H')
            summary_file = self.reports_dir / f'hourly_summary_{timestamp}.json'
            
            with open(summary_file, 'w') as f:
                json.dump(summary, f, indent=2, default=str)
            
            logger.info(f"Hourly summary saved to {summary_file}")
            
            # Cache summary for API access
            cache.set('health_summary_hourly', summary, 3600)
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to generate hourly summary: {e}")
            return None
    
    def generate_daily_summary(self):
        """Generate daily health summary"""
        try:
            logger.info("Generating daily health summary...")
            
            # Collect health data from recent logs
            health_data = self.collect_recent_health_data(hours=24)
            
            # Generate comprehensive daily summary
            summary = {
                'timestamp': datetime.now().isoformat(),
                'period': 'daily',
                'duration_hours': 24,
                'overall_status': self.calculate_period_status(health_data),
                'service_availability': self.calculate_service_availability(health_data),
                'performance_metrics': self.calculate_performance_metrics(health_data),
                'alert_summary': self.summarize_alerts(health_data),
                'trends': self.analyze_trends(health_data),
                'resource_usage': self.analyze_resource_usage(health_data),
                'top_issues': self.identify_top_issues(health_data),
                'recommendations': self.generate_recommendations(health_data)
            }
            
            # Save summary
            timestamp = datetime.now().strftime('%Y%m%d')
            summary_file = self.reports_dir / f'daily_summary_{timestamp}.json'
            
            with open(summary_file, 'w') as f:
                json.dump(summary, f, indent=2, default=str)
            
            logger.info(f"Daily summary saved to {summary_file}")
            
            # Cache summary for API access
            cache.set('health_summary_daily', summary, 86400)
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to generate daily summary: {e}")
            return None
    
    def collect_recent_health_data(self, hours: int = 1) -> List[Dict[str, Any]]:
        """Collect health check data from recent log files"""
        health_data = []
        
        try:
            # Look for health check JSON files
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            for log_file in self.logs_dir.glob('health_check_*.json'):
                try:
                    # Extract timestamp from filename
                    timestamp_str = log_file.stem.replace('health_check_', '')
                    file_time = datetime.strptime(timestamp_str, '%Y%m%d_%H%M%S')
                    
                    if file_time >= cutoff_time:
                        with open(log_file, 'r') as f:
                            data = json.load(f)
                            health_data.append(data)
                            
                except (ValueError, json.JSONDecodeError) as e:
                    logger.warning(f"Failed to parse health check file {log_file}: {e}")
                    continue
            
            # Sort by timestamp
            health_data.sort(key=lambda x: x.get('timestamp', ''))
            
            logger.info(f"Collected {len(health_data)} health check records from last {hours} hours")
            
        except Exception as e:
            logger.error(f"Failed to collect health data: {e}")
        
        return health_data
    
    def calculate_period_status(self, health_data: List[Dict[str, Any]]) -> str:
        """Calculate overall status for the period"""
        if not health_data:
            return 'unknown'
        
        statuses = [data.get('overall_status', 'unknown') for data in health_data]
        
        # If any critical or unhealthy status, overall is unhealthy
        if 'critical' in statuses or 'unhealthy' in statuses:
            return 'unhealthy'
        elif 'warning' in statuses:
            return 'warning'
        elif all(status == 'healthy' for status in statuses):
            return 'healthy'
        else:
            return 'mixed'
    
    def calculate_service_availability(self, health_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate service availability percentages"""
        if not health_data:
            return {}
        
        service_stats = {}
        
        for data in health_data:
            checks = data.get('checks', {})
            for service, check in checks.items():
                if service not in service_stats:
                    service_stats[service] = {'total': 0, 'healthy': 0}
                
                service_stats[service]['total'] += 1
                if check.get('status') == 'healthy':
                    service_stats[service]['healthy'] += 1
        
        # Calculate availability percentages
        availability = {}
        for service, stats in service_stats.items():
            if stats['total'] > 0:
                availability[service] = {
                    'availability_percent': round((stats['healthy'] / stats['total']) * 100, 2),
                    'total_checks': stats['total'],
                    'healthy_checks': stats['healthy'],
                    'unhealthy_checks': stats['total'] - stats['healthy']
                }
        
        return availability
    
    def calculate_performance_metrics(self, health_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate performance metrics from health data"""
        if not health_data:
            return {}
        
        metrics = {
            'response_times': {},
            'resource_usage': {
                'cpu': {'min': 100, 'max': 0, 'avg': 0, 'samples': []},
                'memory': {'min': 100, 'max': 0, 'avg': 0, 'samples': []},
                'disk': {'min': 100, 'max': 0, 'avg': 0, 'samples': []}
            },
            'error_rates': {}
        }
        
        for data in health_data:
            # Collect response times
            checks = data.get('checks', {})
            for service, check in checks.items():
                response_time = check.get('response_time', 0)
                if response_time > 0:
                    if service not in metrics['response_times']:
                        metrics['response_times'][service] = []
                    metrics['response_times'][service].append(response_time)
            
            # Collect resource usage
            system_metrics = data.get('metrics', {}).get('system', {})
            if system_metrics:
                # CPU usage
                cpu_usage = system_metrics.get('cpu_percent', 0)
                if cpu_usage > 0:
                    metrics['resource_usage']['cpu']['samples'].append(cpu_usage)
                    metrics['resource_usage']['cpu']['min'] = min(metrics['resource_usage']['cpu']['min'], cpu_usage)
                    metrics['resource_usage']['cpu']['max'] = max(metrics['resource_usage']['cpu']['max'], cpu_usage)
                
                # Memory usage
                memory_usage = system_metrics.get('memory_percent', 0)
                if memory_usage > 0:
                    metrics['resource_usage']['memory']['samples'].append(memory_usage)
                    metrics['resource_usage']['memory']['min'] = min(metrics['resource_usage']['memory']['min'], memory_usage)
                    metrics['resource_usage']['memory']['max'] = max(metrics['resource_usage']['memory']['max'], memory_usage)
        
        # Calculate averages
        for resource in ['cpu', 'memory', 'disk']:
            samples = metrics['resource_usage'][resource]['samples']
            if samples:
                metrics['resource_usage'][resource]['avg'] = round(sum(samples) / len(samples), 2)
            else:
                metrics['resource_usage'][resource] = {'min': 0, 'max': 0, 'avg': 0}
        
        # Calculate response time statistics
        for service, times in metrics['response_times'].items():
            if times:
                metrics['response_times'][service] = {
                    'min': round(min(times), 2),
                    'max': round(max(times), 2),
                    'avg': round(sum(times) / len(times), 2),
                    'samples': len(times)
                }
        
        return metrics
    
    def summarize_alerts(self, health_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize alerts from health data"""
        if not health_data:
            return {}
        
        alert_summary = {
            'total_alerts': 0,
            'by_severity': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0},
            'by_service': {},
            'most_common_alerts': {},
            'alert_frequency': 0
        }
        
        all_alerts = []
        for data in health_data:
            alerts = data.get('alerts', [])
            all_alerts.extend(alerts)
        
        alert_summary['total_alerts'] = len(all_alerts)
        
        if all_alerts:
            # Count by severity
            for alert in all_alerts:
                severity = alert.get('severity', 'unknown')
                if severity in alert_summary['by_severity']:
                    alert_summary['by_severity'][severity] += 1
                
                # Count by service
                service = alert.get('service', 'unknown')
                if service not in alert_summary['by_service']:
                    alert_summary['by_service'][service] = 0
                alert_summary['by_service'][service] += 1
                
                # Count alert messages
                message = alert.get('message', 'unknown')
                if message not in alert_summary['most_common_alerts']:
                    alert_summary['most_common_alerts'][message] = 0
                alert_summary['most_common_alerts'][message] += 1
            
            # Calculate alert frequency (alerts per hour)
            if health_data:
                time_span_hours = len(health_data) / 12  # Assuming 5-minute intervals
                alert_summary['alert_frequency'] = round(len(all_alerts) / max(time_span_hours, 1), 2)
        
        return alert_summary
    
    def analyze_trends(self, health_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze trends in health data"""
        if len(health_data) < 2:
            return {}
        
        trends = {
            'overall_health_trend': 'stable',
            'resource_trends': {},
            'service_trends': {},
            'alert_trends': {}
        }
        
        # Analyze overall health trend
        recent_statuses = [data.get('overall_status', 'unknown') for data in health_data[-5:]]
        earlier_statuses = [data.get('overall_status', 'unknown') for data in health_data[:5]]
        
        if recent_statuses.count('healthy') > earlier_statuses.count('healthy'):
            trends['overall_health_trend'] = 'improving'
        elif recent_statuses.count('healthy') < earlier_statuses.count('healthy'):
            trends['overall_health_trend'] = 'degrading'
        
        # Analyze resource usage trends
        cpu_samples = []
        memory_samples = []
        
        for data in health_data:
            metrics = data.get('metrics', {}).get('system', {})
            if metrics:
                cpu_samples.append(metrics.get('cpu_percent', 0))
                memory_samples.append(metrics.get('memory_percent', 0))
        
        if len(cpu_samples) >= 2:
            recent_cpu = sum(cpu_samples[-3:]) / len(cpu_samples[-3:])
            earlier_cpu = sum(cpu_samples[:3]) / len(cpu_samples[:3])
            
            if recent_cpu > earlier_cpu * 1.1:
                trends['resource_trends']['cpu'] = 'increasing'
            elif recent_cpu < earlier_cpu * 0.9:
                trends['resource_trends']['cpu'] = 'decreasing'
            else:
                trends['resource_trends']['cpu'] = 'stable'
        
        if len(memory_samples) >= 2:
            recent_memory = sum(memory_samples[-3:]) / len(memory_samples[-3:])
            earlier_memory = sum(memory_samples[:3]) / len(memory_samples[:3])
            
            if recent_memory > earlier_memory * 1.1:
                trends['resource_trends']['memory'] = 'increasing'
            elif recent_memory < earlier_memory * 0.9:
                trends['resource_trends']['memory'] = 'decreasing'
            else:
                trends['resource_trends']['memory'] = 'stable'
        
        return trends
    
    def analyze_resource_usage(self, health_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze resource usage patterns"""
        if not health_data:
            return {}
        
        resource_analysis = {
            'peak_usage_times': {},
            'average_usage': {},
            'resource_efficiency': {},
            'capacity_planning': {}
        }
        
        # Collect resource data with timestamps
        resource_data = []
        for data in health_data:
            timestamp = data.get('timestamp', '')
            metrics = data.get('metrics', {}).get('system', {})
            if metrics and timestamp:
                resource_data.append({
                    'timestamp': timestamp,
                    'cpu': metrics.get('cpu_percent', 0),
                    'memory': metrics.get('memory_percent', 0),
                    'disk': metrics.get('disk_percent', 0)
                })
        
        if resource_data:
            # Calculate averages
            resource_analysis['average_usage'] = {
                'cpu': round(sum(d['cpu'] for d in resource_data) / len(resource_data), 2),
                'memory': round(sum(d['memory'] for d in resource_data) / len(resource_data), 2),
                'disk': round(sum(d['disk'] for d in resource_data) / len(resource_data), 2)
            }
            
            # Find peak usage
            max_cpu = max(resource_data, key=lambda x: x['cpu'])
            max_memory = max(resource_data, key=lambda x: x['memory'])
            
            resource_analysis['peak_usage_times'] = {
                'cpu': {'value': max_cpu['cpu'], 'timestamp': max_cpu['timestamp']},
                'memory': {'value': max_memory['memory'], 'timestamp': max_memory['timestamp']}
            }
            
            # Resource efficiency analysis
            avg_cpu = resource_analysis['average_usage']['cpu']
            avg_memory = resource_analysis['average_usage']['memory']
            
            resource_analysis['resource_efficiency'] = {
                'cpu_efficiency': 'good' if avg_cpu < 70 else 'moderate' if avg_cpu < 85 else 'poor',
                'memory_efficiency': 'good' if avg_memory < 75 else 'moderate' if avg_memory < 90 else 'poor'
            }
        
        return resource_analysis
    
    def identify_top_issues(self, health_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify top issues from health data"""
        issues = []
        
        if not health_data:
            return issues
        
        # Analyze service failures
        service_failures = {}
        for data in health_data:
            checks = data.get('checks', {})
            for service, check in checks.items():
                if check.get('status') != 'healthy':
                    if service not in service_failures:
                        service_failures[service] = 0
                    service_failures[service] += 1
        
        # Add top failing services as issues
        for service, failure_count in sorted(service_failures.items(), key=lambda x: x[1], reverse=True)[:5]:
            issues.append({
                'type': 'service_failure',
                'service': service,
                'frequency': failure_count,
                'severity': 'high' if failure_count > len(health_data) * 0.5 else 'medium',
                'description': f'{service} failed {failure_count} times out of {len(health_data)} checks'
            })
        
        # Analyze resource issues
        resource_issues = []
        for data in health_data:
            metrics = data.get('metrics', {}).get('system', {})
            if metrics:
                cpu = metrics.get('cpu_percent', 0)
                memory = metrics.get('memory_percent', 0)
                
                if cpu > 90:
                    resource_issues.append('high_cpu')
                if memory > 90:
                    resource_issues.append('high_memory')
        
        if resource_issues:
            cpu_issues = resource_issues.count('high_cpu')
            memory_issues = resource_issues.count('high_memory')
            
            if cpu_issues > 0:
                issues.append({
                    'type': 'resource_issue',
                    'resource': 'cpu',
                    'frequency': cpu_issues,
                    'severity': 'high' if cpu_issues > len(health_data) * 0.3 else 'medium',
                    'description': f'High CPU usage detected {cpu_issues} times'
                })
            
            if memory_issues > 0:
                issues.append({
                    'type': 'resource_issue',
                    'resource': 'memory',
                    'frequency': memory_issues,
                    'severity': 'high' if memory_issues > len(health_data) * 0.3 else 'medium',
                    'description': f'High memory usage detected {memory_issues} times'
                })
        
        return issues
    
    def generate_recommendations(self, health_data: List[Dict[str, Any]]) -> List[str]:
        """Generate recommendations based on health analysis"""
        recommendations = []
        
        if not health_data:
            return recommendations
        
        # Analyze recent data for recommendations
        recent_data = health_data[-5:] if len(health_data) >= 5 else health_data
        
        # Resource-based recommendations
        avg_cpu = 0
        avg_memory = 0
        sample_count = 0
        
        for data in recent_data:
            metrics = data.get('metrics', {}).get('system', {})
            if metrics:
                avg_cpu += metrics.get('cpu_percent', 0)
                avg_memory += metrics.get('memory_percent', 0)
                sample_count += 1
        
        if sample_count > 0:
            avg_cpu /= sample_count
            avg_memory /= sample_count
            
            if avg_cpu > 80:
                recommendations.append("Consider scaling CPU resources or optimizing application performance")
            
            if avg_memory > 85:
                recommendations.append("Consider increasing memory allocation or optimizing memory usage")
            
            if avg_cpu < 30 and avg_memory < 50:
                recommendations.append("System resources are underutilized - consider downsizing for cost optimization")
        
        # Service-based recommendations
        failing_services = set()
        for data in recent_data:
            checks = data.get('checks', {})
            for service, check in checks.items():
                if check.get('status') != 'healthy':
                    failing_services.add(service)
        
        if failing_services:
            recommendations.append(f"Investigate and fix issues with services: {', '.join(failing_services)}")
        
        # Alert-based recommendations
        alert_count = sum(len(data.get('alerts', [])) for data in recent_data)
        if alert_count > len(recent_data) * 2:  # More than 2 alerts per check on average
            recommendations.append("High alert frequency detected - review alert thresholds and system stability")
        
        return recommendations


def main():
    """Main function to generate health summaries"""
    generator = HealthSummaryGenerator()
    
    # Generate hourly summary
    hourly_summary = generator.generate_hourly_summary()
    if hourly_summary:
        print(f"Hourly summary generated: {hourly_summary['overall_status']}")
    
    # Generate daily summary if it's a new day or forced
    current_hour = datetime.now().hour
    if current_hour == 0 or '--daily' in sys.argv:  # Run at midnight or when forced
        daily_summary = generator.generate_daily_summary()
        if daily_summary:
            print(f"Daily summary generated: {daily_summary['overall_status']}")


if __name__ == '__main__':
    main()
#!/usr/bin/env python3
"""
Daily health report generator for God Bless platform
Generates comprehensive daily health reports and sends them via email
"""

import os
import sys
import json
import logging
import smtplib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from email.mime.base import MimeBase
from email import encoders

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
        logging.FileHandler('/app/logs/daily_report.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DailyHealthReporter:
    """Generate and send daily health reports"""
    
    def __init__(self):
        self.logs_dir = Path('/app/logs')
        self.reports_dir = self.logs_dir / 'reports'
        self.reports_dir.mkdir(exist_ok=True)
        
        # Email configuration
        self.email_config = {
            'enabled': os.environ.get('DAILY_REPORT_EMAIL_ENABLED', 'false').lower() == 'true',
            'smtp_host': os.environ.get('EMAIL_HOST', 'localhost'),
            'smtp_port': int(os.environ.get('EMAIL_PORT', 587)),
            'smtp_user': os.environ.get('EMAIL_HOST_USER', ''),
            'smtp_password': os.environ.get('EMAIL_HOST_PASSWORD', ''),
            'use_tls': os.environ.get('EMAIL_USE_TLS', 'true').lower() == 'true',
            'from_email': os.environ.get('DAILY_REPORT_FROM_EMAIL', 'reports@godbless.local'),
            'to_emails': os.environ.get('DAILY_REPORT_TO_EMAILS', '').split(','),
            'subject_prefix': os.environ.get('DAILY_REPORT_SUBJECT_PREFIX', '[God Bless Daily Report]')
        }
    
    def generate_daily_report(self) -> Dict[str, Any]:
        """Generate comprehensive daily health report"""
        try:
            logger.info("Generating daily health report...")
            
            # Get yesterday's date for the report
            report_date = datetime.now() - timedelta(days=1)
            report_date_str = report_date.strftime('%Y-%m-%d')
            
            # Load daily summary if available
            daily_summary = self.load_daily_summary(report_date)
            
            # Generate report data
            report = {
                'report_date': report_date_str,
                'generated_at': datetime.now().isoformat(),
                'summary': daily_summary or {},
                'executive_summary': self.generate_executive_summary(daily_summary),
                'detailed_analysis': self.generate_detailed_analysis(daily_summary),
                'recommendations': self.generate_recommendations(daily_summary),
                'appendix': self.generate_appendix(daily_summary)
            }
            
            # Save report
            report_file = self.reports_dir / f'daily_report_{report_date_str}.json'
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            logger.info(f"Daily report saved to {report_file}")
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate daily report: {e}")
            return {}
    
    def load_daily_summary(self, report_date: datetime) -> Optional[Dict[str, Any]]:
        """Load daily summary for the report date"""
        try:
            date_str = report_date.strftime('%Y%m%d')
            summary_file = self.reports_dir / f'daily_summary_{date_str}.json'
            
            if summary_file.exists():
                with open(summary_file, 'r') as f:
                    return json.load(f)
            else:
                logger.warning(f"Daily summary not found for {date_str}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to load daily summary: {e}")
            return None
    
    def generate_executive_summary(self, daily_summary: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate executive summary section"""
        if not daily_summary:
            return {
                'overall_status': 'unknown',
                'key_metrics': {},
                'critical_issues': [],
                'achievements': []
            }
        
        overall_status = daily_summary.get('overall_status', 'unknown')
        service_availability = daily_summary.get('service_availability', {})
        alert_summary = daily_summary.get('alert_summary', {})
        
        # Calculate key metrics
        avg_availability = 0
        if service_availability:
            availabilities = [svc.get('availability_percent', 0) for svc in service_availability.values()]
            avg_availability = sum(availabilities) / len(availabilities) if availabilities else 0
        
        key_metrics = {
            'overall_health': overall_status,
            'average_availability': round(avg_availability, 2),
            'total_alerts': alert_summary.get('total_alerts', 0),
            'critical_alerts': alert_summary.get('by_severity', {}).get('critical', 0)
        }
        
        # Identify critical issues
        critical_issues = []
        if overall_status in ['critical', 'unhealthy']:
            critical_issues.append(f"System overall health is {overall_status}")
        
        if avg_availability < 95:
            critical_issues.append(f"Average service availability is below 95% ({avg_availability:.1f}%)")
        
        if alert_summary.get('by_severity', {}).get('critical', 0) > 0:
            critical_issues.append(f"{alert_summary['by_severity']['critical']} critical alerts generated")
        
        # Identify achievements
        achievements = []
        if avg_availability >= 99:
            achievements.append(f"Excellent service availability: {avg_availability:.1f}%")
        
        if alert_summary.get('total_alerts', 0) == 0:
            achievements.append("Zero alerts generated - system running smoothly")
        
        if overall_status == 'healthy':
            achievements.append("System maintained healthy status throughout the day")
        
        return {
            'overall_status': overall_status,
            'key_metrics': key_metrics,
            'critical_issues': critical_issues,
            'achievements': achievements
        }
    
    def generate_detailed_analysis(self, daily_summary: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate detailed analysis section"""
        if not daily_summary:
            return {}
        
        analysis = {
            'service_performance': self.analyze_service_performance(daily_summary),
            'resource_utilization': self.analyze_resource_utilization(daily_summary),
            'alert_analysis': self.analyze_alerts(daily_summary),
            'trend_analysis': self.analyze_trends(daily_summary)
        }
        
        return analysis
    
    def analyze_service_performance(self, daily_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze service performance"""
        service_availability = daily_summary.get('service_availability', {})
        performance_metrics = daily_summary.get('performance_metrics', {})
        
        analysis = {
            'availability_summary': {},
            'response_time_summary': {},
            'top_performers': [],
            'underperformers': []
        }
        
        # Availability analysis
        for service, metrics in service_availability.items():
            availability = metrics.get('availability_percent', 0)
            analysis['availability_summary'][service] = {
                'availability': availability,
                'status': 'excellent' if availability >= 99 else 'good' if availability >= 95 else 'poor',
                'total_checks': metrics.get('total_checks', 0),
                'failed_checks': metrics.get('unhealthy_checks', 0)
            }
            
            # Categorize services
            if availability >= 99:
                analysis['top_performers'].append(service)
            elif availability < 95:
                analysis['underperformers'].append(service)
        
        # Response time analysis
        response_times = performance_metrics.get('response_times', {})
        for service, times in response_times.items():
            if isinstance(times, dict):
                avg_time = times.get('avg', 0)
                analysis['response_time_summary'][service] = {
                    'average_ms': avg_time,
                    'min_ms': times.get('min', 0),
                    'max_ms': times.get('max', 0),
                    'status': 'fast' if avg_time < 1000 else 'acceptable' if avg_time < 5000 else 'slow'
                }
        
        return analysis
    
    def analyze_resource_utilization(self, daily_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze resource utilization"""
        resource_usage = daily_summary.get('resource_usage', {})
        performance_metrics = daily_summary.get('performance_metrics', {})
        
        analysis = {
            'cpu_analysis': {},
            'memory_analysis': {},
            'disk_analysis': {},
            'efficiency_rating': 'unknown'
        }
        
        # CPU analysis
        cpu_metrics = performance_metrics.get('resource_usage', {}).get('cpu', {})
        if cpu_metrics:
            avg_cpu = cpu_metrics.get('avg', 0)
            max_cpu = cpu_metrics.get('max', 0)
            
            analysis['cpu_analysis'] = {
                'average_usage': avg_cpu,
                'peak_usage': max_cpu,
                'efficiency': 'excellent' if avg_cpu < 50 else 'good' if avg_cpu < 70 else 'poor',
                'recommendation': self.get_cpu_recommendation(avg_cpu, max_cpu)
            }
        
        # Memory analysis
        memory_metrics = performance_metrics.get('resource_usage', {}).get('memory', {})
        if memory_metrics:
            avg_memory = memory_metrics.get('avg', 0)
            max_memory = memory_metrics.get('max', 0)
            
            analysis['memory_analysis'] = {
                'average_usage': avg_memory,
                'peak_usage': max_memory,
                'efficiency': 'excellent' if avg_memory < 60 else 'good' if avg_memory < 80 else 'poor',
                'recommendation': self.get_memory_recommendation(avg_memory, max_memory)
            }
        
        # Overall efficiency rating
        cpu_eff = analysis['cpu_analysis'].get('efficiency', 'unknown')
        memory_eff = analysis['memory_analysis'].get('efficiency', 'unknown')
        
        if cpu_eff == 'excellent' and memory_eff == 'excellent':
            analysis['efficiency_rating'] = 'excellent'
        elif cpu_eff in ['excellent', 'good'] and memory_eff in ['excellent', 'good']:
            analysis['efficiency_rating'] = 'good'
        else:
            analysis['efficiency_rating'] = 'needs_improvement'
        
        return analysis
    
    def analyze_alerts(self, daily_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze alert patterns"""
        alert_summary = daily_summary.get('alert_summary', {})
        
        analysis = {
            'alert_distribution': alert_summary.get('by_severity', {}),
            'service_alert_distribution': alert_summary.get('by_service', {}),
            'alert_frequency': alert_summary.get('alert_frequency', 0),
            'most_common_alerts': alert_summary.get('most_common_alerts', {}),
            'alert_trends': 'stable'  # This would need historical data to determine
        }
        
        # Determine alert severity level
        total_alerts = alert_summary.get('total_alerts', 0)
        critical_alerts = alert_summary.get('by_severity', {}).get('critical', 0)
        
        if critical_alerts > 0:
            analysis['severity_assessment'] = 'high'
        elif total_alerts > 10:
            analysis['severity_assessment'] = 'medium'
        else:
            analysis['severity_assessment'] = 'low'
        
        return analysis
    
    def analyze_trends(self, daily_summary: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze trends from the summary"""
        trends = daily_summary.get('trends', {})
        
        analysis = {
            'health_trend': trends.get('overall_health_trend', 'stable'),
            'resource_trends': trends.get('resource_trends', {}),
            'service_trends': trends.get('service_trends', {}),
            'predictions': []
        }
        
        # Generate predictions based on trends
        if trends.get('resource_trends', {}).get('cpu') == 'increasing':
            analysis['predictions'].append("CPU usage trending upward - may need scaling soon")
        
        if trends.get('resource_trends', {}).get('memory') == 'increasing':
            analysis['predictions'].append("Memory usage trending upward - monitor for potential issues")
        
        if trends.get('overall_health_trend') == 'degrading':
            analysis['predictions'].append("System health showing degradation trend - investigate root causes")
        
        return analysis
    
    def get_cpu_recommendation(self, avg_cpu: float, max_cpu: float) -> str:
        """Get CPU usage recommendation"""
        if max_cpu > 95:
            return "Critical: CPU reached maximum capacity - immediate scaling required"
        elif avg_cpu > 80:
            return "High: Consider CPU scaling or performance optimization"
        elif avg_cpu < 30:
            return "Low: CPU resources may be over-provisioned - consider downsizing"
        else:
            return "Optimal: CPU usage is within acceptable range"
    
    def get_memory_recommendation(self, avg_memory: float, max_memory: float) -> str:
        """Get memory usage recommendation"""
        if max_memory > 95:
            return "Critical: Memory reached maximum capacity - immediate scaling required"
        elif avg_memory > 85:
            return "High: Consider memory scaling or optimization"
        elif avg_memory < 40:
            return "Low: Memory resources may be over-provisioned - consider downsizing"
        else:
            return "Optimal: Memory usage is within acceptable range"
    
    def generate_recommendations(self, daily_summary: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate actionable recommendations"""
        if not daily_summary:
            return []
        
        recommendations = []
        
        # Get existing recommendations from summary
        existing_recommendations = daily_summary.get('recommendations', [])
        for rec in existing_recommendations:
            recommendations.append({
                'category': 'general',
                'priority': 'medium',
                'recommendation': rec,
                'rationale': 'Based on system analysis'
            })
        
        # Add specific recommendations based on analysis
        service_availability = daily_summary.get('service_availability', {})
        for service, metrics in service_availability.items():
            availability = metrics.get('availability_percent', 0)
            if availability < 95:
                recommendations.append({
                    'category': 'availability',
                    'priority': 'high',
                    'recommendation': f"Investigate and improve {service} reliability (current: {availability:.1f}%)",
                    'rationale': f"Service availability below 95% threshold"
                })
        
        # Resource-based recommendations
        performance_metrics = daily_summary.get('performance_metrics', {})
        resource_usage = performance_metrics.get('resource_usage', {})
        
        cpu_metrics = resource_usage.get('cpu', {})
        if cpu_metrics.get('avg', 0) > 80:
            recommendations.append({
                'category': 'performance',
                'priority': 'high',
                'recommendation': "Scale CPU resources or optimize application performance",
                'rationale': f"Average CPU usage is {cpu_metrics.get('avg', 0):.1f}%"
            })
        
        memory_metrics = resource_usage.get('memory', {})
        if memory_metrics.get('avg', 0) > 85:
            recommendations.append({
                'category': 'performance',
                'priority': 'high',
                'recommendation': "Scale memory resources or optimize memory usage",
                'rationale': f"Average memory usage is {memory_metrics.get('avg', 0):.1f}%"
            })
        
        # Alert-based recommendations
        alert_summary = daily_summary.get('alert_summary', {})
        if alert_summary.get('total_alerts', 0) > 20:
            recommendations.append({
                'category': 'monitoring',
                'priority': 'medium',
                'recommendation': "Review alert thresholds and reduce noise",
                'rationale': f"High alert volume: {alert_summary.get('total_alerts', 0)} alerts in 24 hours"
            })
        
        return recommendations
    
    def generate_appendix(self, daily_summary: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate appendix with detailed data"""
        if not daily_summary:
            return {}
        
        appendix = {
            'raw_metrics': daily_summary.get('performance_metrics', {}),
            'detailed_service_stats': daily_summary.get('service_availability', {}),
            'complete_alert_list': daily_summary.get('alert_summary', {}),
            'system_configuration': {
                'monitoring_interval': '5 minutes',
                'retention_period': '30 days',
                'alert_thresholds': {
                    'cpu_warning': '80%',
                    'cpu_critical': '95%',
                    'memory_warning': '85%',
                    'memory_critical': '95%',
                    'disk_warning': '80%',
                    'disk_critical': '90%'
                }
            }
        }
        
        return appendix
    
    def generate_html_report(self, report: Dict[str, Any]) -> str:
        """Generate HTML version of the report"""
        executive_summary = report.get('executive_summary', {})
        detailed_analysis = report.get('detailed_analysis', {})
        recommendations = report.get('recommendations', [])
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>God Bless Platform - Daily Health Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .section {{ margin: 20px 0; }}
                .metric {{ display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }}
                .status-healthy {{ color: green; }}
                .status-warning {{ color: orange; }}
                .status-critical {{ color: red; }}
                .recommendation {{ background-color: #f9f9f9; padding: 10px; margin: 5px 0; border-left: 4px solid #007cba; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>God Bless Platform - Daily Health Report</h1>
                <p><strong>Report Date:</strong> {report.get('report_date', 'Unknown')}</p>
                <p><strong>Generated:</strong> {report.get('generated_at', 'Unknown')}</p>
            </div>
            
            <div class="section">
                <h2>Executive Summary</h2>
                <div class="metric">
                    <strong>Overall Status:</strong> 
                    <span class="status-{executive_summary.get('overall_status', 'unknown')}">{executive_summary.get('overall_status', 'Unknown').upper()}</span>
                </div>
                <div class="metric">
                    <strong>Average Availability:</strong> {executive_summary.get('key_metrics', {}).get('average_availability', 0)}%
                </div>
                <div class="metric">
                    <strong>Total Alerts:</strong> {executive_summary.get('key_metrics', {}).get('total_alerts', 0)}
                </div>
                <div class="metric">
                    <strong>Critical Alerts:</strong> {executive_summary.get('key_metrics', {}).get('critical_alerts', 0)}
                </div>
            </div>
            
            <div class="section">
                <h2>Service Performance</h2>
                <table>
                    <tr>
                        <th>Service</th>
                        <th>Availability</th>
                        <th>Status</th>
                        <th>Failed Checks</th>
                    </tr>
        """
        
        # Add service performance table
        service_performance = detailed_analysis.get('service_performance', {}).get('availability_summary', {})
        for service, metrics in service_performance.items():
            html += f"""
                    <tr>
                        <td>{service}</td>
                        <td>{metrics.get('availability', 0):.2f}%</td>
                        <td class="status-{metrics.get('status', 'unknown')}">{metrics.get('status', 'Unknown').upper()}</td>
                        <td>{metrics.get('failed_checks', 0)}</td>
                    </tr>
            """
        
        html += """
                </table>
            </div>
            
            <div class="section">
                <h2>Recommendations</h2>
        """
        
        # Add recommendations
        for rec in recommendations:
            priority_class = f"priority-{rec.get('priority', 'medium')}"
            html += f"""
                <div class="recommendation {priority_class}">
                    <strong>[{rec.get('priority', 'Medium').upper()}]</strong> {rec.get('recommendation', '')}
                    <br><small><em>Rationale: {rec.get('rationale', '')}</em></small>
                </div>
            """
        
        html += """
            </div>
            
            <div class="section">
                <h2>Resource Utilization</h2>
        """
        
        # Add resource utilization
        resource_analysis = detailed_analysis.get('resource_utilization', {})
        cpu_analysis = resource_analysis.get('cpu_analysis', {})
        memory_analysis = resource_analysis.get('memory_analysis', {})
        
        if cpu_analysis:
            html += f"""
                <div class="metric">
                    <strong>CPU Usage:</strong> Avg: {cpu_analysis.get('average_usage', 0):.1f}%, Peak: {cpu_analysis.get('peak_usage', 0):.1f}%
                    <br><small>Efficiency: {cpu_analysis.get('efficiency', 'Unknown')}</small>
                </div>
            """
        
        if memory_analysis:
            html += f"""
                <div class="metric">
                    <strong>Memory Usage:</strong> Avg: {memory_analysis.get('average_usage', 0):.1f}%, Peak: {memory_analysis.get('peak_usage', 0):.1f}%
                    <br><small>Efficiency: {memory_analysis.get('efficiency', 'Unknown')}</small>
                </div>
            """
        
        html += """
            </div>
            
            <div class="section">
                <p><small>This report was automatically generated by the God Bless Platform monitoring system.</small></p>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def send_email_report(self, report: Dict[str, Any]):
        """Send the daily report via email"""
        try:
            if not self.email_config['enabled']:
                logger.info("Email reporting is disabled")
                return
            
            if not self.email_config['to_emails'] or not self.email_config['to_emails'][0]:
                logger.warning("No email recipients configured for daily report")
                return
            
            # Generate HTML report
            html_content = self.generate_html_report(report)
            
            # Create email message
            msg = MimeMultipart('alternative')
            msg['From'] = self.email_config['from_email']
            msg['To'] = ', '.join(self.email_config['to_emails'])
            
            # Determine subject based on status
            executive_summary = report.get('executive_summary', {})
            overall_status = executive_summary.get('overall_status', 'unknown')
            status_emoji = {
                'healthy': '✅',
                'warning': '⚠️',
                'critical': '🚨',
                'unhealthy': '❌'
            }.get(overall_status, '❓')
            
            msg['Subject'] = f"{self.email_config['subject_prefix']} {status_emoji} {overall_status.upper()} - {report.get('report_date', 'Unknown')}"
            
            # Create plain text version
            plain_text = f"""
God Bless Platform - Daily Health Report
Report Date: {report.get('report_date', 'Unknown')}

EXECUTIVE SUMMARY
Overall Status: {overall_status.upper()}
Average Availability: {executive_summary.get('key_metrics', {}).get('average_availability', 0)}%
Total Alerts: {executive_summary.get('key_metrics', {}).get('total_alerts', 0)}
Critical Alerts: {executive_summary.get('key_metrics', {}).get('critical_alerts', 0)}

RECOMMENDATIONS
"""
            
            recommendations = report.get('recommendations', [])
            for i, rec in enumerate(recommendations[:5], 1):  # Top 5 recommendations
                plain_text += f"{i}. [{rec.get('priority', 'Medium').upper()}] {rec.get('recommendation', '')}\n"
            
            plain_text += f"\nFor detailed analysis, please view the HTML version of this report.\n"
            
            # Attach both versions
            msg.attach(MimeText(plain_text, 'plain'))
            msg.attach(MimeText(html_content, 'html'))
            
            # Attach JSON report as file
            json_attachment = MimeBase('application', 'json')
            json_attachment.set_payload(json.dumps(report, indent=2, default=str))
            encoders.encode_base64(json_attachment)
            json_attachment.add_header(
                'Content-Disposition',
                f'attachment; filename="daily_report_{report.get("report_date", "unknown")}.json"'
            )
            msg.attach(json_attachment)
            
            # Send email
            server = smtplib.SMTP(self.email_config['smtp_host'], self.email_config['smtp_port'])
            if self.email_config['use_tls']:
                server.starttls()
            
            if self.email_config['smtp_user'] and self.email_config['smtp_password']:
                server.login(self.email_config['smtp_user'], self.email_config['smtp_password'])
            
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Daily report email sent to {len(self.email_config['to_emails'])} recipients")
            
        except Exception as e:
            logger.error(f"Failed to send daily report email: {e}")


def main():
    """Main function to generate and send daily report"""
    reporter = DailyHealthReporter()
    
    # Generate report
    report = reporter.generate_daily_report()
    
    if report:
        # Send email report
        reporter.send_email_report(report)
        
        # Print summary
        executive_summary = report.get('executive_summary', {})
        print(f"Daily report generated for {report.get('report_date', 'unknown')}")
        print(f"Overall Status: {executive_summary.get('overall_status', 'unknown')}")
        print(f"Average Availability: {executive_summary.get('key_metrics', {}).get('average_availability', 0)}%")
        print(f"Total Alerts: {executive_summary.get('key_metrics', {}).get('total_alerts', 0)}")
        print(f"Recommendations: {len(report.get('recommendations', []))}")
    else:
        print("Failed to generate daily report")


if __name__ == '__main__':
    main()
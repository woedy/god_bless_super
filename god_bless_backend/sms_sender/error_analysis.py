"""
Error notification system with detailed failure analysis
Provides comprehensive error categorization and analysis for SMS campaigns
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Q
from .models import SMSMessage, RetryAttempt, ServerUsageLog

logger = logging.getLogger(__name__)


class ErrorAnalysisService:
    """Service for analyzing and categorizing SMS delivery errors"""
    
    # Error categories and their patterns
    ERROR_CATEGORIES = {
        'authentication': {
            'patterns': ['auth', 'login', 'credential', 'password', 'username'],
            'severity': 'high',
            'description': 'Authentication failures with servers'
        },
        'network': {
            'patterns': ['timeout', 'connection', 'network', 'unreachable', 'dns'],
            'severity': 'medium',
            'description': 'Network connectivity issues'
        },
        'rate_limiting': {
            'patterns': ['rate limit', 'throttle', 'quota', 'too many requests'],
            'severity': 'medium',
            'description': 'Rate limiting by carriers or servers'
        },
        'carrier_rejection': {
            'patterns': ['rejected', 'blocked', 'spam', 'invalid number', 'carrier'],
            'severity': 'low',
            'description': 'Message rejected by carrier'
        },
        'server_error': {
            'patterns': ['500', 'internal error', 'server error', 'unavailable'],
            'severity': 'high',
            'description': 'Server-side errors'
        },
        'configuration': {
            'patterns': ['config', 'setting', 'parameter', 'invalid format'],
            'severity': 'high',
            'description': 'Configuration or setup issues'
        },
        'temporary': {
            'patterns': ['temporary', 'retry', 'busy', 'try again'],
            'severity': 'low',
            'description': 'Temporary issues that may resolve automatically'
        }
    }
    
    def __init__(self, campaign_id: int = None):
        self.campaign_id = campaign_id
    
    def analyze_error(self, error_message: str, error_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Analyze a single error message and provide detailed analysis"""
        error_message_lower = error_message.lower()
        
        # Categorize the error
        category = self._categorize_error(error_message_lower)
        
        # Determine severity
        severity = self.ERROR_CATEGORIES[category]['severity']
        
        # Generate recommendations
        recommendations = self._generate_recommendations(category, error_message, error_context)
        
        # Check for patterns
        patterns = self._identify_patterns(error_message, error_context)
        
        return {
            'category': category,
            'severity': severity,
            'description': self.ERROR_CATEGORIES[category]['description'],
            'original_message': error_message,
            'recommendations': recommendations,
            'patterns': patterns,
            'timestamp': timezone.now().isoformat(),
            'context': error_context or {}
        }
    
    def analyze_campaign_errors(self, campaign_id: int = None) -> Dict[str, Any]:
        """Analyze all errors for a campaign and provide comprehensive report"""
        target_campaign_id = campaign_id or self.campaign_id
        
        if not target_campaign_id:
            return {'error': 'No campaign ID provided'}
        
        # Get all failed messages for the campaign
        failed_messages = SMSMessage.objects.filter(
            campaign_id=target_campaign_id,
            delivery_status='failed'
        ).exclude(error_message='')
        
        # Analyze error patterns
        error_analysis = self._analyze_error_patterns(failed_messages)
        
        # Get retry analysis
        retry_analysis = self._analyze_retry_patterns(target_campaign_id)
        
        # Server failure analysis
        server_analysis = self._analyze_server_failures(target_campaign_id)
        
        # Time-based analysis
        time_analysis = self._analyze_error_timeline(failed_messages)
        
        # Generate overall recommendations
        overall_recommendations = self._generate_campaign_recommendations(
            error_analysis, retry_analysis, server_analysis
        )
        
        return {
            'campaign_id': target_campaign_id,
            'total_failed_messages': failed_messages.count(),
            'error_patterns': error_analysis,
            'retry_analysis': retry_analysis,
            'server_analysis': server_analysis,
            'timeline_analysis': time_analysis,
            'recommendations': overall_recommendations,
            'analysis_timestamp': timezone.now().isoformat()
        }
    
    def get_error_trends(self, days: int = 7) -> Dict[str, Any]:
        """Analyze error trends over time"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Get failed messages in the time period
        failed_messages = SMSMessage.objects.filter(
            created_at__gte=start_date,
            delivery_status='failed'
        ).exclude(error_message='')
        
        if self.campaign_id:
            failed_messages = failed_messages.filter(campaign_id=self.campaign_id)
        
        # Group by day and error category
        daily_errors = {}
        category_trends = {}
        
        for message in failed_messages:
            day = message.created_at.date().isoformat()
            category = self._categorize_error(message.error_message.lower())
            
            if day not in daily_errors:
                daily_errors[day] = {'total': 0, 'categories': {}}
            
            daily_errors[day]['total'] += 1
            daily_errors[day]['categories'][category] = daily_errors[day]['categories'].get(category, 0) + 1
            
            category_trends[category] = category_trends.get(category, 0) + 1
        
        return {
            'period_days': days,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'daily_breakdown': daily_errors,
            'category_trends': category_trends,
            'total_errors': failed_messages.count()
        }
    
    def _categorize_error(self, error_message: str) -> str:
        """Categorize an error message based on patterns"""
        for category, config in self.ERROR_CATEGORIES.items():
            for pattern in config['patterns']:
                if pattern in error_message:
                    return category
        
        return 'unknown'
    
    def _generate_recommendations(self, category: str, error_message: str, 
                                context: Dict[str, Any] = None) -> List[str]:
        """Generate specific recommendations based on error category"""
        recommendations = []
        
        if category == 'authentication':
            recommendations.extend([
                "Verify SMTP server credentials are correct",
                "Check if passwords have expired or been changed",
                "Ensure proxy authentication is properly configured",
                "Test server connections manually"
            ])
        
        elif category == 'network':
            recommendations.extend([
                "Check network connectivity to servers",
                "Verify firewall settings allow outbound connections",
                "Consider using different proxy servers",
                "Increase connection timeout settings"
            ])
        
        elif category == 'rate_limiting':
            recommendations.extend([
                "Reduce sending rate in campaign settings",
                "Implement longer delays between messages",
                "Distribute load across more SMTP servers",
                "Check carrier-specific rate limits"
            ])
        
        elif category == 'carrier_rejection':
            recommendations.extend([
                "Review message content for spam indicators",
                "Verify phone numbers are valid and active",
                "Check if sender domain is blacklisted",
                "Consider using different SMTP servers"
            ])
        
        elif category == 'server_error':
            recommendations.extend([
                "Check server status and availability",
                "Review server logs for detailed error information",
                "Consider switching to backup servers",
                "Contact server provider if issues persist"
            ])
        
        elif category == 'configuration':
            recommendations.extend([
                "Review campaign configuration settings",
                "Verify server settings are correct",
                "Check message format and encoding",
                "Validate all required parameters are set"
            ])
        
        elif category == 'temporary':
            recommendations.extend([
                "Enable automatic retry for failed messages",
                "Increase retry delays for temporary failures",
                "Monitor if issues resolve automatically",
                "Consider pausing campaign briefly"
            ])
        
        else:
            recommendations.extend([
                "Review error message for specific details",
                "Check server and network connectivity",
                "Consider contacting technical support",
                "Enable detailed logging for more information"
            ])
        
        return recommendations
    
    def _analyze_error_patterns(self, failed_messages) -> Dict[str, Any]:
        """Analyze patterns in failed messages"""
        error_categories = {}
        server_errors = {}
        carrier_errors = {}
        
        for message in failed_messages:
            # Categorize error
            category = self._categorize_error(message.error_message.lower())
            error_categories[category] = error_categories.get(category, 0) + 1
            
            # Track server-specific errors
            if message.smtp_server:
                server_key = f"smtp_{message.smtp_server.id}"
                if server_key not in server_errors:
                    server_errors[server_key] = {'total': 0, 'categories': {}}
                server_errors[server_key]['total'] += 1
                server_errors[server_key]['categories'][category] = server_errors[server_key]['categories'].get(category, 0) + 1
            
            # Track carrier-specific errors
            if message.carrier:
                if message.carrier not in carrier_errors:
                    carrier_errors[message.carrier] = {'total': 0, 'categories': {}}
                carrier_errors[message.carrier]['total'] += 1
                carrier_errors[message.carrier]['categories'][category] = carrier_errors[message.carrier]['categories'].get(category, 0) + 1
        
        return {
            'error_categories': error_categories,
            'server_specific_errors': server_errors,
            'carrier_specific_errors': carrier_errors
        }
    
    def _analyze_retry_patterns(self, campaign_id: int) -> Dict[str, Any]:
        """Analyze retry patterns for the campaign"""
        retry_attempts = RetryAttempt.objects.filter(
            message__campaign_id=campaign_id
        )
        
        # Retry success rates by error type
        retry_by_error = retry_attempts.values('error_type').annotate(
            total_retries=Count('id'),
            successful_retries=Count('id', filter=Q(success=True))
        )
        
        retry_success_rates = {}
        for item in retry_by_error:
            error_type = item['error_type']
            total = item['total_retries']
            successful = item['successful_retries']
            success_rate = (successful / total * 100) if total > 0 else 0
            
            retry_success_rates[error_type] = {
                'total_retries': total,
                'successful_retries': successful,
                'success_rate': success_rate
            }
        
        return {
            'total_retry_attempts': retry_attempts.count(),
            'retry_success_by_error_type': retry_success_rates,
            'pending_retries': retry_attempts.filter(completed=False).count()
        }
    
    def _analyze_server_failures(self, campaign_id: int) -> Dict[str, Any]:
        """Analyze server-specific failure patterns"""
        server_usage = ServerUsageLog.objects.filter(campaign_id=campaign_id)
        
        server_performance = {}
        for usage in server_usage:
            server_key = f"{usage.server_type}_{usage.server_id}"
            success_rate = usage.get_success_rate()
            
            server_performance[server_key] = {
                'server_type': usage.server_type,
                'server_id': usage.server_id,
                'messages_processed': usage.messages_processed,
                'successful_messages': usage.successful_messages,
                'failed_messages': usage.failed_messages,
                'success_rate': success_rate,
                'average_response_time': usage.average_response_time
            }
        
        return server_performance
    
    def _analyze_error_timeline(self, failed_messages) -> Dict[str, Any]:
        """Analyze when errors occurred during the campaign"""
        if not failed_messages.exists():
            return {}
        
        # Group errors by hour
        hourly_errors = {}
        for message in failed_messages:
            hour = message.created_at.replace(minute=0, second=0, microsecond=0)
            hour_key = hour.isoformat()
            
            if hour_key not in hourly_errors:
                hourly_errors[hour_key] = {'total': 0, 'categories': {}}
            
            category = self._categorize_error(message.error_message.lower())
            hourly_errors[hour_key]['total'] += 1
            hourly_errors[hour_key]['categories'][category] = hourly_errors[hour_key]['categories'].get(category, 0) + 1
        
        return {
            'hourly_breakdown': hourly_errors,
            'peak_error_hour': max(hourly_errors.items(), key=lambda x: x[1]['total'])[0] if hourly_errors else None
        }
    
    def _generate_campaign_recommendations(self, error_analysis: Dict, 
                                         retry_analysis: Dict, 
                                         server_analysis: Dict) -> List[str]:
        """Generate overall recommendations for the campaign"""
        recommendations = []
        
        # Analyze error categories
        error_categories = error_analysis.get('error_categories', {})
        if error_categories:
            most_common_error = max(error_categories.items(), key=lambda x: x[1])
            recommendations.extend(
                self._generate_recommendations(most_common_error[0], "")
            )
        
        # Server performance recommendations
        for server_key, performance in server_analysis.items():
            if performance['success_rate'] < 50:
                recommendations.append(
                    f"Consider disabling {performance['server_type']} server {performance['server_id']} "
                    f"due to low success rate ({performance['success_rate']:.1f}%)"
                )
        
        # Retry recommendations
        if retry_analysis.get('pending_retries', 0) > 0:
            recommendations.append(
                f"Monitor {retry_analysis['pending_retries']} pending retry attempts"
            )
        
        return list(set(recommendations))  # Remove duplicates
    
    def _identify_patterns(self, error_message: str, context: Dict[str, Any] = None) -> List[str]:
        """Identify specific patterns in the error"""
        patterns = []
        
        error_lower = error_message.lower()
        
        # Common patterns
        if 'timeout' in error_lower:
            patterns.append('connection_timeout')
        
        if any(code in error_message for code in ['550', '551', '552', '553']):
            patterns.append('smtp_rejection')
        
        if 'authentication' in error_lower or 'auth' in error_lower:
            patterns.append('authentication_failure')
        
        if 'rate' in error_lower and 'limit' in error_lower:
            patterns.append('rate_limiting')
        
        if context:
            # Check for server-specific patterns
            if context.get('server_type') == 'smtp' and 'connection' in error_lower:
                patterns.append('smtp_connection_issue')
            
            if context.get('server_type') == 'proxy' and 'proxy' in error_lower:
                patterns.append('proxy_configuration_issue')
        
        return patterns
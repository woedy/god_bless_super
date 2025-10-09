"""
Predictive Analytics Service for SMS Campaign Optimization

This service provides machine learning algorithms for server performance prediction,
optimization recommendations, and anomaly detection for SMS delivery patterns.
"""

import logging
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from collections import defaultdict

from django.db.models import Avg, Count, Q, F
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import (
    SMSCampaign, SMSMessage, ServerUsageLog, CarrierPerformanceLog, 
    RetryAttempt, CampaignDeliverySettings
)
from proxy_server.models import ProxyServer
from smtps.models import SmtpManager

User = get_user_model()
logger = logging.getLogger(__name__)


class PredictiveAnalyticsService:
    """
    Machine learning service for server performance prediction and optimization
    """
    
    def __init__(self, user: User):
        self.user = user
        self.logger = logger
        
        # Configuration for prediction algorithms
        self.failure_threshold = 0.3  # 30% failure rate threshold
        self.performance_window_days = 7  # Days to look back for performance data
        self.anomaly_threshold = 2.0  # Standard deviations for anomaly detection
        self.min_data_points = 10  # Minimum data points for reliable predictions
        
    def predict_server_failure(self, server_id: int, server_type: str) -> float:
        """
        Predict the probability of server failure using historical performance data
        
        Args:
            server_id: ID of the server (proxy or SMTP)
            server_type: Type of server ('proxy' or 'smtp')
            
        Returns:
            Float between 0.0 and 1.0 representing failure probability
        """
        try:
            # Get recent performance data
            recent_logs = self._get_recent_server_logs(server_id, server_type)
            
            if len(recent_logs) < self.min_data_points:
                self.logger.warning(f"Insufficient data for {server_type} server {server_id} prediction")
                return 0.5  # Default moderate risk
            
            # Calculate failure rate trend
            failure_rates = []
            for log in recent_logs:
                if log.messages_processed > 0:
                    failure_rate = log.failed_messages / log.messages_processed
                    failure_rates.append(failure_rate)
            
            if not failure_rates:
                return 0.5
            
            # Analyze trend using simple linear regression
            current_failure_rate = failure_rates[-1] if failure_rates else 0
            avg_failure_rate = statistics.mean(failure_rates)
            
            # Calculate trend (increasing failure rate = higher risk)
            if len(failure_rates) >= 3:
                recent_trend = statistics.mean(failure_rates[-3:])
                older_trend = statistics.mean(failure_rates[:-3]) if len(failure_rates) > 3 else avg_failure_rate
                trend_factor = max(0, (recent_trend - older_trend) * 2)  # Amplify trend
            else:
                trend_factor = 0
            
            # Calculate response time degradation
            response_times = [log.average_response_time for log in recent_logs if log.average_response_time]
            response_time_factor = 0
            
            if len(response_times) >= 3:
                recent_response_time = statistics.mean(response_times[-3:])
                baseline_response_time = statistics.mean(response_times[:3])
                if baseline_response_time > 0:
                    response_time_factor = max(0, (recent_response_time - baseline_response_time) / baseline_response_time)
            
            # Combine factors for final prediction
            base_risk = min(1.0, current_failure_rate * 2)  # Current failure rate weighted
            trend_risk = min(0.3, trend_factor)  # Trend contribution (max 30%)
            response_risk = min(0.2, response_time_factor * 0.5)  # Response time contribution (max 20%)
            
            failure_probability = min(1.0, base_risk + trend_risk + response_risk)
            
            self.logger.info(f"Predicted failure probability for {server_type} server {server_id}: {failure_probability:.3f}")
            return failure_probability
            
        except Exception as e:
            self.logger.error(f"Error predicting server failure: {e}")
            return 0.5  # Default moderate risk on error
    
    def recommend_server_configuration(self, campaign_type: str = 'general') -> Dict[str, Any]:
        """
        Generate optimization recommendations based on historical performance
        
        Args:
            campaign_type: Type of campaign ('marketing', 'alerts', 'notifications', 'general')
            
        Returns:
            Dictionary containing optimization recommendations
        """
        try:
            recommendations = {
                'proxy_strategy': 'round_robin',
                'smtp_strategy': 'round_robin',
                'delay_settings': {'min': 1, 'max': 5},
                'batch_size': 100,
                'rate_limit': 10,
                'confidence_score': 0.0,
                'reasoning': []
            }
            
            # Analyze historical campaign performance
            recent_campaigns = SMSCampaign.objects.filter(
                user=self.user,
                created_at__gte=timezone.now() - timedelta(days=30),
                status='completed'
            ).select_related('delivery_settings')
            
            if not recent_campaigns.exists():
                recommendations['reasoning'].append("No historical data available, using default settings")
                return recommendations
            
            # Analyze successful campaigns
            successful_campaigns = recent_campaigns.filter(
                messages_delivered__gt=F('total_recipients') * 0.8  # 80% success rate
            )
            
            if successful_campaigns.exists():
                # Analyze proxy strategies
                proxy_performance = defaultdict(list)
                smtp_performance = defaultdict(list)
                
                for campaign in successful_campaigns:
                    if hasattr(campaign, 'delivery_settings'):
                        settings = campaign.delivery_settings
                        success_rate = (campaign.messages_delivered / campaign.total_recipients) if campaign.total_recipients > 0 else 0
                        
                        proxy_performance[settings.proxy_rotation_strategy].append(success_rate)
                        smtp_performance[settings.smtp_rotation_strategy].append(success_rate)
                
                # Recommend best performing strategies
                if proxy_performance:
                    best_proxy_strategy = max(proxy_performance.keys(), 
                                            key=lambda k: statistics.mean(proxy_performance[k]))
                    recommendations['proxy_strategy'] = best_proxy_strategy
                    recommendations['reasoning'].append(f"Proxy strategy '{best_proxy_strategy}' shows best performance")
                
                if smtp_performance:
                    best_smtp_strategy = max(smtp_performance.keys(), 
                                           key=lambda k: statistics.mean(smtp_performance[k]))
                    recommendations['smtp_strategy'] = best_smtp_strategy
                    recommendations['reasoning'].append(f"SMTP strategy '{best_smtp_strategy}' shows best performance")
            
            # Only analyze carrier timing if we have historical data
            if recent_campaigns.exists():
                carrier_data = self._analyze_carrier_timing_patterns()
                if carrier_data:
                    optimal_delays = carrier_data.get('optimal_delays', {})
                    if optimal_delays:
                        recommendations['delay_settings'] = optimal_delays
                        recommendations['reasoning'].append("Delay settings optimized based on carrier performance")
            
            # Calculate confidence score
            data_points = len(recent_campaigns)
            recommendations['confidence_score'] = min(1.0, data_points / 20)  # Max confidence at 20+ campaigns
            
            return recommendations
            
        except Exception as e:
            self.logger.error(f"Error generating recommendations: {e}")
            return recommendations
    
    def generate_optimization_suggestions(self) -> List[Dict[str, Any]]:
        """
        Generate system-wide optimization suggestions based on all user data
        
        Returns:
            List of optimization suggestions with priority and impact estimates
        """
        try:
            suggestions = []
            
            # Analyze server health across all campaigns
            server_health_issues = self._analyze_server_health_issues()
            for issue in server_health_issues:
                suggestions.append({
                    'type': 'server_health',
                    'priority': 'high' if issue['failure_risk'] > 0.7 else 'medium',
                    'title': f"Server Health Alert: {issue['server_type']} Server {issue['server_id']}",
                    'description': issue['description'],
                    'impact': issue['impact'],
                    'action': issue['recommended_action']
                })
            
            # Analyze configuration optimization opportunities
            config_suggestions = self._analyze_configuration_opportunities()
            suggestions.extend(config_suggestions)
            
            # Analyze carrier performance issues
            carrier_suggestions = self._analyze_carrier_performance_issues()
            suggestions.extend(carrier_suggestions)
            
            # Sort by priority and impact
            priority_order = {'high': 3, 'medium': 2, 'low': 1}
            suggestions.sort(key=lambda x: (priority_order.get(x['priority'], 0), x.get('impact', 0)), reverse=True)
            
            return suggestions[:10]  # Return top 10 suggestions
            
        except Exception as e:
            self.logger.error(f"Error generating optimization suggestions: {e}")
            return []
    
    def detect_anomalies(self, campaign_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Detect anomalies in delivery patterns using statistical analysis
        
        Args:
            campaign_id: Optional specific campaign to analyze, otherwise analyze all recent campaigns
            
        Returns:
            List of detected anomalies with severity and recommendations
        """
        try:
            anomalies = []
            
            if campaign_id:
                campaigns = SMSCampaign.objects.filter(id=campaign_id, user=self.user)
            else:
                campaigns = SMSCampaign.objects.filter(
                    user=self.user,
                    created_at__gte=timezone.now() - timedelta(days=7)
                )
            
            for campaign in campaigns:
                campaign_anomalies = self._detect_campaign_anomalies(campaign)
                anomalies.extend(campaign_anomalies)
            
            return anomalies
            
        except Exception as e:
            self.logger.error(f"Error detecting anomalies: {e}")
            return []
    
    def forecast_completion_time(self, campaign_id: int) -> Dict[str, Any]:
        """
        Forecast campaign completion time based on current performance
        
        Args:
            campaign_id: ID of the campaign to forecast
            
        Returns:
            Dictionary containing completion time predictions
        """
        try:
            campaign = SMSCampaign.objects.get(id=campaign_id, user=self.user)
            
            if campaign.status not in ['in_progress', 'scheduled']:
                return {'error': 'Campaign is not active'}
            
            # Calculate current processing rate
            messages_sent = campaign.messages_sent
            remaining_messages = campaign.total_recipients - messages_sent
            
            if messages_sent == 0:
                return {'error': 'No messages sent yet, cannot forecast'}
            
            # Calculate time elapsed and rate
            if campaign.started_at:
                elapsed_time = (timezone.now() - campaign.started_at).total_seconds()
                current_rate = messages_sent / elapsed_time if elapsed_time > 0 else 0  # messages per second
            else:
                return {'error': 'Campaign start time not available'}
            
            if current_rate == 0:
                return {'error': 'No processing rate detected'}
            
            # Basic forecast
            estimated_seconds_remaining = remaining_messages / current_rate
            estimated_completion = timezone.now() + timedelta(seconds=estimated_seconds_remaining)
            
            # Adjust for server performance trends
            server_performance_factor = self._calculate_server_performance_trend(campaign)
            adjusted_seconds = estimated_seconds_remaining * server_performance_factor
            adjusted_completion = timezone.now() + timedelta(seconds=adjusted_seconds)
            
            return {
                'current_rate': current_rate * 60,  # messages per minute
                'messages_remaining': remaining_messages,
                'basic_forecast': estimated_completion.isoformat(),
                'adjusted_forecast': adjusted_completion.isoformat(),
                'confidence': min(1.0, messages_sent / 100),  # Higher confidence with more data
                'performance_factor': server_performance_factor
            }
            
        except SMSCampaign.DoesNotExist:
            return {'error': 'Campaign not found'}
        except Exception as e:
            self.logger.error(f"Error forecasting completion time: {e}")
            return {'error': str(e)}
    
    def analyze_campaign_performance(self, campaign_id: int) -> Dict[str, Any]:
        """
        Analyze performance of a specific campaign with predictive insights
        
        Args:
            campaign_id: ID of the campaign to analyze
            
        Returns:
            Dictionary containing performance analysis and predictions
        """
        try:
            campaign = SMSCampaign.objects.get(id=campaign_id, user=self.user)
            
            analysis = {
                'campaign_id': campaign_id,
                'performance_score': 0.0,
                'bottlenecks': [],
                'optimization_opportunities': [],
                'predicted_improvements': {},
                'server_performance': {},
                'carrier_insights': {}
            }
            
            # Calculate overall performance score
            if campaign.total_recipients > 0:
                delivery_rate = campaign.messages_delivered / campaign.total_recipients
                speed_score = self._calculate_speed_score(campaign)
                error_rate = campaign.messages_failed / campaign.total_recipients
                
                analysis['performance_score'] = (delivery_rate * 0.6 + speed_score * 0.3 + (1 - error_rate) * 0.1)
            
            # Analyze server performance
            server_logs = ServerUsageLog.objects.filter(campaign=campaign)
            for log in server_logs:
                server_key = f"{log.server_type}_{log.server_id}"
                analysis['server_performance'][server_key] = {
                    'success_rate': log.get_success_rate(),
                    'avg_response_time': log.average_response_time,
                    'messages_processed': log.messages_processed,
                    'failure_prediction': self.predict_server_failure(log.server_id, log.server_type)
                }
            
            # Identify bottlenecks
            analysis['bottlenecks'] = self._identify_bottlenecks(campaign)
            
            # Generate optimization opportunities
            analysis['optimization_opportunities'] = self._generate_optimization_opportunities(campaign)
            
            # Predict improvements with different configurations
            analysis['predicted_improvements'] = self._predict_configuration_improvements(campaign)
            
            return analysis
            
        except SMSCampaign.DoesNotExist:
            self.logger.error(f"Campaign {campaign_id} not found for user {self.user.id}")
            return {'error': 'Campaign not found'}
        except Exception as e:
            self.logger.error(f"Error analyzing campaign performance: {e}")
            return {'error': str(e)}
    
    # Private helper methods
    
    def _get_recent_server_logs(self, server_id: int, server_type: str) -> List[ServerUsageLog]:
        """Get recent server usage logs for analysis"""
        cutoff_date = timezone.now() - timedelta(days=self.performance_window_days)
        return list(ServerUsageLog.objects.filter(
            server_id=server_id,
            server_type=server_type,
            campaign__user=self.user,
            last_used__gte=cutoff_date
        ).order_by('last_used'))
    
    def _analyze_carrier_timing_patterns(self) -> Dict[str, Any]:
        """Analyze optimal timing patterns for different carriers"""
        # This would analyze historical data to find optimal send times
        return {
            'optimal_delays': {'min': 2, 'max': 8},
            'peak_hours': [9, 10, 11, 14, 15, 16],
            'carrier_preferences': {}
        }
    
    def _analyze_server_health_issues(self) -> List[Dict[str, Any]]:
        """Analyze server health issues across all user campaigns"""
        issues = []
        
        # Get all servers used by this user
        proxy_servers = ProxyServer.objects.filter(user=self.user)
        smtp_servers = SmtpManager.objects.filter(user=self.user)
        
        for proxy in proxy_servers:
            failure_risk = self.predict_server_failure(proxy.id, 'proxy')
            if failure_risk > 0.5:
                issues.append({
                    'server_type': 'proxy',
                    'server_id': proxy.id,
                    'failure_risk': failure_risk,
                    'description': f"Proxy server {proxy.host}:{proxy.port} showing degraded performance",
                    'impact': failure_risk * 100,
                    'recommended_action': 'Check server health and consider replacement'
                })
        
        for smtp in smtp_servers:
            failure_risk = self.predict_server_failure(smtp.id, 'smtp')
            if failure_risk > 0.5:
                issues.append({
                    'server_type': 'smtp',
                    'server_id': smtp.id,
                    'failure_risk': failure_risk,
                    'description': f"SMTP server {smtp.smtp_server}:{smtp.smtp_port} showing degraded performance",
                    'impact': failure_risk * 100,
                    'recommended_action': 'Check SMTP configuration and credentials'
                })
        
        return issues
    
    def _analyze_configuration_opportunities(self) -> List[Dict[str, Any]]:
        """Analyze configuration optimization opportunities"""
        suggestions = []
        
        # Analyze recent campaigns for common issues
        recent_campaigns = SMSCampaign.objects.filter(
            user=self.user,
            created_at__gte=timezone.now() - timedelta(days=30)
        )
        
        low_success_campaigns = recent_campaigns.filter(
            total_recipients__gt=0
        ).annotate(
            success_rate=F('messages_delivered') * 100.0 / F('total_recipients')
        ).filter(success_rate__lt=80)
        
        if low_success_campaigns.count() > recent_campaigns.count() * 0.3:  # 30% of campaigns have low success
            suggestions.append({
                'type': 'configuration',
                'priority': 'high',
                'title': 'Low Success Rate Detected',
                'description': 'Multiple campaigns showing success rates below 80%',
                'impact': 85,
                'action': 'Review server configurations and enable adaptive optimization'
            })
        
        return suggestions
    
    def _analyze_carrier_performance_issues(self) -> List[Dict[str, Any]]:
        """Analyze carrier-specific performance issues"""
        suggestions = []
        
        # Find carriers with consistently poor performance
        poor_carriers = CarrierPerformanceLog.objects.filter(
            proxy_server__user=self.user,
            success_rate__lt=70,  # Less than 70% success rate
            messages_sent__gte=50  # Minimum 50 messages for statistical significance
        ).values('carrier').annotate(
            avg_success_rate=Avg('success_rate')
        ).filter(avg_success_rate__lt=70)
        
        for carrier_data in poor_carriers:
            suggestions.append({
                'type': 'carrier_performance',
                'priority': 'medium',
                'title': f'Poor Performance for {carrier_data["carrier"]}',
                'description': f'Carrier showing {carrier_data["avg_success_rate"]:.1f}% success rate',
                'impact': 100 - carrier_data["avg_success_rate"],
                'action': f'Review server combinations for {carrier_data["carrier"]} or adjust targeting'
            })
        
        return suggestions
    
    def _detect_campaign_anomalies(self, campaign: SMSCampaign) -> List[Dict[str, Any]]:
        """Detect anomalies in a specific campaign"""
        anomalies = []
        
        # Check for unusual failure patterns
        messages = SMSMessage.objects.filter(campaign=campaign)
        total_messages = messages.count()
        
        if total_messages > 0:
            failed_messages = messages.filter(delivery_status='failed').count()
            failure_rate = failed_messages / total_messages
            
            # Compare with user's historical average
            user_avg_failure_rate = self._get_user_average_failure_rate()
            
            if failure_rate > user_avg_failure_rate + (2 * self.anomaly_threshold * 0.1):  # 2 std devs above normal
                anomalies.append({
                    'type': 'high_failure_rate',
                    'severity': 'high' if failure_rate > 0.3 else 'medium',
                    'campaign_id': campaign.id,
                    'description': f'Unusually high failure rate: {failure_rate:.1%} vs normal {user_avg_failure_rate:.1%}',
                    'recommendation': 'Check server health and message content'
                })
        
        return anomalies
    
    def _get_user_average_failure_rate(self) -> float:
        """Get user's historical average failure rate"""
        completed_campaigns = SMSCampaign.objects.filter(
            user=self.user,
            status='completed',
            total_recipients__gt=0
        )
        
        if not completed_campaigns.exists():
            return 0.1  # Default 10% failure rate
        
        total_recipients = sum(c.total_recipients for c in completed_campaigns)
        total_failed = sum(c.messages_failed for c in completed_campaigns)
        
        return total_failed / total_recipients if total_recipients > 0 else 0.1
    
    def _calculate_speed_score(self, campaign: SMSCampaign) -> float:
        """Calculate speed score based on campaign duration and message count"""
        if not campaign.started_at or not campaign.completed_at:
            return 0.5
        
        duration = (campaign.completed_at - campaign.started_at).total_seconds()
        if duration <= 0:
            return 1.0
        
        messages_per_second = campaign.messages_sent / duration
        # Normalize to 0-1 scale (assuming 1 message/second is excellent)
        return min(1.0, messages_per_second)
    
    def _identify_bottlenecks(self, campaign: SMSCampaign) -> List[str]:
        """Identify performance bottlenecks in a campaign"""
        bottlenecks = []
        
        # Check for slow servers
        slow_servers = ServerUsageLog.objects.filter(
            campaign=campaign,
            average_response_time__gt=5.0  # 5 seconds threshold
        )
        
        for server in slow_servers:
            bottlenecks.append(f"Slow {server.server_type} server {server.server_id} (avg: {server.average_response_time:.2f}s)")
        
        # Check for high failure rates
        failed_servers = ServerUsageLog.objects.filter(
            campaign=campaign,
            messages_processed__gt=0
        ).annotate(
            failure_rate=F('failed_messages') * 100.0 / F('messages_processed')
        ).filter(failure_rate__gt=20)  # 20% failure rate threshold
        
        for server in failed_servers:
            bottlenecks.append(f"High failure rate on {server.server_type} server {server.server_id}")
        
        return bottlenecks
    
    def _generate_optimization_opportunities(self, campaign: SMSCampaign) -> List[str]:
        """Generate optimization opportunities for a campaign"""
        opportunities = []
        
        # Analyze retry patterns
        retry_count = RetryAttempt.objects.filter(message__campaign=campaign).count()
        if retry_count > campaign.total_recipients * 0.1:  # More than 10% retries
            opportunities.append("High retry rate detected - consider server health optimization")
        
        # Analyze delivery timing
        if hasattr(campaign, 'delivery_settings'):
            settings = campaign.delivery_settings
            if not settings.custom_delay_enabled:
                opportunities.append("Enable custom delays to improve carrier acceptance rates")
        
        return opportunities
    
    def _predict_configuration_improvements(self, campaign: SMSCampaign) -> Dict[str, float]:
        """Predict improvements with different configurations"""
        improvements = {}
        
        # Simulate different rotation strategies
        current_success_rate = (campaign.messages_delivered / campaign.total_recipients) if campaign.total_recipients > 0 else 0
        
        # These would be based on historical data analysis
        improvements['best_performance_strategy'] = min(1.0, current_success_rate + 0.05)
        improvements['adaptive_delays'] = min(1.0, current_success_rate + 0.03)
        improvements['carrier_optimization'] = min(1.0, current_success_rate + 0.07)
        
        return improvements
    
    def _calculate_server_performance_trend(self, campaign: SMSCampaign) -> float:
        """Calculate server performance trend factor for forecasting"""
        server_logs = ServerUsageLog.objects.filter(campaign=campaign)
        
        if not server_logs.exists():
            return 1.0  # No adjustment if no data
        
        # Calculate average performance factor
        performance_factors = []
        for log in server_logs:
            if log.messages_processed > 0:
                success_rate = log.successful_messages / log.messages_processed
                # Factor ranges from 0.5 (poor performance) to 1.5 (excellent performance)
                factor = 0.5 + success_rate
                performance_factors.append(factor)
        
        return statistics.mean(performance_factors) if performance_factors else 1.0
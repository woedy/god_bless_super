"""
Campaign statistics and performance reporting
Provides comprehensive analytics and reporting for SMS campaigns
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Avg, Sum, Q, F, Max, Min
from django.db.models.functions import TruncHour, TruncDay
from .models import (
    SMSCampaign, SMSMessage, ServerUsageLog, 
    CarrierPerformanceLog, RetryAttempt, CampaignDeliverySettings
)

logger = logging.getLogger(__name__)


class PerformanceReportingService:
    """Service for generating comprehensive campaign performance reports"""
    
    def __init__(self, campaign_id: int = None, user_id: int = None):
        self.campaign_id = campaign_id
        self.user_id = user_id
    
    def generate_campaign_report(self, campaign_id: int = None) -> Dict[str, Any]:
        """Generate comprehensive performance report for a campaign"""
        target_campaign_id = campaign_id or self.campaign_id
        
        if not target_campaign_id:
            return {'error': 'No campaign ID provided'}
        
        try:
            campaign = SMSCampaign.objects.get(id=target_campaign_id)
        except SMSCampaign.DoesNotExist:
            return {'error': 'Campaign not found'}
        
        # Basic campaign metrics
        basic_metrics = self._get_basic_metrics(campaign)
        
        # Delivery performance
        delivery_performance = self._get_delivery_performance(campaign)
        
        # Server performance
        server_performance = self._get_server_performance(campaign)
        
        # Time-based analysis
        time_analysis = self._get_time_analysis(campaign)
        
        # Carrier analysis
        carrier_analysis = self._get_carrier_analysis(campaign)
        
        # Cost analysis
        cost_analysis = self._get_cost_analysis(campaign)
        
        # Optimization insights
        optimization_insights = self._get_optimization_insights(campaign)
        
        return {
            'campaign_id': target_campaign_id,
            'campaign_name': campaign.name,
            'report_generated_at': timezone.now().isoformat(),
            'basic_metrics': basic_metrics,
            'delivery_performance': delivery_performance,
            'server_performance': server_performance,
            'time_analysis': time_analysis,
            'carrier_analysis': carrier_analysis,
            'cost_analysis': cost_analysis,
            'optimization_insights': optimization_insights
        }
    
    def generate_user_summary_report(self, user_id: int = None, days: int = 30) -> Dict[str, Any]:
        """Generate summary report for all user's campaigns"""
        target_user_id = user_id or self.user_id
        
        if not target_user_id:
            return {'error': 'No user ID provided'}
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Get user's campaigns in the period
        campaigns = SMSCampaign.objects.filter(
            user_id=target_user_id,
            created_at__gte=start_date
        )
        
        # Aggregate metrics
        aggregate_metrics = self._get_user_aggregate_metrics(campaigns)
        
        # Campaign performance comparison
        campaign_comparison = self._get_campaign_comparison(campaigns)
        
        # Trends analysis
        trends_analysis = self._get_user_trends(target_user_id, days)
        
        # Server utilization
        server_utilization = self._get_user_server_utilization(campaigns)
        
        # Recommendations
        recommendations = self._get_user_recommendations(campaigns)
        
        return {
            'user_id': target_user_id,
            'period_days': days,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_campaigns': campaigns.count(),
            'aggregate_metrics': aggregate_metrics,
            'campaign_comparison': campaign_comparison,
            'trends_analysis': trends_analysis,
            'server_utilization': server_utilization,
            'recommendations': recommendations,
            'report_generated_at': timezone.now().isoformat()
        }
    
    def get_real_time_metrics(self, campaign_id: int = None) -> Dict[str, Any]:
        """Get real-time metrics for active campaign monitoring"""
        target_campaign_id = campaign_id or self.campaign_id
        
        if not target_campaign_id:
            return {'error': 'No campaign ID provided'}
        
        try:
            campaign = SMSCampaign.objects.get(id=target_campaign_id)
        except SMSCampaign.DoesNotExist:
            return {'error': 'Campaign not found'}
        
        # Current status
        current_status = {
            'status': campaign.status,
            'progress': campaign.progress,
            'messages_sent': campaign.messages_sent,
            'messages_delivered': campaign.messages_delivered,
            'messages_failed': campaign.messages_failed,
            'total_recipients': campaign.total_recipients
        }
        
        # Recent activity (last 5 minutes)
        recent_cutoff = timezone.now() - timedelta(minutes=5)
        recent_messages = campaign.messages.filter(created_at__gte=recent_cutoff)
        
        recent_activity = {
            'messages_in_last_5min': recent_messages.count(),
            'successful_in_last_5min': recent_messages.filter(delivery_status='delivered').count(),
            'failed_in_last_5min': recent_messages.filter(delivery_status='failed').count(),
            'current_rate_per_minute': recent_messages.count() / 5 if recent_messages.exists() else 0
        }
        
        # Server status
        server_status = self._get_current_server_status(campaign)
        
        # Estimated completion
        estimated_completion = self._calculate_estimated_completion(campaign)
        
        return {
            'campaign_id': target_campaign_id,
            'timestamp': timezone.now().isoformat(),
            'current_status': current_status,
            'recent_activity': recent_activity,
            'server_status': server_status,
            'estimated_completion': estimated_completion
        }
    
    def _get_basic_metrics(self, campaign: SMSCampaign) -> Dict[str, Any]:
        """Get basic campaign metrics"""
        messages = campaign.messages.all()
        
        # Status breakdown
        status_counts = messages.values('delivery_status').annotate(
            count=Count('id')
        )
        status_breakdown = {item['delivery_status']: item['count'] for item in status_counts}
        
        # Success rate
        total_messages = messages.count()
        delivered_messages = messages.filter(delivery_status='delivered').count()
        success_rate = (delivered_messages / total_messages * 100) if total_messages > 0 else 0
        
        # Duration
        duration = None
        if campaign.started_at:
            end_time = campaign.completed_at or timezone.now()
            duration = (end_time - campaign.started_at).total_seconds()
        
        return {
            'total_messages': total_messages,
            'delivered_messages': delivered_messages,
            'failed_messages': messages.filter(delivery_status='failed').count(),
            'pending_messages': messages.filter(delivery_status='pending').count(),
            'success_rate': round(success_rate, 2),
            'status_breakdown': status_breakdown,
            'duration_seconds': duration,
            'started_at': campaign.started_at.isoformat() if campaign.started_at else None,
            'completed_at': campaign.completed_at.isoformat() if campaign.completed_at else None
        }
    
    def _get_delivery_performance(self, campaign: SMSCampaign) -> Dict[str, Any]:
        """Get delivery performance metrics"""
        messages = campaign.messages.exclude(
            total_processing_time__isnull=True
        )
        
        if not messages.exists():
            return {
                'avg_processing_time': None,
                'min_processing_time': None,
                'max_processing_time': None,
                'avg_delivery_delay': None
            }
        
        performance_stats = messages.aggregate(
            avg_processing_time=Avg('total_processing_time'),
            min_processing_time=Min('total_processing_time'),
            max_processing_time=Max('total_processing_time'),
            avg_delivery_delay=Avg('delivery_delay_applied'),
            avg_proxy_response_time=Avg('proxy_response_time'),
            avg_smtp_response_time=Avg('smtp_response_time')
        )
        
        # Delivery rate over time
        hourly_delivery = messages.filter(
            sent_at__isnull=False
        ).extra(
            select={'hour': "date_trunc('hour', sent_at)"}
        ).values('hour').annotate(
            messages_sent=Count('id')
        ).order_by('hour')
        
        return {
            **performance_stats,
            'hourly_delivery_rate': list(hourly_delivery),
            'total_messages_with_timing': messages.count()
        }
    
    def _get_server_performance(self, campaign: SMSCampaign) -> Dict[str, Any]:
        """Get server performance metrics"""
        server_usage = ServerUsageLog.objects.filter(campaign=campaign)
        
        server_stats = []
        for usage in server_usage:
            server_stats.append({
                'server_type': usage.server_type,
                'server_id': usage.server_id,
                'messages_processed': usage.messages_processed,
                'successful_messages': usage.successful_messages,
                'failed_messages': usage.failed_messages,
                'success_rate': usage.get_success_rate(),
                'average_response_time': usage.average_response_time,
                'total_processing_time': usage.total_processing_time,
                'first_used': usage.first_used.isoformat(),
                'last_used': usage.last_used.isoformat()
            })
        
        # Best and worst performing servers
        best_server = None
        worst_server = None
        
        if server_stats:
            server_stats_sorted = sorted(server_stats, key=lambda x: x['success_rate'], reverse=True)
            best_server = server_stats_sorted[0] if server_stats_sorted else None
            worst_server = server_stats_sorted[-1] if server_stats_sorted else None
        
        return {
            'server_statistics': server_stats,
            'total_servers_used': len(server_stats),
            'best_performing_server': best_server,
            'worst_performing_server': worst_server
        }
    
    def _get_time_analysis(self, campaign: SMSCampaign) -> Dict[str, Any]:
        """Get time-based analysis of campaign performance"""
        messages = campaign.messages.filter(created_at__isnull=False)
        
        if not messages.exists():
            return {}
        
        # Hourly breakdown
        hourly_stats = messages.annotate(
            hour=TruncHour('created_at')
        ).values('hour').annotate(
            total_messages=Count('id'),
            successful_messages=Count('id', filter=Q(delivery_status='delivered')),
            failed_messages=Count('id', filter=Q(delivery_status='failed'))
        ).order_by('hour')
        
        # Calculate success rate for each hour
        for stat in hourly_stats:
            total = stat['total_messages']
            successful = stat['successful_messages']
            stat['success_rate'] = (successful / total * 100) if total > 0 else 0
            stat['hour'] = stat['hour'].isoformat()
        
        # Peak performance hour
        peak_hour = None
        if hourly_stats:
            peak_hour = max(hourly_stats, key=lambda x: x['total_messages'])
        
        return {
            'hourly_breakdown': list(hourly_stats),
            'peak_performance_hour': peak_hour,
            'total_hours_active': len(hourly_stats)
        }
    
    def _get_carrier_analysis(self, campaign: SMSCampaign) -> Dict[str, Any]:
        """Get carrier-specific performance analysis"""
        messages = campaign.messages.exclude(carrier__isnull=True)
        
        carrier_stats = messages.values('carrier').annotate(
            total_messages=Count('id'),
            successful_messages=Count('id', filter=Q(delivery_status='delivered')),
            failed_messages=Count('id', filter=Q(delivery_status='failed')),
            avg_processing_time=Avg('total_processing_time')
        ).order_by('-total_messages')
        
        # Calculate success rates
        for stat in carrier_stats:
            total = stat['total_messages']
            successful = stat['successful_messages']
            stat['success_rate'] = (successful / total * 100) if total > 0 else 0
        
        # Best and worst performing carriers
        best_carrier = None
        worst_carrier = None
        
        if carrier_stats:
            carriers_by_success = sorted(carrier_stats, key=lambda x: x['success_rate'], reverse=True)
            best_carrier = carriers_by_success[0] if carriers_by_success else None
            worst_carrier = carriers_by_success[-1] if carriers_by_success else None
        
        return {
            'carrier_breakdown': list(carrier_stats),
            'total_carriers': carrier_stats.count(),
            'best_performing_carrier': best_carrier,
            'worst_performing_carrier': worst_carrier
        }
    
    def _get_cost_analysis(self, campaign: SMSCampaign) -> Dict[str, Any]:
        """Get cost analysis (placeholder for future cost tracking)"""
        # This would integrate with actual cost tracking when implemented
        messages = campaign.messages.all()
        
        return {
            'total_messages': messages.count(),
            'estimated_cost_per_message': 0.01,  # Placeholder
            'estimated_total_cost': messages.count() * 0.01,
            'cost_breakdown_by_carrier': {},  # To be implemented
            'note': 'Cost tracking not yet implemented'
        }
    
    def _get_optimization_insights(self, campaign: SMSCampaign) -> Dict[str, Any]:
        """Get optimization insights and recommendations"""
        insights = []
        
        # Analyze server performance
        server_usage = ServerUsageLog.objects.filter(campaign=campaign)
        low_performing_servers = [
            usage for usage in server_usage 
            if usage.get_success_rate() < 80
        ]
        
        if low_performing_servers:
            insights.append({
                'type': 'server_performance',
                'severity': 'medium',
                'message': f"{len(low_performing_servers)} servers have success rate below 80%",
                'recommendation': 'Consider disabling or replacing low-performing servers'
            })
        
        # Analyze retry patterns
        retry_attempts = RetryAttempt.objects.filter(message__campaign=campaign)
        high_retry_rate = retry_attempts.count() / campaign.messages.count() if campaign.messages.count() > 0 else 0
        
        if high_retry_rate > 0.1:  # More than 10% retry rate
            insights.append({
                'type': 'retry_rate',
                'severity': 'high',
                'message': f"High retry rate: {high_retry_rate:.1%}",
                'recommendation': 'Review server configuration and message content'
            })
        
        # Analyze delivery timing
        messages_with_timing = campaign.messages.exclude(total_processing_time__isnull=True)
        if messages_with_timing.exists():
            avg_processing_time = messages_with_timing.aggregate(
                avg=Avg('total_processing_time')
            )['avg']
            
            if avg_processing_time and avg_processing_time > 30:  # More than 30 seconds
                insights.append({
                    'type': 'processing_time',
                    'severity': 'medium',
                    'message': f"Average processing time is {avg_processing_time:.1f} seconds",
                    'recommendation': 'Consider optimizing server configuration or reducing delays'
                })
        
        return {
            'insights': insights,
            'total_insights': len(insights),
            'optimization_score': max(0, 100 - len(insights) * 10)  # Simple scoring
        }
    
    def _get_user_aggregate_metrics(self, campaigns) -> Dict[str, Any]:
        """Get aggregate metrics for user's campaigns"""
        total_campaigns = campaigns.count()
        
        if total_campaigns == 0:
            return {
                'total_campaigns': 0,
                'total_messages': 0,
                'overall_success_rate': 0,
                'avg_campaign_duration': 0
            }
        
        # Aggregate all messages from user's campaigns
        all_messages = SMSMessage.objects.filter(campaign__in=campaigns)
        
        total_messages = all_messages.count()
        delivered_messages = all_messages.filter(delivery_status='delivered').count()
        overall_success_rate = (delivered_messages / total_messages * 100) if total_messages > 0 else 0
        
        # Average campaign duration
        completed_campaigns = campaigns.filter(
            started_at__isnull=False,
            completed_at__isnull=False
        )
        
        avg_duration = None
        if completed_campaigns.exists():
            durations = [
                (campaign.completed_at - campaign.started_at).total_seconds()
                for campaign in completed_campaigns
            ]
            avg_duration = sum(durations) / len(durations)
        
        return {
            'total_campaigns': total_campaigns,
            'total_messages': total_messages,
            'delivered_messages': delivered_messages,
            'failed_messages': all_messages.filter(delivery_status='failed').count(),
            'overall_success_rate': round(overall_success_rate, 2),
            'avg_campaign_duration_seconds': avg_duration,
            'completed_campaigns': completed_campaigns.count()
        }
    
    def _get_campaign_comparison(self, campaigns) -> List[Dict[str, Any]]:
        """Get comparison data for user's campaigns"""
        campaign_data = []
        
        for campaign in campaigns.order_by('-created_at')[:10]:  # Last 10 campaigns
            messages = campaign.messages.all()
            total_messages = messages.count()
            delivered_messages = messages.filter(delivery_status='delivered').count()
            success_rate = (delivered_messages / total_messages * 100) if total_messages > 0 else 0
            
            duration = None
            if campaign.started_at and campaign.completed_at:
                duration = (campaign.completed_at - campaign.started_at).total_seconds()
            
            campaign_data.append({
                'id': campaign.id,
                'name': campaign.name,
                'status': campaign.status,
                'total_messages': total_messages,
                'success_rate': round(success_rate, 2),
                'duration_seconds': duration,
                'created_at': campaign.created_at.isoformat()
            })
        
        return campaign_data
    
    def _get_user_trends(self, user_id: int, days: int) -> Dict[str, Any]:
        """Get trend analysis for user's campaigns"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Daily message volume
        daily_messages = SMSMessage.objects.filter(
            campaign__user_id=user_id,
            created_at__gte=start_date
        ).annotate(
            day=TruncDay('created_at')
        ).values('day').annotate(
            total_messages=Count('id'),
            successful_messages=Count('id', filter=Q(delivery_status='delivered'))
        ).order_by('day')
        
        # Calculate daily success rates
        for day_data in daily_messages:
            total = day_data['total_messages']
            successful = day_data['successful_messages']
            day_data['success_rate'] = (successful / total * 100) if total > 0 else 0
            day_data['day'] = day_data['day'].isoformat()
        
        return {
            'daily_message_volume': list(daily_messages),
            'period_days': days
        }
    
    def _get_user_server_utilization(self, campaigns) -> Dict[str, Any]:
        """Get server utilization across user's campaigns"""
        server_usage = ServerUsageLog.objects.filter(campaign__in=campaigns)
        
        # Aggregate by server
        server_aggregates = {}
        for usage in server_usage:
            server_key = f"{usage.server_type}_{usage.server_id}"
            
            if server_key not in server_aggregates:
                server_aggregates[server_key] = {
                    'server_type': usage.server_type,
                    'server_id': usage.server_id,
                    'total_messages': 0,
                    'successful_messages': 0,
                    'failed_messages': 0,
                    'campaigns_used': set()
                }
            
            agg = server_aggregates[server_key]
            agg['total_messages'] += usage.messages_processed
            agg['successful_messages'] += usage.successful_messages
            agg['failed_messages'] += usage.failed_messages
            agg['campaigns_used'].add(usage.campaign_id)
        
        # Convert to list and calculate success rates
        server_list = []
        for server_key, data in server_aggregates.items():
            data['campaigns_used'] = len(data['campaigns_used'])
            data['success_rate'] = (
                data['successful_messages'] / data['total_messages'] * 100
                if data['total_messages'] > 0 else 0
            )
            server_list.append(data)
        
        return {
            'server_utilization': server_list,
            'total_unique_servers': len(server_list)
        }
    
    def _get_user_recommendations(self, campaigns) -> List[str]:
        """Get recommendations for user based on campaign history"""
        recommendations = []
        
        if not campaigns.exists():
            return ["Start creating SMS campaigns to get personalized recommendations"]
        
        # Analyze overall success rate
        all_messages = SMSMessage.objects.filter(campaign__in=campaigns)
        if all_messages.exists():
            success_rate = (
                all_messages.filter(delivery_status='delivered').count() / 
                all_messages.count() * 100
            )
            
            if success_rate < 80:
                recommendations.append(
                    f"Overall success rate is {success_rate:.1f}%. "
                    "Consider reviewing server configuration and message content."
                )
        
        # Check for recent failures
        recent_campaigns = campaigns.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        )
        
        failed_campaigns = recent_campaigns.filter(status='failed').count()
        if failed_campaigns > 0:
            recommendations.append(
                f"{failed_campaigns} campaigns failed in the last 7 days. "
                "Review error logs and server health."
            )
        
        return recommendations
    
    def _get_current_server_status(self, campaign: SMSCampaign) -> Dict[str, Any]:
        """Get current server status for active campaign"""
        # This would integrate with real-time server monitoring
        # For now, return basic information from recent usage
        
        recent_usage = ServerUsageLog.objects.filter(
            campaign=campaign,
            last_used__gte=timezone.now() - timedelta(minutes=10)
        )
        
        active_servers = {
            'proxy_servers': recent_usage.filter(server_type='proxy').count(),
            'smtp_servers': recent_usage.filter(server_type='smtp').count(),
            'last_activity': recent_usage.aggregate(
                last_used=Max('last_used')
            )['last_used']
        }
        
        return active_servers
    
    def _calculate_estimated_completion(self, campaign: SMSCampaign) -> Optional[str]:
        """Calculate estimated completion time for active campaign"""
        if campaign.status not in ['in_progress', 'scheduled']:
            return None
        
        if not campaign.started_at:
            return None
        
        # Calculate current rate
        elapsed_time = timezone.now() - campaign.started_at
        elapsed_minutes = elapsed_time.total_seconds() / 60
        
        if elapsed_minutes <= 0 or campaign.messages_sent <= 0:
            return None
        
        messages_per_minute = campaign.messages_sent / elapsed_minutes
        remaining_messages = campaign.total_recipients - campaign.messages_sent
        
        if messages_per_minute <= 0:
            return None
        
        estimated_minutes_remaining = remaining_messages / messages_per_minute
        estimated_completion = timezone.now() + timedelta(minutes=estimated_minutes_remaining)
        
        return estimated_completion.isoformat()
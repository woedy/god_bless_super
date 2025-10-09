"""
Real-time monitoring service for SMS campaigns
Provides WebSocket updates for campaign progress and server status
"""
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Avg, Q, F
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import (
    SMSCampaign, SMSMessage, ServerUsageLog, 
    CarrierPerformanceLog, RetryAttempt
)

logger = logging.getLogger(__name__)


class CampaignMonitoringService:
    """Real-time monitoring service for SMS campaigns"""
    
    def __init__(self, campaign_id: int):
        self.campaign_id = campaign_id
        self.channel_layer = get_channel_layer()
        
        try:
            self.campaign = SMSCampaign.objects.get(id=campaign_id)
        except SMSCampaign.DoesNotExist:
            logger.error(f"Campaign {campaign_id} not found")
            self.campaign = None
    
    def get_campaign_group_name(self) -> str:
        """Get WebSocket group name for campaign updates"""
        return f"campaign_{self.campaign_id}"
    
    def get_user_group_name(self) -> str:
        """Get WebSocket group name for user-specific updates"""
        if self.campaign:
            return f"user_{self.campaign.user.id}_campaigns"
        return None
    
    def send_progress_update(self, data: Dict[str, Any]) -> None:
        """Send campaign progress update via WebSocket"""
        if not self.campaign:
            return
            
        message = {
            'type': 'campaign_progress',
            'campaign_id': self.campaign_id,
            'timestamp': timezone.now().isoformat(),
            **data
        }
        
        # Send to campaign-specific group
        self._send_to_group(self.get_campaign_group_name(), message)
        
        # Send to user's campaigns group
        user_group = self.get_user_group_name()
        if user_group:
            self._send_to_group(user_group, message)
    
    def send_server_status_update(self, server_type: str, server_id: int, 
                                status: str, details: Dict[str, Any] = None) -> None:
        """Send server status update via WebSocket"""
        if not self.campaign:
            return
            
        message = {
            'type': 'server_status',
            'campaign_id': self.campaign_id,
            'server_type': server_type,
            'server_id': server_id,
            'status': status,
            'timestamp': timezone.now().isoformat(),
            'details': details or {}
        }
        
        # Send to campaign-specific group
        self._send_to_group(self.get_campaign_group_name(), message)
        
        # Send to user's campaigns group
        user_group = self.get_user_group_name()
        if user_group:
            self._send_to_group(user_group, message)
    
    def send_error_notification(self, error_type: str, message: str, 
                              details: Dict[str, Any] = None) -> None:
        """Send error notification with detailed failure analysis"""
        if not self.campaign:
            return
            
        error_message = {
            'type': 'error_notification',
            'campaign_id': self.campaign_id,
            'error_type': error_type,
            'message': message,
            'timestamp': timezone.now().isoformat(),
            'details': details or {},
            'severity': self._determine_error_severity(error_type)
        }
        
        # Send to campaign-specific group
        self._send_to_group(self.get_campaign_group_name(), error_message)
        
        # Send to user's campaigns group
        user_group = self.get_user_group_name()
        if user_group:
            self._send_to_group(user_group, error_message)
    
    def get_campaign_stats(self) -> Dict[str, Any]:
        """Get comprehensive campaign statistics"""
        if not self.campaign:
            return {}
        
        # Basic campaign metrics
        messages = self.campaign.messages.all()
        total_messages = messages.count()
        
        # Status breakdown
        status_counts = messages.values('delivery_status').annotate(
            count=Count('id')
        ).order_by('delivery_status')
        
        status_breakdown = {item['delivery_status']: item['count'] for item in status_counts}
        
        # Server usage statistics
        server_stats = self._get_server_usage_stats()
        
        # Performance metrics
        performance_metrics = self._get_performance_metrics()
        
        # Retry statistics
        retry_stats = self._get_retry_statistics()
        
        # Carrier performance
        carrier_stats = self._get_carrier_performance()
        
        # Time-based metrics
        time_metrics = self._get_time_metrics()
        
        return {
            'campaign_id': self.campaign_id,
            'campaign_name': self.campaign.name,
            'status': self.campaign.status,
            'progress': self.campaign.progress,
            'total_messages': total_messages,
            'messages_sent': self.campaign.messages_sent,
            'messages_delivered': self.campaign.messages_delivered,
            'messages_failed': self.campaign.messages_failed,
            'status_breakdown': status_breakdown,
            'server_usage': server_stats,
            'performance_metrics': performance_metrics,
            'retry_statistics': retry_stats,
            'carrier_performance': carrier_stats,
            'time_metrics': time_metrics,
            'last_updated': timezone.now().isoformat()
        }
    
    def send_campaign_stats_update(self) -> None:
        """Send complete campaign statistics update"""
        stats = self.get_campaign_stats()
        self.send_progress_update({
            'type': 'stats_update',
            'stats': stats
        })
    
    def _send_to_group(self, group_name: str, message: Dict[str, Any]) -> None:
        """Send message to WebSocket group"""
        if not self.channel_layer or not group_name:
            return
            
        try:
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'campaign_message',
                    'message': message
                }
            )
        except Exception as e:
            logger.error(f"Failed to send WebSocket message to group {group_name}: {e}")
    
    def _determine_error_severity(self, error_type: str) -> str:
        """Determine error severity level"""
        high_severity_errors = [
            'smtp_authentication_failed',
            'proxy_authentication_failed',
            'all_servers_failed',
            'campaign_cancelled'
        ]
        
        medium_severity_errors = [
            'server_timeout',
            'rate_limit_exceeded',
            'carrier_rejection'
        ]
        
        if error_type in high_severity_errors:
            return 'high'
        elif error_type in medium_severity_errors:
            return 'medium'
        else:
            return 'low'
    
    def _get_server_usage_stats(self) -> Dict[str, Any]:
        """Get server usage statistics for the campaign"""
        usage_logs = ServerUsageLog.objects.filter(campaign=self.campaign)
        
        proxy_stats = usage_logs.filter(server_type='proxy').values(
            'server_id'
        ).annotate(
            messages_processed=F('messages_processed'),
            success_rate=F('successful_messages') * 100.0 / F('messages_processed'),
            avg_response_time=F('average_response_time')
        )
        
        smtp_stats = usage_logs.filter(server_type='smtp').values(
            'server_id'
        ).annotate(
            messages_processed=F('messages_processed'),
            success_rate=F('successful_messages') * 100.0 / F('messages_processed'),
            avg_response_time=F('average_response_time')
        )
        
        return {
            'proxy_servers': list(proxy_stats),
            'smtp_servers': list(smtp_stats),
            'total_proxy_servers': proxy_stats.count(),
            'total_smtp_servers': smtp_stats.count()
        }
    
    def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for the campaign"""
        messages = self.campaign.messages.exclude(
            proxy_response_time__isnull=True,
            smtp_response_time__isnull=True
        )
        
        if not messages.exists():
            return {
                'avg_proxy_response_time': None,
                'avg_smtp_response_time': None,
                'avg_total_processing_time': None,
                'avg_delivery_delay': None
            }
        
        aggregates = messages.aggregate(
            avg_proxy_response_time=Avg('proxy_response_time'),
            avg_smtp_response_time=Avg('smtp_response_time'),
            avg_total_processing_time=Avg('total_processing_time'),
            avg_delivery_delay=Avg('delivery_delay_applied')
        )
        
        return aggregates
    
    def _get_retry_statistics(self) -> Dict[str, Any]:
        """Get retry statistics for the campaign"""
        retry_attempts = RetryAttempt.objects.filter(
            message__campaign=self.campaign
        )
        
        total_retries = retry_attempts.count()
        successful_retries = retry_attempts.filter(success=True).count()
        pending_retries = retry_attempts.filter(completed=False).count()
        
        # Retry by error type
        retry_by_error = retry_attempts.values('error_type').annotate(
            count=Count('id'),
            success_count=Count('id', filter=Q(success=True))
        ).order_by('-count')
        
        return {
            'total_retries': total_retries,
            'successful_retries': successful_retries,
            'pending_retries': pending_retries,
            'retry_success_rate': (successful_retries / total_retries * 100) if total_retries > 0 else 0,
            'retry_by_error_type': list(retry_by_error)
        }
    
    def _get_carrier_performance(self) -> Dict[str, Any]:
        """Get carrier performance statistics"""
        messages = self.campaign.messages.exclude(carrier__isnull=True)
        
        carrier_stats = messages.values('carrier').annotate(
            total_messages=Count('id'),
            successful_messages=Count('id', filter=Q(delivery_status='delivered')),
            failed_messages=Count('id', filter=Q(delivery_status='failed')),
            avg_response_time=Avg('total_processing_time')
        ).order_by('-total_messages')
        
        # Calculate success rates
        for stat in carrier_stats:
            if stat['total_messages'] > 0:
                stat['success_rate'] = (stat['successful_messages'] / stat['total_messages']) * 100
            else:
                stat['success_rate'] = 0
        
        return {
            'carrier_breakdown': list(carrier_stats),
            'total_carriers': carrier_stats.count()
        }
    
    def _get_time_metrics(self) -> Dict[str, Any]:
        """Get time-based metrics for the campaign"""
        if not self.campaign.started_at:
            return {
                'duration': None,
                'estimated_completion': None,
                'messages_per_minute': None
            }
        
        now = timezone.now()
        duration = now - self.campaign.started_at
        
        # Calculate messages per minute
        duration_minutes = duration.total_seconds() / 60
        messages_per_minute = self.campaign.messages_sent / duration_minutes if duration_minutes > 0 else 0
        
        # Estimate completion time
        remaining_messages = self.campaign.total_recipients - self.campaign.messages_sent
        estimated_completion = None
        
        if messages_per_minute > 0 and remaining_messages > 0:
            remaining_minutes = remaining_messages / messages_per_minute
            estimated_completion = now + timedelta(minutes=remaining_minutes)
        
        return {
            'duration_seconds': duration.total_seconds(),
            'duration_formatted': str(duration),
            'estimated_completion': estimated_completion.isoformat() if estimated_completion else None,
            'messages_per_minute': round(messages_per_minute, 2),
            'started_at': self.campaign.started_at.isoformat(),
            'completed_at': self.campaign.completed_at.isoformat() if self.campaign.completed_at else None
        }


class GlobalMonitoringService:
    """Global monitoring service for all campaigns and system health"""
    
    def __init__(self, user_id: int = None):
        self.user_id = user_id
        self.channel_layer = get_channel_layer()
    
    def get_system_health_stats(self) -> Dict[str, Any]:
        """Get overall system health statistics"""
        # Active campaigns
        active_campaigns = SMSCampaign.objects.filter(
            status__in=['in_progress', 'scheduled']
        )
        
        if self.user_id:
            active_campaigns = active_campaigns.filter(user_id=self.user_id)
        
        # Recent performance (last 24 hours)
        last_24h = timezone.now() - timedelta(hours=24)
        recent_messages = SMSMessage.objects.filter(created_at__gte=last_24h)
        
        if self.user_id:
            recent_messages = recent_messages.filter(campaign__user_id=self.user_id)
        
        # Server health summary
        server_health = self._get_server_health_summary()
        
        return {
            'active_campaigns': active_campaigns.count(),
            'total_messages_24h': recent_messages.count(),
            'successful_messages_24h': recent_messages.filter(delivery_status='delivered').count(),
            'failed_messages_24h': recent_messages.filter(delivery_status='failed').count(),
            'server_health': server_health,
            'timestamp': timezone.now().isoformat()
        }
    
    def send_system_health_update(self) -> None:
        """Send system health update to all connected clients"""
        stats = self.get_system_health_stats()
        
        group_name = f"user_{self.user_id}_system" if self.user_id else "system_health"
        
        message = {
            'type': 'system_health',
            'stats': stats
        }
        
        self._send_to_group(group_name, message)
    
    def _get_server_health_summary(self) -> Dict[str, Any]:
        """Get summary of server health across all campaigns"""
        # This would integrate with actual server health monitoring
        # For now, return basic statistics
        
        recent_usage = ServerUsageLog.objects.filter(
            last_used__gte=timezone.now() - timedelta(hours=1)
        )
        
        if self.user_id:
            recent_usage = recent_usage.filter(campaign__user_id=self.user_id)
        
        proxy_health = recent_usage.filter(server_type='proxy').aggregate(
            avg_success_rate=Avg(F('successful_messages') * 100.0 / F('messages_processed')),
            total_servers=Count('server_id', distinct=True)
        )
        
        smtp_health = recent_usage.filter(server_type='smtp').aggregate(
            avg_success_rate=Avg(F('successful_messages') * 100.0 / F('messages_processed')),
            total_servers=Count('server_id', distinct=True)
        )
        
        return {
            'proxy_servers': {
                'total': proxy_health['total_servers'] or 0,
                'avg_success_rate': proxy_health['avg_success_rate'] or 0
            },
            'smtp_servers': {
                'total': smtp_health['total_servers'] or 0,
                'avg_success_rate': smtp_health['avg_success_rate'] or 0
            }
        }
    
    def _send_to_group(self, group_name: str, message: Dict[str, Any]) -> None:
        """Send message to WebSocket group"""
        if not self.channel_layer:
            return
            
        try:
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'system_message',
                    'message': message
                }
            )
        except Exception as e:
            logger.error(f"Failed to send WebSocket message to group {group_name}: {e}")
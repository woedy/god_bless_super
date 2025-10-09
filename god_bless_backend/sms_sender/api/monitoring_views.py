"""
API views for SMS campaign monitoring and real-time statistics
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta

from ..models import SMSCampaign
from ..monitoring_service import CampaignMonitoringService, GlobalMonitoringService
from ..performance_reporting import PerformanceReportingService
from ..error_analysis import ErrorAnalysisService


class CampaignMonitoringViewSet(viewsets.ViewSet):
    """ViewSet for campaign monitoring and statistics"""
    permission_classes = [IsAuthenticated]
    
    def get_campaign(self, campaign_id):
        """Get campaign and verify user access"""
        return get_object_or_404(
            SMSCampaign,
            id=campaign_id,
            user=self.request.user
        )
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get real-time campaign statistics"""
        campaign = self.get_campaign(pk)
        monitoring_service = CampaignMonitoringService(campaign.id)
        
        stats = monitoring_service.get_campaign_stats()
        
        return Response({
            'success': True,
            'data': stats
        })
    
    @action(detail=True, methods=['get'])
    def real_time_metrics(self, request, pk=None):
        """Get real-time metrics for active campaign"""
        campaign = self.get_campaign(pk)
        reporting_service = PerformanceReportingService(campaign.id)
        
        metrics = reporting_service.get_real_time_metrics()
        
        return Response({
            'success': True,
            'data': metrics
        })
    
    @action(detail=True, methods=['get'])
    def performance_report(self, request, pk=None):
        """Get comprehensive performance report"""
        campaign = self.get_campaign(pk)
        reporting_service = PerformanceReportingService(campaign.id)
        
        report = reporting_service.generate_campaign_report()
        
        return Response({
            'success': True,
            'data': report
        })
    
    @action(detail=True, methods=['get'])
    def error_analysis(self, request, pk=None):
        """Get detailed error analysis for campaign"""
        campaign = self.get_campaign(pk)
        error_service = ErrorAnalysisService(campaign.id)
        
        analysis = error_service.analyze_campaign_errors()
        
        return Response({
            'success': True,
            'data': analysis
        })
    
    @action(detail=True, methods=['get'])
    def error_trends(self, request, pk=None):
        """Get error trends over time"""
        campaign = self.get_campaign(pk)
        error_service = ErrorAnalysisService(campaign.id)
        
        days = int(request.query_params.get('days', 7))
        trends = error_service.get_error_trends(days)
        
        return Response({
            'success': True,
            'data': trends
        })
    
    @action(detail=False, methods=['get'])
    def user_summary(self, request):
        """Get summary report for all user's campaigns"""
        days = int(request.query_params.get('days', 30))
        reporting_service = PerformanceReportingService(user_id=request.user.id)
        
        summary = reporting_service.generate_user_summary_report(days=days)
        
        return Response({
            'success': True,
            'data': summary
        })
    
    @action(detail=False, methods=['get'])
    def system_health(self, request):
        """Get system health statistics for user"""
        monitoring_service = GlobalMonitoringService(request.user.id)
        
        health_stats = monitoring_service.get_system_health_stats()
        
        return Response({
            'success': True,
            'data': health_stats
        })
    
    @action(detail=False, methods=['get'])
    def active_campaigns(self, request):
        """Get list of user's active campaigns with basic stats"""
        active_campaigns = SMSCampaign.objects.filter(
            user=request.user,
            status__in=['in_progress', 'scheduled']
        ).order_by('-started_at')
        
        campaigns_data = []
        for campaign in active_campaigns:
            monitoring_service = CampaignMonitoringService(campaign.id)
            basic_stats = {
                'id': campaign.id,
                'name': campaign.name,
                'status': campaign.status,
                'progress': campaign.progress,
                'messages_sent': campaign.messages_sent,
                'messages_failed': campaign.messages_failed,
                'total_recipients': campaign.total_recipients,
                'started_at': campaign.started_at.isoformat() if campaign.started_at else None
            }
            
            # Add real-time metrics for in-progress campaigns
            if campaign.status == 'in_progress':
                reporting_service = PerformanceReportingService(campaign.id)
                real_time = reporting_service.get_real_time_metrics()
                basic_stats.update({
                    'recent_activity': real_time.get('recent_activity', {}),
                    'estimated_completion': real_time.get('estimated_completion')
                })
            
            campaigns_data.append(basic_stats)
        
        return Response({
            'success': True,
            'data': {
                'active_campaigns': campaigns_data,
                'total_active': len(campaigns_data)
            }
        })
    
    @action(detail=True, methods=['post'])
    def send_test_notification(self, request, pk=None):
        """Send test WebSocket notification (for debugging)"""
        campaign = self.get_campaign(pk)
        monitoring_service = CampaignMonitoringService(campaign.id)
        
        notification_type = request.data.get('type', 'test')
        message = request.data.get('message', 'Test notification')
        
        if notification_type == 'progress':
            monitoring_service.send_progress_update({
                'type': 'test_progress',
                'message': message,
                'timestamp': timezone.now().isoformat()
            })
        elif notification_type == 'error':
            monitoring_service.send_error_notification(
                'test_error',
                message,
                {'test': True}
            )
        elif notification_type == 'server':
            monitoring_service.send_server_status_update(
                'smtp', 1, 'test',
                {'message': message}
            )
        else:
            monitoring_service.send_progress_update({
                'type': 'test',
                'message': message,
                'timestamp': timezone.now().isoformat()
            })
        
        return Response({
            'success': True,
            'message': f'Test {notification_type} notification sent'
        })


class SystemMonitoringViewSet(viewsets.ViewSet):
    """ViewSet for system-wide monitoring"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get dashboard statistics for user"""
        monitoring_service = GlobalMonitoringService(request.user.id)
        reporting_service = PerformanceReportingService(user_id=request.user.id)
        
        # Get system health
        system_health = monitoring_service.get_system_health_stats()
        
        # Get recent campaigns summary
        days = int(request.query_params.get('days', 7))
        user_summary = reporting_service.generate_user_summary_report(days=days)
        
        # Get recent error trends
        error_service = ErrorAnalysisService()
        error_service.user_id = request.user.id
        error_trends = error_service.get_error_trends(days)
        
        return Response({
            'success': True,
            'data': {
                'system_health': system_health,
                'user_summary': user_summary,
                'error_trends': error_trends,
                'period_days': days
            }
        })
    
    @action(detail=False, methods=['get'])
    def server_performance(self, request):
        """Get server performance metrics"""
        days = int(request.query_params.get('days', 7))
        
        # This would integrate with actual server monitoring
        # For now, return basic performance data
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        from ..models import ServerUsageLog
        
        # Get server usage for user's campaigns
        server_usage = ServerUsageLog.objects.filter(
            campaign__user=request.user,
            last_used__gte=start_date
        )
        
        # Aggregate by server
        server_performance = {}
        for usage in server_usage:
            server_key = f"{usage.server_type}_{usage.server_id}"
            
            if server_key not in server_performance:
                server_performance[server_key] = {
                    'server_type': usage.server_type,
                    'server_id': usage.server_id,
                    'total_messages': 0,
                    'successful_messages': 0,
                    'failed_messages': 0,
                    'total_processing_time': 0,
                    'usage_count': 0
                }
            
            perf = server_performance[server_key]
            perf['total_messages'] += usage.messages_processed
            perf['successful_messages'] += usage.successful_messages
            perf['failed_messages'] += usage.failed_messages
            perf['total_processing_time'] += usage.total_processing_time or 0
            perf['usage_count'] += 1
        
        # Calculate averages and success rates
        for server_key, perf in server_performance.items():
            if perf['total_messages'] > 0:
                perf['success_rate'] = (perf['successful_messages'] / perf['total_messages']) * 100
                perf['avg_processing_time'] = perf['total_processing_time'] / perf['usage_count'] if perf['usage_count'] > 0 else 0
            else:
                perf['success_rate'] = 0
                perf['avg_processing_time'] = 0
        
        return Response({
            'success': True,
            'data': {
                'server_performance': list(server_performance.values()),
                'period_days': days,
                'total_servers': len(server_performance)
            }
        })
    
    @action(detail=False, methods=['post'])
    def trigger_health_check(self, request):
        """Trigger health check for user's servers"""
        from ..enhanced_tasks import health_check_servers_task
        
        # Queue health check task
        task = health_check_servers_task.delay(request.user.id)
        
        return Response({
            'success': True,
            'message': 'Health check initiated',
            'task_id': task.id
        })
    
    @action(detail=False, methods=['get'])
    def export_report(self, request):
        """Export comprehensive monitoring report"""
        days = int(request.query_params.get('days', 30))
        format_type = request.query_params.get('format', 'json')
        
        reporting_service = PerformanceReportingService(user_id=request.user.id)
        report = reporting_service.generate_user_summary_report(days=days)
        
        if format_type == 'json':
            return Response({
                'success': True,
                'data': report,
                'export_format': 'json'
            })
        else:
            # Future: Support CSV, PDF exports
            return Response({
                'success': False,
                'message': f'Export format {format_type} not yet supported'
            }, status=status.HTTP_400_BAD_REQUEST)
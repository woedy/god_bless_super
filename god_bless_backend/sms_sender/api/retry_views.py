"""
API views for retry management functionality.

Provides endpoints for managing retry attempts, viewing retry statistics,
and controlling retry behavior for SMS campaigns.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg
from django.utils import timezone
from datetime import timedelta

from ..models import SMSCampaign, SMSMessage, RetryAttempt
from ..retry_service import RetryManagementService
from .serializers import (
    RetryAttemptSerializer, 
    RetryStatsSerializer,
    MessageRetryHistorySerializer,
    RetryConfigurationSerializer
)


class RetryManagementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing retry attempts and viewing retry statistics.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = RetryAttemptSerializer
    
    def get_queryset(self):
        """Filter retry attempts by user's campaigns"""
        user_campaigns = SMSCampaign.objects.filter(user=self.request.user)
        return RetryAttempt.objects.filter(
            message__campaign__in=user_campaigns
        ).select_related(
            'message', 'message__campaign', 'retry_proxy_server', 'retry_smtp_server'
        ).order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get global retry statistics for the user.
        
        Returns comprehensive retry statistics across all campaigns.
        """
        stats = RetryManagementService.get_global_retry_stats(request.user)
        serializer = RetryStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def campaign_stats(self, request):
        """
        Get retry statistics for a specific campaign.
        
        Query Parameters:
        - campaign_id: ID of the campaign
        """
        campaign_id = request.query_params.get('campaign_id')
        if not campaign_id:
            return Response(
                {'error': 'campaign_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        campaign = get_object_or_404(
            SMSCampaign, 
            id=campaign_id, 
            user=request.user
        )
        
        retry_service = RetryManagementService(campaign)
        stats = retry_service.get_retry_stats()
        
        serializer = RetryStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def message_history(self, request):
        """
        Get retry history for a specific message.
        
        Query Parameters:
        - message_id: ID of the message
        """
        message_id = request.query_params.get('message_id')
        if not message_id:
            return Response(
                {'error': 'message_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify message belongs to user
        message = get_object_or_404(
            SMSMessage,
            id=message_id,
            campaign__user=request.user
        )
        
        retry_service = RetryManagementService(message.campaign)
        history = retry_service.get_message_retry_history(message)
        
        serializer = MessageRetryHistorySerializer(history, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def cancel_retries(self, request):
        """
        Cancel pending retry attempts for a message or campaign.
        
        Request Body:
        - message_id (optional): Cancel retries for specific message
        - campaign_id (optional): Cancel retries for entire campaign
        """
        message_id = request.data.get('message_id')
        campaign_id = request.data.get('campaign_id')
        
        if not message_id and not campaign_id:
            return Response(
                {'error': 'Either message_id or campaign_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cancelled_count = 0
        
        if message_id:
            # Cancel retries for specific message
            message = get_object_or_404(
                SMSMessage,
                id=message_id,
                campaign__user=request.user
            )
            
            retry_service = RetryManagementService(message.campaign)
            cancelled_count = retry_service.cancel_pending_retries(message)
            
        elif campaign_id:
            # Cancel retries for entire campaign
            campaign = get_object_or_404(
                SMSCampaign,
                id=campaign_id,
                user=request.user
            )
            
            retry_service = RetryManagementService(campaign)
            
            # Cancel retries for all messages in campaign
            for message in campaign.messages.all():
                cancelled_count += retry_service.cancel_pending_retries(message)
        
        return Response({
            'cancelled_count': cancelled_count,
            'message': f'Cancelled {cancelled_count} pending retry attempts'
        })
    
    @action(detail=False, methods=['post'])
    def manual_retry(self, request):
        """
        Manually trigger a retry for a failed message.
        
        Request Body:
        - message_id: ID of the message to retry
        - force: Whether to force retry even if max attempts reached (default: false)
        """
        message_id = request.data.get('message_id')
        force = request.data.get('force', False)
        
        if not message_id:
            return Response(
                {'error': 'message_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message = get_object_or_404(
            SMSMessage,
            id=message_id,
            campaign__user=request.user
        )
        
        # Check if message is in failed state
        if message.delivery_status != 'failed':
            return Response(
                {'error': 'Message is not in failed state'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        retry_service = RetryManagementService(message.campaign)
        
        # Check if retry is allowed
        if not force and not retry_service.should_retry(message, message.error_message):
            return Response(
                {'error': 'Message has exceeded maximum retry attempts'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Schedule manual retry
        error_type = retry_service._classify_error(message.error_message.lower())
        success = retry_service.schedule_retry(message, message.error_message, error_type)
        
        if success:
            return Response({
                'message': 'Retry scheduled successfully',
                'retry_scheduled': True
            })
        else:
            return Response(
                {'error': 'Failed to schedule retry'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def error_analysis(self, request):
        """
        Get analysis of error patterns for retry optimization.
        
        Query Parameters:
        - campaign_id (optional): Analyze specific campaign
        - days (optional): Number of days to analyze (default: 30)
        """
        campaign_id = request.query_params.get('campaign_id')
        days = int(request.query_params.get('days', 30))
        
        # Filter by date range
        start_date = timezone.now() - timedelta(days=days)
        
        # Base queryset
        queryset = RetryAttempt.objects.filter(
            message__campaign__user=request.user,
            created_at__gte=start_date
        )
        
        # Filter by campaign if specified
        if campaign_id:
            queryset = queryset.filter(message__campaign_id=campaign_id)
        
        # Analyze error patterns
        error_analysis = queryset.values('error_type').annotate(
            count=Count('id'),
            avg_retry_delay=Avg('retry_delay'),
            success_rate=Avg('success')
        ).order_by('-count')
        
        # Analyze retry success by attempt number
        retry_success_by_attempt = queryset.values('attempt_number').annotate(
            count=Count('id'),
            success_rate=Avg('success')
        ).order_by('attempt_number')
        
        # Most problematic carriers
        carrier_analysis = queryset.values(
            'message__carrier'
        ).annotate(
            count=Count('id'),
            success_rate=Avg('success')
        ).order_by('-count')[:10]
        
        return Response({
            'error_patterns': list(error_analysis),
            'retry_success_by_attempt': list(retry_success_by_attempt),
            'carrier_analysis': list(carrier_analysis),
            'analysis_period_days': days,
            'total_retry_attempts': queryset.count()
        })
    
    @action(detail=False, methods=['get'])
    def configuration(self, request):
        """
        Get current retry configuration settings.
        """
        # Get default configuration from RetryManagementService
        config = {
            'max_retry_attempts': RetryManagementService.MAX_RETRY_ATTEMPTS,
            'base_retry_delay': RetryManagementService.BASE_RETRY_DELAY,
            'max_retry_delay': RetryManagementService.MAX_RETRY_DELAY,
            'carrier_configs': RetryManagementService.CARRIER_RETRY_CONFIG,
            'error_classifications': RetryManagementService.ERROR_CLASSIFICATIONS
        }
        
        serializer = RetryConfigurationSerializer(config)
        return Response(serializer.data)


class RetryAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing individual retry attempts.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = RetryAttemptSerializer
    
    def get_queryset(self):
        """Filter retry attempts by user's campaigns"""
        user_campaigns = SMSCampaign.objects.filter(user=self.request.user)
        return RetryAttempt.objects.filter(
            message__campaign__in=user_campaigns
        ).select_related(
            'message', 'message__campaign', 'retry_proxy_server', 'retry_smtp_server'
        ).order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """
        List retry attempts with filtering options.
        
        Query Parameters:
        - campaign_id: Filter by campaign
        - message_id: Filter by message
        - error_type: Filter by error type
        - completed: Filter by completion status (true/false)
        - success: Filter by success status (true/false)
        """
        queryset = self.get_queryset()
        
        # Apply filters
        campaign_id = request.query_params.get('campaign_id')
        if campaign_id:
            queryset = queryset.filter(message__campaign_id=campaign_id)
        
        message_id = request.query_params.get('message_id')
        if message_id:
            queryset = queryset.filter(message_id=message_id)
        
        error_type = request.query_params.get('error_type')
        if error_type:
            queryset = queryset.filter(error_type=error_type)
        
        completed = request.query_params.get('completed')
        if completed is not None:
            completed_bool = completed.lower() == 'true'
            queryset = queryset.filter(completed=completed_bool)
        
        success = request.query_params.get('success')
        if success is not None:
            success_bool = success.lower() == 'true'
            queryset = queryset.filter(success=success_bool)
        
        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
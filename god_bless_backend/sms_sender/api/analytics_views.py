"""
API Views for Predictive Analytics Service
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from ..analytics_service import PredictiveAnalyticsService
from ..models import SMSCampaign


class PredictiveAnalyticsViewSet(viewsets.ViewSet):
    """
    ViewSet for predictive analytics operations
    """
    permission_classes = [IsAuthenticated]
    
    def get_analytics_service(self):
        """Get analytics service instance for current user"""
        return PredictiveAnalyticsService(self.request.user)
    
    @action(detail=False, methods=['get'])
    def server_failure_prediction(self, request):
        """
        Predict server failure probability
        
        Query parameters:
        - server_id: ID of the server
        - server_type: Type of server ('proxy' or 'smtp')
        """
        server_id = request.query_params.get('server_id')
        server_type = request.query_params.get('server_type')
        
        if not server_id or not server_type:
            return Response(
                {'error': 'server_id and server_type parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if server_type not in ['proxy', 'smtp']:
            return Response(
                {'error': 'server_type must be either "proxy" or "smtp"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            server_id = int(server_id)
        except ValueError:
            return Response(
                {'error': 'server_id must be a valid integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        analytics_service = self.get_analytics_service()
        failure_probability = analytics_service.predict_server_failure(server_id, server_type)
        
        return Response({
            'server_id': server_id,
            'server_type': server_type,
            'failure_probability': failure_probability,
            'risk_level': 'high' if failure_probability > 0.7 else 'medium' if failure_probability > 0.4 else 'low'
        })
    
    @action(detail=False, methods=['get'])
    def optimization_recommendations(self, request):
        """
        Get optimization recommendations for campaign configuration
        
        Query parameters:
        - campaign_type: Type of campaign (optional, defaults to 'general')
        """
        campaign_type = request.query_params.get('campaign_type', 'general')
        
        analytics_service = self.get_analytics_service()
        recommendations = analytics_service.recommend_server_configuration(campaign_type)
        
        return Response(recommendations)
    
    @action(detail=False, methods=['get'])
    def system_suggestions(self, request):
        """
        Get system-wide optimization suggestions
        """
        analytics_service = self.get_analytics_service()
        suggestions = analytics_service.generate_optimization_suggestions()
        
        return Response({
            'suggestions': suggestions,
            'total_count': len(suggestions)
        })
    
    @action(detail=False, methods=['get'])
    def anomaly_detection(self, request):
        """
        Detect anomalies in delivery patterns
        
        Query parameters:
        - campaign_id: Specific campaign to analyze (optional)
        """
        campaign_id = request.query_params.get('campaign_id')
        
        if campaign_id:
            try:
                campaign_id = int(campaign_id)
                # Verify campaign belongs to user
                get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
            except ValueError:
                return Response(
                    {'error': 'campaign_id must be a valid integer'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        analytics_service = self.get_analytics_service()
        anomalies = analytics_service.detect_anomalies(campaign_id)
        
        return Response({
            'anomalies': anomalies,
            'total_count': len(anomalies),
            'campaign_id': campaign_id
        })
    
    @action(detail=True, methods=['get'])
    def campaign_analysis(self, request, pk=None):
        """
        Analyze performance of a specific campaign
        """
        try:
            campaign_id = int(pk)
            # Verify campaign belongs to user
            get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
        except ValueError:
            return Response(
                {'error': 'Invalid campaign ID'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        analytics_service = self.get_analytics_service()
        analysis = analytics_service.analyze_campaign_performance(campaign_id)
        
        if 'error' in analysis:
            return Response(analysis, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(analysis)
    
    @action(detail=False, methods=['get'])
    def performance_forecast(self, request):
        """
        Forecast campaign completion time
        
        Query parameters:
        - campaign_id: ID of the campaign to forecast (required)
        """
        campaign_id = request.query_params.get('campaign_id')
        
        if not campaign_id:
            return Response(
                {'error': 'campaign_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            campaign_id = int(campaign_id)
            # Verify campaign belongs to user
            get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
        except ValueError:
            return Response(
                {'error': 'campaign_id must be a valid integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        analytics_service = self.get_analytics_service()
        forecast = analytics_service.forecast_completion_time(campaign_id)
        
        if 'error' in forecast:
            return Response(forecast, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(forecast)
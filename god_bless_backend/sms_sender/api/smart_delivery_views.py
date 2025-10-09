"""
Smart Delivery API Views
API endpoints for smart delivery engine functionality
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from ..models import SMSCampaign
from ..smart_delivery_engine import SmartDeliveryEngine
from ..rotation_manager import RotationManager


class SmartDeliveryViewSet(viewsets.ViewSet):
    """API endpoints for smart delivery engine functionality"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get delivery analytics for a campaign"""
        campaign = get_object_or_404(SMSCampaign, pk=pk, user=request.user)
        engine = SmartDeliveryEngine(request.user, campaign)
        
        analytics = engine.analyze_delivery_patterns()
        return Response(analytics)
    
    @action(detail=True, methods=['get'])
    def recommendations(self, request, pk=None):
        """Get delivery optimization recommendations for a campaign"""
        campaign = get_object_or_404(SMSCampaign, pk=pk, user=request.user)
        engine = SmartDeliveryEngine(request.user, campaign)
        
        recommendations = engine.get_delivery_recommendations()
        return Response({'recommendations': recommendations})
    
    @action(detail=True, methods=['post'])
    def detect_carrier(self, request, pk=None):
        """Detect carrier from phone number"""
        campaign = get_object_or_404(SMSCampaign, pk=pk, user=request.user)
        phone_number = request.data.get('phone_number')
        
        if not phone_number:
            return Response(
                {'error': 'phone_number is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        engine = SmartDeliveryEngine(request.user, campaign)
        carrier = engine.detect_carrier_from_phone(phone_number)
        timezone_name = engine.get_timezone_from_phone(phone_number)
        
        return Response({
            'phone_number': phone_number,
            'carrier': carrier,
            'timezone': timezone_name
        })
    
    @action(detail=True, methods=['post'])
    def optimal_send_time(self, request, pk=None):
        """Get optimal send time for a phone number"""
        campaign = get_object_or_404(SMSCampaign, pk=pk, user=request.user)
        phone_number = request.data.get('phone_number')
        
        if not phone_number:
            return Response(
                {'error': 'phone_number is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        engine = SmartDeliveryEngine(request.user, campaign)
        optimal_time = engine.predict_optimal_send_time(phone_number)
        
        return Response({
            'phone_number': phone_number,
            'optimal_send_time': optimal_time.isoformat(),
            'timezone': engine.get_timezone_from_phone(phone_number)
        })
    
    @action(detail=True, methods=['get'])
    def adaptive_rate_limit(self, request, pk=None):
        """Get adaptive rate limit for a carrier"""
        campaign = get_object_or_404(SMSCampaign, pk=pk, user=request.user)
        carrier = request.query_params.get('carrier')
        
        if not carrier:
            return Response(
                {'error': 'carrier parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        engine = SmartDeliveryEngine(request.user, campaign)
        rate_limit = engine.calculate_adaptive_rate_limit(carrier)
        
        return Response({
            'carrier': carrier,
            'adaptive_rate_limit': rate_limit,
            'base_rate_limit': campaign.rate_limit
        })
    
    @action(detail=True, methods=['post'])
    def optimal_servers(self, request, pk=None):
        """Get optimal server combination for a carrier and phone number"""
        campaign = get_object_or_404(SMSCampaign, pk=pk, user=request.user)
        carrier = request.data.get('carrier')
        phone_number = request.data.get('phone_number', '')
        
        if not carrier:
            return Response(
                {'error': 'carrier is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rotation_manager = RotationManager(request.user, campaign)
        proxy, smtp = rotation_manager.get_optimal_server_combination(carrier, phone_number)
        
        response_data = {
            'carrier': carrier,
            'phone_number': phone_number,
            'proxy_server': None,
            'smtp_server': None
        }
        
        if proxy:
            response_data['proxy_server'] = {
                'id': proxy.id,
                'host': proxy.host,
                'port': proxy.port,
                'success_rate': proxy.success_rate
            }
        
        if smtp:
            response_data['smtp_server'] = {
                'id': smtp.id,
                'host': smtp.host,
                'port': smtp.port,
                'success_rate': smtp.success_rate
            }
        
        return Response(response_data)
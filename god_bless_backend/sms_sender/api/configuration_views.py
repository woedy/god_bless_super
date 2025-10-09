"""
Configuration API Views
API endpoints for managing rotation and delivery settings
"""
from rest_framework import viewsets, status, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser
from django.http import HttpResponse
from django.db.models import Q, Avg, Count, Sum
from django.utils import timezone
from django.contrib.auth import get_user_model
import json
import csv
import io
from datetime import timedelta

from sms_sender.models import (
    CampaignDeliverySettings, 
    ServerUsageLog, 
    CarrierPerformanceLog,
    SMSCampaign,
    SMSMessage
)
from proxy_server.models import ProxyServer, RotationSettings
from smtps.models import SmtpManager

User = get_user_model()


class RotationSettingsSerializer(serializers.ModelSerializer):
    """Serializer for rotation and delay settings"""
    
    class Meta:
        model = RotationSettings
        fields = [
            'id', 'proxy_rotation_enabled', 'proxy_rotation_strategy',
            'proxy_health_check_interval', 'proxy_max_failures',
            'smtp_rotation_enabled', 'smtp_rotation_strategy',
            'smtp_health_check_interval', 'smtp_max_failures',
            'delivery_delay_enabled', 'delivery_delay_min', 'delivery_delay_max',
            'delivery_delay_random_seed', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CampaignDeliverySettingsSerializer(serializers.ModelSerializer):
    """Serializer for campaign delivery settings"""
    
    class Meta:
        model = CampaignDeliverySettings
        fields = [
            'id', 'campaign', 'use_proxy_rotation', 'proxy_rotation_strategy',
            'use_smtp_rotation', 'smtp_rotation_strategy', 'custom_delay_enabled',
            'custom_delay_min', 'custom_delay_max', 'custom_random_seed',
            'adaptive_optimization_enabled', 'carrier_optimization_enabled',
            'timezone_optimization_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ServerHealthSerializer(serializers.Serializer):
    """Serializer for server health information"""
    id = serializers.IntegerField()
    type = serializers.CharField()
    host = serializers.CharField()
    port = serializers.CharField()
    is_healthy = serializers.BooleanField()
    is_active = serializers.BooleanField()
    success_rate = serializers.FloatField()
    total_requests = serializers.IntegerField()
    successful_requests = serializers.IntegerField()
    failed_requests = serializers.IntegerField()
    last_used = serializers.DateTimeField(allow_null=True)
    last_health_check = serializers.DateTimeField(allow_null=True)
    health_check_failures = serializers.IntegerField()
    average_response_time = serializers.FloatField(allow_null=True)
    performance_score = serializers.FloatField()
    predicted_failure_risk = serializers.FloatField()


class BulkConfigurationSerializer(serializers.Serializer):
    """Serializer for bulk configuration import/export"""
    rotation_settings = RotationSettingsSerializer(required=False)
    proxy_servers = serializers.ListField(child=serializers.DictField(), required=False)
    smtp_servers = serializers.ListField(child=serializers.DictField(), required=False)
    campaign_templates = serializers.ListField(child=serializers.DictField(), required=False)
    export_format = serializers.ChoiceField(choices=['json', 'csv'], default='json', write_only=True)


class RotationSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing rotation and delay settings"""
    serializer_class = RotationSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return RotationSettings.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Get or create rotation settings for the current user"""
        settings, created = RotationSettings.objects.get_or_create(
            user=self.request.user,
            defaults={
                'proxy_rotation_enabled': True,
                'proxy_rotation_strategy': 'round_robin',
                'smtp_rotation_enabled': True,
                'smtp_rotation_strategy': 'round_robin',
                'delivery_delay_enabled': True,
                'delivery_delay_min': 1,
                'delivery_delay_max': 5
            }
        )
        return settings
    
    def list(self, request):
        """Get current rotation settings"""
        settings = self.get_object()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Update rotation settings"""
        settings = self.get_object()
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CampaignDeliverySettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for per-campaign delivery configuration"""
    serializer_class = CampaignDeliverySettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return CampaignDeliverySettings.objects.filter(campaign__user=self.request.user)
    
    def perform_create(self, serializer):
        # Ensure the campaign belongs to the current user
        campaign = serializer.validated_data['campaign']
        if campaign.user != self.request.user:
            raise serializers.ValidationError("Campaign does not belong to current user")
        serializer.save()


class ServerHealthViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for monitoring server health status"""
    serializer_class = ServerHealthSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # This is a read-only viewset, so we don't need a real queryset
        return []
    
    def list(self, request):
        """Get health status for all servers"""
        user = request.user
        
        # Get proxy servers
        proxy_servers = ProxyServer.objects.filter(user=user)
        proxy_health_data = []
        
        for proxy in proxy_servers:
            health_data = {
                'id': proxy.id,
                'type': 'proxy',
                'host': proxy.host,
                'port': str(proxy.port),
                'is_healthy': getattr(proxy, 'is_healthy', True),
                'is_active': proxy.is_active,
                'success_rate': getattr(proxy, 'success_rate', 0.0),
                'total_requests': getattr(proxy, 'total_requests', 0),
                'successful_requests': getattr(proxy, 'successful_requests', 0),
                'failed_requests': getattr(proxy, 'failed_requests', 0),
                'last_used': getattr(proxy, 'last_used', None),
                'last_health_check': getattr(proxy, 'last_health_check', None),
                'health_check_failures': getattr(proxy, 'health_check_failures', 0),
                'average_response_time': getattr(proxy, 'average_response_time', None),
                'performance_score': getattr(proxy, 'performance_score', 0.0),
                'predicted_failure_risk': getattr(proxy, 'predicted_failure_risk', 0.0)
            }
            proxy_health_data.append(health_data)
        
        # Get SMTP servers
        smtp_servers = SmtpManager.objects.filter(user=user)
        smtp_health_data = []
        
        for smtp in smtp_servers:
            health_data = {
                'id': smtp.id,
                'type': 'smtp',
                'host': smtp.host,
                'port': str(smtp.port),
                'is_healthy': getattr(smtp, 'is_healthy', True),
                'is_active': smtp.active,
                'success_rate': getattr(smtp, 'success_rate', 0.0),
                'total_requests': getattr(smtp, 'total_sent', 0),
                'successful_requests': getattr(smtp, 'successful_sent', 0),
                'failed_requests': getattr(smtp, 'failed_sent', 0),
                'last_used': getattr(smtp, 'last_used', None),
                'last_health_check': getattr(smtp, 'last_health_check', None),
                'health_check_failures': getattr(smtp, 'health_check_failures', 0),
                'average_response_time': getattr(smtp, 'average_response_time', None),
                'performance_score': getattr(smtp, 'performance_score', 0.0),
                'predicted_failure_risk': getattr(smtp, 'predicted_failure_risk', 0.0)
            }
            smtp_health_data.append(health_data)
        
        return Response({
            'proxy_servers': proxy_health_data,
            'smtp_servers': smtp_health_data,
            'total_servers': len(proxy_health_data) + len(smtp_health_data),
            'healthy_servers': len([s for s in proxy_health_data + smtp_health_data if s['is_healthy']]),
            'timestamp': timezone.now()
        })


class BulkConfigurationViewSet(viewsets.ViewSet):
    """ViewSet for bulk configuration import/export functionality"""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser]
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export configuration data"""
        export_format = request.query_params.get('format', 'json')
        user = request.user
        
        # Collect configuration data
        config_data = {
            'rotation_settings': {},
            'proxy_servers': [],
            'smtp_servers': [],
            'campaign_templates': []
        }
        
        # Get rotation settings
        try:
            rotation_settings = RotationSettings.objects.get(user=user)
            config_data['rotation_settings'] = RotationSettingsSerializer(rotation_settings).data
        except RotationSettings.DoesNotExist:
            pass
        
        # Get proxy servers
        proxy_servers = ProxyServer.objects.filter(user=user)
        for proxy in proxy_servers:
            config_data['proxy_servers'].append({
                'host': proxy.host,
                'port': proxy.port,
                'username': proxy.username,
                'is_active': proxy.is_active,
                'rotation_strategy': getattr(proxy, 'rotation_strategy', 'round_robin')
            })
        
        # Get SMTP servers
        smtp_servers = SmtpManager.objects.filter(user=user)
        for smtp in smtp_servers:
            config_data['smtp_servers'].append({
                'host': smtp.host,
                'port': smtp.port,
                'username': smtp.username,
                'use_tls': smtp.use_tls,
                'active': smtp.active
            })
        
        if export_format == 'csv':
            # Create CSV response
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="sms_configuration.csv"'
            
            writer = csv.writer(response)
            
            # Write proxy servers
            writer.writerow(['Proxy Servers'])
            writer.writerow(['Host', 'Port', 'Username', 'Active'])
            for proxy in config_data['proxy_servers']:
                writer.writerow([proxy['host'], proxy['port'], proxy['username'], proxy['is_active']])
            
            writer.writerow([])  # Empty row
            
            # Write SMTP servers
            writer.writerow(['SMTP Servers'])
            writer.writerow(['Host', 'Port', 'Username', 'Use TLS', 'Active'])
            for smtp in config_data['smtp_servers']:
                writer.writerow([smtp['host'], smtp['port'], smtp['username'], smtp['use_tls'], smtp['active']])
            
            return response
        else:
            # JSON response
            response = HttpResponse(
                json.dumps(config_data, indent=2, default=str),
                content_type='application/json'
            )
            response['Content-Disposition'] = 'attachment; filename="sms_configuration.json"'
            return response
    
    @action(detail=False, methods=['post'])
    def import_config(self, request):
        """Import configuration data"""
        try:
            if 'file' in request.FILES:
                # Handle file upload
                uploaded_file = request.FILES['file']
                if uploaded_file.name.endswith('.json'):
                    import_data = json.loads(uploaded_file.read().decode('utf-8'))
                elif uploaded_file.name.endswith('.csv'):
                    # Handle CSV import (simplified)
                    return Response(
                        {'error': 'CSV import not yet implemented'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                else:
                    return Response(
                        {'error': 'Unsupported file format'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # Handle JSON data in request body
                import_data = request.data
            
            # Validate and import data
            results = self._import_configuration_data(request.user, import_data)
            
            return Response(results, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Import failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _import_configuration_data(self, user, import_data):
        """Import configuration data for a user"""
        results = {
            'success': True,
            'imported': {
                'rotation_settings': False,
                'proxy_servers': 0,
                'smtp_servers': 0,
                'campaign_templates': 0
            },
            'errors': []
        }
        
        try:
            # Import rotation settings
            if 'rotation_settings' in import_data:
                rotation_data = import_data['rotation_settings']
                settings, created = RotationSettings.objects.get_or_create(user=user)
                
                # Update settings
                for key, value in rotation_data.items():
                    if hasattr(settings, key):
                        setattr(settings, key, value)
                
                settings.save()
                results['imported']['rotation_settings'] = True
            
            return results
            
        except Exception as e:
            results['success'] = False
            results['errors'].append(str(e))
            return results
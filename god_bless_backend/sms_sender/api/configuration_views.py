"""
Configuration API Views
API endpoints for managing rotation and delivery settings
"""
from rest_framework import viewsets, status, permissions, serializers
from rest_framework.decorators import action, api_view, permission_classes, renderer_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.renderers import JSONRenderer, BrowsableAPIRenderer, BaseRenderer
from django.http import HttpResponse
from django.db.models import Q, Avg, Count, Sum
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
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
            'selected_smtp_account_ids', 'selected_proxy_ids', 'applied_template_id',
            'adaptive_optimization_enabled', 'carrier_optimization_enabled',
            'timezone_optimization_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        errors = {}
        custom_delay_enabled = attrs.get('custom_delay_enabled', getattr(self.instance, 'custom_delay_enabled', False))
        if custom_delay_enabled:
            min_delay = attrs.get('custom_delay_min', getattr(self.instance, 'custom_delay_min', None))
            max_delay = attrs.get('custom_delay_max', getattr(self.instance, 'custom_delay_max', None))
            if min_delay is None or max_delay is None:
                errors['custom_delay_min'] = 'Custom delay range requires both minimum and maximum values.'
            elif min_delay < 0 or max_delay < 0:
                errors['custom_delay_min'] = 'Delivery delays must be zero or greater.'
            elif min_delay > max_delay:
                errors['custom_delay_max'] = 'Minimum delay cannot be greater than maximum delay.'

        for field in ['selected_smtp_account_ids', 'selected_proxy_ids']:
            values = attrs.get(field, getattr(self.instance, field, []))
            if values is None:
                continue
            if not isinstance(values, list):
                errors[field] = 'Expected a list of numeric identifiers.'
                continue
            invalid_values = [value for value in values if not isinstance(value, int)]
            if invalid_values:
                errors[field] = 'All selections must be numeric identifiers.'

        if errors:
            raise serializers.ValidationError(errors)

        return attrs


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


class BulkConfigurationCSVRenderer(BaseRenderer):
    media_type = 'text/csv'
    format = 'csv'
    charset = 'utf-8'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


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

    def create(self, request, *args, **kwargs):
        """Upsert rotation settings for the current user."""
        settings = self.get_object()
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        """Update rotation settings"""
        settings = self.get_object()
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def validate_settings(self, request):
        """Validate whether enough infrastructure exists for rotation settings."""
        active_proxies = ProxyServer.objects.filter(user=request.user, is_active=True, is_healthy=True).count()
        active_smtp_servers = SmtpManager.objects.filter(user=request.user, active=True, is_healthy=True).count()

        is_valid = active_proxies > 0 and active_smtp_servers > 0

        return Response({
            'is_valid': is_valid,
            'server_counts': {
                'active_proxies': active_proxies,
                'active_smtp_servers': active_smtp_servers,
            }
        })


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

    @action(detail=False, methods=['get'])
    def by_campaign(self, request):
        """Retrieve delivery settings for a specific campaign"""
        campaign_id = request.query_params.get('campaign_id')
        if not campaign_id:
            return Response({'detail': 'campaign_id query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        campaign = get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
        settings, _ = CampaignDeliverySettings.objects.get_or_create(campaign=campaign)
        serializer = self.get_serializer(settings)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def update_by_campaign(self, request):
        """Create or update delivery settings for a specific campaign"""
        campaign_id = request.data.get('campaign_id')
        if not campaign_id:
            return Response({'campaign_id': 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        campaign = get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
        settings, _ = CampaignDeliverySettings.objects.get_or_create(campaign=campaign)

        serializer = self.get_serializer(settings, data={**request.data, 'campaign': campaign.id}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(campaign=campaign)

        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def copy_from_template(self, request):
        """Apply a template payload to a campaign's delivery settings."""
        campaign_id = request.data.get('campaign_id')
        template_settings = request.data.get('template_settings')

        if not campaign_id:
            return Response({'campaign_id': 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(template_settings, dict):
            return Response({'template_settings': 'Provide a settings object to copy.'}, status=status.HTTP_400_BAD_REQUEST)

        campaign = get_object_or_404(SMSCampaign, id=campaign_id, user=request.user)
        settings, _ = CampaignDeliverySettings.objects.get_or_create(campaign=campaign)

        allowed_fields = {
            'use_proxy_rotation',
            'proxy_rotation_strategy',
            'use_smtp_rotation',
            'smtp_rotation_strategy',
            'custom_delay_enabled',
            'custom_delay_min',
            'custom_delay_max',
            'custom_random_seed',
            'selected_smtp_account_ids',
            'selected_proxy_ids',
            'applied_template_id',
            'adaptive_optimization_enabled',
            'carrier_optimization_enabled',
            'timezone_optimization_enabled',
        }

        updated = False
        for field, value in template_settings.items():
            if field in allowed_fields:
                setattr(settings, field, value)
                updated = True

        if updated:
            settings.save()

        return Response(self.get_serializer(settings).data)


class ServerHealthViewSet(viewsets.ViewSet):
    """ViewSet for monitoring server health status"""

    permission_classes = [permissions.IsAuthenticated]

    def _serialize_proxy(self, proxy: ProxyServer):
        return {
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

    def _serialize_smtp(self, smtp: SmtpManager):
        return {
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

    def list(self, request):
        """Return server health entries, optionally filtered by type."""
        user = request.user
        requested_type = request.query_params.get('type')

        proxies = ProxyServer.objects.filter(user=user)
        smtps = SmtpManager.objects.filter(user=user)

        payload = []
        if requested_type in (None, '', 'proxy', 'all'):
            payload.extend(self._serialize_proxy(proxy) for proxy in proxies)
        if requested_type in (None, '', 'smtp', 'all'):
            payload.extend(self._serialize_smtp(smtp) for smtp in smtps)

        return Response(payload)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Aggregate health metrics for proxies and SMTP accounts."""
        user = request.user
        proxy_data = [self._serialize_proxy(proxy) for proxy in ProxyServer.objects.filter(user=user)]
        smtp_data = [self._serialize_smtp(smtp) for smtp in SmtpManager.objects.filter(user=user)]

        proxy_total = len(proxy_data)
        proxy_healthy = len([entry for entry in proxy_data if entry['is_healthy']])
        smtp_total = len(smtp_data)
        smtp_healthy = len([entry for entry in smtp_data if entry['is_healthy']])

        total_servers = proxy_total + smtp_total
        healthy_servers = proxy_healthy + smtp_healthy
        health_percentage = 0.0
        if total_servers:
            health_percentage = round((healthy_servers / total_servers) * 100, 2)

        return Response({
            'proxy_servers': {
                'total': proxy_total,
                'healthy': proxy_healthy,
                'entries': proxy_data,
            },
            'smtp_servers': {
                'total': smtp_total,
                'healthy': smtp_healthy,
                'entries': smtp_data,
            },
            'overall_health': {
                'total_servers': total_servers,
                'healthy_servers': healthy_servers,
                'health_percentage': health_percentage,
            },
            'timestamp': timezone.now(),
        })

    @action(detail=False, methods=['post'])
    def force_health_check(self, request):
        """Simulate health checks for the requested servers."""
        server_ids = request.data.get('server_ids', [])
        server_type = request.data.get('server_type', 'all')
        if not isinstance(server_ids, list):
            return Response({'error': 'server_ids must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        results = []

        include_proxy = server_type in ('all', 'proxy', None, '')
        include_smtp = server_type in ('all', 'smtp', None, '')

        if include_proxy:
            proxies = ProxyServer.objects.filter(user=user)
            for proxy in proxies:
                if server_ids and proxy.id not in server_ids:
                    continue
                results.append({
                    'id': proxy.id,
                    'type': 'proxy',
                    'status': 'checked',
                    'last_checked_at': timezone.now(),
                })

        if include_smtp:
            smtps = SmtpManager.objects.filter(user=user)
            for smtp in smtps:
                if server_ids and smtp.id not in server_ids:
                    continue
                results.append({
                    'id': smtp.id,
                    'type': 'smtp',
                    'status': 'checked',
                    'last_checked_at': timezone.now(),
                })

        return Response({
            'results': results,
            'timestamp': timezone.now(),
        })


class BulkConfigurationViewSet(viewsets.ViewSet):
    """ViewSet for bulk configuration import/export functionality"""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser]
    renderer_classes = [JSONRenderer, BrowsableAPIRenderer, BulkConfigurationCSVRenderer]
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export configuration data"""
        export_format = request.query_params.get('format', 'json')
        user = request.user

        # Collect configuration data
        config_data = {
            'export_timestamp': timezone.now().isoformat(),
            'user_id': user.id,
            'rotation_settings': {},
            'proxy_servers': [],
            'smtp_servers': [],
            'campaign_templates': [],
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
                'protocol': getattr(proxy, 'protocol', 'http'),
                'is_active': proxy.is_active,
                'success_rate': getattr(proxy, 'success_rate', None),
            })

        # Get SMTP servers
        smtp_servers = SmtpManager.objects.filter(user=user)
        for smtp in smtp_servers:
            config_data['smtp_servers'].append({
                'host': smtp.host,
                'port': smtp.port,
                'ssl': smtp.ssl,
                'tls': smtp.tls,
                'active': smtp.active,
            })

        if export_format == 'csv':
            # Create CSV response
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="sms_configuration.csv"'
            
            writer = csv.writer(response)
            
            # Write proxy servers
            writer.writerow(['Proxy Servers'])
            writer.writerow(['Host', 'Port', 'Protocol', 'Active'])
            for proxy in config_data['proxy_servers']:
                writer.writerow([proxy['host'], proxy['port'], proxy['protocol'], proxy['is_active']])

            writer.writerow([])  # Empty row

            # Write SMTP servers
            writer.writerow(['SMTP Servers'])
            writer.writerow(['Host', 'Port', 'SSL', 'TLS', 'Active'])
            for smtp in config_data['smtp_servers']:
                writer.writerow([smtp['host'], smtp['port'], smtp['ssl'], smtp['tls'], smtp['active']])

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

    @action(detail=False, methods=['post'])
    def validate_import(self, request):
        """Validate configuration payload without importing it."""
        data = request.data
        summary = {
            'sections_found': [],
            'counts': {
                'rotation_settings': 0,
                'proxy_servers': 0,
                'smtp_servers': 0,
                'campaign_templates': 0,
            },
            'errors': [],
        }

        is_valid = True

        rotation_data = data.get('rotation_settings')
        if rotation_data is not None:
            serializer = RotationSettingsSerializer(data=rotation_data)
            if serializer.is_valid():
                summary['sections_found'].append('rotation_settings')
                summary['counts']['rotation_settings'] = 1
            else:
                is_valid = False
                summary['errors'].append({'rotation_settings': serializer.errors})

        proxy_payload = data.get('proxy_servers') or []
        if proxy_payload:
            summary['sections_found'].append('proxy_servers')
            summary['counts']['proxy_servers'] = len(proxy_payload)
            for proxy in proxy_payload:
                if 'host' not in proxy or 'port' not in proxy:
                    is_valid = False
                    summary['errors'].append({'proxy_servers': 'Each proxy must include host and port.'})
                    break

        smtp_payload = data.get('smtp_servers') or []
        if smtp_payload:
            summary['sections_found'].append('smtp_servers')
            summary['counts']['smtp_servers'] = len(smtp_payload)
            for smtp in smtp_payload:
                if 'host' not in smtp or 'port' not in smtp:
                    is_valid = False
                    summary['errors'].append({'smtp_servers': 'Each SMTP server must include host and port.'})
                    break

        template_payload = data.get('campaign_templates') or []
        if template_payload:
            summary['sections_found'].append('campaign_templates')
            summary['counts']['campaign_templates'] = len(template_payload)

        return Response({'is_valid': is_valid, 'summary': summary})
    
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

            # Import proxy servers
            for proxy in import_data.get('proxy_servers', []):
                proxy_port = proxy.get('port')
                try:
                    proxy_port = int(proxy_port) if proxy_port is not None else None
                except (TypeError, ValueError):
                    proxy_port = None

                ProxyServer.objects.update_or_create(
                    user=user,
                    host=proxy.get('host'),
                    port=proxy_port,
                    defaults={
                        'protocol': proxy.get('protocol', 'http'),
                        'is_active': proxy.get('is_active', True),
                    }
                )
                results['imported']['proxy_servers'] += 1

            # Import SMTP servers
            for smtp in import_data.get('smtp_servers', []):
                smtp_port = smtp.get('port')
                if smtp_port is not None:
                    smtp_port = str(smtp_port)

                SmtpManager.objects.update_or_create(
                    user=user,
                    host=smtp.get('host'),
                    port=smtp_port,
                    defaults={
                        'ssl': smtp.get('ssl', False),
                        'tls': smtp.get('tls', False),
                        'active': smtp.get('active', True),
                    }
                )
                results['imported']['smtp_servers'] += 1

            return results

        except Exception as e:
            results['success'] = False
            results['errors'].append(str(e))
            return results


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@renderer_classes([JSONRenderer, BrowsableAPIRenderer, BulkConfigurationCSVRenderer])
def bulk_configuration_export_view(request, format=None):
    viewset = BulkConfigurationViewSet()
    viewset.request = request
    viewset.args = ()
    viewset.kwargs = {}
    return viewset.export(request)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@renderer_classes([JSONRenderer, BrowsableAPIRenderer])
def bulk_configuration_import_view(request, format=None):
    viewset = BulkConfigurationViewSet()
    viewset.request = request
    viewset.args = ()
    viewset.kwargs = {}
    return viewset.import_config(request)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@renderer_classes([JSONRenderer, BrowsableAPIRenderer])
def bulk_configuration_validate_view(request, format=None):
    viewset = BulkConfigurationViewSet()
    viewset.request = request
    viewset.args = ()
    viewset.kwargs = {}
    return viewset.validate_import(request)
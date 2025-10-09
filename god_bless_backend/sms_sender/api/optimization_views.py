"""
API views for one-click optimization features.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from ..models import SMSCampaign
from ..optimization_service import OptimizationService
from ..serializers import SMSCampaignSerializer

logger = logging.getLogger(__name__)


class OptimizationViewSet(viewsets.ViewSet):
    """
    ViewSet for campaign optimization features.
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._optimization_service = None
    
    @property
    def optimization_service(self):
        """Lazy initialization of optimization service."""
        if self._optimization_service is None:
            self._optimization_service = OptimizationService(self.request.user)
        return self._optimization_service
    
    @action(detail=False, methods=['post'])
    def auto_optimize_campaign(self, request):
        """
        Automatically optimize a campaign's settings.
        
        POST /api/sms/optimization/auto_optimize_campaign/
        {
            "campaign_id": 123
        }
        """
        try:
            campaign_id = request.data.get('campaign_id')
            if not campaign_id:
                return Response(
                    {'error': 'campaign_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            campaign = get_object_or_404(
                SMSCampaign, 
                id=campaign_id, 
                user=request.user
            )
            
            result = self.optimization_service.auto_optimize_campaign(campaign)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Auto-optimization failed: {str(e)}")
            return Response(
                {'error': 'Optimization failed', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """
        Get optimization recommendations for the user.
        
        GET /api/sms/optimization/recommendations/
        """
        try:
            recommendations = self.optimization_service.get_optimization_recommendations()
            
            return Response({
                'success': True,
                'recommendations': recommendations,
                'count': len(recommendations)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Failed to get recommendations: {str(e)}")
            return Response(
                {'error': 'Failed to get recommendations', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def guidance(self, request):
        """
        Get real-time guidance for a specific context.
        
        POST /api/sms/optimization/guidance/
        {
            "context": "campaign_setup",
            "campaign_data": {...}
        }
        """
        try:
            context = request.data.get('context', 'general')
            campaign_data = request.data.get('campaign_data', {})
            
            guidance = self.optimization_service.get_real_time_guidance(
                context, campaign_data
            )
            
            return Response({
                'success': True,
                'guidance': guidance
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Failed to get guidance: {str(e)}")
            return Response(
                {'error': 'Failed to get guidance', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def enable_maintenance(self, request):
        """
        Enable maintenance mode for a server.
        
        POST /api/sms/optimization/enable_maintenance/
        {
            "server_type": "proxy",
            "server_id": 123,
            "duration_minutes": 30
        }
        """
        try:
            server_type = request.data.get('server_type')
            server_id = request.data.get('server_id')
            duration_minutes = request.data.get('duration_minutes', 30)
            
            if not server_type or not server_id:
                return Response(
                    {'error': 'server_type and server_id are required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if server_type not in ['proxy', 'smtp']:
                return Response(
                    {'error': 'server_type must be "proxy" or "smtp"'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            result = self.optimization_service.enable_maintenance_mode(
                server_type, server_id, duration_minutes
            )
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Failed to enable maintenance mode: {str(e)}")
            return Response(
                {'error': 'Failed to enable maintenance mode', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def disable_maintenance(self, request):
        """
        Disable maintenance mode for a server.
        
        POST /api/sms/optimization/disable_maintenance/
        {
            "server_type": "proxy",
            "server_id": 123
        }
        """
        try:
            server_type = request.data.get('server_type')
            server_id = request.data.get('server_id')
            
            if not server_type or not server_id:
                return Response(
                    {'error': 'server_type and server_id are required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if server_type not in ['proxy', 'smtp']:
                return Response(
                    {'error': 'server_type must be "proxy" or "smtp"'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            result = self.optimization_service.disable_maintenance_mode(
                server_type, server_id
            )
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Failed to disable maintenance mode: {str(e)}")
            return Response(
                {'error': 'Failed to disable maintenance mode', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def maintenance_status(self, request):
        """
        Get maintenance status for all servers.
        
        GET /api/sms/optimization/maintenance_status/
        """
        try:
            # Get all user's servers
            from proxy_server.models import ProxyServer
            from smtps.models import SmtpManager
            
            proxy_servers = ProxyServer.objects.filter(user=request.user)
            smtp_servers = SmtpManager.objects.filter(user=request.user)
            
            maintenance_status = {
                'proxy_servers': [],
                'smtp_servers': []
            }
            
            # Check maintenance status for proxy servers
            for server in proxy_servers:
                is_maintenance = self.optimization_service.is_server_in_maintenance(
                    'proxy', server.id
                )
                maintenance_status['proxy_servers'].append({
                    'id': server.id,
                    'host': server.host,
                    'port': server.port,
                    'is_maintenance': is_maintenance,
                    'is_active': server.is_active
                })
            
            # Check maintenance status for SMTP servers
            for server in smtp_servers:
                is_maintenance = self.optimization_service.is_server_in_maintenance(
                    'smtp', server.id
                )
                maintenance_status['smtp_servers'].append({
                    'id': server.id,
                    'host': server.host,
                    'port': server.port,
                    'is_maintenance': is_maintenance,
                    'is_active': server.is_active
                })
            
            return Response({
                'success': True,
                'maintenance_status': maintenance_status
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Failed to get maintenance status: {str(e)}")
            return Response(
                {'error': 'Failed to get maintenance status', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def bulk_optimize(self, request):
        """
        Bulk optimize multiple campaigns.
        
        POST /api/sms/optimization/bulk_optimize/
        {
            "campaign_ids": [1, 2, 3]
        }
        """
        try:
            campaign_ids = request.data.get('campaign_ids', [])
            if not campaign_ids:
                return Response(
                    {'error': 'campaign_ids is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            results = []
            for campaign_id in campaign_ids:
                try:
                    campaign = get_object_or_404(
                        SMSCampaign, 
                        id=campaign_id, 
                        user=request.user
                    )
                    
                    result = self.optimization_service.auto_optimize_campaign(campaign)
                    results.append({
                        'campaign_id': campaign_id,
                        'success': result['success'],
                        'optimization_applied': result.get('optimization_applied', False),
                        'error': result.get('error')
                    })
                    
                except Exception as e:
                    results.append({
                        'campaign_id': campaign_id,
                        'success': False,
                        'error': str(e)
                    })
            
            successful_count = sum(1 for r in results if r['success'])
            
            return Response({
                'success': True,
                'results': results,
                'total_campaigns': len(campaign_ids),
                'successful_optimizations': successful_count,
                'failed_optimizations': len(campaign_ids) - successful_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Bulk optimization failed: {str(e)}")
            return Response(
                {'error': 'Bulk optimization failed', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ConfigurationImportViewSet(viewsets.ViewSet):
    """
    ViewSet for importing server configurations.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def import_servers(self, request):
        """
        Import server configurations from CSV or JSON.
        
        POST /api/sms/optimization/import_servers/
        {
            "format": "json",
            "data": {...}
        }
        """
        try:
            format_type = request.data.get('format', 'json')
            data = request.data.get('data')
            
            if not data:
                return Response(
                    {'error': 'data is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if format_type not in ['json', 'csv']:
                return Response(
                    {'error': 'format must be "json" or "csv"'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Process import based on format
            if format_type == 'json':
                result = self._import_json_config(data, request.user)
            else:
                result = self._import_csv_config(data, request.user)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Configuration import failed: {str(e)}")
            return Response(
                {'error': 'Import failed', 'details': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _import_json_config(self, data, user):
        """Import configuration from JSON format."""
        from proxy_server.models import ProxyServer
        from smtps.models import SmtpManager
        
        imported_count = 0
        errors = []
        
        # Import proxy servers
        if 'proxy_servers' in data:
            for proxy_config in data['proxy_servers']:
                try:
                    ProxyServer.objects.create(
                        user=user,
                        host=proxy_config['host'],
                        port=proxy_config['port'],
                        username=proxy_config.get('username', ''),
                        password=proxy_config.get('password', ''),
                        is_active=proxy_config.get('is_active', True)
                    )
                    imported_count += 1
                except Exception as e:
                    errors.append(f"Proxy {proxy_config.get('host', 'unknown')}: {str(e)}")
        
        # Import SMTP servers
        if 'smtp_servers' in data:
            for smtp_config in data['smtp_servers']:
                try:
                    SmtpManager.objects.create(
                        user=user,
                        host=smtp_config['host'],
                        port=smtp_config['port'],
                        username=smtp_config.get('username', ''),
                        password=smtp_config.get('password', ''),
                        use_tls=smtp_config.get('use_tls', True),
                        is_active=smtp_config.get('is_active', True)
                    )
                    imported_count += 1
                except Exception as e:
                    errors.append(f"SMTP {smtp_config.get('host', 'unknown')}: {str(e)}")
        
        return {
            'success': True,
            'imported_count': imported_count,
            'errors': errors,
            'error_count': len(errors)
        }
    
    def _import_csv_config(self, data, user):
        """Import configuration from CSV format."""
        # This would parse CSV data and create server configurations
        # For now, return a placeholder response
        return {
            'success': True,
            'imported_count': 0,
            'errors': ['CSV import not yet implemented'],
            'error_count': 1
        }
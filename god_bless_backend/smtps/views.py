"""
API views for SMTP rotation and health monitoring
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
import json
from .models import SmtpManager
from .serializers import SmtpManagerSerializer
from .rotation_service import SMTPRotationService
from .tasks import check_smtp_health_for_user
from proxy_server.models import RotationSettings
import logging

logger = logging.getLogger(__name__)


class SmtpManagerViewSet(viewsets.ModelViewSet):
    """Enhanced SMTP Manager ViewSet with rotation and health monitoring"""
    serializer_class = SmtpManagerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return SmtpManager.objects.filter(user=self.request.user, is_archived=False)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def rotation_stats(self, request):
        """Get SMTP rotation statistics"""
        rotation_service = SMTPRotationService(request.user)
        stats = rotation_service.get_rotation_stats()
        return Response(stats)
    
    @action(detail=False, methods=['post'])
    def check_health(self, request):
        """Trigger health check for all user's SMTP servers"""
        rotation_service = SMTPRotationService(request.user)
        results = rotation_service.check_all_smtp_health()
        return Response({
            'message': 'Health check completed',
            'results': results
        })
    
    @action(detail=True, methods=['post'])
    def check_server_health(self, request, pk=None):
        """Check health of a specific SMTP server"""
        smtp = get_object_or_404(SmtpManager, pk=pk, user=request.user)
        rotation_service = SMTPRotationService(request.user)
        
        is_healthy, health_info = rotation_service.check_smtp_health(smtp)
        
        return Response({
            'is_healthy': is_healthy,
            'health_info': health_info,
            'server_info': {
                'id': smtp.id,
                'host': smtp.host,
                'port': smtp.port,
                'success_rate': smtp.get_success_rate()
            }
        })
    
    @action(detail=True, methods=['get'])
    def performance_metrics(self, request, pk=None):
        """Get detailed performance metrics for a specific SMTP server"""
        smtp = get_object_or_404(SmtpManager, pk=pk, user=request.user)
        rotation_service = SMTPRotationService(request.user)
        
        metrics = rotation_service.get_server_performance_metrics(smtp.id)
        return Response(metrics)
    
    @action(detail=False, methods=['get'])
    def next_server(self, request):
        """Get the next SMTP server based on rotation strategy"""
        rotation_service = SMTPRotationService(request.user)
        next_smtp = rotation_service.get_next_smtp()
        
        if next_smtp:
            serializer = self.get_serializer(next_smtp)
            return Response({
                'server': serializer.data,
                'strategy': rotation_service.settings.smtp_rotation_strategy,
                'rotation_enabled': rotation_service.settings.smtp_rotation_enabled
            })
        else:
            return Response({
                'message': 'No healthy SMTP servers available',
                'server': None
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def async_health_check(self, request):
        """Trigger asynchronous health check using Celery"""
        task = check_smtp_health_for_user.delay(request.user.id)
        
        return Response({
            'message': 'Health check started',
            'task_id': task.id
        })
    
    @action(detail=True, methods=['post'])
    def reset_health(self, request, pk=None):
        """Reset health status of a specific SMTP server"""
        smtp = get_object_or_404(SmtpManager, pk=pk, user=request.user)
        
        smtp.is_healthy = True
        smtp.health_check_failures = 0
        smtp.consecutive_failures = 0
        smtp.last_error_message = None
        smtp.save()
        
        logger.info(f"Reset health status for SMTP server {smtp} by user {request.user.username}")
        
        return Response({
            'message': f'Health status reset for SMTP server {smtp}',
            'server_id': smtp.id
        })
    
    @action(detail=False, methods=['get', 'post'])
    def rotation_settings(self, request):
        """Get or update SMTP rotation settings"""
        settings, created = RotationSettings.objects.get_or_create(
            user=request.user,
            defaults={
                'smtp_rotation_enabled': True,
                'smtp_rotation_strategy': 'round_robin',
                'smtp_health_check_interval': 300,
                'smtp_max_failures': 3
            }
        )
        
        if request.method == 'GET':
            return Response({
                'smtp_rotation_enabled': settings.smtp_rotation_enabled,
                'smtp_rotation_strategy': settings.smtp_rotation_strategy,
                'smtp_health_check_interval': settings.smtp_health_check_interval,
                'smtp_max_failures': settings.smtp_max_failures,
                'available_strategies': [
                    'round_robin',
                    'random',
                    'least_used',
                    'best_performance'
                ]
            })
        
        elif request.method == 'POST':
            # Update settings
            data = request.data
            
            if 'smtp_rotation_enabled' in data:
                settings.smtp_rotation_enabled = data['smtp_rotation_enabled']
            
            if 'smtp_rotation_strategy' in data:
                valid_strategies = ['round_robin', 'random', 'least_used', 'best_performance']
                if data['smtp_rotation_strategy'] in valid_strategies:
                    settings.smtp_rotation_strategy = data['smtp_rotation_strategy']
                else:
                    return Response({
                        'error': f'Invalid strategy. Must be one of: {valid_strategies}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if 'smtp_health_check_interval' in data:
                interval = data['smtp_health_check_interval']
                if 60 <= interval <= 3600:  # Between 1 minute and 1 hour
                    settings.smtp_health_check_interval = interval
                else:
                    return Response({
                        'error': 'Health check interval must be between 60 and 3600 seconds'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if 'smtp_max_failures' in data:
                max_failures = data['smtp_max_failures']
                if 1 <= max_failures <= 10:
                    settings.smtp_max_failures = max_failures
                else:
                    return Response({
                        'error': 'Max failures must be between 1 and 10'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            settings.save()
            
            logger.info(f"Updated SMTP rotation settings for user {request.user.username}")
            
            return Response({
                'message': 'Settings updated successfully',
                'smtp_rotation_enabled': settings.smtp_rotation_enabled,
                'smtp_rotation_strategy': settings.smtp_rotation_strategy,
                'smtp_health_check_interval': settings.smtp_health_check_interval,
                'smtp_max_failures': settings.smtp_max_failures
            })


# Function-based views for backward compatibility
@csrf_exempt
@login_required
def add_smtp_view(request):
    """Add new SMTP server"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            smtp = SmtpManager.objects.create(
                user=request.user,
                host=data.get('host'),
                port=data.get('port'),
                username=data.get('username'),
                password=data.get('password'),
                ssl=data.get('ssl', False),
                tls=data.get('tls', False)
            )
            
            return JsonResponse({
                'success': True,
                'message': 'SMTP server added successfully',
                'smtp_id': smtp.id
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)
    
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def get_smtps_view(request):
    """Get all SMTP servers for user"""
    if request.method == 'GET':
        smtps = SmtpManager.objects.filter(user=request.user, is_archived=False)
        serializer = SmtpManagerSerializer(smtps, many=True)
        
        return JsonResponse({
            'success': True,
            'smtps': serializer.data
        })
    
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def delete_smtp(request):
    """Delete SMTP server"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            smtp_id = data.get('smtp_id')
            
            smtp = SmtpManager.objects.get(id=smtp_id, user=request.user)
            smtp.is_archived = True
            smtp.save()
            
            return JsonResponse({
                'success': True,
                'message': 'SMTP server deleted successfully'
            })
            
        except SmtpManager.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'SMTP server not found'
            }, status=404)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)
    
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def check_smtp_health_view(request):
    """Check health of a specific SMTP server"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            smtp_id = data.get('smtp_id')
            
            smtp = SmtpManager.objects.get(id=smtp_id, user=request.user)
            rotation_service = SMTPRotationService(request.user)
            
            is_healthy, health_info = rotation_service.check_smtp_health(smtp)
            
            return JsonResponse({
                'success': True,
                'is_healthy': is_healthy,
                'health_info': health_info
            })
            
        except SmtpManager.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'SMTP server not found'
            }, status=404)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)
    
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def check_all_smtp_health_view(request):
    """Check health of all user's SMTP servers"""
    if request.method == 'POST':
        try:
            rotation_service = SMTPRotationService(request.user)
            results = rotation_service.check_all_smtp_health()
            
            return JsonResponse({
                'success': True,
                'results': results
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)
    
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
@login_required
def get_smtp_rotation_stats_view(request):
    """Get SMTP rotation statistics"""
    if request.method == 'GET':
        try:
            rotation_service = SMTPRotationService(request.user)
            stats = rotation_service.get_rotation_stats()
            
            return JsonResponse({
                'success': True,
                'stats': stats
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)
    
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)
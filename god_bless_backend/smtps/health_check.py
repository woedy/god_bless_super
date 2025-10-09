"""
Health check utilities for SMTP rotation service
Used by Docker health checks and monitoring systems
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import SmtpManager
from .rotation_service import SMTPRotationService
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET"])
def smtp_service_health(request):
    """
    Health check endpoint for SMTP rotation service
    Returns overall health status of SMTP infrastructure
    """
    try:
        # Get overall SMTP health statistics
        total_servers = SmtpManager.objects.filter(active=True, is_archived=False).count()
        healthy_servers = SmtpManager.objects.filter(
            active=True, 
            is_archived=False, 
            is_healthy=True
        ).count()
        
        # Calculate health percentage
        health_percentage = (healthy_servers / total_servers * 100) if total_servers > 0 else 100
        
        # Determine overall status
        if health_percentage >= 80:
            status = "healthy"
            http_status = 200
        elif health_percentage >= 50:
            status = "degraded"
            http_status = 200
        else:
            status = "unhealthy"
            http_status = 503
        
        # Get recent activity
        recent_activity = SmtpManager.objects.filter(
            active=True,
            is_archived=False,
            last_used__gte=timezone.now() - timezone.timedelta(hours=1)
        ).count()
        
        response_data = {
            "status": status,
            "timestamp": timezone.now().isoformat(),
            "smtp_servers": {
                "total": total_servers,
                "healthy": healthy_servers,
                "unhealthy": total_servers - healthy_servers,
                "health_percentage": round(health_percentage, 2)
            },
            "recent_activity": {
                "servers_used_last_hour": recent_activity
            },
            "service": "smtp_rotation_service",
            "version": "1.0.0"
        }
        
        return JsonResponse(response_data, status=http_status)
        
    except Exception as e:
        logger.error(f"SMTP health check failed: {e}")
        return JsonResponse({
            "status": "error",
            "error": str(e),
            "timestamp": timezone.now().isoformat(),
            "service": "smtp_rotation_service"
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def smtp_detailed_health(request):
    """
    Detailed health check endpoint with per-user statistics
    """
    try:
        users_data = []
        overall_stats = {
            "total_users": 0,
            "total_servers": 0,
            "healthy_servers": 0,
            "total_emails_sent": 0,
            "successful_emails": 0
        }
        
        active_users = User.objects.filter(is_active=True)
        
        for user in active_users:
            user_servers = SmtpManager.objects.filter(
                user=user,
                active=True,
                is_archived=False
            )
            
            if user_servers.exists():
                rotation_service = SMTPRotationService(user)
                user_stats = rotation_service.get_rotation_stats()
                
                users_data.append({
                    "user_id": user.id,
                    "username": user.username,
                    "stats": user_stats
                })
                
                # Aggregate stats
                overall_stats["total_servers"] += user_stats["total_smtp_servers"]
                overall_stats["healthy_servers"] += user_stats["healthy_smtp_servers"]
                overall_stats["total_emails_sent"] += user_stats["total_emails_sent"]
                overall_stats["successful_emails"] += user_stats["successful_emails"]
        
        overall_stats["total_users"] = len(users_data)
        overall_stats["overall_success_rate"] = (
            overall_stats["successful_emails"] / overall_stats["total_emails_sent"] * 100
        ) if overall_stats["total_emails_sent"] > 0 else 0
        
        return JsonResponse({
            "status": "healthy",
            "timestamp": timezone.now().isoformat(),
            "overall_stats": overall_stats,
            "users": users_data,
            "service": "smtp_rotation_service_detailed"
        })
        
    except Exception as e:
        logger.error(f"Detailed SMTP health check failed: {e}")
        return JsonResponse({
            "status": "error",
            "error": str(e),
            "timestamp": timezone.now().isoformat(),
            "service": "smtp_rotation_service_detailed"
        }, status=500)


def check_smtp_service_readiness():
    """
    Check if SMTP rotation service is ready to handle requests
    Used for Docker readiness probes
    """
    try:
        # Check database connectivity
        SmtpManager.objects.exists()
        
        # Check cache connectivity
        from django.core.cache import cache
        cache.set('smtp_readiness_check', 'ok', timeout=10)
        cache.get('smtp_readiness_check')
        
        return True, "Service ready"
        
    except Exception as e:
        return False, f"Service not ready: {e}"


@csrf_exempt
@require_http_methods(["GET"])
def smtp_readiness_check(request):
    """
    Readiness check endpoint for Docker
    """
    is_ready, message = check_smtp_service_readiness()
    
    if is_ready:
        return JsonResponse({
            "status": "ready",
            "message": message,
            "timestamp": timezone.now().isoformat()
        })
    else:
        return JsonResponse({
            "status": "not_ready",
            "message": message,
            "timestamp": timezone.now().isoformat()
        }, status=503)
"""
Celery tasks for SMTP rotation and health monitoring
"""
from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone
from .rotation_service import SMTPRotationService
from .models import SmtpManager
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True)
def check_smtp_health_for_all_users(self):
    """
    Periodic task to check SMTP health for all active users
    Should be run every 5-15 minutes via Celery beat
    """
    logger.info("Starting periodic SMTP health check for all users")
    
    users = User.objects.filter(is_active=True)
    total_users = users.count()
    total_servers = 0
    healthy_servers = 0
    
    for user in users:
        try:
            rotation_service = SMTPRotationService(user)
            results = rotation_service.check_all_smtp_health()
            
            user_healthy = sum(1 for r in results if r['is_healthy'])
            user_total = len(results)
            
            total_servers += user_total
            healthy_servers += user_healthy
            
            logger.debug(f"User {user.username}: {user_healthy}/{user_total} servers healthy")
            
        except Exception as e:
            logger.error(f"Error checking SMTP health for user {user.username}: {e}")
    
    health_percentage = (healthy_servers / total_servers * 100) if total_servers > 0 else 100
    
    logger.info(
        f"SMTP health check completed: {healthy_servers}/{total_servers} servers healthy "
        f"({health_percentage:.1f}%) across {total_users} users"
    )
    
    return {
        'total_users': total_users,
        'total_servers': total_servers,
        'healthy_servers': healthy_servers,
        'health_percentage': health_percentage,
        'timestamp': timezone.now().isoformat()
    }


@shared_task(bind=True)
def check_smtp_health_for_user(self, user_id):
    """
    Check SMTP health for a specific user
    """
    try:
        user = User.objects.get(id=user_id)
        rotation_service = SMTPRotationService(user)
        results = rotation_service.check_all_smtp_health()
        
        healthy_count = sum(1 for r in results if r['is_healthy'])
        total_count = len(results)
        
        logger.info(f"SMTP health check for user {user.username}: {healthy_count}/{total_count} servers healthy")
        
        return {
            'user_id': user_id,
            'username': user.username,
            'healthy_servers': healthy_count,
            'total_servers': total_count,
            'results': results,
            'timestamp': timezone.now().isoformat()
        }
        
    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} does not exist")
        return {'error': f'User with ID {user_id} does not exist'}
    except Exception as e:
        logger.error(f"Error checking SMTP health for user ID {user_id}: {e}")
        return {'error': str(e)}


@shared_task(bind=True)
def cleanup_unhealthy_smtp_servers(self):
    """
    Cleanup task to handle servers that have been unhealthy for too long
    """
    logger.info("Starting cleanup of unhealthy SMTP servers")
    
    # Find servers that have been unhealthy for more than 24 hours
    cutoff_time = timezone.now() - timezone.timedelta(hours=24)
    
    unhealthy_servers = SmtpManager.objects.filter(
        is_healthy=False,
        last_health_check__lt=cutoff_time,
        active=True
    )
    
    deactivated_count = 0
    
    for smtp in unhealthy_servers:
        # Deactivate servers that have been unhealthy for too long
        if smtp.health_check_failures >= 10:  # More than 10 failures
            smtp.active = False
            smtp.save()
            deactivated_count += 1
            logger.warning(f"Deactivated SMTP server {smtp} due to prolonged health issues")
    
    logger.info(f"Cleanup completed: {deactivated_count} servers deactivated")
    
    return {
        'deactivated_servers': deactivated_count,
        'timestamp': timezone.now().isoformat()
    }


@shared_task(bind=True)
def generate_smtp_performance_report(self, user_id=None):
    """
    Generate performance report for SMTP servers
    """
    logger.info(f"Generating SMTP performance report for user {user_id or 'all users'}")
    
    if user_id:
        try:
            user = User.objects.get(id=user_id)
            users = [user]
        except User.DoesNotExist:
            return {'error': f'User with ID {user_id} does not exist'}
    else:
        users = User.objects.filter(is_active=True)
    
    report_data = []
    
    for user in users:
        rotation_service = SMTPRotationService(user)
        stats = rotation_service.get_rotation_stats()
        
        user_report = {
            'user_id': user.id,
            'username': user.username,
            'stats': stats
        }
        
        report_data.append(user_report)
    
    logger.info(f"Performance report generated for {len(report_data)} users")
    
    return {
        'report_data': report_data,
        'generated_at': timezone.now().isoformat()
    }
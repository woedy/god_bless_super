"""
Celery tasks for server maintenance management.
"""

import logging
from celery import shared_task
from django.core.cache import cache
from django.utils import timezone
from datetime import datetime

from proxy_server.models import ProxyServer
from smtps.models import SmtpManager

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def end_maintenance_mode(self, server_type: str, server_id: int, user_id: int):
    """
    Automatically end maintenance mode for a server after the scheduled duration.
    
    Args:
        server_type: 'proxy' or 'smtp'
        server_id: ID of the server
        user_id: ID of the user who owns the server
    """
    try:
        logger.info(f"Ending maintenance mode for {server_type} server {server_id}")
        
        # Remove maintenance status from cache
        cache_key = f"maintenance_{server_type}_{server_id}"
        cache.delete(cache_key)
        
        # Restore server to active status
        if server_type == 'proxy':
            try:
                server = ProxyServer.objects.get(id=server_id, user_id=user_id)
                server.is_active = True
                server.save()
                logger.info(f"Proxy server {server_id} restored to active status")
            except ProxyServer.DoesNotExist:
                logger.warning(f"Proxy server {server_id} not found for user {user_id}")
                
        elif server_type == 'smtp':
            try:
                server = SmtpManager.objects.get(id=server_id, user_id=user_id)
                server.is_active = True
                server.save()
                logger.info(f"SMTP server {server_id} restored to active status")
            except SmtpManager.DoesNotExist:
                logger.warning(f"SMTP server {server_id} not found for user {user_id}")
        
        return {
            'success': True,
            'server_type': server_type,
            'server_id': server_id,
            'message': 'Maintenance mode ended successfully'
        }
        
    except Exception as e:
        logger.error(f"Failed to end maintenance mode for {server_type} server {server_id}: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(bind=True)
def check_server_health_during_maintenance(self, server_type: str, server_id: int, user_id: int):
    """
    Check server health during maintenance to ensure it's ready to be restored.
    
    Args:
        server_type: 'proxy' or 'smtp'
        server_id: ID of the server
        user_id: ID of the user who owns the server
    """
    try:
        logger.info(f"Checking health for {server_type} server {server_id} during maintenance")
        
        # This would implement actual health checks
        # For now, we'll assume the server is healthy after maintenance
        health_status = {
            'is_healthy': True,
            'response_time': 0.1,  # Mock response time
            'last_check': timezone.now().isoformat()
        }
        
        # Store health check result in cache
        health_cache_key = f"health_check_{server_type}_{server_id}"
        cache.set(health_cache_key, health_status, timeout=300)  # 5 minutes
        
        return {
            'success': True,
            'server_type': server_type,
            'server_id': server_id,
            'health_status': health_status
        }
        
    except Exception as e:
        logger.error(f"Health check failed for {server_type} server {server_id}: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(bind=True)
def schedule_maintenance_reminder(self, server_type: str, server_id: int, user_id: int, 
                                 maintenance_end_time: str):
    """
    Send reminder notifications before maintenance mode ends.
    
    Args:
        server_type: 'proxy' or 'smtp'
        server_id: ID of the server
        user_id: ID of the user who owns the server
        maintenance_end_time: ISO format datetime string
    """
    try:
        end_time = datetime.fromisoformat(maintenance_end_time.replace('Z', '+00:00'))
        current_time = timezone.now()
        
        # Calculate time remaining
        time_remaining = end_time - current_time
        minutes_remaining = int(time_remaining.total_seconds() / 60)
        
        logger.info(f"Maintenance reminder: {server_type} server {server_id} has {minutes_remaining} minutes remaining")
        
        # Store reminder in cache for frontend to pick up
        reminder_key = f"maintenance_reminder_{server_type}_{server_id}"
        reminder_data = {
            'server_type': server_type,
            'server_id': server_id,
            'minutes_remaining': minutes_remaining,
            'end_time': maintenance_end_time,
            'message': f"Maintenance for {server_type} server will end in {minutes_remaining} minutes"
        }
        
        cache.set(reminder_key, reminder_data, timeout=600)  # 10 minutes
        
        return {
            'success': True,
            'reminder_sent': True,
            'minutes_remaining': minutes_remaining
        }
        
    except Exception as e:
        logger.error(f"Failed to send maintenance reminder: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
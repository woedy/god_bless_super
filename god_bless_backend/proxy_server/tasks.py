"""
Celery tasks for proxy server operations
"""
from celery import shared_task
from django.contrib.auth import get_user_model
from .fetch_proxies import ProxyFetcher
from .rotation_service import ProxyRotationService
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(bind=True)
def download_and_test_proxies_task(self, user_id, protocols=['http', 'socks5'], limit=500):
    """
    Background task to download proxies from GeoNode and test their health
    """
    try:
        # Update task status
        self.update_state(state='PROGRESS', meta={'status': 'Starting proxy download...'})
        
        # Get user
        user = User.objects.get(id=user_id)
        
        # Create fetcher
        fetcher = ProxyFetcher(user_id=user_id)
        
        # Fetch proxies
        self.update_state(state='PROGRESS', meta={'status': 'Fetching proxies from GeoNode...'})
        proxies_data = fetcher.fetch_proxies(limit=limit, protocols=protocols)
        
        if not proxies_data:
            return {
                'status': 'error',
                'message': 'No proxies fetched from GeoNode',
                'stats': {'total': 0, 'added': 0, 'healthy': 0, 'unhealthy': 0}
            }
        
        # Add proxies to database
        self.update_state(state='PROGRESS', meta={
            'status': f'Adding {len(proxies_data)} proxies to database...',
            'currentStep': 'Fetching and adding proxies',
            'progress': 10
        })
        added_proxies = []
        unhealthy_proxies = []
        
        for i, proxy_data in enumerate(proxies_data):
            proxy = fetcher.add_proxy_to_database(proxy_data)
            if proxy:
                added_proxies.append(proxy)
            
            # Update progress (10-50% for adding)
            progress = 10 + int((i + 1) / len(proxies_data) * 40)
            self.update_state(
                state='PROGRESS', 
                meta={
                    'status': f'Added {i + 1}/{len(proxies_data)} proxies...',
                    'currentStep': 'Adding proxies to database',
                    'progress': progress
                }
            )
        
        # Test health of all added proxies
        self.update_state(state='PROGRESS', meta={
            'status': f'Testing health of {len(added_proxies)} proxies...',
            'currentStep': 'Testing proxy health',
            'progress': 50
        })
        rotation_service = ProxyRotationService(user)
        healthy_count = 0
        unhealthy_count = 0
        
        for i, proxy in enumerate(added_proxies):
            is_healthy = rotation_service.check_proxy_health(proxy)
            if is_healthy:
                healthy_count += 1
            else:
                unhealthy_count += 1
                unhealthy_proxies.append(proxy.id)
            
            # Update progress (50-100% for testing)
            progress = 50 + int((i + 1) / len(added_proxies) * 50)
            self.update_state(
                state='PROGRESS', 
                meta={
                    'status': f'Tested {i + 1}/{len(added_proxies)} proxies...',
                    'currentStep': f'Testing proxy health ({healthy_count} healthy, {unhealthy_count} unhealthy)',
                    'progress': progress,
                    'healthy': healthy_count,
                    'unhealthy': unhealthy_count
                }
            )
        
        # Optionally remove unhealthy proxies (keep them for now but mark as inactive)
        if unhealthy_proxies:
            from .models import ProxyServer
            ProxyServer.objects.filter(id__in=unhealthy_proxies).update(is_active=False)
            logger.info(f"Marked {len(unhealthy_proxies)} unhealthy proxies as inactive")
        
        result = {
            'status': 'completed',
            'message': f'Successfully processed {len(added_proxies)} proxies',
            'stats': {
                'total': len(proxies_data),
                'added': len(added_proxies),
                'healthy': healthy_count,
                'unhealthy': unhealthy_count
            }
        }
        
        logger.info(f"Proxy download task completed for user {user_id}: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error in proxy download task: {str(e)}")
        self.update_state(
            state='FAILURE', 
            meta={'status': f'Error: {str(e)}'}
        )
        raise


@shared_task
def cleanup_unhealthy_proxies_task(user_id):
    """
    Background task to remove unhealthy proxies
    """
    try:
        from .models import ProxyServer
        
        # Delete unhealthy proxies older than 1 day
        from django.utils import timezone
        from datetime import timedelta
        
        cutoff_time = timezone.now() - timedelta(days=1)
        
        unhealthy_proxies = ProxyServer.objects.filter(
            user_id=user_id,
            is_healthy=False,
            last_health_check__lt=cutoff_time
        )
        
        count = unhealthy_proxies.count()
        unhealthy_proxies.delete()
        
        logger.info(f"Cleaned up {count} unhealthy proxies for user {user_id}")
        return {'deleted_count': count}
        
    except Exception as e:
        logger.error(f"Error in cleanup task: {str(e)}")
        raise

"""
SMTP Rotation Service
Handles intelligent SMTP server rotation with health checking
"""
import random
import smtplib
from typing import Optional
from django.utils import timezone
from django.core.cache import cache
from .models import SmtpManager
from proxy_server.models import RotationSettings


class SMTPRotationService:
    """Service for managing SMTP rotation"""
    
    def __init__(self, user):
        self.user = user
        self.settings = self._get_or_create_settings()
    
    def _get_or_create_settings(self):
        """Get or create rotation settings for user"""
        settings, created = RotationSettings.objects.get_or_create(
            user=self.user,
            defaults={
                'smtp_rotation_enabled': True,
                'smtp_rotation_strategy': 'round_robin',
                'smtp_health_check_interval': 300,
                'smtp_max_failures': 3
            }
        )
        return settings
    
    def get_next_smtp(self) -> Optional[SmtpManager]:
        """Get next SMTP server based on rotation strategy"""
        if not self.settings.smtp_rotation_enabled:
            return None
        
        # Get all active and healthy SMTP servers
        smtp_servers = SmtpManager.objects.filter(
            user=self.user,
            active=True,
            is_healthy=True,
            is_archived=False
        )
        
        if not smtp_servers.exists():
            return None
        
        strategy = self.settings.smtp_rotation_strategy
        
        if strategy == 'round_robin':
            return self._round_robin_selection(smtp_servers)
        elif strategy == 'random':
            return self._random_selection(smtp_servers)
        elif strategy == 'least_used':
            return self._least_used_selection(smtp_servers)
        elif strategy == 'best_performance':
            return self._best_performance_selection(smtp_servers)
        
        return smtp_servers.first()
    
    def _round_robin_selection(self, smtp_servers):
        """Round-robin SMTP selection"""
        cache_key = f'smtp_rotation_index_{self.user.id}'
        current_index = cache.get(cache_key, 0)
        
        smtp_list = list(smtp_servers)
        if not smtp_list:
            return None
        
        smtp = smtp_list[current_index % len(smtp_list)]
        cache.set(cache_key, (current_index + 1) % len(smtp_list), timeout=3600)
        
        return smtp
    
    def _random_selection(self, smtp_servers):
        """Random SMTP selection"""
        smtp_list = list(smtp_servers)
        return random.choice(smtp_list) if smtp_list else None
    
    def _least_used_selection(self, smtp_servers):
        """Select SMTP with least usage"""
        return smtp_servers.order_by('total_emails_sent').first()
    
    def _best_performance_selection(self, smtp_servers):
        """Select SMTP with best success rate"""
        best_smtp = None
        best_rate = 0
        
        for smtp in smtp_servers:
            if smtp.total_emails_sent > 0:
                success_rate = smtp.successful_emails / smtp.total_emails_sent
                if success_rate > best_rate:
                    best_rate = success_rate
                    best_smtp = smtp
        
        return best_smtp or smtp_servers.first()
    
    def check_smtp_health(self, smtp: SmtpManager) -> bool:
        """Check if SMTP server is healthy"""
        try:
            # Try to connect to SMTP server
            if smtp.ssl:
                server = smtplib.SMTP_SSL(smtp.host, int(smtp.port), timeout=10)
            else:
                server = smtplib.SMTP(smtp.host, int(smtp.port), timeout=10)
                if smtp.tls:
                    server.starttls()
            
            # Try to login
            if smtp.username and smtp.password:
                server.login(smtp.username, smtp.password)
            
            server.quit()
            
            # Mark as healthy
            smtp.is_healthy = True
            smtp.health_check_failures = 0
            smtp.last_health_check = timezone.now()
            smtp.save()
            return True
            
        except Exception as e:
            smtp.mark_failure()
            smtp.last_health_check = timezone.now()
            smtp.save()
            return False
    
    def check_all_smtp_health(self):
        """Check health of all user's SMTP servers"""
        smtp_servers = SmtpManager.objects.filter(
            user=self.user,
            active=True,
            is_archived=False
        )
        
        results = []
        for smtp in smtp_servers:
            is_healthy = self.check_smtp_health(smtp)
            results.append({
                'smtp_id': smtp.id,
                'smtp': str(smtp),
                'is_healthy': is_healthy
            })
        
        return results
    
    def get_rotation_stats(self):
        """Get rotation statistics"""
        smtp_servers = SmtpManager.objects.filter(
            user=self.user,
            is_archived=False
        )
        
        total_smtp = smtp_servers.count()
        active_smtp = smtp_servers.filter(active=True).count()
        healthy_smtp = smtp_servers.filter(is_healthy=True, active=True).count()
        
        total_emails = sum(s.total_emails_sent for s in smtp_servers)
        successful_emails = sum(s.successful_emails for s in smtp_servers)
        failed_emails = sum(s.failed_emails for s in smtp_servers)
        
        success_rate = (successful_emails / total_emails * 100) if total_emails > 0 else 0
        
        return {
            'total_smtp_servers': total_smtp,
            'active_smtp_servers': active_smtp,
            'healthy_smtp_servers': healthy_smtp,
            'total_emails_sent': total_emails,
            'successful_emails': successful_emails,
            'failed_emails': failed_emails,
            'success_rate': round(success_rate, 2),
            'rotation_enabled': self.settings.smtp_rotation_enabled,
            'rotation_strategy': self.settings.smtp_rotation_strategy
        }

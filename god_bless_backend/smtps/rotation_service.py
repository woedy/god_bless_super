"""
SMTP Rotation Service
Handles intelligent SMTP server rotation with health checking
"""
import random
import smtplib
import logging
import time
import os
from typing import Optional, Dict, List, Tuple
from django.utils import timezone
from django.core.cache import cache
from django.db import transaction
from .models import SmtpManager
from proxy_server.models import RotationSettings

# Import Docker configuration if available
try:
    from .docker_config import configure_smtp_logging, get_smtp_health_check_settings, is_docker_environment
    if is_docker_environment():
        logger = configure_smtp_logging()
    else:
        logger = logging.getLogger(__name__)
except ImportError:
    logger = logging.getLogger(__name__)


class SMTPRotationService:
    """Enhanced service for managing SMTP rotation with health tracking and performance monitoring"""
    
    def __init__(self, user):
        self.user = user
        self.settings = self._get_or_create_settings()
        self.logger = logging.getLogger(f"{__name__}.{user.id}")
        
        # Load Docker-specific settings if available
        try:
            from .docker_config import get_smtp_health_check_settings
            self.docker_settings = get_smtp_health_check_settings()
        except ImportError:
            self.docker_settings = {
                'connection_timeout': 15,
                'max_failures_threshold': 3
            }
    
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
        """Get next SMTP server based on rotation strategy with enhanced selection logic"""
        if not self.settings.smtp_rotation_enabled:
            # If rotation is disabled, return the first available healthy server
            smtp = SmtpManager.objects.filter(
                user=self.user,
                active=True,
                is_healthy=True,
                is_archived=False
            ).first()
            
            if smtp:
                self.logger.info(f"Rotation disabled, using first available SMTP: {smtp}")
            return smtp
        
        # Get all active and healthy SMTP servers
        smtp_servers = SmtpManager.objects.filter(
            user=self.user,
            active=True,
            is_healthy=True,
            is_archived=False
        )
        
        if not smtp_servers.exists():
            self.logger.warning("No healthy SMTP servers available")
            return None
        
        strategy = self.settings.smtp_rotation_strategy
        self.logger.debug(f"Using rotation strategy: {strategy}")
        
        try:
            if strategy == 'round_robin':
                return self._round_robin_selection(smtp_servers)
            elif strategy == 'random':
                return self._random_selection(smtp_servers)
            elif strategy == 'least_used':
                return self._least_used_selection(smtp_servers)
            elif strategy == 'best_performance':
                return self._best_performance_selection(smtp_servers)
            else:
                self.logger.warning(f"Unknown rotation strategy: {strategy}, falling back to round_robin")
                return self._round_robin_selection(smtp_servers)
        except Exception as e:
            self.logger.error(f"Error in SMTP selection: {e}")
            return smtp_servers.first()
    
    def _round_robin_selection(self, smtp_servers):
        """Enhanced round-robin SMTP selection with better state management"""
        cache_key = f'smtp_rotation_index_{self.user.id}'
        
        with transaction.atomic():
            current_index = cache.get(cache_key, 0)
            smtp_list = list(smtp_servers.order_by('id'))  # Ensure consistent ordering
            
            if not smtp_list:
                return None
            
            smtp = smtp_list[current_index % len(smtp_list)]
            next_index = (current_index + 1) % len(smtp_list)
            cache.set(cache_key, next_index, timeout=3600)
            
            self.logger.debug(f"Round-robin selected SMTP {smtp} (index {current_index}/{len(smtp_list)})")
            return smtp
    
    def _random_selection(self, smtp_servers):
        """Enhanced random SMTP selection with weighted probability based on performance"""
        smtp_list = list(smtp_servers)
        if not smtp_list:
            return None
        
        # Use weighted selection based on success rate for better performance
        weights = []
        for smtp in smtp_list:
            if smtp.total_emails_sent > 0:
                success_rate = smtp.successful_emails / smtp.total_emails_sent
                # Give higher weight to servers with better success rates
                weight = max(0.1, success_rate)  # Minimum weight of 0.1
            else:
                weight = 1.0  # Default weight for unused servers
            weights.append(weight)
        
        # Weighted random selection
        selected_smtp = random.choices(smtp_list, weights=weights, k=1)[0]
        self.logger.debug(f"Random selection chose SMTP {selected_smtp}")
        return selected_smtp
    
    def _least_used_selection(self, smtp_servers):
        """Enhanced least-used SMTP selection with time-based weighting"""
        # Order by total usage, but also consider last_used time to balance load
        smtp_list = list(smtp_servers.order_by('total_emails_sent', 'last_used'))
        
        if not smtp_list:
            return None
        
        selected_smtp = smtp_list[0]
        self.logger.debug(f"Least-used selection chose SMTP {selected_smtp} (sent: {selected_smtp.total_emails_sent})")
        return selected_smtp
    
    def _best_performance_selection(self, smtp_servers):
        """Enhanced best performance selection with comprehensive scoring"""
        best_smtp = None
        best_score = -1
        
        for smtp in smtp_servers:
            score = self._calculate_performance_score(smtp)
            if score > best_score:
                best_score = score
                best_smtp = smtp
        
        if best_smtp:
            self.logger.debug(f"Best performance selection chose SMTP {best_smtp} (score: {best_score:.3f})")
        
        return best_smtp or smtp_servers.first()
    
    def _calculate_performance_score(self, smtp: SmtpManager) -> float:
        """Calculate comprehensive performance score for SMTP server"""
        if smtp.total_emails_sent == 0:
            return 0.5  # Default score for unused servers
        
        # Success rate (0-1)
        success_rate = smtp.successful_emails / smtp.total_emails_sent
        
        # Recency factor (prefer recently used servers)
        recency_factor = 1.0
        if smtp.last_used:
            hours_since_use = (timezone.now() - smtp.last_used).total_seconds() / 3600
            recency_factor = max(0.1, 1.0 - (hours_since_use / 24))  # Decay over 24 hours
        
        # Health factor
        health_factor = 1.0 if smtp.is_healthy else 0.1
        
        # Failure penalty
        failure_penalty = max(0.1, 1.0 - (smtp.health_check_failures * 0.1))
        
        # Combined score
        score = success_rate * recency_factor * health_factor * failure_penalty
        
        return score
    
    def check_smtp_health(self, smtp: SmtpManager) -> Tuple[bool, Dict]:
        """Enhanced SMTP health check with detailed diagnostics and performance metrics"""
        start_time = time.time()
        health_info = {
            'smtp_id': smtp.id,
            'host': smtp.host,
            'port': smtp.port,
            'connection_time': None,
            'auth_time': None,
            'total_time': None,
            'error': None,
            'error_type': None
        }
        
        try:
            # Connection phase
            connection_start = time.time()
            timeout = self.docker_settings.get('connection_timeout', 15)
            
            if smtp.ssl:
                server = smtplib.SMTP_SSL(smtp.host, int(smtp.port), timeout=timeout)
            else:
                server = smtplib.SMTP(smtp.host, int(smtp.port), timeout=timeout)
                if smtp.tls:
                    server.starttls()
            
            health_info['connection_time'] = time.time() - connection_start
            
            # Authentication phase
            auth_start = time.time()
            if smtp.username and smtp.password:
                server.login(smtp.username, smtp.password)
            health_info['auth_time'] = time.time() - auth_start
            
            server.quit()
            
            # Mark as healthy
            with transaction.atomic():
                smtp.is_healthy = True
                smtp.health_check_failures = 0
                smtp.last_health_check = timezone.now()
                smtp.save()
            
            health_info['total_time'] = time.time() - start_time
            
            self.logger.info(f"SMTP {smtp} health check passed (total: {health_info['total_time']:.3f}s)")
            return True, health_info
            
        except smtplib.SMTPAuthenticationError as e:
            health_info['error'] = str(e)
            health_info['error_type'] = 'authentication'
            self.logger.error(f"SMTP {smtp} authentication failed: {e}")
        except smtplib.SMTPConnectError as e:
            health_info['error'] = str(e)
            health_info['error_type'] = 'connection'
            self.logger.error(f"SMTP {smtp} connection failed: {e}")
        except smtplib.SMTPServerDisconnected as e:
            health_info['error'] = str(e)
            health_info['error_type'] = 'disconnection'
            self.logger.error(f"SMTP {smtp} server disconnected: {e}")
        except Exception as e:
            health_info['error'] = str(e)
            health_info['error_type'] = 'unknown'
            self.logger.error(f"SMTP {smtp} health check failed: {e}")
        
        # Mark as failed
        with transaction.atomic():
            smtp.mark_failure()
            smtp.last_health_check = timezone.now()
            smtp.save()
        
        health_info['total_time'] = time.time() - start_time
        return False, health_info
    
    def check_all_smtp_health(self) -> List[Dict]:
        """Enhanced health check for all user's SMTP servers with detailed reporting"""
        smtp_servers = SmtpManager.objects.filter(
            user=self.user,
            active=True,
            is_archived=False
        )
        
        results = []
        total_servers = smtp_servers.count()
        healthy_count = 0
        
        self.logger.info(f"Starting health check for {total_servers} SMTP servers")
        
        for smtp in smtp_servers:
            is_healthy, health_info = self.check_smtp_health(smtp)
            
            result = {
                'smtp_id': smtp.id,
                'smtp': str(smtp),
                'is_healthy': is_healthy,
                'health_info': health_info,
                'performance_score': self._calculate_performance_score(smtp),
                'last_used': smtp.last_used.isoformat() if smtp.last_used else None,
                'total_emails_sent': smtp.total_emails_sent,
                'success_rate': (smtp.successful_emails / smtp.total_emails_sent * 100) if smtp.total_emails_sent > 0 else 0
            }
            
            results.append(result)
            
            if is_healthy:
                healthy_count += 1
        
        self.logger.info(f"Health check completed: {healthy_count}/{total_servers} servers healthy")
        
        return results
    
    def get_rotation_stats(self) -> Dict:
        """Get comprehensive rotation statistics and performance metrics"""
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
        
        # Calculate server performance distribution
        server_stats = []
        for smtp in smtp_servers.filter(active=True):
            server_success_rate = (smtp.successful_emails / smtp.total_emails_sent * 100) if smtp.total_emails_sent > 0 else 0
            server_stats.append({
                'id': smtp.id,
                'host': smtp.host,
                'port': smtp.port,
                'is_healthy': smtp.is_healthy,
                'total_emails_sent': smtp.total_emails_sent,
                'success_rate': round(server_success_rate, 2),
                'performance_score': round(self._calculate_performance_score(smtp), 3),
                'last_used': smtp.last_used.isoformat() if smtp.last_used else None,
                'health_check_failures': smtp.health_check_failures
            })
        
        # Get current rotation index for round-robin
        cache_key = f'smtp_rotation_index_{self.user.id}'
        current_rotation_index = cache.get(cache_key, 0)
        
        return {
            'total_smtp_servers': total_smtp,
            'active_smtp_servers': active_smtp,
            'healthy_smtp_servers': healthy_smtp,
            'unhealthy_smtp_servers': active_smtp - healthy_smtp,
            'total_emails_sent': total_emails,
            'successful_emails': successful_emails,
            'failed_emails': failed_emails,
            'success_rate': round(success_rate, 2),
            'rotation_enabled': self.settings.smtp_rotation_enabled,
            'rotation_strategy': self.settings.smtp_rotation_strategy,
            'health_check_interval': self.settings.smtp_health_check_interval,
            'max_failures_threshold': self.settings.smtp_max_failures,
            'current_rotation_index': current_rotation_index,
            'server_stats': server_stats,
            'last_updated': timezone.now().isoformat()
        }
    
    def record_success(self, smtp: SmtpManager, response_time: float = None):
        """Record successful SMTP usage with performance metrics"""
        with transaction.atomic():
            smtp.mark_success()
            
            # Store response time in cache for performance tracking
            if response_time:
                cache_key = f'smtp_response_times_{smtp.id}'
                response_times = cache.get(cache_key, [])
                response_times.append(response_time)
                
                # Keep only last 100 response times
                if len(response_times) > 100:
                    response_times = response_times[-100:]
                
                cache.set(cache_key, response_times, timeout=3600)
        
        self.logger.debug(f"Recorded success for SMTP {smtp} (response_time: {response_time}s)")
    
    def record_failure(self, smtp: SmtpManager, error: str, error_type: str = None):
        """Record SMTP failure with detailed error information"""
        with transaction.atomic():
            smtp.mark_failure()
            
            # Store error information in cache for analysis
            cache_key = f'smtp_errors_{smtp.id}'
            errors = cache.get(cache_key, [])
            errors.append({
                'timestamp': timezone.now().isoformat(),
                'error': error,
                'error_type': error_type or 'unknown'
            })
            
            # Keep only last 50 errors
            if len(errors) > 50:
                errors = errors[-50:]
            
            cache.set(cache_key, errors, timeout=3600)
        
        self.logger.warning(f"Recorded failure for SMTP {smtp}: {error}")
    
    def get_server_performance_metrics(self, smtp_id: int) -> Dict:
        """Get detailed performance metrics for a specific SMTP server"""
        try:
            smtp = SmtpManager.objects.get(id=smtp_id, user=self.user)
        except SmtpManager.DoesNotExist:
            return {}
        
        # Get response times from cache
        response_times_key = f'smtp_response_times_{smtp_id}'
        response_times = cache.get(response_times_key, [])
        
        # Get recent errors from cache
        errors_key = f'smtp_errors_{smtp_id}'
        recent_errors = cache.get(errors_key, [])
        
        # Calculate metrics
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        success_rate = (smtp.successful_emails / smtp.total_emails_sent * 100) if smtp.total_emails_sent > 0 else 0
        
        return {
            'smtp_id': smtp_id,
            'host': smtp.host,
            'port': smtp.port,
            'is_healthy': smtp.is_healthy,
            'total_emails_sent': smtp.total_emails_sent,
            'successful_emails': smtp.successful_emails,
            'failed_emails': smtp.failed_emails,
            'success_rate': round(success_rate, 2),
            'performance_score': round(self._calculate_performance_score(smtp), 3),
            'average_response_time': round(avg_response_time, 3),
            'recent_response_times': response_times[-10:],  # Last 10 response times
            'recent_errors': recent_errors[-5:],  # Last 5 errors
            'health_check_failures': smtp.health_check_failures,
            'last_used': smtp.last_used.isoformat() if smtp.last_used else None,
            'last_health_check': smtp.last_health_check.isoformat() if smtp.last_health_check else None
        }

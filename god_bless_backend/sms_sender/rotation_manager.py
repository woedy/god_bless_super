"""
Rotation Manager
Coordinates all rotation services for SMS delivery
"""
import time
import logging
from typing import Optional, Dict, Any, Tuple, List
from django.utils import timezone
from django.db import transaction

from proxy_server.rotation_service import ProxyRotationService
from proxy_server.delivery_delay_service import DeliveryDelayService
from smtps.rotation_service import SMTPRotationService
from proxy_server.models import ProxyServer
from smtps.models import SmtpManager
from .models import CampaignDeliverySettings, ServerUsageLog, CarrierPerformanceLog
from .smart_delivery_engine import SmartDeliveryEngine


logger = logging.getLogger(__name__)


class RotationManager:
    """Coordinates all rotation services for SMS delivery"""
    
    def __init__(self, user, campaign):
        self.user = user
        self.campaign = campaign
        
        # Initialize services
        self.proxy_service = ProxyRotationService(user)
        self.smtp_service = SMTPRotationService(user)
        self.delay_service = DeliveryDelayService(user)
        self.smart_delivery_engine = SmartDeliveryEngine(user, campaign)
        
        # Initialize logging first
        self.logger = logging.getLogger(f"{__name__}.{user.id}.{campaign.id}")
        
        # Get campaign-specific settings
        self.delivery_settings = self._get_delivery_settings()
    
    def _get_delivery_settings(self) -> CampaignDeliverySettings:
        """Get or create delivery settings for the campaign"""
        settings, created = CampaignDeliverySettings.objects.get_or_create(
            campaign=self.campaign,
            defaults={
                'use_proxy_rotation': self.campaign.use_proxy_rotation,
                'use_smtp_rotation': self.campaign.use_smtp_rotation,
                'proxy_rotation_strategy': 'round_robin',
                'smtp_rotation_strategy': 'round_robin',
                'custom_delay_enabled': False,
                'custom_delay_min': 1,
                'custom_delay_max': 5,
                'adaptive_optimization_enabled': False,
                'carrier_optimization_enabled': False,
                'timezone_optimization_enabled': False
            }
        )
        
        if created:
            self.logger.info(f"Created default delivery settings for campaign {self.campaign.id}")
        
        return settings
    
    def get_next_proxy(self) -> Optional[ProxyServer]:
        """Get next proxy server based on campaign settings"""
        if not self.delivery_settings.use_proxy_rotation:
            self.logger.debug("Proxy rotation disabled for this campaign")
            return None
        
        # Update proxy service strategy if different from campaign settings
        if self.proxy_service.settings.proxy_rotation_strategy != self.delivery_settings.proxy_rotation_strategy:
            self.proxy_service.settings.proxy_rotation_strategy = self.delivery_settings.proxy_rotation_strategy
            self.proxy_service.settings.save()
        
        proxy = self.proxy_service.get_next_proxy()
        
        if proxy:
            self.logger.debug(f"Selected proxy: {proxy}")
            # Update usage tracking
            self._update_server_usage_log('proxy', proxy.id)
        else:
            self.logger.warning("No healthy proxy servers available")
        
        return proxy
    
    def get_next_smtp(self) -> Optional[SmtpManager]:
        """Get next SMTP server based on campaign settings"""
        if not self.delivery_settings.use_smtp_rotation:
            # Get first available healthy SMTP server
            smtp = SmtpManager.objects.filter(
                user=self.user,
                active=True,
                is_healthy=True,
                is_archived=False
            ).first()
            
            if smtp:
                self.logger.debug(f"SMTP rotation disabled, using first available: {smtp}")
                self._update_server_usage_log('smtp', smtp.id)
            else:
                self.logger.warning("No healthy SMTP servers available")
            
            return smtp
        
        # Update SMTP service strategy if different from campaign settings
        if self.smtp_service.settings.smtp_rotation_strategy != self.delivery_settings.smtp_rotation_strategy:
            self.smtp_service.settings.smtp_rotation_strategy = self.delivery_settings.smtp_rotation_strategy
            self.smtp_service.settings.save()
        
        smtp = self.smtp_service.get_next_smtp()
        
        if smtp:
            self.logger.debug(f"Selected SMTP: {smtp}")
            # Update usage tracking
            self._update_server_usage_log('smtp', smtp.id)
        else:
            self.logger.warning("No healthy SMTP servers available")
        
        return smtp
    
    def apply_delivery_delay(self) -> float:
        """Apply delivery delay based on campaign settings"""
        if self.delivery_settings.custom_delay_enabled:
            # Use campaign-specific delay settings
            min_delay = self.delivery_settings.custom_delay_min
            max_delay = self.delivery_settings.custom_delay_max
            
            # Temporarily update delay service settings
            original_settings = self.delay_service.get_delay_settings()
            self.delay_service.update_delay_settings(
                enabled=True,
                min_delay=min_delay,
                max_delay=max_delay,
                random_seed=self.delivery_settings.custom_random_seed
            )
            
            try:
                delay = self.delay_service.apply_delay()
                self.logger.debug(f"Applied custom delay: {delay:.2f}s")
                return delay
            finally:
                # Restore original settings
                self.delay_service.update_delay_settings(**original_settings)
        else:
            # Use global delay settings
            delay = self.delay_service.apply_delay()
            self.logger.debug(f"Applied global delay: {delay:.2f}s")
            return delay
    
    def get_optimal_server_combination(self, carrier: str, phone_number: str = None) -> Tuple[Optional[ProxyServer], Optional[SmtpManager]]:
        """Get optimal server combination based on carrier performance data using smart delivery engine"""
        if not self.delivery_settings.carrier_optimization_enabled or not carrier:
            # Use standard rotation
            return self.get_next_proxy(), self.get_next_smtp()
        
        # Use smart delivery engine for optimization
        proxy, smtp = self.smart_delivery_engine.get_optimal_server_combination(carrier, phone_number or "")
        
        if proxy and smtp:
            # Update usage tracking
            self._update_server_usage_log('proxy', proxy.id)
            self._update_server_usage_log('smtp', smtp.id)
            return proxy, smtp
        
        # Fall back to standard rotation
        self.logger.debug(f"Smart delivery engine returned no optimal combination for carrier {carrier}, using standard rotation")
        return self.get_next_proxy(), self.get_next_smtp()
    
    def record_success(self, server_type: str, server_id: int, response_time: float = None, carrier: str = None):
        """Record successful server usage"""
        try:
            if server_type == 'proxy':
                proxy = ProxyServer.objects.get(id=server_id, user=self.user)
                proxy.mark_success()
                self.proxy_service.record_success(proxy, response_time)
                
            elif server_type == 'smtp':
                smtp = SmtpManager.objects.get(id=server_id, user=self.user)
                smtp.mark_success()
                self.smtp_service.record_success(smtp, response_time)
            
            # Update server usage log
            self._update_server_usage_success(server_type, server_id, response_time)
            
            # Update carrier performance if available
            if carrier and server_type in ['proxy', 'smtp']:
                self._update_carrier_performance(carrier, server_id, server_type, True, response_time)
            
            self.logger.debug(f"Recorded success for {server_type} server {server_id}")
            
        except Exception as e:
            self.logger.error(f"Error recording success for {server_type} server {server_id}: {e}")
    
    def record_failure(self, server_type: str, server_id: int, error: str, error_type: str = None, carrier: str = None):
        """Record server failure"""
        try:
            if server_type == 'proxy':
                proxy = ProxyServer.objects.get(id=server_id, user=self.user)
                proxy.mark_failure()
                self.proxy_service.record_failure(proxy, error, error_type)
                
            elif server_type == 'smtp':
                smtp = SmtpManager.objects.get(id=server_id, user=self.user)
                smtp.mark_failure()
                self.smtp_service.record_failure(smtp, error, error_type)
            
            # Update server usage log
            self._update_server_usage_failure(server_type, server_id)
            
            # Update carrier performance if available
            if carrier and server_type in ['proxy', 'smtp']:
                self._update_carrier_performance(carrier, server_id, server_type, False)
            
            self.logger.warning(f"Recorded failure for {server_type} server {server_id}: {error}")
            
        except Exception as e:
            self.logger.error(f"Error recording failure for {server_type} server {server_id}: {e}")
    
    def _update_server_usage_log(self, server_type: str, server_id: int):
        """Update server usage log for the campaign"""
        try:
            usage_log, created = ServerUsageLog.objects.get_or_create(
                campaign=self.campaign,
                server_type=server_type,
                server_id=server_id,
                defaults={
                    'messages_processed': 0,
                    'successful_messages': 0,
                    'failed_messages': 0
                }
            )
            
            usage_log.messages_processed += 1
            usage_log.save()
            
        except Exception as e:
            self.logger.error(f"Error updating server usage log: {e}")
    
    def _update_server_usage_success(self, server_type: str, server_id: int, response_time: float = None):
        """Update server usage log with success"""
        try:
            usage_log = ServerUsageLog.objects.get(
                campaign=self.campaign,
                server_type=server_type,
                server_id=server_id
            )
            
            usage_log.successful_messages += 1
            
            # Update average response time
            if response_time:
                if usage_log.average_response_time:
                    # Calculate weighted average
                    total_successful = usage_log.successful_messages
                    usage_log.average_response_time = (
                        (usage_log.average_response_time * (total_successful - 1) + response_time) / total_successful
                    )
                else:
                    usage_log.average_response_time = response_time
            
            usage_log.save()
            
        except ServerUsageLog.DoesNotExist:
            self.logger.warning(f"Server usage log not found for {server_type} {server_id}")
        except Exception as e:
            self.logger.error(f"Error updating server usage success: {e}")
    
    def _update_server_usage_failure(self, server_type: str, server_id: int):
        """Update server usage log with failure"""
        try:
            usage_log = ServerUsageLog.objects.get(
                campaign=self.campaign,
                server_type=server_type,
                server_id=server_id
            )
            
            usage_log.failed_messages += 1
            usage_log.save()
            
        except ServerUsageLog.DoesNotExist:
            self.logger.warning(f"Server usage log not found for {server_type} {server_id}")
        except Exception as e:
            self.logger.error(f"Error updating server usage failure: {e}")
    
    def _update_carrier_performance(self, carrier: str, server_id: int, server_type: str, success: bool, delivery_time: float = None):
        """Update carrier performance data for optimization"""
        if not self.delivery_settings.carrier_optimization_enabled:
            return
        
        try:
            # We need both proxy and SMTP to create a performance log
            # For now, we'll skip this if we don't have both
            # This could be enhanced to track individual server performance per carrier
            pass
            
        except Exception as e:
            self.logger.error(f"Error updating carrier performance: {e}")
    
    def get_rotation_stats(self) -> Dict[str, Any]:
        """Get comprehensive rotation statistics"""
        proxy_stats = self.proxy_service.get_rotation_stats()
        smtp_stats = self.smtp_service.get_rotation_stats()
        delay_stats = self.delay_service.get_delay_settings()
        
        # Get campaign-specific usage stats
        campaign_usage = ServerUsageLog.objects.filter(campaign=self.campaign)
        
        proxy_usage = campaign_usage.filter(server_type='proxy')
        smtp_usage = campaign_usage.filter(server_type='smtp')
        
        return {
            'campaign_id': self.campaign.id,
            'campaign_name': self.campaign.name,
            'delivery_settings': {
                'use_proxy_rotation': self.delivery_settings.use_proxy_rotation,
                'proxy_rotation_strategy': self.delivery_settings.proxy_rotation_strategy,
                'use_smtp_rotation': self.delivery_settings.use_smtp_rotation,
                'smtp_rotation_strategy': self.delivery_settings.smtp_rotation_strategy,
                'custom_delay_enabled': self.delivery_settings.custom_delay_enabled,
                'custom_delay_min': self.delivery_settings.custom_delay_min,
                'custom_delay_max': self.delivery_settings.custom_delay_max,
                'adaptive_optimization_enabled': self.delivery_settings.adaptive_optimization_enabled,
                'carrier_optimization_enabled': self.delivery_settings.carrier_optimization_enabled
            },
            'proxy_stats': proxy_stats,
            'smtp_stats': smtp_stats,
            'delay_stats': delay_stats,
            'campaign_usage': {
                'proxy_servers_used': proxy_usage.count(),
                'smtp_servers_used': smtp_usage.count(),
                'total_proxy_messages': sum(log.messages_processed for log in proxy_usage),
                'total_smtp_messages': sum(log.messages_processed for log in smtp_usage),
                'proxy_success_rate': self._calculate_usage_success_rate(proxy_usage),
                'smtp_success_rate': self._calculate_usage_success_rate(smtp_usage)
            }
        }
    
    def _calculate_usage_success_rate(self, usage_logs) -> float:
        """Calculate success rate from usage logs"""
        total_processed = sum(log.messages_processed for log in usage_logs)
        total_successful = sum(log.successful_messages for log in usage_logs)
        
        if total_processed == 0:
            return 0.0
        
        return (total_successful / total_processed) * 100
    
    def get_adaptive_rate_limit(self, carrier: str = None) -> int:
        """Get adaptive rate limit using smart delivery engine"""
        if not self.delivery_settings.adaptive_optimization_enabled or not carrier:
            return self.campaign.rate_limit
        
        return self.smart_delivery_engine.calculate_adaptive_rate_limit(carrier)
    
    def get_optimal_send_time(self, phone_number: str) -> timezone.datetime:
        """Get optimal send time using smart delivery engine"""
        if not self.delivery_settings.timezone_optimization_enabled:
            return timezone.now()
        
        return self.smart_delivery_engine.predict_optimal_send_time(phone_number)
    
    def detect_carrier_from_phone(self, phone_number: str) -> str:
        """Detect carrier from phone number using smart delivery engine"""
        return self.smart_delivery_engine.detect_carrier_from_phone(phone_number)
    
    def update_carrier_performance(self, carrier: str, proxy_server: ProxyServer, smtp_server: SmtpManager, 
                                 success: bool, delivery_time: float = None):
        """Update carrier performance data using smart delivery engine"""
        self.smart_delivery_engine.update_carrier_performance(carrier, proxy_server, smtp_server, success, delivery_time)
    
    def get_delivery_analytics(self) -> Dict[str, Any]:
        """Get comprehensive delivery analytics from smart delivery engine"""
        return self.smart_delivery_engine.analyze_delivery_patterns()
    
    def get_delivery_recommendations(self) -> List[Dict[str, Any]]:
        """Get delivery optimization recommendations from smart delivery engine"""
        return self.smart_delivery_engine.get_delivery_recommendations()
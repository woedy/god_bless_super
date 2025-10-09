"""
One-click optimization service for SMS campaigns.
Provides automatic configuration, recommendations, and maintenance mode.
"""

import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from django.db.models import Avg, Count, Q
from django.utils import timezone
from django.core.cache import cache

from .models import SMSCampaign, SMSMessage, CampaignDeliverySettings
from proxy_server.models import ProxyServer
from smtps.models import SmtpManager
from .analytics_service import PredictiveAnalyticsService
from .smart_delivery_engine import SmartDeliveryEngine

logger = logging.getLogger(__name__)


class OptimizationService:
    """
    Service for automatic campaign optimization and recommendations.
    """
    
    def __init__(self, user):
        self.user = user
        self.analytics_service = PredictiveAnalyticsService(user)
        self.smart_delivery = SmartDeliveryEngine(user, None)
        
    def auto_optimize_campaign(self, campaign: SMSCampaign) -> Dict[str, Any]:
        """
        Automatically optimize campaign settings based on user's infrastructure.
        
        Args:
            campaign: The SMS campaign to optimize
            
        Returns:
            Dict containing optimized settings and analysis
        """
        try:
            logger.info(f"Starting auto-optimization for campaign {campaign.id}")
            
            # Analyze user's server infrastructure
            infrastructure_analysis = self._analyze_infrastructure()
            
            # Get historical performance data
            performance_data = self._get_historical_performance()
            
            # Generate optimal configuration
            optimal_config = self._generate_optimal_config(
                infrastructure_analysis, 
                performance_data,
                campaign
            )
            
            # Apply optimization to campaign
            self._apply_optimization(campaign, optimal_config)
            
            # Generate optimization report
            report = {
                'success': True,
                'optimization_applied': True,
                'config': optimal_config,
                'analysis': infrastructure_analysis,
                'performance_improvement': self._estimate_improvement(optimal_config),
                'recommendations': self._generate_recommendations(infrastructure_analysis),
                'timestamp': timezone.now().isoformat()
            }
            
            logger.info(f"Auto-optimization completed for campaign {campaign.id}")
            return report
            
        except Exception as e:
            logger.error(f"Auto-optimization failed for campaign {campaign.id}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }
    
    def get_optimization_recommendations(self) -> List[Dict[str, Any]]:
        """
        Generate optimization recommendations based on current infrastructure.
        
        Returns:
            List of recommendation objects
        """
        recommendations = []
        
        try:
            # Analyze current setup
            infrastructure = self._analyze_infrastructure()
            
            # Server recommendations
            if infrastructure['proxy_count'] < 2:
                recommendations.append({
                    'type': 'infrastructure',
                    'priority': 'high',
                    'title': 'Add More Proxy Servers',
                    'description': 'Consider adding more proxy servers to improve delivery rates and avoid IP-based rate limiting.',
                    'impact': 'High delivery rate improvement',
                    'action': 'Add 2-3 additional proxy servers'
                })
            
            if infrastructure['smtp_count'] < 2:
                recommendations.append({
                    'type': 'infrastructure',
                    'priority': 'high',
                    'title': 'Add More SMTP Servers',
                    'description': 'Multiple SMTP servers provide better failover and load distribution.',
                    'impact': 'Improved reliability and throughput',
                    'action': 'Configure additional SMTP servers'
                })
            
            # Performance recommendations
            if infrastructure['avg_success_rate'] < 0.85:
                recommendations.append({
                    'type': 'performance',
                    'priority': 'medium',
                    'title': 'Optimize Server Configuration',
                    'description': 'Current success rate is below optimal. Consider reviewing server settings.',
                    'impact': f"Potential {(0.90 - infrastructure['avg_success_rate']) * 100:.1f}% improvement",
                    'action': 'Review and optimize server configurations'
                })
            
            # Strategy recommendations
            if infrastructure['current_strategy'] == 'round_robin':
                recommendations.append({
                    'type': 'strategy',
                    'priority': 'low',
                    'title': 'Consider Performance-Based Routing',
                    'description': 'Switch to best_performance strategy for better results.',
                    'impact': 'Improved delivery success rates',
                    'action': 'Change rotation strategy to best_performance'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {str(e)}")
            return []
    
    def get_real_time_guidance(self, context: str, campaign_data: Dict = None) -> Dict[str, Any]:
        """
        Provide real-time guidance and tips based on current context.
        
        Args:
            context: Current context (e.g., 'campaign_setup', 'server_config')
            campaign_data: Optional campaign data for context-specific tips
            
        Returns:
            Dict containing guidance information
        """
        guidance = {
            'tips': [],
            'warnings': [],
            'suggestions': [],
            'context': context
        }
        
        try:
            if context == 'campaign_setup':
                guidance.update(self._get_campaign_setup_guidance(campaign_data))
            elif context == 'server_config':
                guidance.update(self._get_server_config_guidance())
            elif context == 'performance_review':
                guidance.update(self._get_performance_guidance())
            
            return guidance
            
        except Exception as e:
            logger.error(f"Failed to generate guidance for context {context}: {str(e)}")
            return guidance
    
    def enable_maintenance_mode(self, server_type: str, server_id: int, 
                              duration_minutes: int = 30) -> Dict[str, Any]:
        """
        Enable maintenance mode for a server with graceful handling.
        
        Args:
            server_type: 'proxy' or 'smtp'
            server_id: ID of the server
            duration_minutes: Duration of maintenance window
            
        Returns:
            Dict containing maintenance mode status
        """
        try:
            from .maintenance_tasks import end_maintenance_mode, schedule_maintenance_reminder
            
            end_time = timezone.now() + timedelta(minutes=duration_minutes)
            cache_key = f"maintenance_{server_type}_{server_id}"
            maintenance_data = {
                'enabled': True,
                'start_time': timezone.now().isoformat(),
                'end_time': end_time.isoformat(),
                'server_type': server_type,
                'server_id': server_id,
                'duration_minutes': duration_minutes
            }
            
            # Store maintenance status in cache
            cache.set(cache_key, maintenance_data, timeout=duration_minutes * 60)
            
            # Update server status
            if server_type == 'proxy':
                try:
                    server = ProxyServer.objects.get(id=server_id, user=self.user)
                    server.is_active = False
                    server.save()
                except ProxyServer.DoesNotExist:
                    pass
            elif server_type == 'smtp':
                try:
                    server = SmtpManager.objects.get(id=server_id, user=self.user)
                    server.is_active = False
                    server.save()
                except SmtpManager.DoesNotExist:
                    pass
            
            # Schedule automatic end of maintenance mode
            end_maintenance_mode.apply_async(
                args=[server_type, server_id, self.user.id],
                eta=end_time
            )
            
            # Schedule reminder 5 minutes before end
            if duration_minutes > 5:
                reminder_time = end_time - timedelta(minutes=5)
                schedule_maintenance_reminder.apply_async(
                    args=[server_type, server_id, self.user.id, end_time.isoformat()],
                    eta=reminder_time
                )
            
            logger.info(f"Maintenance mode enabled for {server_type} server {server_id}")
            
            return {
                'success': True,
                'maintenance_enabled': True,
                'server_type': server_type,
                'server_id': server_id,
                'duration_minutes': duration_minutes,
                'end_time': maintenance_data['end_time'],
                'auto_end_scheduled': True
            }
            
        except Exception as e:
            logger.error(f"Failed to enable maintenance mode: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def disable_maintenance_mode(self, server_type: str, server_id: int) -> Dict[str, Any]:
        """
        Disable maintenance mode and restore server to active status.
        
        Args:
            server_type: 'proxy' or 'smtp'
            server_id: ID of the server
            
        Returns:
            Dict containing maintenance mode status
        """
        try:
            cache_key = f"maintenance_{server_type}_{server_id}"
            cache.delete(cache_key)
            
            # Restore server status
            if server_type == 'proxy':
                try:
                    server = ProxyServer.objects.get(id=server_id, user=self.user)
                    server.is_active = True
                    server.save()
                except ProxyServer.DoesNotExist:
                    pass
            elif server_type == 'smtp':
                try:
                    server = SmtpManager.objects.get(id=server_id, user=self.user)
                    server.is_active = True
                    server.save()
                except SmtpManager.DoesNotExist:
                    pass
            
            logger.info(f"Maintenance mode disabled for {server_type} server {server_id}")
            
            return {
                'success': True,
                'maintenance_enabled': False,
                'server_type': server_type,
                'server_id': server_id
            }
            
        except Exception as e:
            logger.error(f"Failed to disable maintenance mode: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def is_server_in_maintenance(self, server_type: str, server_id: int) -> bool:
        """
        Check if a server is currently in maintenance mode.
        
        Args:
            server_type: 'proxy' or 'smtp'
            server_id: ID of the server
            
        Returns:
            True if server is in maintenance mode
        """
        cache_key = f"maintenance_{server_type}_{server_id}"
        maintenance_data = cache.get(cache_key)
        
        if maintenance_data:
            end_time = datetime.fromisoformat(maintenance_data['end_time'].replace('Z', '+00:00'))
            return timezone.now() < end_time
        
        return False
    
    def _analyze_infrastructure(self) -> Dict[str, Any]:
        """Analyze user's current server infrastructure."""
        proxy_servers = ProxyServer.objects.filter(user=self.user, is_active=True)
        smtp_servers = SmtpManager.objects.filter(user=self.user, is_active=True)
        
        # Get recent performance data
        recent_messages = SMSMessage.objects.filter(
            campaign__user=self.user,
            created_at__gte=timezone.now() - timedelta(days=7)
        )
        
        success_rate = 0
        if recent_messages.exists():
            successful = recent_messages.filter(status='sent').count()
            total = recent_messages.count()
            success_rate = successful / total if total > 0 else 0
        
        return {
            'proxy_count': proxy_servers.count(),
            'smtp_count': smtp_servers.count(),
            'total_servers': proxy_servers.count() + smtp_servers.count(),
            'avg_success_rate': success_rate,
            'recent_message_count': recent_messages.count(),
            'current_strategy': 'round_robin',  # Default, could be dynamic
            'health_status': 'good' if success_rate > 0.8 else 'needs_attention'
        }
    
    def _get_historical_performance(self) -> Dict[str, Any]:
        """Get historical performance data for optimization."""
        # Get performance data from last 30 days
        start_date = timezone.now() - timedelta(days=30)
        
        messages = SMSMessage.objects.filter(
            campaign__user=self.user,
            created_at__gte=start_date
        )
        
        if not messages.exists():
            return {
                'total_messages': 0,
                'success_rate': 0,
                'avg_delivery_time': 0,
                'peak_hours': [],
                'carrier_performance': {}
            }
        
        total_messages = messages.count()
        successful_messages = messages.filter(status='sent').count()
        success_rate = successful_messages / total_messages if total_messages > 0 else 0
        
        # Calculate average delivery time (mock data for now)
        avg_delivery_time = 2.5  # seconds
        
        return {
            'total_messages': total_messages,
            'success_rate': success_rate,
            'avg_delivery_time': avg_delivery_time,
            'peak_hours': [9, 10, 11, 14, 15, 16],  # Business hours
            'carrier_performance': self._get_carrier_performance()
        }
    
    def _get_carrier_performance(self) -> Dict[str, float]:
        """Get performance data by carrier."""
        # This would analyze actual carrier performance
        # For now, return mock data
        return {
            'verizon': 0.92,
            'att': 0.89,
            'tmobile': 0.91,
            'sprint': 0.87,
            'other': 0.85
        }
    
    def _generate_optimal_config(self, infrastructure: Dict, performance: Dict, 
                               campaign: SMSCampaign) -> Dict[str, Any]:
        """Generate optimal configuration based on analysis."""
        config = {
            'proxy_rotation_enabled': infrastructure['proxy_count'] > 1,
            'smtp_rotation_enabled': infrastructure['smtp_count'] > 1,
            'delivery_delay_enabled': True,
            'adaptive_optimization_enabled': True
        }
        
        # Choose optimal strategies based on infrastructure
        if infrastructure['proxy_count'] > 2:
            config['proxy_rotation_strategy'] = 'best_performance'
        elif infrastructure['proxy_count'] > 1:
            config['proxy_rotation_strategy'] = 'round_robin'
        else:
            config['proxy_rotation_strategy'] = 'single'
        
        if infrastructure['smtp_count'] > 2:
            config['smtp_rotation_strategy'] = 'best_performance'
        elif infrastructure['smtp_count'] > 1:
            config['smtp_rotation_strategy'] = 'round_robin'
        else:
            config['smtp_rotation_strategy'] = 'single'
        
        # Optimize delivery timing based on performance
        if performance['success_rate'] < 0.8:
            config['delivery_delay_min'] = 3
            config['delivery_delay_max'] = 8
        else:
            config['delivery_delay_min'] = 1
            config['delivery_delay_max'] = 3
        
        return config
    
    def _apply_optimization(self, campaign: SMSCampaign, config: Dict[str, Any]):
        """Apply optimization configuration to campaign."""
        settings, created = CampaignDeliverySettings.objects.get_or_create(
            campaign=campaign,
            defaults=config
        )
        
        if not created:
            for key, value in config.items():
                setattr(settings, key, value)
            settings.save()
    
    def _estimate_improvement(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Estimate performance improvement from optimization."""
        # This would use ML models to predict improvement
        # For now, return estimated improvements
        base_improvement = 0.05  # 5% base improvement
        
        if config.get('proxy_rotation_enabled'):
            base_improvement += 0.03
        if config.get('smtp_rotation_enabled'):
            base_improvement += 0.03
        if config.get('adaptive_optimization_enabled'):
            base_improvement += 0.02
        
        return {
            'estimated_success_rate_improvement': min(base_improvement, 0.15),  # Cap at 15%
            'estimated_delivery_time_improvement': 0.1,  # 10% faster
            'confidence': 0.85
        }
    
    def _generate_recommendations(self, infrastructure: Dict) -> List[Dict[str, str]]:
        """Generate specific recommendations based on infrastructure."""
        recommendations = []
        
        if infrastructure['proxy_count'] == 0:
            recommendations.append({
                'type': 'critical',
                'message': 'No proxy servers configured. Add proxy servers for better delivery rates.'
            })
        
        if infrastructure['smtp_count'] == 1:
            recommendations.append({
                'type': 'warning',
                'message': 'Single SMTP server detected. Add backup SMTP servers for redundancy.'
            })
        
        if infrastructure['avg_success_rate'] < 0.7:
            recommendations.append({
                'type': 'critical',
                'message': 'Low success rate detected. Review server configurations and health.'
            })
        
        return recommendations
    
    def _get_campaign_setup_guidance(self, campaign_data: Dict = None) -> Dict[str, List[str]]:
        """Get guidance for campaign setup."""
        tips = [
            "Use auto-optimization for best results with your current server setup",
            "Consider scheduling campaigns during business hours for better engagement",
            "Test with a small batch before sending to large audiences"
        ]
        
        warnings = []
        suggestions = []
        
        if campaign_data:
            message_count = campaign_data.get('message_count', 0)
            if message_count > 10000:
                warnings.append("Large campaign detected. Ensure sufficient server capacity.")
                suggestions.append("Consider splitting large campaigns into smaller batches.")
        
        return {'tips': tips, 'warnings': warnings, 'suggestions': suggestions}
    
    def _get_server_config_guidance(self) -> Dict[str, List[str]]:
        """Get guidance for server configuration."""
        infrastructure = self._analyze_infrastructure()
        
        tips = []
        warnings = []
        suggestions = []
        
        if infrastructure['proxy_count'] < 2:
            suggestions.append("Add more proxy servers for better load distribution")
        
        if infrastructure['smtp_count'] < 2:
            suggestions.append("Configure backup SMTP servers for redundancy")
        
        if infrastructure['avg_success_rate'] < 0.8:
            warnings.append("Current success rate is below optimal")
            suggestions.append("Review server health and configuration settings")
        
        tips.extend([
            "Regularly monitor server health and performance",
            "Use performance-based rotation for optimal results",
            "Enable maintenance mode before server updates"
        ])
        
        return {'tips': tips, 'warnings': warnings, 'suggestions': suggestions}
    
    def _get_performance_guidance(self) -> Dict[str, List[str]]:
        """Get guidance for performance optimization."""
        performance = self._get_historical_performance()
        
        tips = []
        warnings = []
        suggestions = []
        
        if performance['success_rate'] < 0.8:
            warnings.append("Success rate is below target (80%)")
            suggestions.append("Consider optimizing server configuration or rotation strategy")
        
        if performance['total_messages'] > 0:
            tips.append(f"Current success rate: {performance['success_rate']:.1%}")
            tips.append("Monitor carrier-specific performance for optimization opportunities")
        
        return {'tips': tips, 'warnings': warnings, 'suggestions': suggestions}
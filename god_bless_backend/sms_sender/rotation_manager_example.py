"""
Example usage of RotationManager in SMS campaign processing
This demonstrates how to integrate the RotationManager with existing SMS tasks
"""

from .rotation_manager import RotationManager
from .models import SMSCampaign, SMSMessage
from django.utils import timezone
import time
import logging

logger = logging.getLogger(__name__)


def enhanced_sms_campaign_example(campaign_id: int):
    """
    Example of how to use RotationManager in an enhanced SMS campaign task.
    This shows the integration pattern for the actual SMS sending task.
    """
    try:
        # Get the campaign
        campaign = SMSCampaign.objects.get(id=campaign_id)
        user = campaign.user
        
        logger.info(f"Starting enhanced SMS campaign: {campaign.name}")
        
        # Initialize the rotation manager
        with RotationManager(user, campaign) as rotation_manager:
            
            # Get messages to process
            messages = SMSMessage.objects.filter(
                campaign=campaign,
                delivery_status='pending'
            )
            
            logger.info(f"Processing {messages.count()} messages")
            
            for message in messages:
                try:
                    # Get optimal server combination
                    proxy, smtp = rotation_manager.get_optimal_server_combination(
                        carrier=message.carrier,
                        phone_number=message.phone_number
                    )
                    
                    # Apply delivery delay
                    delay_applied = rotation_manager.apply_delivery_delay()
                    
                    # Record the servers used
                    message.proxy_server = proxy
                    message.smtp_server = smtp
                    message.delivery_delay_applied = delay_applied
                    
                    # Simulate message sending (replace with actual SMS sending logic)
                    start_time = time.time()
                    
                    try:
                        # Here you would call the actual SMS sending function
                        # send_sms_message(message, proxy, smtp)
                        
                        # Simulate processing time
                        processing_time = 0.5  # Simulated
                        
                        # Record success
                        if proxy:
                            rotation_manager.record_success('proxy', proxy.id, processing_time)
                        if smtp:
                            rotation_manager.record_success('smtp', smtp.id, processing_time)
                        
                        # Update message status
                        message.delivery_status = 'sent'
                        message.sent_at = timezone.now()
                        message.total_processing_time = processing_time
                        
                        logger.debug(f"Message sent successfully to {message.phone_number}")
                        
                    except Exception as send_error:
                        # Record failure
                        if proxy:
                            rotation_manager.record_failure('proxy', proxy.id, str(send_error))
                        if smtp:
                            rotation_manager.record_failure('smtp', smtp.id, str(send_error))
                        
                        # Update message status
                        message.delivery_status = 'failed'
                        message.error_message = str(send_error)
                        
                        logger.error(f"Failed to send message to {message.phone_number}: {send_error}")
                    
                    finally:
                        message.save()
                
                except Exception as message_error:
                    logger.error(f"Error processing message {message.id}: {message_error}")
                    continue
            
            # Get final statistics
            final_stats = rotation_manager.get_rotation_stats()
            logger.info(f"Campaign completed. Final stats: {final_stats['campaign_stats']}")
            
            return final_stats
            
    except SMSCampaign.DoesNotExist:
        logger.error(f"Campaign {campaign_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error in enhanced SMS campaign: {e}")
        return None


def rotation_manager_integration_patterns():
    """
    Demonstrates various integration patterns with RotationManager
    """
    
    # Pattern 1: Basic usage with context manager
    def basic_usage_pattern(user, campaign):
        with RotationManager(user, campaign) as manager:
            proxy = manager.get_next_proxy()
            smtp = manager.get_next_smtp()
            delay = manager.apply_delivery_delay()
            return proxy, smtp, delay
    
    # Pattern 2: Manual lifecycle management
    def manual_lifecycle_pattern(user, campaign):
        manager = RotationManager(user, campaign)
        try:
            # Use manager methods
            stats = manager.get_rotation_stats()
            return stats
        finally:
            # Manual cleanup if needed
            pass
    
    # Pattern 3: Carrier-optimized routing
    def carrier_optimized_pattern(user, campaign, carrier, phone_number):
        with RotationManager(user, campaign) as manager:
            proxy, smtp = manager.get_optimal_server_combination(carrier, phone_number)
            
            # Use the optimized servers
            success = True  # Result of actual sending
            
            if success:
                manager.record_success('proxy', proxy.id if proxy else 0, 0.5)
                manager.record_success('smtp', smtp.id if smtp else 0, 1.2)
            else:
                manager.record_failure('proxy', proxy.id if proxy else 0, 'Connection timeout')
                manager.record_failure('smtp', smtp.id if smtp else 0, 'Authentication failed')
            
            return proxy, smtp
    
    # Pattern 4: Health monitoring
    def health_monitoring_pattern(user, campaign):
        with RotationManager(user, campaign) as manager:
            health_results = manager.health_check_all_servers()
            
            # Check if we have enough healthy servers
            summary = health_results['summary']
            if summary['healthy_proxy_servers'] == 0:
                logger.warning("No healthy proxy servers available")
            if summary['healthy_smtp_servers'] == 0:
                logger.error("No healthy SMTP servers available")
            
            return health_results
    
    return {
        'basic_usage': basic_usage_pattern,
        'manual_lifecycle': manual_lifecycle_pattern,
        'carrier_optimized': carrier_optimized_pattern,
        'health_monitoring': health_monitoring_pattern
    }


# Example configuration for different campaign types
CAMPAIGN_TEMPLATES = {
    'marketing': {
        'use_proxy_rotation': True,
        'proxy_rotation_strategy': 'best_performance',
        'use_smtp_rotation': True,
        'smtp_rotation_strategy': 'best_performance',
        'custom_delay_enabled': True,
        'custom_delay_min': 2,
        'custom_delay_max': 8,
        'carrier_optimization_enabled': True
    },
    'alerts': {
        'use_proxy_rotation': True,
        'proxy_rotation_strategy': 'round_robin',
        'use_smtp_rotation': True,
        'smtp_rotation_strategy': 'round_robin',
        'custom_delay_enabled': True,
        'custom_delay_min': 1,
        'custom_delay_max': 3,
        'carrier_optimization_enabled': False
    },
    'notifications': {
        'use_proxy_rotation': False,
        'use_smtp_rotation': True,
        'smtp_rotation_strategy': 'least_used',
        'custom_delay_enabled': False,
        'carrier_optimization_enabled': False
    }
}


def apply_campaign_template(campaign, template_name):
    """Apply a predefined template to a campaign's delivery settings"""
    if template_name not in CAMPAIGN_TEMPLATES:
        raise ValueError(f"Unknown template: {template_name}")
    
    template = CAMPAIGN_TEMPLATES[template_name]
    
    # Get or create delivery settings
    from .models import CampaignDeliverySettings
    settings, created = CampaignDeliverySettings.objects.get_or_create(
        campaign=campaign,
        defaults=template
    )
    
    if not created:
        # Update existing settings
        for key, value in template.items():
            setattr(settings, key, value)
        settings.save()
    
    logger.info(f"Applied {template_name} template to campaign {campaign.name}")
    return settings
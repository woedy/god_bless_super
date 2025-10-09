"""
Enhanced SMS Campaign Tasks
Integrates with rotation manager for advanced server rotation and delivery optimization
"""
import time
import logging
from typing import Dict, Any, Optional
from email.mime.text import MIMEText
import smtplib
import ssl
import requests
from datetime import datetime
from django.utils import timezone
from django.db import transaction
from celery import shared_task

from .models import SMSCampaign, SMSMessage, ServerUsageLog, CarrierPerformanceLog
from .rotation_manager import RotationManager
from .macro_processor import process_message
from .rate_limiter import rate_limiter
from .email_utils import format_provider_email_address
from .monitoring_service import CampaignMonitoringService
from .error_analysis import ErrorAnalysisService
from proxy_server.models import ProxyServer
from smtps.models import SmtpManager


logger = logging.getLogger(__name__)


@shared_task(bind=True)
def process_enhanced_sms_campaign_task(self, campaign_id: int):
    """
    Enhanced SMS campaign processing with full rotation support
    
    Args:
        campaign_id: ID of the campaign to process
    """
    try:
        campaign = SMSCampaign.objects.get(id=campaign_id)
    except SMSCampaign.DoesNotExist:
        logger.error(f"Campaign {campaign_id} not found")
        return {'status': 'error', 'message': 'Campaign not found'}
    
    # Initialize rotation manager and monitoring service
    rotation_manager = RotationManager(campaign.user, campaign)
    monitoring_service = CampaignMonitoringService(campaign_id)
    
    # Update campaign status
    campaign.status = 'in_progress'
    campaign.started_at = timezone.now()
    campaign.celery_task_id = self.request.id
    campaign.save()
    
    # Send initial campaign start notification
    monitoring_service.send_progress_update({
        'type': 'campaign_started',
        'status': 'in_progress',
        'total_messages': 0,  # Will be updated below
        'started_at': campaign.started_at.isoformat()
    })
    
    logger.info(f"Starting enhanced SMS campaign {campaign_id}: {campaign.name}")
    
    # Get pending messages
    messages = campaign.messages.filter(delivery_status='pending').order_by('id')
    total_messages = messages.count()
    
    if total_messages == 0:
        campaign.status = 'completed'
        campaign.completed_at = timezone.now()
        campaign.progress = 100
        campaign.save()
        
        # Send completion notification
        monitoring_service.send_progress_update({
            'type': 'campaign_completed',
            'status': 'completed',
            'total_messages': 0,
            'completed_at': campaign.completed_at.isoformat()
        })
        
        logger.info(f"Campaign {campaign_id} completed - no messages to send")
        return {'status': 'completed', 'message': 'No messages to send'}
    
    # Validate server availability
    proxy = rotation_manager.get_next_proxy()
    smtp = rotation_manager.get_next_smtp()
    
    if not smtp:
        campaign.status = 'failed'
        campaign.save()
        
        # Send error notification
        monitoring_service.send_error_notification(
            'server_unavailable',
            'No active SMTP servers found',
            {'server_type': 'smtp', 'available_servers': 0}
        )
        
        logger.error(f"Campaign {campaign_id} failed - no active SMTP servers found")
        return {'status': 'error', 'message': 'No active SMTP servers found'}
    
    sent_count = 0
    failed_count = 0
    
    # Process messages in batches
    batch_size = campaign.batch_size
    
    logger.info(f"Processing {total_messages} messages in batches of {batch_size}")
    
    # Send initial progress update with total message count
    monitoring_service.send_progress_update({
        'type': 'processing_started',
        'total_messages': total_messages,
        'batch_size': batch_size,
        'messages_sent': 0,
        'messages_failed': 0
    })
    
    for i in range(0, total_messages, batch_size):
        batch = messages[i:i + batch_size]
        
        for message in batch:
            # Check if campaign was paused or cancelled
            campaign.refresh_from_db()
            if campaign.status in ['paused', 'cancelled']:
                logger.info(f"Campaign {campaign_id} {campaign.status}, stopping processing")
                return {'status': campaign.status, 'sent': sent_count, 'failed': failed_count}
            
            # Apply rate limiting
            if message.carrier:
                rate_limiter.wait_if_needed(message.carrier, str(campaign_id))
            
            # Get optimal server combination for this message
            if message.carrier and rotation_manager.delivery_settings.carrier_optimization_enabled:
                proxy, smtp = rotation_manager.get_optimal_server_combination(message.carrier)
            else:
                proxy = rotation_manager.get_next_proxy()
                smtp = rotation_manager.get_next_smtp()
            
            if not smtp:
                logger.error(f"No SMTP server available for message {message.id}")
                failed_count += 1
                campaign.messages_failed += 1
                message.delivery_status = 'failed'
                message.error_message = 'No SMTP server available'
                message.save()
                
                # Send server unavailable notification
                monitoring_service.send_server_status_update(
                    'smtp', 0, 'unavailable',
                    {'message_id': message.id, 'phone_number': message.phone_number}
                )
                
                continue
            
            # Apply delivery delay
            delay_applied = rotation_manager.apply_delivery_delay()
            
            # Send the message with enhanced tracking
            success, processing_time = send_enhanced_sms_message(
                message, smtp, proxy, campaign, rotation_manager, delay_applied, monitoring_service
            )
            
            if success:
                sent_count += 1
                campaign.messages_sent += 1
            else:
                failed_count += 1
                campaign.messages_failed += 1
            
            # Record rate limit
            if message.carrier:
                rate_limiter.record_send(message.carrier, str(campaign_id))
            
            # Update progress
            progress = ((sent_count + failed_count) / total_messages) * 100
            campaign.progress = int(progress)
            campaign.save()
            
            # Send real-time progress update
            monitoring_service.send_progress_update({
                'type': 'message_processed',
                'progress': progress,
                'messages_sent': sent_count,
                'messages_failed': failed_count,
                'total_messages': total_messages,
                'current_message': message.phone_number,
                'processing_time': processing_time,
                'success': success
            })
            
            # Update task state
            self.update_state(
                state='PROGRESS',
                meta={
                    'progress': progress,
                    'sent': sent_count,
                    'failed': failed_count,
                    'total': total_messages,
                    'current_message': message.phone_number,
                    'proxy_used': proxy.host if proxy else None,
                    'smtp_used': f"{smtp.host}:{smtp.port}" if smtp else None
                }
            )
            
            # Send periodic statistics update (every 10 messages)
            if (sent_count + failed_count) % 10 == 0:
                monitoring_service.send_campaign_stats_update()
    
    # Mark campaign as completed
    campaign.status = 'completed'
    campaign.completed_at = timezone.now()
    campaign.progress = 100
    campaign.save()
    
    # Log final statistics
    rotation_stats = rotation_manager.get_rotation_stats()
    logger.info(f"Campaign {campaign_id} completed: {sent_count} sent, {failed_count} failed")
    logger.info(f"Rotation stats: {rotation_stats}")
    
    # Send final completion update with comprehensive stats
    monitoring_service.send_progress_update({
        'type': 'campaign_completed',
        'status': 'completed',
        'messages_sent': sent_count,
        'messages_failed': failed_count,
        'total_messages': total_messages,
        'success_rate': (sent_count / total_messages * 100) if total_messages > 0 else 0,
        'rotation_stats': rotation_stats,
        'completed_at': campaign.completed_at.isoformat()
    })
    
    # Send final statistics update
    monitoring_service.send_campaign_stats_update()
    
    return {
        'status': 'completed',
        'sent': sent_count,
        'failed': failed_count,
        'total': total_messages,
        'rotation_stats': rotation_stats
    }


def send_enhanced_sms_message(
    message: SMSMessage, 
    smtp: SmtpManager, 
    proxy: Optional[ProxyServer], 
    campaign: SMSCampaign,
    rotation_manager: RotationManager,
    delay_applied: float,
    monitoring_service: CampaignMonitoringService
) -> tuple[bool, float]:
    """
    Send a single SMS message with enhanced tracking and server integration
    
    Args:
        message: SMSMessage instance
        smtp: SMTP server to use
        proxy: Proxy server to use (optional)
        campaign: Campaign instance
        rotation_manager: RotationManager instance
        delay_applied: Delay that was applied before sending
    
    Returns:
        Tuple of (success: bool, processing_time: float)
    """
    start_time = time.time()
    
    # Update message status and tracking
    message.delivery_status = 'sending'
    message.send_attempts += 1
    message.last_attempt_at = timezone.now()
    message.smtp_server = smtp
    message.proxy_server = proxy
    message.delivery_delay_applied = delay_applied
    
    # Legacy fields for backward compatibility
    message.smtp_server_legacy = f"{smtp.host}:{smtp.port}"
    if proxy:
        message.proxy_used_legacy = f"{proxy.host}:{proxy.port}"
    
    message.save()
    
    logger.debug(f"Sending message {message.id} to {message.phone_number} via SMTP {smtp} and proxy {proxy}")
    
    try:
        # Format receiver email
        receiver_email = format_provider_email_address(
            message.phone_number,
            message.carrier or campaign.target_carrier or "AT&T"
        )
        
        # Create email message
        email_message = MIMEText(message.message_content)
        email_message["Subject"] = "SMS"
        email_message["From"] = smtp.username
        email_message["To"] = receiver_email
        
        # Measure SMTP connection time
        smtp_start_time = time.time()
        
        # Configure proxy if available
        if proxy:
            # For SMTP over proxy, we need to handle this differently
            # This is a simplified approach - in production you might need more sophisticated proxy handling
            proxy_start_time = time.time()
            
            # Test proxy connectivity first
            try:
                proxy_url = proxy.get_proxy_url()
                proxies = {'http': proxy_url, 'https': proxy_url}
                
                # Quick proxy test
                test_response = requests.get(
                    'https://httpbin.org/ip', 
                    proxies=proxies, 
                    timeout=5
                )
                
                proxy_response_time = time.time() - proxy_start_time
                message.proxy_response_time = proxy_response_time
                
                if test_response.status_code != 200:
                    raise Exception(f"Proxy test failed with status {test_response.status_code}")
                
                rotation_manager.record_success('proxy', proxy.id, proxy_response_time, message.carrier)
                
            except Exception as proxy_error:
                proxy_response_time = time.time() - proxy_start_time
                message.proxy_response_time = proxy_response_time
                rotation_manager.record_failure('proxy', proxy.id, str(proxy_error), 'connection', message.carrier)
                
                # Send proxy failure notification
                monitoring_service.send_server_status_update(
                    'proxy', proxy.id, 'failed',
                    {'error': str(proxy_error), 'message_id': message.id}
                )
                
                logger.warning(f"Proxy {proxy} failed, continuing without proxy: {proxy_error}")
                # Continue without proxy
        
        # Send via SMTP
        with smtplib.SMTP_SSL(smtp.host, int(smtp.port), context=ssl.create_default_context()) as email_conn:
            email_conn.login(smtp.username, smtp.password)
            email_conn.sendmail(smtp.username, receiver_email, email_message.as_string())
        
        smtp_response_time = time.time() - smtp_start_time
        message.smtp_response_time = smtp_response_time
        
        # Calculate total processing time
        total_processing_time = time.time() - start_time
        message.total_processing_time = total_processing_time
        
        # Update message status
        message.delivery_status = 'sent'
        message.sent_at = timezone.now()
        message.save()
        
        # Record success for servers
        rotation_manager.record_success('smtp', smtp.id, smtp_response_time, message.carrier)
        
        # Send success notification
        monitoring_service.send_server_status_update(
            'smtp', smtp.id, 'success',
            {
                'message_id': message.id,
                'phone_number': message.phone_number,
                'processing_time': total_processing_time,
                'smtp_response_time': smtp_response_time
            }
        )
        
        logger.debug(f"Message {message.id} sent successfully in {total_processing_time:.3f}s")
        
        return True, total_processing_time
        
    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"SMTP authentication failed: {str(e)}"
        message.delivery_status = 'failed'
        message.error_message = error_msg
        message.total_processing_time = time.time() - start_time
        message.save()
        
        rotation_manager.record_failure('smtp', smtp.id, error_msg, 'authentication', message.carrier)
        
        # Send authentication error notification
        monitoring_service.send_error_notification(
            'smtp_authentication_failed',
            error_msg,
            {
                'server_id': smtp.id,
                'server_host': smtp.host,
                'message_id': message.id,
                'phone_number': message.phone_number
            }
        )
        
        logger.error(f"Message {message.id} failed - SMTP auth error: {e}")
        
        return False, time.time() - start_time
        
    except smtplib.SMTPConnectError as e:
        error_msg = f"SMTP connection failed: {str(e)}"
        message.delivery_status = 'failed'
        message.error_message = error_msg
        message.total_processing_time = time.time() - start_time
        message.save()
        
        rotation_manager.record_failure('smtp', smtp.id, error_msg, 'connection', message.carrier)
        
        # Send connection error notification
        monitoring_service.send_error_notification(
            'smtp_connection_failed',
            error_msg,
            {
                'server_id': smtp.id,
                'server_host': smtp.host,
                'message_id': message.id,
                'phone_number': message.phone_number
            }
        )
        
        logger.error(f"Message {message.id} failed - SMTP connection error: {e}")
        
        return False, time.time() - start_time
        
    except smtplib.SMTPRecipientsRefused as e:
        error_msg = f"SMTP recipients refused: {str(e)}"
        message.delivery_status = 'failed'
        message.error_message = error_msg
        message.total_processing_time = time.time() - start_time
        message.save()
        
        rotation_manager.record_failure('smtp', smtp.id, error_msg, 'recipients_refused', message.carrier)
        
        # Send recipients refused error notification
        monitoring_service.send_error_notification(
            'smtp_recipients_refused',
            error_msg,
            {
                'server_id': smtp.id,
                'server_host': smtp.host,
                'message_id': message.id,
                'phone_number': message.phone_number,
                'carrier': message.carrier
            }
        )
        
        logger.error(f"Message {message.id} failed - recipients refused: {e}")
        
        return False, time.time() - start_time
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        message.delivery_status = 'failed'
        message.error_message = error_msg
        message.total_processing_time = time.time() - start_time
        message.save()
        
        rotation_manager.record_failure('smtp', smtp.id, error_msg, 'unknown', message.carrier)
        
        # Analyze error and send detailed notification
        error_analysis_service = ErrorAnalysisService(campaign.id)
        error_analysis = error_analysis_service.analyze_error(
            error_msg,
            {
                'server_id': smtp.id,
                'server_type': 'smtp',
                'server_host': smtp.host,
                'message_id': message.id,
                'phone_number': message.phone_number,
                'carrier': message.carrier
            }
        )
        
        monitoring_service.send_error_notification(
            'smtp_unknown_error',
            error_msg,
            {
                'server_id': smtp.id,
                'server_host': smtp.host,
                'message_id': message.id,
                'phone_number': message.phone_number,
                'error_analysis': error_analysis
            }
        )
        
        logger.error(f"Message {message.id} failed - unexpected error: {e}")
        
        return False, time.time() - start_time


@shared_task
def schedule_enhanced_campaign_task(campaign_id: int):
    """
    Schedule an enhanced campaign to be sent at the specified time
    
    Args:
        campaign_id: ID of the campaign to schedule
    """
    try:
        campaign = SMSCampaign.objects.get(id=campaign_id)
        
        if campaign.scheduled_time and campaign.scheduled_time > timezone.now():
            # Schedule for later
            process_enhanced_sms_campaign_task.apply_async(
                args=[campaign_id],
                eta=campaign.scheduled_time
            )
            campaign.status = 'scheduled'
            campaign.save()
            logger.info(f"Campaign {campaign_id} scheduled for {campaign.scheduled_time}")
        else:
            # Send immediately
            process_enhanced_sms_campaign_task.delay(campaign_id)
            logger.info(f"Campaign {campaign_id} queued for immediate processing")
            
    except SMSCampaign.DoesNotExist:
        logger.error(f"Campaign {campaign_id} not found for scheduling")


@shared_task
def health_check_servers_task(user_id: int):
    """
    Background task to check health of all servers for a user
    
    Args:
        user_id: ID of the user whose servers to check
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=user_id)
        
        # Create a dummy campaign for rotation manager initialization
        # In practice, you might want to create a separate health check service
        dummy_campaign = type('DummyCampaign', (), {
            'id': 0,
            'name': 'Health Check',
            'user': user,
            'use_proxy_rotation': True,
            'use_smtp_rotation': True
        })()
        
        rotation_manager = RotationManager(user, dummy_campaign)
        
        # Check SMTP health
        smtp_results = rotation_manager.smtp_service.check_all_smtp_health()
        
        # Check proxy health  
        proxy_results = rotation_manager.proxy_service.check_all_proxies_health()
        
        logger.info(f"Health check completed for user {user_id}: "
                   f"{len(smtp_results)} SMTP servers, {len(proxy_results)} proxy servers")
        
        return {
            'user_id': user_id,
            'smtp_results': smtp_results,
            'proxy_results': proxy_results,
            'timestamp': timezone.now().isoformat()
        }
        
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for health check")
        return {'error': 'User not found'}
    except Exception as e:
        logger.error(f"Health check failed for user {user_id}: {e}")
        return {'error': str(e)}
# tasks.py
from celery import shared_task
from time import sleep
from email.mime.text import MIMEText
import smtplib
import ssl
from datetime import datetime
from django.utils import timezone
from typing import List, Dict, Any

from sms_sender.models import SMSCampaign, SMSMessage
from sms_sender.macro_processor import process_message
from sms_sender.rate_limiter import rate_limiter
from sms_sender.email_utils import format_provider_email_address
from smtps.models import SmtpManager


@shared_task(bind=True)
def send_bulk_sms_via_email_task(self, numbers, sender_name: str, subject: str, message: str, smtps, provider: str, delay_seconds: int = 1):
    """Legacy bulk SMS task - kept for backward compatibility"""
    smtp_index = 0
    total = len(numbers)
    
    for index, number in enumerate(numbers):
        # Update task progress
        progress = (index + 1) / total * 100
        self.update_state(state='PROGRESS', meta={'progress': progress})

        smtp = smtps[smtp_index]
        sender_email = smtp.username
        email_password = smtp.password
        receiver_email = format_provider_email_address(number, provider)

        # Create the email message
        email_message = MIMEText(message)
        email_message["Subject"] = subject
        email_message["from"] = sender_name
        email_message["To"] = receiver_email

        try:
            with smtplib.SMTP_SSL(smtp.host, smtp.port, context=ssl.create_default_context()) as email:
                email.login(sender_email, email_password)
                email.sendmail(sender_email, receiver_email, email_message.as_string())
        except smtplib.SMTPException as e:
            print(f"Failed to send email: {e}")

        smtp_index = (smtp_index + 1) % len(smtps)
        sleep(delay_seconds)

    return {'status': 'Task Completed'}


@shared_task(bind=True)
def process_sms_campaign_task(self, campaign_id: int):
    """
    Process an SMS campaign with enhanced rotation integration
    
    Args:
        campaign_id: ID of the campaign to process
    """
    # Import here to avoid circular imports
    from .rotation_manager import RotationManager
    
    try:
        campaign = SMSCampaign.objects.get(id=campaign_id)
    except SMSCampaign.DoesNotExist:
        return {'status': 'error', 'message': 'Campaign not found'}
    
    # Initialize rotation manager
    rotation_manager = RotationManager(campaign.user, campaign)
    
    # Update campaign status
    campaign.status = 'in_progress'
    campaign.started_at = timezone.now()
    campaign.celery_task_id = self.request.id
    campaign.save()
    
    # Get pending messages
    messages = campaign.messages.filter(delivery_status='pending').order_by('id')
    total_messages = messages.count()
    
    if total_messages == 0:
        campaign.status = 'completed'
        campaign.completed_at = timezone.now()
        campaign.progress = 100
        campaign.save()
        return {'status': 'completed', 'message': 'No messages to send'}
    
    # Validate server availability using rotation manager
    smtp = rotation_manager.get_next_smtp()
    if not smtp:
        campaign.status = 'failed'
        campaign.save()
        return {'status': 'error', 'message': 'No active SMTP servers found'}
    
    sent_count = 0
    failed_count = 0
    
    # Process messages in batches
    batch_size = campaign.batch_size
    
    for i in range(0, total_messages, batch_size):
        batch = messages[i:i + batch_size]
        
        for message in batch:
            # Check if campaign was paused or cancelled
            campaign.refresh_from_db()
            if campaign.status in ['paused', 'cancelled']:
                return {'status': campaign.status, 'sent': sent_count, 'failed': failed_count}
            
            # Apply rate limiting
            if message.carrier:
                rate_limiter.wait_if_needed(message.carrier, str(campaign_id))
            
            # Get servers using rotation manager
            proxy = rotation_manager.get_next_proxy()
            smtp = rotation_manager.get_next_smtp()
            
            if not smtp:
                failed_count += 1
                campaign.messages_failed += 1
                message.delivery_status = 'failed'
                message.error_message = 'No SMTP server available'
                message.save()
                continue
            
            # Apply delivery delay
            delay_applied = rotation_manager.apply_delivery_delay()
            
            # Send the message with enhanced tracking
            success = send_enhanced_sms_message_simple(message, smtp, proxy, campaign, rotation_manager, delay_applied)
            
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
            
            # Update task state
            self.update_state(
                state='PROGRESS',
                meta={
                    'progress': progress,
                    'sent': sent_count,
                    'failed': failed_count,
                    'total': total_messages,
                    'proxy_used': proxy.host if proxy else None,
                    'smtp_used': f"{smtp.host}:{smtp.port}" if smtp else None
                }
            )
    
    # Mark campaign as completed
    campaign.status = 'completed'
    campaign.completed_at = timezone.now()
    campaign.progress = 100
    campaign.save()
    
    return {
        'status': 'completed',
        'sent': sent_count,
        'failed': failed_count,
        'total': total_messages
    }


def send_enhanced_sms_message_simple(message: SMSMessage, smtp: SmtpManager, proxy, campaign: SMSCampaign, rotation_manager, delay_applied: float) -> bool:
    """
    Send a single SMS message with enhanced tracking (simplified version for backward compatibility)
    
    Args:
        message: SMSMessage instance
        smtp: SMTP server to use
        proxy: Proxy server to use (optional)
        campaign: Campaign instance
        rotation_manager: RotationManager instance
        delay_applied: Delay that was applied before sending
    
    Returns:
        True if successful, False otherwise
    """
    import time
    
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
        
        # Measure SMTP response time
        smtp_start_time = time.time()
        
        # Send via SMTP
        with smtplib.SMTP_SSL(smtp.host, int(smtp.port), context=ssl.create_default_context()) as email_conn:
            email_conn.login(smtp.username, smtp.password)
            email_conn.sendmail(smtp.username, receiver_email, email_message.as_string())
        
        smtp_response_time = time.time() - smtp_start_time
        message.smtp_response_time = smtp_response_time
        message.total_processing_time = time.time() - start_time
        
        # Update message status
        message.delivery_status = 'sent'
        message.sent_at = timezone.now()
        message.save()
        
        # Record success
        rotation_manager.record_success('smtp', smtp.id, smtp_response_time, message.carrier)
        if proxy:
            rotation_manager.record_success('proxy', proxy.id, None, message.carrier)
        
        return True
        
    except Exception as e:
        # Update message with error
        message.delivery_status = 'failed'
        message.error_message = str(e)
        message.total_processing_time = time.time() - start_time
        message.save()
        
        # Record failure
        rotation_manager.record_failure('smtp', smtp.id, str(e), 'unknown', message.carrier)
        if proxy:
            rotation_manager.record_failure('proxy', proxy.id, str(e), 'unknown', message.carrier)
        
        # Schedule retry if appropriate
        from .retry_service import RetryManagementService
        retry_service = RetryManagementService(campaign)
        error_type = retry_service._classify_error(str(e).lower())
        
        if retry_service.should_retry(message, str(e)):
            retry_service.schedule_retry(message, str(e), error_type)
        
        return False


def send_single_sms_message(message: SMSMessage, smtp: SmtpManager, campaign: SMSCampaign) -> bool:
    """
    Send a single SMS message via email gateway
    
    Args:
        message: SMSMessage instance
        smtp: SMTP server to use
        campaign: Campaign instance
    
    Returns:
        True if successful, False otherwise
    """
    message.delivery_status = 'sending'
    message.send_attempts += 1
    message.last_attempt_at = timezone.now()
    message.smtp_server = f"{smtp.host}:{smtp.port}"
    message.save()
    
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
        
        # Send via SMTP
        with smtplib.SMTP_SSL(smtp.host, int(smtp.port), context=ssl.create_default_context()) as email_conn:
            email_conn.login(smtp.username, smtp.password)
            email_conn.sendmail(smtp.username, receiver_email, email_message.as_string())
        
        # Update message status
        message.delivery_status = 'sent'
        message.sent_at = timezone.now()
        message.save()
        
        return True
        
    except Exception as e:
        # Update message with error
        message.delivery_status = 'failed'
        message.error_message = str(e)
        message.save()
        
        return False


@shared_task
def schedule_campaign_task(campaign_id: int):
    """
    Schedule a campaign to be sent at the specified time
    
    Args:
        campaign_id: ID of the campaign to schedule
    """
    try:
        campaign = SMSCampaign.objects.get(id=campaign_id)
        
        if campaign.scheduled_time and campaign.scheduled_time > timezone.now():
            # Schedule for later
            process_sms_campaign_task.apply_async(
                args=[campaign_id],
                eta=campaign.scheduled_time
            )
            campaign.status = 'scheduled'
            campaign.save()
        else:
            # Send immediately
            process_sms_campaign_task.delay(campaign_id)
            
    except SMSCampaign.DoesNotExist:
        pass


@shared_task(bind=True)
def retry_sms_message_task(self, message_id: int, retry_attempt_id: int):
    """
    Celery task to retry sending a failed SMS message.
    
    Args:
        message_id: ID of the SMSMessage to retry
        retry_attempt_id: ID of the RetryAttempt record
    """
    from .models import RetryAttempt
    from .rotation_manager import RotationManager
    
    try:
        message = SMSMessage.objects.get(id=message_id)
        retry_attempt = RetryAttempt.objects.get(id=retry_attempt_id)
    except (SMSMessage.DoesNotExist, RetryAttempt.DoesNotExist) as e:
        return {'status': 'error', 'message': str(e)}
    
    campaign = message.campaign
    
    # Check if campaign is still active
    if campaign.status not in ['in_progress', 'scheduled']:
        retry_attempt.mark_completed(success=False)
        return {'status': 'cancelled', 'reason': 'campaign_inactive'}
    
    # Initialize rotation manager
    rotation_manager = RotationManager(campaign.user, campaign)
    
    # Get servers for retry (may be different from original attempt)
    proxy = rotation_manager.get_next_proxy()
    smtp = rotation_manager.get_next_smtp()
    
    if not smtp:
        retry_attempt.mark_completed(success=False)
        return {'status': 'error', 'message': 'No SMTP server available'}
    
    # Update retry attempt with server information
    retry_attempt.retry_proxy_server = proxy
    retry_attempt.retry_smtp_server = smtp
    retry_attempt.save()
    
    # Apply delivery delay
    delay_applied = rotation_manager.apply_delivery_delay()
    
    # Attempt to send the message
    success = send_enhanced_sms_message_simple(
        message, smtp, proxy, campaign, rotation_manager, delay_applied
    )
    
    # Mark retry attempt as completed
    retry_attempt.mark_completed(success=success)
    
    if success:
        # Update campaign metrics
        campaign.messages_sent += 1
        if campaign.messages_failed > 0:
            campaign.messages_failed -= 1
        campaign.save()
        
        return {
            'status': 'success',
            'message_id': message_id,
            'attempt_number': retry_attempt.attempt_number
        }
    else:
        # Check if we should schedule another retry
        from .retry_service import RetryManagementService
        retry_service = RetryManagementService(campaign)
        if retry_service.should_retry(message, message.error_message):
            retry_service.schedule_retry(
                message, 
                message.error_message, 
                retry_service._classify_error(message.error_message.lower())
            )
        
        return {
            'status': 'failed',
            'message_id': message_id,
            'attempt_number': retry_attempt.attempt_number,
            'error': message.error_message
        }


@shared_task
def cleanup_old_retry_attempts():
    """
    Periodic task to clean up old completed retry attempts.
    Keeps retry attempts for 30 days for reporting purposes.
    """
    from datetime import timedelta
    from .models import RetryAttempt
    
    cutoff_date = timezone.now() - timedelta(days=30)
    
    old_attempts = RetryAttempt.objects.filter(
        completed=True,
        completion_time__lt=cutoff_date
    )
    
    count = old_attempts.count()
    old_attempts.delete()
    
    return {'cleaned_up': count}

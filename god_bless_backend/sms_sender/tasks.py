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
    Process an SMS campaign with rate limiting and progress tracking
    
    Args:
        campaign_id: ID of the campaign to process
    """
    try:
        campaign = SMSCampaign.objects.get(id=campaign_id)
    except SMSCampaign.DoesNotExist:
        return {'status': 'error', 'message': 'Campaign not found'}
    
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
    
    # Get user's SMTP servers
    smtp_servers = list(SmtpManager.objects.filter(
        user=campaign.user,
        is_archived=False,
        active=True
    ))
    
    if not smtp_servers:
        campaign.status = 'failed'
        campaign.save()
        return {'status': 'error', 'message': 'No active SMTP servers found'}
    
    smtp_index = 0
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
            
            # Get SMTP server (rotate if enabled)
            if campaign.use_smtp_rotation:
                smtp = smtp_servers[smtp_index]
                smtp_index = (smtp_index + 1) % len(smtp_servers)
            else:
                smtp = smtp_servers[0]
            
            # Send the message
            success = send_single_sms_message(message, smtp, campaign)
            
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
                    'total': total_messages
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

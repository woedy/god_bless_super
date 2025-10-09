"""
Intelligent retry management service for SMS delivery failures.

This service implements carrier-specific retry strategies with exponential backoff
algorithms and integrates with Celery for delayed task scheduling.
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from django.utils import timezone
from django.conf import settings
from django.db import models
from celery import shared_task

from .models import SMSMessage, RetryAttempt, SMSCampaign

logger = logging.getLogger(__name__)


class RetryManagementService:
    """
    Intelligent retry logic with exponential backoff for SMS delivery failures.
    
    Implements carrier-specific retry strategies and automatic retry scheduling
    with Celery delayed tasks.
    """
    
    # Maximum retry attempts per message
    MAX_RETRY_ATTEMPTS = getattr(settings, 'SMS_MAX_RETRY_ATTEMPTS', 3)
    
    # Base delay for exponential backoff (in seconds)
    BASE_RETRY_DELAY = getattr(settings, 'SMS_BASE_RETRY_DELAY', 60)
    
    # Maximum retry delay (in seconds) - 24 hours
    MAX_RETRY_DELAY = getattr(settings, 'SMS_MAX_RETRY_DELAY', 86400)
    
    # Carrier-specific retry configurations
    CARRIER_RETRY_CONFIG = {
        'AT&T': {
            'max_attempts': 3,
            'base_delay': 60,
            'backoff_multiplier': 2.0,
            'rate_limit_delay': 300,  # 5 minutes for rate limit errors
        },
        'Verizon': {
            'max_attempts': 4,
            'base_delay': 45,
            'backoff_multiplier': 1.8,
            'rate_limit_delay': 240,  # 4 minutes for rate limit errors
        },
        'T-Mobile': {
            'max_attempts': 3,
            'base_delay': 30,
            'backoff_multiplier': 2.2,
            'rate_limit_delay': 180,  # 3 minutes for rate limit errors
        },
        'Sprint': {
            'max_attempts': 3,
            'base_delay': 90,
            'backoff_multiplier': 2.5,
            'rate_limit_delay': 360,  # 6 minutes for rate limit errors
        },
        'default': {
            'max_attempts': 3,
            'base_delay': 60,
            'backoff_multiplier': 2.0,
            'rate_limit_delay': 300,
        }
    }
    
    # Error type classifications for retry strategies
    ERROR_CLASSIFICATIONS = {
        # Temporary errors - should retry
        'temporary': [
            'connection timeout',
            'connection refused',
            'temporary failure',
            'server busy',
            'rate limit',
            'throttled',
            'quota exceeded',
            'network error',
            'dns resolution failed',
            'smtp timeout',
        ],
        # Authentication errors - retry with different server
        'auth': [
            'authentication failed',
            'invalid credentials',
            'login failed',
            'unauthorized',
            'access denied',
        ],
        # Permanent errors - do not retry
        'permanent': [
            'invalid recipient',
            'mailbox unavailable',
            'user unknown',
            'domain not found',
            'message too large',
            'spam detected',
            'blocked',
            'blacklisted',
        ],
        # Server errors - retry with exponential backoff
        'server': [
            'internal server error',
            'service unavailable',
            'bad gateway',
            'gateway timeout',
            '5xx error',
        ]
    }
    
    def __init__(self, campaign: SMSCampaign):
        """
        Initialize retry management service for a campaign.
        
        Args:
            campaign: SMSCampaign instance
        """
        self.campaign = campaign
        self.user = campaign.user
        
    def should_retry(self, message: SMSMessage, error: str) -> bool:
        """
        Determine if a message should be retried based on error type and attempt count.
        
        Args:
            message: SMSMessage instance that failed
            error: Error message from the failure
            
        Returns:
            True if message should be retried, False otherwise
        """
        # Check if we've exceeded maximum retry attempts
        current_attempts = message.retry_attempts.count()
        carrier_config = self._get_carrier_config(message.carrier)
        
        if current_attempts >= carrier_config['max_attempts']:
            logger.info(f"Message {message.id} exceeded max retry attempts ({current_attempts})")
            return False
        
        # Classify error type
        error_type = self._classify_error(error.lower())
        
        # Don't retry permanent errors
        if error_type == 'permanent':
            logger.info(f"Message {message.id} has permanent error, not retrying: {error}")
            return False
        
        # Retry temporary, auth, and server errors
        if error_type in ['temporary', 'auth', 'server']:
            logger.info(f"Message {message.id} has {error_type} error, will retry: {error}")
            return True
        
        # Default: don't retry unknown error types after first attempt
        if current_attempts == 0:
            logger.warning(f"Message {message.id} has unknown error type, will retry once: {error}")
            return True
        
        logger.info(f"Message {message.id} has unknown error type, not retrying: {error}")
        return False
    
    def calculate_retry_delay(self, message: SMSMessage, error: str) -> int:
        """
        Calculate delay before retry using exponential backoff with carrier-specific settings.
        
        Args:
            message: SMSMessage instance
            error: Error message from the failure
            
        Returns:
            Delay in seconds before retry
        """
        attempt_count = message.retry_attempts.count() + 1  # Next attempt number
        carrier_config = self._get_carrier_config(message.carrier)
        error_type = self._classify_error(error.lower())
        
        # Special handling for rate limit errors
        if 'rate limit' in error.lower() or 'throttled' in error.lower():
            delay = carrier_config['rate_limit_delay']
            logger.info(f"Rate limit error for message {message.id}, using delay: {delay}s")
            return delay
        
        # Exponential backoff calculation
        base_delay = carrier_config['base_delay']
        multiplier = carrier_config['backoff_multiplier']
        
        # Calculate exponential delay: base_delay * (multiplier ^ (attempt - 1))
        delay = base_delay * (multiplier ** (attempt_count - 1))
        
        # Add jitter to prevent thundering herd (±20% random variation)
        import random
        jitter = random.uniform(0.8, 1.2)
        delay = int(delay * jitter)
        
        # Cap at maximum delay
        delay = min(delay, self.MAX_RETRY_DELAY)
        
        logger.info(f"Calculated retry delay for message {message.id}, attempt {attempt_count}: {delay}s")
        return delay
    
    def schedule_retry(self, message: SMSMessage, error: str, error_type: str = 'unknown') -> bool:
        """
        Schedule a retry attempt for a failed message.
        
        Args:
            message: SMSMessage instance that failed
            error: Error message from the failure
            error_type: Classification of the error type
            
        Returns:
            True if retry was scheduled, False otherwise
        """
        if not self.should_retry(message, error):
            return False
        
        # Calculate retry delay
        delay_seconds = self.calculate_retry_delay(message, error)
        scheduled_time = timezone.now() + timedelta(seconds=delay_seconds)
        
        # Create retry attempt record
        attempt_number = message.retry_attempts.count() + 1
        retry_attempt = RetryAttempt.objects.create(
            message=message,
            attempt_number=attempt_number,
            error_type=error_type,
            error_message=error,
            retry_delay=delay_seconds,
            scheduled_retry_time=scheduled_time
        )
        
        # Schedule Celery task for retry
        from .tasks import retry_sms_message_task
        task_result = retry_sms_message_task.apply_async(
            args=[message.id, retry_attempt.id],
            eta=scheduled_time
        )
        
        logger.info(f"Scheduled retry for message {message.id}, attempt {attempt_number} at {scheduled_time}")
        return True
    
    def get_retry_stats(self) -> Dict:
        """
        Get retry statistics for the campaign.
        
        Returns:
            Dictionary containing retry statistics
        """
        messages_with_retries = self.campaign.messages.filter(
            retry_attempts__isnull=False
        ).distinct()
        
        total_retry_attempts = RetryAttempt.objects.filter(
            message__campaign=self.campaign
        ).count()
        
        successful_retries = RetryAttempt.objects.filter(
            message__campaign=self.campaign,
            completed=True,
            success=True
        ).count()
        
        failed_retries = RetryAttempt.objects.filter(
            message__campaign=self.campaign,
            completed=True,
            success=False
        ).count()
        
        pending_retries = RetryAttempt.objects.filter(
            message__campaign=self.campaign,
            completed=False
        ).count()
        
        # Calculate retry success rate
        completed_retries = successful_retries + failed_retries
        retry_success_rate = (successful_retries / completed_retries * 100) if completed_retries > 0 else 0
        
        # Get retry statistics by error type
        retry_by_error_type = {}
        error_types = RetryAttempt.objects.filter(
            message__campaign=self.campaign
        ).values_list('error_type', flat=True).distinct()
        
        for error_type in error_types:
            count = RetryAttempt.objects.filter(
                message__campaign=self.campaign,
                error_type=error_type
            ).count()
            retry_by_error_type[error_type] = count
        
        return {
            'messages_with_retries': messages_with_retries.count(),
            'total_retry_attempts': total_retry_attempts,
            'successful_retries': successful_retries,
            'failed_retries': failed_retries,
            'pending_retries': pending_retries,
            'retry_success_rate': round(retry_success_rate, 2),
            'retry_by_error_type': retry_by_error_type,
        }
    
    def get_message_retry_history(self, message: SMSMessage) -> List[Dict]:
        """
        Get retry history for a specific message.
        
        Args:
            message: SMSMessage instance
            
        Returns:
            List of retry attempt dictionaries
        """
        retry_attempts = message.retry_attempts.all().order_by('attempt_number')
        
        history = []
        for attempt in retry_attempts:
            history.append({
                'attempt_number': attempt.attempt_number,
                'error_type': attempt.error_type,
                'error_message': attempt.error_message,
                'retry_delay': attempt.retry_delay,
                'scheduled_retry_time': attempt.scheduled_retry_time,
                'completed': attempt.completed,
                'success': attempt.success,
                'completion_time': attempt.completion_time,
                'created_at': attempt.created_at,
            })
        
        return history
    
    def cancel_pending_retries(self, message: SMSMessage) -> int:
        """
        Cancel all pending retry attempts for a message.
        
        Args:
            message: SMSMessage instance
            
        Returns:
            Number of cancelled retry attempts
        """
        pending_retries = message.retry_attempts.filter(completed=False)
        count = pending_retries.count()
        
        # Mark as completed but not successful (cancelled)
        pending_retries.update(
            completed=True,
            success=False,
            completion_time=timezone.now()
        )
        
        logger.info(f"Cancelled {count} pending retries for message {message.id}")
        return count
    
    def _get_carrier_config(self, carrier: Optional[str]) -> Dict:
        """
        Get retry configuration for a specific carrier.
        
        Args:
            carrier: Carrier name
            
        Returns:
            Carrier-specific retry configuration
        """
        if not carrier:
            return self.CARRIER_RETRY_CONFIG['default']
        
        # Normalize carrier name
        carrier_normalized = carrier.strip().title()
        
        return self.CARRIER_RETRY_CONFIG.get(
            carrier_normalized,
            self.CARRIER_RETRY_CONFIG['default']
        )
    
    def _classify_error(self, error_message: str) -> str:
        """
        Classify error message into retry strategy categories.
        
        Args:
            error_message: Error message (lowercase)
            
        Returns:
            Error classification: 'temporary', 'auth', 'permanent', 'server', or 'unknown'
        """
        for classification, keywords in self.ERROR_CLASSIFICATIONS.items():
            for keyword in keywords:
                if keyword in error_message:
                    return classification
        
        return 'unknown'
    
    @classmethod
    def get_global_retry_stats(cls, user) -> Dict:
        """
        Get global retry statistics for a user across all campaigns.
        
        Args:
            user: User instance
            
        Returns:
            Dictionary containing global retry statistics
        """
        user_campaigns = SMSCampaign.objects.filter(user=user)
        
        total_messages = SMSMessage.objects.filter(campaign__in=user_campaigns).count()
        messages_with_retries = SMSMessage.objects.filter(
            campaign__in=user_campaigns,
            retry_attempts__isnull=False
        ).distinct().count()
        
        total_retry_attempts = RetryAttempt.objects.filter(
            message__campaign__in=user_campaigns
        ).count()
        
        successful_retries = RetryAttempt.objects.filter(
            message__campaign__in=user_campaigns,
            completed=True,
            success=True
        ).count()
        
        # Calculate overall retry rate
        retry_rate = (messages_with_retries / total_messages * 100) if total_messages > 0 else 0
        
        # Get most common error types
        common_errors = RetryAttempt.objects.filter(
            message__campaign__in=user_campaigns
        ).values('error_type').annotate(
            count=models.Count('id')
        ).order_by('-count')[:5]
        
        return {
            'total_messages': total_messages,
            'messages_with_retries': messages_with_retries,
            'retry_rate': round(retry_rate, 2),
            'total_retry_attempts': total_retry_attempts,
            'successful_retries': successful_retries,
            'common_error_types': list(common_errors),
        }


@shared_task(bind=True)
def retry_sms_message_task(self, message_id: int, retry_attempt_id: int):
    """
    Celery task to retry sending a failed SMS message.
    
    Args:
        message_id: ID of the SMSMessage to retry
        retry_attempt_id: ID of the RetryAttempt record
    """
    try:
        message = SMSMessage.objects.get(id=message_id)
        retry_attempt = RetryAttempt.objects.get(id=retry_attempt_id)
    except (SMSMessage.DoesNotExist, RetryAttempt.DoesNotExist) as e:
        logger.error(f"Retry task failed: {e}")
        return {'status': 'error', 'message': str(e)}
    
    # Import here to avoid circular imports
    from .rotation_manager import RotationManager
    from .tasks import send_enhanced_sms_message_simple
    
    campaign = message.campaign
    
    # Check if campaign is still active
    if campaign.status not in ['in_progress', 'scheduled']:
        retry_attempt.mark_completed(success=False)
        logger.info(f"Retry cancelled - campaign {campaign.id} is no longer active")
        return {'status': 'cancelled', 'reason': 'campaign_inactive'}
    
    # Initialize rotation manager
    rotation_manager = RotationManager(campaign.user, campaign)
    
    # Get servers for retry (may be different from original attempt)
    proxy = rotation_manager.get_next_proxy()
    smtp = rotation_manager.get_next_smtp()
    
    if not smtp:
        retry_attempt.mark_completed(success=False)
        logger.error(f"Retry failed - no SMTP server available for message {message_id}")
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
        logger.info(f"Retry successful for message {message_id}, attempt {retry_attempt.attempt_number}")
        
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
        logger.warning(f"Retry failed for message {message_id}, attempt {retry_attempt.attempt_number}")
        
        # Check if we should schedule another retry
        retry_service = RetryManagementService(campaign)
        if retry_service.should_retry(message, message.error_message):
            retry_service.schedule_retry(
                message, 
                message.error_message, 
                retry_service._classify_error(message.error_message.lower())
            )
            logger.info(f"Scheduled additional retry for message {message_id}")
        
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
    from django.db import models
    
    cutoff_date = timezone.now() - timedelta(days=30)
    
    old_attempts = RetryAttempt.objects.filter(
        completed=True,
        completion_time__lt=cutoff_date
    )
    
    count = old_attempts.count()
    old_attempts.delete()
    
    logger.info(f"Cleaned up {count} old retry attempts")
    return {'cleaned_up': count}
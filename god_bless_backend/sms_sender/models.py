from django.db import models
from django.contrib.auth import get_user_model
User = get_user_model()


CAMPAIGN_STATUS_CHOICES = [
    ('draft', 'Draft'),
    ('scheduled', 'Scheduled'),
    ('in_progress', 'In Progress'),
    ('completed', 'Completed'),
    ('paused', 'Paused'),
    ('cancelled', 'Cancelled'),
    ('failed', 'Failed'),
]

MESSAGE_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('queued', 'Queued'),
    ('sending', 'Sending'),
    ('sent', 'Sent'),
    ('delivered', 'Delivered'),
    ('failed', 'Failed'),
    ('bounced', 'Bounced'),
]


class SMSCampaign(models.Model):
    """SMS Campaign model for managing bulk SMS operations"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sms_campaigns')
    
    # Campaign details
    name = models.CharField(max_length=200, help_text="Campaign name")
    description = models.TextField(blank=True, help_text="Campaign description")
    message_template = models.TextField(help_text="Message template with macro support")
    custom_macros = models.JSONField(default=dict, blank=True, help_text="Custom macro values for this campaign")
    
    # Targeting
    target_carrier = models.CharField(max_length=50, null=True, blank=True, help_text="Target specific carrier")
    target_type = models.CharField(max_length=20, null=True, blank=True, help_text="Target type (mobile/landline)")
    target_area_codes = models.JSONField(default=list, blank=True, help_text="List of target area codes")
    
    # Scheduling
    scheduled_time = models.DateTimeField(null=True, blank=True, help_text="When to send the campaign")
    send_immediately = models.BooleanField(default=False)
    
    # Campaign settings
    batch_size = models.IntegerField(default=100, help_text="Number of messages per batch")
    rate_limit = models.IntegerField(default=10, help_text="Messages per minute")
    use_proxy_rotation = models.BooleanField(default=True)
    use_smtp_rotation = models.BooleanField(default=True)
    
    # Status and progress
    status = models.CharField(max_length=20, default='draft', choices=CAMPAIGN_STATUS_CHOICES)
    progress = models.IntegerField(default=0, help_text="Progress percentage (0-100)")
    
    # Metrics
    total_recipients = models.IntegerField(default=0)
    messages_sent = models.IntegerField(default=0)
    messages_delivered = models.IntegerField(default=0)
    messages_failed = models.IntegerField(default=0)
    
    # Celery task tracking
    celery_task_id = models.CharField(max_length=255, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['scheduled_time']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.status}"


class SMSMessage(models.Model):
    """Individual SMS message within a campaign"""
    campaign = models.ForeignKey(SMSCampaign, on_delete=models.CASCADE, related_name='messages')
    
    # Message details
    phone_number = models.CharField(max_length=15)
    message_content = models.TextField(help_text="Rendered message content with macros replaced")
    recipient_data = models.JSONField(default=dict, blank=True, help_text="Recipient-specific data for macro replacement")
    
    # Carrier information
    carrier = models.CharField(max_length=50, null=True, blank=True)
    carrier_gateway = models.CharField(max_length=100, null=True, blank=True)
    
    # Delivery tracking
    delivery_status = models.CharField(max_length=20, default='pending', choices=MESSAGE_STATUS_CHOICES)
    
    # SMTP and Proxy used
    smtp_server = models.CharField(max_length=200, null=True, blank=True)
    proxy_used = models.CharField(max_length=200, null=True, blank=True)
    
    # Attempt tracking
    send_attempts = models.IntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    queued_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['campaign', 'delivery_status']),
            models.Index(fields=['phone_number']),
            models.Index(fields=['delivery_status']),
        ]
    
    def __str__(self):
        return f"{self.phone_number} - {self.delivery_status}"


class SentSMS(models.Model):
    """Legacy SMS model - kept for backward compatibility"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_sms')

    number = models.CharField(max_length=500, null=True, blank=True)
    provider = models.CharField(max_length=500, null=True, blank=True)
    subject = models.CharField(max_length=5000, null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    sent = models.BooleanField(default=False)


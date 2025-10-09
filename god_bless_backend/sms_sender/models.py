from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

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
    
    # Enhanced server tracking with foreign key relationships
    proxy_server = models.ForeignKey('proxy_server.ProxyServer', null=True, blank=True, on_delete=models.SET_NULL, related_name='sms_messages')
    smtp_server = models.ForeignKey('smtps.SmtpManager', null=True, blank=True, on_delete=models.SET_NULL, related_name='sms_messages')
    
    # Legacy fields for backward compatibility
    smtp_server_legacy = models.CharField(max_length=200, null=True, blank=True, help_text="Legacy SMTP server field")
    proxy_used_legacy = models.CharField(max_length=200, null=True, blank=True, help_text="Legacy proxy field")
    
    # Enhanced performance tracking
    delivery_delay_applied = models.FloatField(null=True, blank=True, help_text="Delay applied before sending (seconds)")
    proxy_response_time = models.FloatField(null=True, blank=True, help_text="Proxy response time in seconds")
    smtp_response_time = models.FloatField(null=True, blank=True, help_text="SMTP response time in seconds")
    total_processing_time = models.FloatField(null=True, blank=True, help_text="Total processing time in seconds")
    
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
            models.Index(fields=['proxy_server']),
            models.Index(fields=['smtp_server']),
        ]
    
    def __str__(self):
        return f"{self.phone_number} - {self.delivery_status}"


class CampaignDeliverySettings(models.Model):
    """Per-campaign delivery optimization settings"""
    campaign = models.OneToOneField(SMSCampaign, on_delete=models.CASCADE, related_name='delivery_settings')
    
    # Proxy settings
    use_proxy_rotation = models.BooleanField(default=True)
    proxy_rotation_strategy = models.CharField(max_length=20, default='round_robin', choices=[
        ('round_robin', 'Round Robin'),
        ('random', 'Random'),
        ('least_used', 'Least Used'),
        ('best_performance', 'Best Performance'),
        ('smart_adaptive', 'Smart Adaptive')
    ])
    
    # SMTP settings  
    use_smtp_rotation = models.BooleanField(default=True)
    smtp_rotation_strategy = models.CharField(max_length=20, default='round_robin', choices=[
        ('round_robin', 'Round Robin'),
        ('random', 'Random'),
        ('least_used', 'Least Used'),
        ('best_performance', 'Best Performance'),
        ('smart_adaptive', 'Smart Adaptive')
    ])
    
    # Delivery timing
    custom_delay_enabled = models.BooleanField(default=False)
    custom_delay_min = models.IntegerField(default=1, help_text="Minimum delay in seconds")
    custom_delay_max = models.IntegerField(default=5, help_text="Maximum delay in seconds")
    custom_random_seed = models.IntegerField(null=True, blank=True, help_text="Random seed for reproducible delays")
    
    # Smart delivery features
    adaptive_optimization_enabled = models.BooleanField(default=False)
    carrier_optimization_enabled = models.BooleanField(default=False)
    timezone_optimization_enabled = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Campaign Delivery Settings"
        verbose_name_plural = "Campaign Delivery Settings"
    
    def __str__(self):
        return f"Delivery Settings for {self.campaign.name}"


class ServerUsageLog(models.Model):
    """Track server usage during campaigns"""
    campaign = models.ForeignKey(SMSCampaign, on_delete=models.CASCADE, related_name='server_usage_logs')
    server_type = models.CharField(max_length=10, choices=[('proxy', 'Proxy'), ('smtp', 'SMTP')])
    server_id = models.IntegerField(help_text="ID of the proxy or SMTP server")
    
    # Usage statistics
    messages_processed = models.IntegerField(default=0)
    successful_messages = models.IntegerField(default=0)
    failed_messages = models.IntegerField(default=0)
    
    # Performance metrics
    average_response_time = models.FloatField(null=True, blank=True, help_text="Average response time in seconds")
    total_processing_time = models.FloatField(null=True, blank=True, help_text="Total processing time in seconds")
    
    # Timestamps
    first_used = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['campaign', 'server_type', 'server_id']
        indexes = [
            models.Index(fields=['campaign', 'server_type']),
            models.Index(fields=['server_type', 'server_id']),
        ]
    
    def __str__(self):
        return f"{self.server_type.title()} Server {self.server_id} - Campaign {self.campaign.name}"
    
    def get_success_rate(self):
        """Calculate success rate percentage"""
        if self.messages_processed == 0:
            return 0.0
        return (self.successful_messages / self.messages_processed) * 100


class CarrierPerformanceLog(models.Model):
    """Track performance by carrier for optimization"""
    carrier = models.CharField(max_length=50, help_text="Carrier name")
    proxy_server = models.ForeignKey('proxy_server.ProxyServer', on_delete=models.CASCADE, related_name='carrier_performance_logs')
    smtp_server = models.ForeignKey('smtps.SmtpManager', on_delete=models.CASCADE, related_name='carrier_performance_logs')
    
    # Performance metrics
    success_rate = models.FloatField(default=0.0, help_text="Success rate percentage (0-100)")
    average_delivery_time = models.FloatField(null=True, blank=True, help_text="Average delivery time in seconds")
    messages_sent = models.IntegerField(default=0)
    successful_deliveries = models.IntegerField(default=0)
    failed_deliveries = models.IntegerField(default=0)
    
    # Timestamps
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['carrier', 'proxy_server', 'smtp_server']
        indexes = [
            models.Index(fields=['carrier']),
            models.Index(fields=['success_rate']),
            models.Index(fields=['proxy_server', 'smtp_server']),
        ]
    
    def __str__(self):
        return f"{self.carrier} - Proxy {self.proxy_server.id} - SMTP {self.smtp_server.id}"
    
    def update_performance(self, success: bool, delivery_time: float = None):
        """Update performance metrics with new delivery result"""
        self.messages_sent += 1
        if success:
            self.successful_deliveries += 1
            if delivery_time:
                # Update average delivery time
                if self.average_delivery_time:
                    self.average_delivery_time = (self.average_delivery_time + delivery_time) / 2
                else:
                    self.average_delivery_time = delivery_time
        else:
            self.failed_deliveries += 1
        
        # Recalculate success rate
        self.success_rate = (self.successful_deliveries / self.messages_sent) * 100
        self.save()


class RetryAttempt(models.Model):
    """Track retry attempts for failed messages"""
    message = models.ForeignKey(SMSMessage, on_delete=models.CASCADE, related_name='retry_attempts')
    attempt_number = models.IntegerField(help_text="Retry attempt number (1, 2, 3, etc.)")
    
    # Error information
    error_type = models.CharField(max_length=50, help_text="Type of error that caused the retry")
    error_message = models.TextField(help_text="Detailed error message")
    
    # Retry configuration
    retry_delay = models.IntegerField(help_text="Delay before retry in seconds")
    scheduled_retry_time = models.DateTimeField(help_text="When the retry is scheduled")
    
    # Retry result
    completed = models.BooleanField(default=False)
    success = models.BooleanField(default=False)
    completion_time = models.DateTimeField(null=True, blank=True)
    
    # Server information for retry
    retry_proxy_server = models.ForeignKey('proxy_server.ProxyServer', null=True, blank=True, on_delete=models.SET_NULL)
    retry_smtp_server = models.ForeignKey('smtps.SmtpManager', null=True, blank=True, on_delete=models.SET_NULL)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['attempt_number']
        indexes = [
            models.Index(fields=['message', 'attempt_number']),
            models.Index(fields=['scheduled_retry_time']),
            models.Index(fields=['completed', 'success']),
        ]
    
    def __str__(self):
        return f"Retry {self.attempt_number} for {self.message.phone_number}"
    
    def mark_completed(self, success: bool):
        """Mark the retry attempt as completed"""
        self.completed = True
        self.success = success
        self.completion_time = timezone.now()
        self.save()


class CampaignTemplate(models.Model):
    """Pre-configured campaign templates"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='campaign_templates')
    name = models.CharField(max_length=200, help_text="Template name")
    description = models.TextField(blank=True, help_text="Template description")
    
    category = models.CharField(max_length=20, choices=[
        ('marketing', 'Marketing'),
        ('alerts', 'Alerts'),
        ('notifications', 'Notifications'),
        ('custom', 'Custom')
    ], default='custom')
    
    # Template settings (JSON field containing all campaign settings)
    settings = models.JSONField(default=dict, help_text="Template configuration settings")
    
    # Performance metrics
    usage_count = models.IntegerField(default=0, help_text="Number of times this template has been used")
    average_success_rate = models.FloatField(null=True, blank=True, help_text="Average success rate of campaigns using this template")
    
    # Sharing settings
    is_public = models.BooleanField(default=False, help_text="Allow sharing between users")
    is_system_template = models.BooleanField(default=False, help_text="System-provided template")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-usage_count', '-created_at']
        indexes = [
            models.Index(fields=['user', 'category']),
            models.Index(fields=['is_public', 'category']),
            models.Index(fields=['-usage_count']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.category})"
    
    def increment_usage(self):
        """Increment usage count when template is used"""
        self.usage_count += 1
        self.save()
    
    def update_success_rate(self, campaign_success_rate: float):
        """Update average success rate with new campaign data"""
        if self.average_success_rate is None:
            self.average_success_rate = campaign_success_rate
        else:
            # Calculate weighted average
            self.average_success_rate = (self.average_success_rate + campaign_success_rate) / 2
        self.save()


class RoutingRule(models.Model):
    """Conditional routing rules for server selection"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='routing_rules')
    name = models.CharField(max_length=200, help_text="Rule name")
    description = models.TextField(blank=True, help_text="Rule description")
    
    # Rule conditions (JSON field)
    conditions = models.JSONField(default=dict, help_text="Conditions for rule matching")
    
    # Rule actions (JSON field)
    actions = models.JSONField(default=dict, help_text="Actions to take when rule matches")
    
    # Rule configuration
    priority = models.IntegerField(default=0, help_text="Rule priority (higher = more important)")
    enabled = models.BooleanField(default=True, help_text="Whether rule is active")
    
    # Usage statistics
    match_count = models.IntegerField(default=0, help_text="Number of times rule has matched")
    success_count = models.IntegerField(default=0, help_text="Number of successful deliveries using this rule")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['user', 'enabled']),
            models.Index(fields=['-priority']),
        ]
    
    def __str__(self):
        return f"{self.name} (Priority: {self.priority})"
    
    def get_success_rate(self):
        """Calculate success rate percentage"""
        if self.match_count == 0:
            return 0.0
        return (self.success_count / self.match_count) * 100
    
    def increment_match(self, success: bool = False):
        """Increment match count and optionally success count"""
        self.match_count += 1
        if success:
            self.success_count += 1
        self.save()


class ServerCapacityWeight(models.Model):
    """Load balancing weights for server capacity management"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='server_weights')
    
    # Server identification
    server_type = models.CharField(max_length=10, choices=[('proxy', 'Proxy'), ('smtp', 'SMTP')])
    server_id = models.IntegerField(help_text="ID of the proxy or SMTP server")
    
    # Capacity configuration
    capacity_weight = models.FloatField(default=1.0, help_text="Server capacity weight (higher = more capacity)")
    max_concurrent_requests = models.IntegerField(default=100, help_text="Maximum concurrent requests")
    
    # Geographic configuration
    timezone = models.CharField(max_length=20, default='eastern', choices=[
        ('eastern', 'Eastern'),
        ('central', 'Central'),
        ('mountain', 'Mountain'),
        ('pacific', 'Pacific'),
        ('alaska', 'Alaska'),
        ('hawaii', 'Hawaii')
    ])
    
    # Server tags for routing rules
    tags = models.JSONField(default=list, blank=True, help_text="Tags for routing rule matching")
    
    # Performance thresholds
    min_success_rate = models.FloatField(default=80.0, help_text="Minimum success rate to remain active")
    max_response_time = models.FloatField(default=5.0, help_text="Maximum acceptable response time (seconds)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'server_type', 'server_id']
        indexes = [
            models.Index(fields=['user', 'server_type']),
            models.Index(fields=['server_type', 'server_id']),
        ]
    
    def __str__(self):
        return f"{self.server_type.title()} Server {self.server_id} - Weight: {self.capacity_weight}"
    
    def is_within_thresholds(self, success_rate: float, response_time: float) -> bool:
        """Check if server performance is within acceptable thresholds"""
        return (success_rate >= self.min_success_rate and 
                response_time <= self.max_response_time)


class GeographicRoutingPreference(models.Model):
    """Geographic routing preferences for optimized server selection"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='geographic_preferences')
    
    # Geographic targeting
    area_codes = models.JSONField(default=list, help_text="Target area codes")
    states = models.JSONField(default=list, help_text="Target states (2-letter codes)")
    timezones = models.JSONField(default=list, help_text="Target timezones")
    
    # Preferred servers
    preferred_proxy_servers = models.JSONField(default=list, help_text="Preferred proxy server IDs")
    preferred_smtp_servers = models.JSONField(default=list, help_text="Preferred SMTP server IDs")
    
    # Routing strategy
    strategy = models.CharField(max_length=20, default='closest', choices=[
        ('closest', 'Closest Geographic Match'),
        ('performance', 'Best Performance'),
        ('balanced', 'Balanced Performance and Geography'),
        ('custom', 'Custom Rules')
    ])
    
    # Performance weights
    geographic_weight = models.FloatField(default=0.3, help_text="Weight for geographic proximity (0-1)")
    performance_weight = models.FloatField(default=0.7, help_text="Weight for server performance (0-1)")
    
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'enabled']),
        ]
    
    def __str__(self):
        return f"Geographic Preference - {self.strategy} ({len(self.area_codes)} area codes)"


class ABTestExperiment(models.Model):
    """A/B testing experiments for campaign optimization"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ab_experiments')
    name = models.CharField(max_length=200, help_text="Experiment name")
    description = models.TextField(blank=True, help_text="Experiment description")
    
    # Experiment configuration
    hypothesis = models.TextField(help_text="What we're testing and expected outcome")
    test_type = models.CharField(max_length=20, choices=[
        ('message_content', 'Message Content'),
        ('send_timing', 'Send Timing'),
        ('server_config', 'Server Configuration'),
        ('rate_limiting', 'Rate Limiting'),
        ('routing_rules', 'Routing Rules'),
        ('delivery_settings', 'Delivery Settings')
    ])
    
    # Test parameters
    traffic_split = models.FloatField(default=0.5, help_text="Percentage of traffic for variant A (0.0-1.0)")
    minimum_sample_size = models.IntegerField(default=100, help_text="Minimum messages per variant")
    confidence_level = models.FloatField(default=0.95, help_text="Statistical confidence level")
    
    # Test configurations (JSON fields)
    control_config = models.JSONField(default=dict, help_text="Control group configuration")
    variant_config = models.JSONField(default=dict, help_text="Variant group configuration")
    
    # Success metrics
    primary_metric = models.CharField(max_length=50, default='delivery_rate', choices=[
        ('delivery_rate', 'Delivery Rate'),
        ('response_time', 'Response Time'),
        ('success_rate', 'Success Rate'),
        ('cost_per_message', 'Cost Per Message'),
        ('error_rate', 'Error Rate')
    ])
    secondary_metrics = models.JSONField(default=list, help_text="Additional metrics to track")
    
    # Experiment status
    status = models.CharField(max_length=20, default='draft', choices=[
        ('draft', 'Draft'),
        ('running', 'Running'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ])
    
    # Statistical results
    statistical_significance = models.FloatField(null=True, blank=True, help_text="P-value of the test")
    confidence_interval = models.JSONField(default=dict, blank=True, help_text="Confidence interval for the effect")
    effect_size = models.FloatField(null=True, blank=True, help_text="Measured effect size")
    winner = models.CharField(max_length=15, null=True, blank=True, choices=[
        ('control', 'Control'),
        ('variant', 'Variant'),
        ('inconclusive', 'Inconclusive')
    ])
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['test_type', 'status']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.test_type}) - {self.status}"
    
    def get_duration_days(self):
        """Get experiment duration in days"""
        if self.started_at and self.ended_at:
            return (self.ended_at - self.started_at).days
        elif self.started_at:
            return (timezone.now() - self.started_at).days
        return 0
    
    def is_statistically_significant(self):
        """Check if results are statistically significant"""
        return (self.statistical_significance is not None and 
                self.statistical_significance < (1 - self.confidence_level))


class ABTestVariant(models.Model):
    """Individual variants in an A/B test"""
    experiment = models.ForeignKey(ABTestExperiment, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=100, help_text="Variant name (e.g., 'Control', 'Variant A')")
    is_control = models.BooleanField(default=False, help_text="Whether this is the control group")
    
    # Configuration
    configuration = models.JSONField(default=dict, help_text="Variant-specific configuration")
    traffic_allocation = models.FloatField(help_text="Percentage of traffic allocated to this variant")
    
    # Metrics
    total_messages = models.IntegerField(default=0)
    successful_messages = models.IntegerField(default=0)
    failed_messages = models.IntegerField(default=0)
    
    # Performance metrics
    average_response_time = models.FloatField(null=True, blank=True)
    average_cost = models.FloatField(null=True, blank=True)
    error_count = models.IntegerField(default=0)
    
    # Calculated metrics
    delivery_rate = models.FloatField(null=True, blank=True, help_text="Calculated delivery rate percentage")
    success_rate = models.FloatField(null=True, blank=True, help_text="Calculated success rate percentage")
    error_rate = models.FloatField(null=True, blank=True, help_text="Calculated error rate percentage")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['experiment', 'name']
        indexes = [
            models.Index(fields=['experiment', 'is_control']),
        ]
    
    def __str__(self):
        return f"{self.experiment.name} - {self.name}"
    
    def calculate_metrics(self):
        """Calculate and update performance metrics"""
        if self.total_messages > 0:
            self.delivery_rate = (self.successful_messages / self.total_messages) * 100
            self.success_rate = (self.successful_messages / self.total_messages) * 100
            self.error_rate = (self.error_count / self.total_messages) * 100
        else:
            self.delivery_rate = 0.0
            self.success_rate = 0.0
            self.error_rate = 0.0
        
        self.save()
    
    def add_message_result(self, success: bool, response_time: float = None, cost: float = None, error: bool = False):
        """Add a message result to this variant"""
        self.total_messages += 1
        
        if success:
            self.successful_messages += 1
        else:
            self.failed_messages += 1
        
        if error:
            self.error_count += 1
        
        # Update average response time
        if response_time is not None:
            if self.average_response_time is None:
                self.average_response_time = response_time
            else:
                # Calculate running average
                total_time = self.average_response_time * (self.total_messages - 1) + response_time
                self.average_response_time = total_time / self.total_messages
        
        # Update average cost
        if cost is not None:
            if self.average_cost is None:
                self.average_cost = cost
            else:
                # Calculate running average
                total_cost = self.average_cost * (self.total_messages - 1) + cost
                self.average_cost = total_cost / self.total_messages
        
        # Recalculate metrics
        self.calculate_metrics()


class ABTestAssignment(models.Model):
    """Track which messages are assigned to which A/B test variants"""
    experiment = models.ForeignKey(ABTestExperiment, on_delete=models.CASCADE, related_name='assignments')
    variant = models.ForeignKey(ABTestVariant, on_delete=models.CASCADE, related_name='assignments')
    message = models.ForeignKey(SMSMessage, on_delete=models.CASCADE, related_name='ab_test_assignments')
    
    # Assignment details
    assigned_at = models.DateTimeField(auto_now_add=True)
    assignment_method = models.CharField(max_length=20, default='random', choices=[
        ('random', 'Random'),
        ('hash_based', 'Hash-based'),
        ('sequential', 'Sequential')
    ])
    
    # Result tracking
    result_recorded = models.BooleanField(default=False)
    result_recorded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['experiment', 'message']
        indexes = [
            models.Index(fields=['experiment', 'variant']),
            models.Index(fields=['message']),
            models.Index(fields=['assigned_at']),
        ]
    
    def __str__(self):
        return f"{self.experiment.name} - {self.variant.name} - Message {self.message.id}"
    
    def record_result(self, success: bool, response_time: float = None, cost: float = None, error: bool = False):
        """Record the result of this assignment"""
        if not self.result_recorded:
            self.variant.add_message_result(success, response_time, cost, error)
            self.result_recorded = True
            self.result_recorded_at = timezone.now()
            self.save()


class ABTestResult(models.Model):
    """Statistical results and analysis for A/B tests"""
    experiment = models.OneToOneField(ABTestExperiment, on_delete=models.CASCADE, related_name='results')
    
    # Statistical analysis
    control_mean = models.FloatField(null=True, blank=True)
    variant_mean = models.FloatField(null=True, blank=True)
    control_std = models.FloatField(null=True, blank=True)
    variant_std = models.FloatField(null=True, blank=True)
    
    # Test statistics
    t_statistic = models.FloatField(null=True, blank=True)
    p_value = models.FloatField(null=True, blank=True)
    degrees_of_freedom = models.IntegerField(null=True, blank=True)
    
    # Effect size and confidence intervals
    effect_size = models.FloatField(null=True, blank=True)
    confidence_interval_lower = models.FloatField(null=True, blank=True)
    confidence_interval_upper = models.FloatField(null=True, blank=True)
    
    # Practical significance
    minimum_detectable_effect = models.FloatField(null=True, blank=True)
    practical_significance = models.BooleanField(null=True, blank=True)
    
    # Recommendations
    recommendation = models.TextField(blank=True, help_text="Analysis and recommendations")
    confidence_level = models.FloatField(help_text="Confidence level used in analysis")
    
    # Analysis metadata
    analysis_method = models.CharField(max_length=50, default='t_test', choices=[
        ('t_test', 'T-Test'),
        ('chi_square', 'Chi-Square'),
        ('mann_whitney', 'Mann-Whitney U'),
        ('bootstrap', 'Bootstrap')
    ])
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['p_value']),
            models.Index(fields=['effect_size']),
        ]
    
    def __str__(self):
        return f"Results for {self.experiment.name}"
    
    def is_significant(self):
        """Check if the result is statistically significant"""
        if self.p_value is None:
            return False
        return self.p_value < (1 - self.confidence_level)
    
    def get_winner(self):
        """Determine the winning variant"""
        if not self.is_significant():
            return 'inconclusive'
        
        if self.variant_mean is None or self.control_mean is None:
            return 'inconclusive'
        
        if self.variant_mean > self.control_mean:
            return 'variant'
        else:
            return 'control'


class CampaignOptimizationRecommendation(models.Model):
    """AI-generated optimization recommendations based on A/B test results"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='optimization_recommendations')
    experiment = models.ForeignKey(ABTestExperiment, null=True, blank=True, on_delete=models.CASCADE, related_name='recommendations')
    
    # Recommendation details
    title = models.CharField(max_length=200, help_text="Recommendation title")
    description = models.TextField(help_text="Detailed recommendation description")
    category = models.CharField(max_length=50, choices=[
        ('server_config', 'Server Configuration'),
        ('routing_rules', 'Routing Rules'),
        ('timing', 'Send Timing'),
        ('rate_limiting', 'Rate Limiting'),
        ('message_content', 'Message Content'),
        ('general', 'General Optimization')
    ])
    
    # Impact assessment
    expected_improvement = models.FloatField(help_text="Expected improvement percentage")
    confidence_score = models.FloatField(help_text="Confidence in recommendation (0-1)")
    implementation_effort = models.CharField(max_length=20, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High')
    ])
    
    # Implementation details
    configuration_changes = models.JSONField(default=dict, help_text="Specific configuration changes to make")
    implementation_steps = models.JSONField(default=list, help_text="Step-by-step implementation guide")
    
    # Status tracking
    status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('implemented', 'Implemented'),
        ('rejected', 'Rejected'),
        ('testing', 'Under Testing')
    ])
    
    # Results tracking
    implemented_at = models.DateTimeField(null=True, blank=True)
    actual_improvement = models.FloatField(null=True, blank=True, help_text="Actual improvement achieved")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-confidence_score', '-expected_improvement', '-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['-confidence_score']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.expected_improvement:.1f}% improvement)"
    
    def mark_implemented(self):
        """Mark recommendation as implemented"""
        self.status = 'implemented'
        self.implemented_at = timezone.now()
        self.save()


class SentSMS(models.Model):
    """Legacy SMS model - kept for backward compatibility"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_sms')

    number = models.CharField(max_length=500, null=True, blank=True)
    provider = models.CharField(max_length=500, null=True, blank=True)
    subject = models.CharField(max_length=5000, null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    sent = models.BooleanField(default=False)


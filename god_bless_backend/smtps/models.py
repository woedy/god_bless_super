from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class SmtpManager(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_smtps')

    host = models.CharField(max_length=500, null=True, blank=True)
    port = models.CharField(max_length=500, null=True, blank=True)
    username = models.CharField(max_length=500, null=True, blank=True)
    password = models.CharField(max_length=500, null=True, blank=True)
    ssl = models.BooleanField(default=False)
    tls = models.BooleanField(default=False)

    # Health tracking
    is_healthy = models.BooleanField(default=True)
    last_health_check = models.DateTimeField(null=True, blank=True)
    health_check_failures = models.IntegerField(default=0)
    
    # Usage tracking
    total_emails_sent = models.IntegerField(default=0)
    successful_emails = models.IntegerField(default=0)
    failed_emails = models.IntegerField(default=0)
    last_used = models.DateTimeField(null=True, blank=True)
    
    # Performance tracking
    average_response_time = models.FloatField(null=True, blank=True, help_text='Average response time in seconds')
    last_response_time = models.FloatField(null=True, blank=True, help_text='Last response time in seconds')
    consecutive_failures = models.IntegerField(default=0, help_text='Consecutive failures since last success')
    last_error_message = models.TextField(null=True, blank=True, help_text='Last error message')

    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created_at = models.DateField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-id']
    
    def __str__(self):
        return f"{self.host}:{self.port}"
    
    def mark_success(self, response_time=None):
        """Mark a successful email send with optional response time tracking"""
        self.total_emails_sent += 1
        self.successful_emails += 1
        self.last_used = timezone.now()
        self.health_check_failures = 0
        self.consecutive_failures = 0
        self.is_healthy = True
        self.last_error_message = None
        
        # Update response time metrics
        if response_time is not None:
            self.last_response_time = response_time
            if self.average_response_time is None:
                self.average_response_time = response_time
            else:
                # Calculate rolling average (weighted towards recent performance)
                self.average_response_time = (self.average_response_time * 0.8) + (response_time * 0.2)
        
        self.save()
    
    def mark_failure(self, error_message=None):
        """Mark a failed email send with optional error message"""
        self.total_emails_sent += 1
        self.failed_emails += 1
        self.health_check_failures += 1
        self.consecutive_failures += 1
        self.last_used = timezone.now()
        
        if error_message:
            self.last_error_message = error_message[:500]  # Limit error message length
        
        # Mark as unhealthy after 3 consecutive failures
        if self.health_check_failures >= 3:
            self.is_healthy = False
        
        self.save()
    
    def get_success_rate(self):
        """Calculate success rate percentage"""
        if self.total_emails_sent == 0:
            return 0.0
        return (self.successful_emails / self.total_emails_sent) * 100
    
    def get_performance_summary(self):
        """Get a summary of server performance metrics"""
        return {
            'success_rate': round(self.get_success_rate(), 2),
            'total_sent': self.total_emails_sent,
            'avg_response_time': round(self.average_response_time, 3) if self.average_response_time else None,
            'is_healthy': self.is_healthy,
            'consecutive_failures': self.consecutive_failures,
            'last_used': self.last_used.isoformat() if self.last_used else None
        }

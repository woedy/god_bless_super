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

    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created_at = models.DateField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-id']
    
    def __str__(self):
        return f"{self.host}:{self.port}"
    
    def mark_success(self):
        """Mark a successful email send"""
        self.total_emails_sent += 1
        self.successful_emails += 1
        self.last_used = timezone.now()
        self.health_check_failures = 0
        self.is_healthy = True
        self.save()
    
    def mark_failure(self):
        """Mark a failed email send"""
        self.total_emails_sent += 1
        self.failed_emails += 1
        self.health_check_failures += 1
        self.last_used = timezone.now()
        
        # Mark as unhealthy after 3 consecutive failures
        if self.health_check_failures >= 3:
            self.is_healthy = False
        
        self.save()

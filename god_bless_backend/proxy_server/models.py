from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class ProxyServer(models.Model):
    """Model for storing proxy server configurations"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_proxies')
    
    host = models.CharField(max_length=500)
    port = models.IntegerField()
    username = models.CharField(max_length=500, null=True, blank=True)
    password = models.CharField(max_length=500, null=True, blank=True)
    protocol = models.CharField(max_length=10, default='http', choices=[
        ('http', 'HTTP'),
        ('https', 'HTTPS'),
        ('socks4', 'SOCKS4'),
        ('socks5', 'SOCKS5')
    ])
    
    # Health tracking
    is_active = models.BooleanField(default=True)
    is_healthy = models.BooleanField(default=True)
    last_health_check = models.DateTimeField(null=True, blank=True)
    health_check_failures = models.IntegerField(default=0)
    
    # Usage tracking
    total_requests = models.IntegerField(default=0)
    successful_requests = models.IntegerField(default=0)
    failed_requests = models.IntegerField(default=0)
    last_used = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.protocol}://{self.host}:{self.port}"
    
    def get_proxy_url(self):
        """Returns formatted proxy URL"""
        if self.username and self.password:
            return f"{self.protocol}://{self.username}:{self.password}@{self.host}:{self.port}"
        return f"{self.protocol}://{self.host}:{self.port}"
    
    def mark_success(self):
        """Mark a successful request"""
        self.total_requests += 1
        self.successful_requests += 1
        self.last_used = timezone.now()
        self.health_check_failures = 0
        self.is_healthy = True
        self.save()
    
    def mark_failure(self):
        """Mark a failed request"""
        self.total_requests += 1
        self.failed_requests += 1
        self.health_check_failures += 1
        self.last_used = timezone.now()
        
        # Mark as unhealthy after 3 consecutive failures
        if self.health_check_failures >= 3:
            self.is_healthy = False
        
        self.save()


class RotationSettings(models.Model):
    """Model for storing rotation configuration settings"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='rotation_settings')
    
    # Proxy rotation settings
    proxy_rotation_enabled = models.BooleanField(default=True)
    proxy_rotation_strategy = models.CharField(max_length=20, default='round_robin', choices=[
        ('round_robin', 'Round Robin'),
        ('random', 'Random'),
        ('least_used', 'Least Used'),
        ('best_performance', 'Best Performance')
    ])
    proxy_health_check_interval = models.IntegerField(default=300, help_text='Health check interval in seconds')
    proxy_max_failures = models.IntegerField(default=3, help_text='Max failures before marking unhealthy')
    
    # SMTP rotation settings
    smtp_rotation_enabled = models.BooleanField(default=True)
    smtp_rotation_strategy = models.CharField(max_length=20, default='round_robin', choices=[
        ('round_robin', 'Round Robin'),
        ('random', 'Random'),
        ('least_used', 'Least Used'),
        ('best_performance', 'Best Performance')
    ])
    smtp_health_check_interval = models.IntegerField(default=300, help_text='Health check interval in seconds')
    smtp_max_failures = models.IntegerField(default=3, help_text='Max failures before marking unhealthy')
    
    # Delivery delay settings
    delivery_delay_enabled = models.BooleanField(default=True)
    delivery_delay_min = models.IntegerField(default=1, help_text='Minimum delay in seconds')
    delivery_delay_max = models.IntegerField(default=5, help_text='Maximum delay in seconds')
    delivery_delay_random_seed = models.IntegerField(null=True, blank=True, help_text='Random seed for reproducible delays')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Rotation Settings for {self.user.username}"

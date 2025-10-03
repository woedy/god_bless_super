from django.db import models

class PhonePrefix(models.Model):
    prefix = models.CharField(max_length=6, unique=True)  # Store the prefix (e.g., '201200')
    carrier = models.CharField(max_length=255)             # Carrier name (e.g., 'Sprint')
    city = models.CharField(max_length=255)                # City (e.g., 'Newark')
    state = models.CharField(max_length=255)               # State (e.g., 'New Jersey')
    line_type = models.CharField(max_length=50)            # Line type (Mobile or Landline)

    def __str__(self):
        return f"{self.prefix} - {self.carrier} - {self.line_type}"

    class Meta:
        ordering = ['prefix']



class Proxy(models.Model):
    ip_address = models.CharField(max_length=15)
    port = models.IntegerField()
    country = models.CharField(max_length=50, blank=True, null=True)
    ssl = models.BooleanField(default=False)
    anonymity = models.CharField(max_length=20, blank=True, null=True)
    valid = models.BooleanField(default=False)  # Track whether proxy is valid or not
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.ip_address}:{self.port}"

from django.db import models
from django.contrib.auth import get_user_model

from projects.models import Project

User = get_user_model()



STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('assigned', 'Assigned'),
        ('blocked', 'Blocked'),
    ]


class PhoneNumber(models.Model):
    """Enhanced phone number model with carrier, type, and validation tracking"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_numbers')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='user_projectss')

    phone_number = models.CharField(max_length=15, unique=True)
    valid_number = models.BooleanField(null=True)

    # Enhanced carrier and type information
    carrier = models.CharField(max_length=200, null=True, blank=True, db_index=True)
    location = models.CharField(max_length=200, null=True, blank=True)
    type = models.CharField(max_length=200, null=True, blank=True, db_index=True)
    state = models.CharField(max_length=200, null=True, blank=True)

    international = models.CharField(max_length=200, null=True, blank=True)
    local = models.CharField(max_length=200, null=True, blank=True)
    
    code = models.CharField(max_length=200, null=True, blank=True)
    country_name = models.CharField(max_length=200, null=True, blank=True)
    prefix = models.CharField(max_length=200, null=True, blank=True, db_index=True)
    area_code = models.CharField(max_length=5, null=True, blank=True, db_index=True)

    # Enhanced validation tracking
    validation_attempted = models.BooleanField(default=False)
    validation_date = models.DateTimeField(null=True, blank=True)
    validation_source = models.CharField(max_length=50, default='internal', help_text="Source of validation (internal/external)")

    dispatch = models.BooleanField(default=False)
    status = models.CharField(max_length=100, default='Pending', choices=STATUS_CHOICES, blank=True, null=True)

    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=False)
    created_at = models.DateField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['carrier', 'type']),
            models.Index(fields=['area_code', 'valid_number']),
            models.Index(fields=['user', 'project']),
        ]

    def __str__(self):
        return self.phone_number



TASK_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('in_progress', 'In Progress'),
    ('completed', 'Completed'),
    ('failed', 'Failed'),
    ('cancelled', 'Cancelled'),
]


class PhoneGenerationTask(models.Model):
    """Background task tracking for phone number generation"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='phone_generation_tasks')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='generation_tasks', null=True, blank=True)
    
    # Task parameters
    area_code = models.CharField(max_length=5)
    quantity = models.IntegerField(help_text="Number of phone numbers to generate")
    carrier_filter = models.CharField(max_length=200, null=True, blank=True, help_text="Optional carrier filter")
    type_filter = models.CharField(max_length=200, null=True, blank=True, help_text="Optional type filter (mobile/landline)")
    
    # Task status and progress
    status = models.CharField(max_length=20, default='pending', choices=TASK_STATUS_CHOICES)
    progress = models.IntegerField(default=0, help_text="Progress percentage (0-100)")
    current_step = models.CharField(max_length=200, blank=True, help_text="Current processing step")
    
    # Task metrics
    total_items = models.IntegerField(default=0)
    processed_items = models.IntegerField(default=0)
    successful_items = models.IntegerField(default=0)
    failed_items = models.IntegerField(default=0)
    
    # Celery task tracking
    celery_task_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    
    # Result data
    result_data = models.JSONField(default=dict, blank=True, help_text="Task result and metadata")
    error_message = models.TextField(blank=True, help_text="Error message if task failed")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    estimated_completion = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['celery_task_id']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"Task {self.id} - {self.area_code} ({self.quantity} numbers) - {self.status}"
    
    @property
    def duration(self):
        """Calculate task duration"""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None

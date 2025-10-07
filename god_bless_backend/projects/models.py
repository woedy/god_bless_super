from django.db import models
from django.contrib.auth import get_user_model
from django.db.models import Count, Q

User = get_user_model()


class Project(models.Model):
    STATUS_CHOICES = [
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="user_projects"
    )
    project_name = models.CharField(max_length=1500, unique=True)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    # Project settings
    target_phone_count = models.IntegerField(default=0)
    target_sms_count = models.IntegerField(default=0)
    budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Collaboration
    collaborators = models.ManyToManyField(User, related_name='collaborated_projects', blank=True)
    
    # Dates
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)
    
    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=False)

    created_at = models.DateField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.project_name
    
    @property
    def task_stats(self):
        """Get task statistics for the project"""
        tasks = self.tasks.all()
        total = tasks.count()
        completed = tasks.filter(status='completed').count()
        in_progress = tasks.filter(status='in_progress').count()
        pending = tasks.filter(status='pending').count()
        
        return {
            'total': total,
            'completed': completed,
            'in_progress': in_progress,
            'pending': pending,
            'completion_rate': (completed / total * 100) if total > 0 else 0
        }
    
    @property
    def phone_stats(self):
        """Get phone number statistics for the project"""
        try:
            from phone_generator.models import PhoneNumber
            phones = PhoneNumber.objects.filter(project=self)
            return {
                'total': phones.count(),
                'valid': phones.filter(valid_number=True).count(),
                'invalid': phones.filter(valid_number=False).count()
            }
        except Exception as e:
            print(f"Error getting phone stats: {e}")
            return {
                'total': 0,
                'valid': 0,
                'invalid': 0
            }
    
    @property
    def sms_stats(self):
        """Get SMS statistics for the project"""
        try:
            from sms_sender.models import SMSMessage, SMSCampaign
            # Get campaigns for this project's user
            campaigns = SMSCampaign.objects.filter(user=self.user)
            messages = SMSMessage.objects.filter(campaign__in=campaigns)
            return {
                'total': messages.count(),
                'sent': messages.filter(delivery_status='sent').count(),
                'pending': messages.filter(delivery_status='pending').count(),
                'failed': messages.filter(delivery_status='failed').count()
            }
        except Exception as e:
            print(f"Error getting SMS stats: {e}")
            return {
                'total': 0,
                'sent': 0,
                'pending': 0,
                'failed': 0
            }


class ProjectTask(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=500)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tasks')
    
    due_date = models.DateField(null=True, blank=True)
    completed_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', '-created_at']

    def __str__(self):
        return f"{self.project.project_name} - {self.title}"


class ProjectNote(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='notes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Note by {self.user.username} on {self.project.project_name}"


class ProjectActivity(models.Model):
    ACTIVITY_TYPES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('task_added', 'Task Added'),
        ('task_completed', 'Task Completed'),
        ('note_added', 'Note Added'),
        ('status_changed', 'Status Changed'),
        ('collaborator_added', 'Collaborator Added'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Project Activities'

    def __str__(self):
        return f"{self.activity_type} - {self.project.project_name}"

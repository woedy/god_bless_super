import os
import random
from datetime import timedelta
from django.utils import timezone

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models
from django.db.models import Q
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from rest_framework.authtoken.models import Token

from god_bless_pro.utils import unique_user_id_generator




def get_file_ext(filepath):
    base_name = os.path.basename(filepath)
    name, ext = os.path.splitext(base_name)
    return name, ext


def upload_image_path(instance, filename):
    new_filename = random.randint(1, 3910209312)
    name, ext = get_file_ext(filename)
    final_filename = '{new_filename}{ext}'.format(new_filename=new_filename, ext=ext)
    return "users/{final_filename}".format(
        new_filename=new_filename,
        final_filename=final_filename
    )
def get_default_profile_image():
    return "defaults/default_profile_image.png"


class UserManager(BaseUserManager):
    def create_user(self, email, username, password=None, is_active=True, is_staff=False, is_admin=False):
        if not email:
            raise ValueError("User must have an email address")
        if not password:
            raise ValueError("user must have a password")

        user_obj = self.model(
            email=self.normalize_email(email),
            username=username,
        )
        user_obj.set_password(password)
        user_obj.staff = is_staff
        user_obj.is_active = is_active
        user_obj.save(using=self._db)
        return user_obj


    def create_staffuser(self, email, username=None, password=None):
        user = self.create_user(
            email,
            password=password,
            username=username,
            is_staff=True
        )
        return user



    def create_superuser(self, email, username=None, password=None, ):
        user = self.create_user(
            email,
            password=password,
            username=username,
            is_staff=True,
            is_admin=True
        )
        return user


    def search(self, query=None):
        qs = self.get_queryset()

        if query is not None:
            or_lookup = (Q(email__icontains=query) | Q(username__icontains=query))
            qs = qs.filter(or_lookup).distinct()

        return qs




class User(AbstractBaseUser):
    user_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    email = models.EmailField(max_length=255, unique=True,  null=True, blank=True)
    username = models.CharField(max_length=255, blank=True, null=True, unique=True)

    fcm_token = models.TextField(blank=True, null=True)

    otp_code = models.CharField(max_length=10, blank=True, null=True)
    email_token = models.CharField(max_length=10, blank=True, null=True)
    email_verified = models.BooleanField(default=False)

    photo = models.ImageField(upload_to=upload_image_path, null=True, blank=True, default=get_default_profile_image)

    phone = models.CharField(max_length=255, null=True, blank=True)
    country = models.CharField(max_length=255, null=True, blank=True)
    language = models.CharField(default="English", max_length=255, null=True, blank=True)

    # Enhanced theme and notification preferences
    theme_preference = models.CharField(max_length=10, default='light', choices=[('light', 'Light'), ('dark', 'Dark')])
    notification_preferences = models.JSONField(default=dict, blank=True)
    api_rate_limit = models.IntegerField(default=1000)
    last_activity = models.DateTimeField(auto_now=True)

  
    location_name = models.CharField(max_length=200, null=True, blank=True)
    lat = models.DecimalField(max_digits=30, decimal_places=15, null=True, blank=True)
    lng = models.DecimalField(max_digits=30, decimal_places=15, null=True, blank=True)

 
    is_archived = models.BooleanField(default=False)


    is_active = models.BooleanField(default=True)
    staff = models.BooleanField(default=False)
    admin = models.BooleanField(default=False)

    timestamp = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'

    REQUIRED_FIELDS = ['username']

    objects = UserManager()

    def __str__(self):
        if self.email is None:
            return 'No Email'
        return self.email


    def get_short_name(self):
        return self.email

    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True



    @property
    def is_staff(self):
        if self.is_admin:
            return True
        return self.staff


    @property
    def is_admin(self):
        return self.admin




@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_auth_token(sender, instance=None, created=False, **kwargs):
    if created:
        Token.objects.create(user=instance)


def pre_save_user_id_receiver(sender, instance, *args, **kwargs):
    if not instance.user_id:
        instance.user_id = unique_user_id_generator(instance)

pre_save.connect(pre_save_user_id_receiver, sender=User)






# UserAPIKey model removed - external API validation no longer used
# All validation now uses internal database validation exclusively




class UserSubscription(models.Model):
    PLAN_CHOICES = [
        ('Daily', 'Daily'),
        ('Weekly', 'Weekly'),
        ('Monthly', 'Monthly'),
        ('Yearly', 'Yearly'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    subscription_plan = models.CharField(max_length=50, choices=PLAN_CHOICES, default='monthly')

    def is_subscription_active(self):
        """Returns whether the user's subscription is active based on the current time"""
        return self.is_active and self.end_date > timezone.now()

    def __str__(self):
        return f"Subscription for {self.user.username} ({'Active' if self.is_active else 'Inactive'})"


class SystemSettings(models.Model):
    """User-specific system configuration settings"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='system_settings')
    
    # SMTP and Proxy rotation settings
    smtp_rotation_enabled = models.BooleanField(default=True)
    proxy_rotation_enabled = models.BooleanField(default=True)
    
    # Delivery delay settings
    delivery_delay_min = models.IntegerField(default=1, help_text="Minimum delay in seconds")
    delivery_delay_max = models.IntegerField(default=5, help_text="Maximum delay in seconds")
    delivery_delay_seed = models.IntegerField(null=True, blank=True, help_text="Random seed for delay generation")
    
    # Batch processing settings
    batch_size = models.IntegerField(default=100, help_text="Default batch size for bulk operations")
    
    # Rate limiting settings
    sms_rate_limit_per_minute = models.IntegerField(default=10, help_text="SMS sending rate limit per minute")
    carrier_specific_rate_limits = models.JSONField(default=dict, blank=True, help_text="Carrier-specific rate limits")
    
    # Created and updated timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Settings for {self.user.username}"
    
    class Meta:
        verbose_name = "System Settings"
        verbose_name_plural = "System Settings"

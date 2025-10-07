from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group

from accounts.forms import UserAdminCreationForm, UserAdminChangeForm
from accounts.models import SystemSettings, UserSubscription

User = get_user_model()

# Register your models here.
class UserAdmin(BaseUserAdmin):
    form = UserAdminChangeForm
    add_form = UserAdminCreationForm

    list_display = ('id', 'user_id', 'email', 'username', 'theme_preference', 'otp_code', 'email_token', 'email_verified',  'admin',)
    list_filter = ('admin', 'staff', 'is_active', 'theme_preference')

    fieldsets = (
        (None, {'fields': ('email', 'username', 'fcm_token', 'otp_code', 'email_token', 'is_archived', 'photo', 'email_verified', 'password')}),
        ('Preferences', {'fields': ('theme_preference', 'notification_preferences', 'api_rate_limit')}),
        ('Permissions', {'fields': ('admin', 'staff', 'is_active',)}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2')}
         ),
    )

    search_fields = ('email', 'username',)
    ordering = ('email',)
    filter_horizontal = ()

admin.site.register(User, UserAdmin)


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ('user', 'smtp_rotation_enabled', 'proxy_rotation_enabled', 'batch_size', 'sms_rate_limit_per_minute', 'updated_at')
    list_filter = ('smtp_rotation_enabled', 'proxy_rotation_enabled')
    search_fields = ('user__email', 'user__username')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Rotation Settings', {
            'fields': ('smtp_rotation_enabled', 'proxy_rotation_enabled')
        }),
        ('Delivery Settings', {
            'fields': ('delivery_delay_min', 'delivery_delay_max', 'delivery_delay_seed')
        }),
        ('Batch & Rate Limiting', {
            'fields': ('batch_size', 'sms_rate_limit_per_minute', 'carrier_specific_rate_limits')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


admin.site.unregister(Group)

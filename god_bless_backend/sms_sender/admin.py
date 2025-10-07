from django.contrib import admin
from sms_sender.models import SMSCampaign, SMSMessage, SentSMS


@admin.register(SMSCampaign)
class SMSCampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'status', 'progress', 'total_recipients', 'messages_sent', 'messages_delivered', 'created_at')
    list_filter = ('status', 'send_immediately', 'created_at')
    search_fields = ('name', 'user__email', 'description')
    readonly_fields = ('created_at', 'updated_at', 'started_at', 'completed_at', 'celery_task_id')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Campaign Information', {
            'fields': ('user', 'name', 'description', 'message_template')
        }),
        ('Targeting', {
            'fields': ('target_carrier', 'target_type', 'target_area_codes')
        }),
        ('Scheduling', {
            'fields': ('send_immediately', 'scheduled_time')
        }),
        ('Settings', {
            'fields': ('batch_size', 'rate_limit', 'use_proxy_rotation', 'use_smtp_rotation')
        }),
        ('Status & Progress', {
            'fields': ('status', 'progress', 'celery_task_id')
        }),
        ('Metrics', {
            'fields': ('total_recipients', 'messages_sent', 'messages_delivered', 'messages_failed')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'started_at', 'completed_at')
        }),
    )


@admin.register(SMSMessage)
class SMSMessageAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'campaign', 'delivery_status', 'carrier', 'send_attempts', 'sent_at', 'delivered_at')
    list_filter = ('delivery_status', 'carrier', 'created_at')
    search_fields = ('phone_number', 'campaign__name', 'carrier')
    readonly_fields = ('created_at', 'queued_at', 'sent_at', 'delivered_at', 'last_attempt_at')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Message Information', {
            'fields': ('campaign', 'phone_number', 'message_content')
        }),
        ('Carrier Information', {
            'fields': ('carrier', 'carrier_gateway')
        }),
        ('Delivery', {
            'fields': ('delivery_status', 'smtp_server', 'proxy_used')
        }),
        ('Attempts', {
            'fields': ('send_attempts', 'last_attempt_at', 'error_message')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'queued_at', 'sent_at', 'delivered_at')
        }),
    )


@admin.register(SentSMS)
class SentSMSAdmin(admin.ModelAdmin):
    list_display = ('user', 'number', 'provider', 'sent')
    list_filter = ('sent',)
    search_fields = ('number', 'user__email', 'provider')

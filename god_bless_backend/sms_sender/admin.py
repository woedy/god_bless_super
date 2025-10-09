from django.contrib import admin
from sms_sender.models import (
    SMSCampaign, SMSMessage, SentSMS, CampaignDeliverySettings, 
    ServerUsageLog, CarrierPerformanceLog, RetryAttempt, CampaignTemplate
)


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
            'fields': ('delivery_status', 'smtp_server', 'proxy_server', 'smtp_server_legacy', 'proxy_used_legacy')
        }),
        ('Performance Tracking', {
            'fields': ('delivery_delay_applied', 'proxy_response_time', 'smtp_response_time', 'total_processing_time')
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


@admin.register(CampaignDeliverySettings)
class CampaignDeliverySettingsAdmin(admin.ModelAdmin):
    list_display = ('campaign', 'use_proxy_rotation', 'proxy_rotation_strategy', 'use_smtp_rotation', 'smtp_rotation_strategy')
    list_filter = ('use_proxy_rotation', 'use_smtp_rotation', 'proxy_rotation_strategy', 'smtp_rotation_strategy')
    search_fields = ('campaign__name',)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Campaign', {
            'fields': ('campaign',)
        }),
        ('Proxy Settings', {
            'fields': ('use_proxy_rotation', 'proxy_rotation_strategy')
        }),
        ('SMTP Settings', {
            'fields': ('use_smtp_rotation', 'smtp_rotation_strategy')
        }),
        ('Delivery Timing', {
            'fields': ('custom_delay_enabled', 'custom_delay_min', 'custom_delay_max', 'custom_random_seed')
        }),
        ('Smart Features', {
            'fields': ('adaptive_optimization_enabled', 'carrier_optimization_enabled', 'timezone_optimization_enabled')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(ServerUsageLog)
class ServerUsageLogAdmin(admin.ModelAdmin):
    list_display = ('campaign', 'server_type', 'server_id', 'messages_processed', 'successful_messages', 'failed_messages', 'get_success_rate')
    list_filter = ('server_type', 'campaign__status')
    search_fields = ('campaign__name',)
    readonly_fields = ('first_used', 'last_used')
    
    def get_success_rate(self, obj):
        return f"{obj.get_success_rate():.1f}%"
    get_success_rate.short_description = 'Success Rate'


@admin.register(CarrierPerformanceLog)
class CarrierPerformanceLogAdmin(admin.ModelAdmin):
    list_display = ('carrier', 'proxy_server', 'smtp_server', 'success_rate', 'messages_sent', 'successful_deliveries', 'failed_deliveries')
    list_filter = ('carrier', 'proxy_server', 'smtp_server')
    search_fields = ('carrier',)
    readonly_fields = ('last_updated', 'created_at')
    
    fieldsets = (
        ('Server Configuration', {
            'fields': ('carrier', 'proxy_server', 'smtp_server')
        }),
        ('Performance Metrics', {
            'fields': ('success_rate', 'average_delivery_time', 'messages_sent', 'successful_deliveries', 'failed_deliveries')
        }),
        ('Timestamps', {
            'fields': ('last_updated', 'created_at')
        }),
    )


@admin.register(RetryAttempt)
class RetryAttemptAdmin(admin.ModelAdmin):
    list_display = ('message', 'attempt_number', 'error_type', 'scheduled_retry_time', 'completed', 'success')
    list_filter = ('error_type', 'completed', 'success', 'scheduled_retry_time')
    search_fields = ('message__phone_number', 'message__campaign__name', 'error_type')
    readonly_fields = ('created_at', 'completion_time')
    
    fieldsets = (
        ('Retry Information', {
            'fields': ('message', 'attempt_number', 'error_type', 'error_message')
        }),
        ('Retry Configuration', {
            'fields': ('retry_delay', 'scheduled_retry_time', 'retry_proxy_server', 'retry_smtp_server')
        }),
        ('Retry Result', {
            'fields': ('completed', 'success', 'completion_time')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )


@admin.register(CampaignTemplate)
class CampaignTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'category', 'usage_count', 'average_success_rate', 'is_public', 'is_system_template')
    list_filter = ('category', 'is_public', 'is_system_template', 'created_at')
    search_fields = ('name', 'user__email', 'description')
    readonly_fields = ('usage_count', 'average_success_rate', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Template Information', {
            'fields': ('user', 'name', 'description', 'category')
        }),
        ('Template Settings', {
            'fields': ('settings',)
        }),
        ('Performance Metrics', {
            'fields': ('usage_count', 'average_success_rate')
        }),
        ('Sharing Settings', {
            'fields': ('is_public', 'is_system_template')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
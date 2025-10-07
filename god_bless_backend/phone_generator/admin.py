from django.contrib import admin
from phone_generator.models import PhoneNumber, PhoneGenerationTask


@admin.register(PhoneNumber)
class PhoneNumberAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'user', 'carrier', 'type', 'area_code', 'valid_number', 'validation_date', 'created_at')
    list_filter = ('carrier', 'type', 'valid_number', 'validation_attempted', 'created_at')
    search_fields = ('phone_number', 'carrier', 'area_code', 'user__email')
    readonly_fields = ('created_at', 'updated_at', 'validation_date')
    date_hierarchy = 'created_at'


@admin.register(PhoneGenerationTask)
class PhoneGenerationTaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'area_code', 'quantity', 'status', 'progress', 'created_at', 'completed_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__email', 'area_code', 'celery_task_id')
    readonly_fields = ('created_at', 'started_at', 'completed_at', 'celery_task_id', 'duration')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Task Information', {
            'fields': ('user', 'project', 'area_code', 'quantity', 'carrier_filter', 'type_filter')
        }),
        ('Status & Progress', {
            'fields': ('status', 'progress', 'current_step', 'celery_task_id')
        }),
        ('Metrics', {
            'fields': ('total_items', 'processed_items', 'successful_items', 'failed_items')
        }),
        ('Results', {
            'fields': ('result_data', 'error_message')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'started_at', 'completed_at', 'estimated_completion', 'duration')
        }),
    )

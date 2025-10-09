from django.contrib import admin
from .models import TaskProgress


@admin.register(TaskProgress)
class TaskProgressAdmin(admin.ModelAdmin):
    list_display = [
        'task_id_short', 
        'user', 
        'task_name', 
        'category', 
        'status', 
        'progress_display', 
        'created_at',
        'duration_display'
    ]
    list_filter = [
        'status', 
        'category', 
        'created_at', 
        'completed_at'
    ]
    search_fields = [
        'task_id', 
        'task_name', 
        'user__username', 
        'user__email'
    ]
    readonly_fields = [
        'task_id', 
        'created_at', 
        'started_at', 
        'completed_at', 
        'duration_display'
    ]
    ordering = ['-created_at']
    
    fieldsets = (
        ('Task Information', {
            'fields': ('task_id', 'task_name', 'category', 'user')
        }),
        ('Progress', {
            'fields': ('status', 'progress', 'current_step', 'total_items', 'processed_items')
        }),
        ('Data', {
            'fields': ('task_args', 'result_data', 'error_message'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'started_at', 'completed_at', 'estimated_completion', 'duration_display'),
            'classes': ('collapse',)
        }),
    )
    
    def task_id_short(self, obj):
        return obj.task_id[:8] + '...' if len(obj.task_id) > 8 else obj.task_id
    task_id_short.short_description = 'Task ID'
    
    def progress_display(self, obj):
        return f"{obj.progress}%"
    progress_display.short_description = 'Progress'
    
    def duration_display(self, obj):
        return f"{obj.duration:.2f}s" if obj.duration else "N/A"
    duration_display.short_description = 'Duration'
    
    def has_add_permission(self, request):
        return False  # Tasks should only be created programmatically
    
    def has_change_permission(self, request, obj=None):
        return False  # Tasks should only be modified by the system
    
    actions = ['cleanup_selected_tasks']
    
    def cleanup_selected_tasks(self, request, queryset):
        """Admin action to clean up selected completed tasks"""
        completed_tasks = queryset.filter(status__in=['SUCCESS', 'FAILURE', 'REVOKED'])
        count = completed_tasks.count()
        completed_tasks.delete()
        
        self.message_user(
            request,
            f'Successfully deleted {count} completed tasks.'
        )
    cleanup_selected_tasks.short_description = "Delete selected completed tasks"

"""
Django Admin configuration for Proxy Server models
"""
from django.contrib import admin
from .models import ProxyServer, RotationSettings


@admin.register(ProxyServer)
class ProxyServerAdmin(admin.ModelAdmin):
    """Admin configuration for ProxyServer model"""
    
    list_display = [
        'host', 'port', 'protocol', 'user', 'is_active', 'is_healthy', 
        'last_health_check', 'health_check_failures'
    ]
    list_filter = [
        'is_active', 'is_healthy', 'protocol', 'is_archived', 'created_at'
    ]
    search_fields = ['host', 'user__username', 'user__email']
    list_editable = ['is_active']
    readonly_fields = [
        'created_at', 'updated_at', 'last_used', 'total_requests',
        'successful_requests', 'failed_requests', 'last_health_check',
        'last_health_check_latency_ms', 'last_health_check_status_code',
        'last_health_check_error'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'host', 'port', 'username', 'password', 'protocol')
        }),
        ('Status', {
            'fields': ('is_active', 'is_healthy', 'is_archived')
        }),
        ('Health Check Information', {
            'fields': (
                'last_health_check', 'last_health_check_latency_ms',
                'last_health_check_status_code', 'last_health_check_error',
                'health_check_failures'
            ),
            'classes': ('collapse',)
        }),
        ('Usage Statistics', {
            'fields': (
                'total_requests', 'successful_requests', 'failed_requests',
                'last_used'
            ),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['mark_healthy', 'mark_unhealthy', 'reset_health_stats']
    
    def mark_healthy(self, request, queryset):
        """Mark selected proxies as healthy"""
        updated = queryset.update(is_healthy=True, health_check_failures=0)
        self.message_user(request, f'{updated} proxies marked as healthy.')
    mark_healthy.short_description = 'Mark selected as healthy'
    
    def mark_unhealthy(self, request, queryset):
        """Mark selected proxies as unhealthy"""
        updated = queryset.update(is_healthy=False)
        self.message_user(request, f'{updated} proxies marked as unhealthy.')
    mark_unhealthy.short_description = 'Mark selected as unhealthy'
    
    def reset_health_stats(self, request, queryset):
        """Reset health statistics for selected proxies"""
        updated = queryset.update(
            health_check_failures=0,
            last_health_check=None,
            last_health_check_latency_ms=None,
            last_health_check_status_code=None,
            last_health_check_error=None,
            is_healthy=True
        )
        self.message_user(request, f'Health stats reset for {updated} proxies.')
    reset_health_stats.short_description = 'Reset health statistics'
    
    def get_queryset(self, request):
        """Optimize queries"""
        return super().get_queryset(request).select_related('user')


@admin.register(RotationSettings)
class RotationSettingsAdmin(admin.ModelAdmin):
    """Admin configuration for RotationSettings model"""
    
    list_display = [
        'user', 'proxy_rotation_enabled', 'proxy_rotation_strategy',
        'smtp_rotation_enabled', 'smtp_rotation_strategy'
    ]
    list_filter = [
        'proxy_rotation_enabled', 'proxy_rotation_strategy',
        'smtp_rotation_enabled', 'smtp_rotation_strategy'
    ]
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        """Optimize queries"""
        return super().get_queryset(request).select_related('user')

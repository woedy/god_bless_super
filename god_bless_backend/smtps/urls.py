from django.urls import path, include
from rest_framework.routers import DefaultRouter

from smtps.views import (
    add_smtp_view, delete_smtp, get_smtps_view,
    check_smtp_health_view, check_all_smtp_health_view,
    get_smtp_rotation_stats_view, SmtpManagerViewSet
)
from smtps.health_check import (
    smtp_service_health, smtp_detailed_health, smtp_readiness_check
)

# Create router for ViewSet
router = DefaultRouter()
router.register(r'api', SmtpManagerViewSet, basename='smtp-api')

app_name = 'smtps'

urlpatterns = [
    # REST API endpoints (new enhanced API)
    path('', include(router.urls)),
    
    # Docker health check endpoints
    path('health/', smtp_service_health, name='smtp_service_health'),
    path('health/detailed/', smtp_detailed_health, name='smtp_detailed_health'),
    path('health/ready/', smtp_readiness_check, name='smtp_readiness_check'),
    
    # Legacy function-based views (for backward compatibility)
    path('add-smtp/', add_smtp_view, name="add_smtp_view"),
    path('get-smtps/', get_smtps_view, name="get_smtps_view"),
    path('delete-smtp/', delete_smtp, name="delete_smtp"),
    
    # Health checking
    path('health/check/', check_smtp_health_view, name='check_smtp_health'),
    path('health/check-all/', check_all_smtp_health_view, name='check_all_smtp_health'),
    
    # Rotation stats
    path('rotation/stats/', get_smtp_rotation_stats_view, name='smtp_rotation_stats'),
]

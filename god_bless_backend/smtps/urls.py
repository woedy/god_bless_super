from django.urls import path

from smtps.views import (
    add_smtp_view, delete_smtp, get_smtps_view,
    check_smtp_health_view, check_all_smtp_health_view,
    get_smtp_rotation_stats_view
)


app_name = 'smtps'

urlpatterns = [
    # SMTP management
    path('add-smtp/', add_smtp_view, name="add_smtp_view"),
    path('get-smtps/', get_smtps_view, name="get_smtps_view"),
    path('delete-smtp/', delete_smtp, name="delete_smtp"),
    
    # Health checking
    path('health/check/', check_smtp_health_view, name='check_smtp_health'),
    path('health/check-all/', check_all_smtp_health_view, name='check_all_smtp_health'),
    
    # Rotation stats
    path('rotation/stats/', get_smtp_rotation_stats_view, name='smtp_rotation_stats'),
]

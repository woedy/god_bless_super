from django.urls import path

from dashboard.api.views import (
    dashboard_view,
    dashboard_metrics,
    dashboard_overview,
    dashboard_health,
    dashboard_tasks,
    dashboard_activity,
    dashboard_realtime,
    dashboard_refresh,
)
from dashboard.api.analytics_views import (
    dashboard_analytics,
    active_tasks,
    recent_tasks,
    system_health,
    performance_metrics,
)
from phone_generator.api.views import clear_numbers_view, generate_numbers_view, get_all_numbers_view, get_valid_numbers, validate_numbers_view


app_name = 'dashboard'

urlpatterns = [
    # Legacy endpoints
    path('', dashboard_view, name="dashboard_view"),
    path('analytics/', dashboard_analytics, name="dashboard_analytics"),
    path('tasks/active/', active_tasks, name="active_tasks"),
    path('tasks/recent/', recent_tasks, name="recent_tasks"),
    path('system-health/', system_health, name="system_health"),
    path('performance/', performance_metrics, name="performance_metrics"),
    
    # New frontend-compatible endpoints
    path('metrics/', dashboard_metrics, name="dashboard_metrics"),
    path('overview/', dashboard_overview, name="dashboard_overview"),
    path('health/', dashboard_health, name="dashboard_health"),
    path('tasks/', dashboard_tasks, name="dashboard_tasks"),
    path('activity/', dashboard_activity, name="dashboard_activity"),
    path('realtime/', dashboard_realtime, name="dashboard_realtime"),
    path('refresh/', dashboard_refresh, name="dashboard_refresh"),
]

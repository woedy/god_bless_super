from django.urls import path

from dashboard.api.views import dashboard_view
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
    path('', dashboard_view, name="dashboard_view"),
    path('analytics/', dashboard_analytics, name="dashboard_analytics"),
    path('tasks/active/', active_tasks, name="active_tasks"),
    path('tasks/recent/', recent_tasks, name="recent_tasks"),
    path('system-health/', system_health, name="system_health"),
    path('performance/', performance_metrics, name="performance_metrics"),
]

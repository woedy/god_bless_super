from django.urls import path
from . import views

app_name = 'proxy_server'

urlpatterns = [
    # Proxy management
    path('add/', views.add_proxy_view, name='add_proxy'),
    path('list/', views.get_proxies_view, name='get_proxies'),
    path('delete/', views.delete_proxy_view, name='delete_proxy'),
    
    # Health checking
    path('health/check/', views.check_proxy_health_view, name='check_proxy_health'),
    path('health/check-all/', views.check_all_proxies_health_view, name='check_all_proxies_health'),
    
    # Rotation stats and settings
    path('rotation/stats/', views.get_proxy_rotation_stats_view, name='proxy_rotation_stats'),
    path('rotation/settings/', views.rotation_settings_view, name='rotation_settings'),
]

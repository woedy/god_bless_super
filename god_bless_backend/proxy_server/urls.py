from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'api', views.ProxyServerViewSet, basename='proxy-api')

app_name = 'proxy_server'

urlpatterns = [
    path('', include(router.urls)),

    # Proxy management
    path('add/', views.add_proxy_view, name='add_proxy'),
    path('update/', views.update_proxy_view, name='update_proxy'),
    path('list/', views.get_proxies_view, name='get_proxies'),
    path('delete/', views.delete_proxy_view, name='delete_proxy'),
    
    # Health checking
    path('health/check/', views.check_proxy_health_view, name='check_proxy_health'),
    path('health/check-all/', views.check_all_proxies_health_view, name='check_all_proxies_health'),
    
    # Proxy downloading and testing
    path('download/', views.download_and_test_proxies_view, name='download_and_test_proxies'),
    path('download/status/<str:task_id>/', views.get_proxy_download_status_view, name='get_proxy_download_status'),
    path('cleanup/', views.cleanup_unhealthy_proxies_view, name='cleanup_unhealthy_proxies'),
    
    # Rotation stats and settings
    path('rotation/stats/', views.get_proxy_rotation_stats_view, name='proxy_rotation_stats'),
    path('rotation/settings/', views.rotation_settings_view, name='rotation_settings'),
]

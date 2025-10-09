"""
WebSocket routing for SMS sender app
Provides real-time monitoring endpoints for campaigns and system health
"""
from django.urls import re_path, path
from . import consumers

websocket_urlpatterns = [
    # Campaign-specific monitoring
    re_path(r'ws/sms/campaign/(?P<campaign_id>\d+)/$', consumers.CampaignMonitoringConsumer.as_asgi()),
    
    # System-wide monitoring for user
    path('ws/sms/system/', consumers.SystemMonitoringConsumer.as_asgi()),
    
    # User's campaigns overview
    path('ws/sms/campaigns/', consumers.UserCampaignsConsumer.as_asgi()),
    
    # Legacy task progress (backward compatibility)
    re_path(r'ws/sms/task/(?P<task_id>[\w-]+)/$', consumers.TaskProgressConsumer.as_asgi()),
]
"""
WebSocket routing for phone generator app
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/phone-generation/(?P<user_id>\w+)/$', consumers.PhoneGenerationProgressConsumer.as_asgi()),
    re_path(r'ws/tasks/(?P<user_id>\w+)/$', consumers.TaskProgressConsumer.as_asgi()),
]
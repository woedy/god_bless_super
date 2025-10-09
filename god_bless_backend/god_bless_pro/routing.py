from django.urls import path, re_path, include
from tasks.consumers import TaskProgressConsumer
from dashboard.simple_consumer import SimpleDashboardConsumer
from phone_generator.routing import websocket_urlpatterns as phone_generator_websocket_urlpatterns
from sms_sender.routing import websocket_urlpatterns as sms_sender_websocket_urlpatterns


websocket_urlpatterns = [
    # Main dashboard WebSocket (matches frontend /ws connection)
    path('ws/', SimpleDashboardConsumer.as_asgi()),
    path('ws', SimpleDashboardConsumer.as_asgi()),  # Handle both with and without trailing slash
    
    # Specific task progress WebSocket
    path('ws/tasks/', TaskProgressConsumer.as_asgi()),
    
    #path('ws/communications/chats', BookingChatConsumers.as_asgi()),
    #re_path(r"ws/chat/(?P<room_name>\w+)/$", ChatConsumer.as_asgi()),
] + phone_generator_websocket_urlpatterns + sms_sender_websocket_urlpatterns
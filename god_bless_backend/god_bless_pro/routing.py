from django.urls import path, re_path, include
from tasks.consumers import TaskProgressConsumer
from phone_generator.routing import websocket_urlpatterns as phone_generator_websocket_urlpatterns


websocket_urlpatterns = [
    path('ws/tasks/', TaskProgressConsumer.as_asgi()),
    #path('ws/communications/chats', BookingChatConsumers.as_asgi()),
    #re_path(r"ws/chat/(?P<room_name>\w+)/$", ChatConsumer.as_asgi()),
] + phone_generator_websocket_urlpatterns
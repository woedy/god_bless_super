"""
Simple Dashboard WebSocket Consumer
Minimal implementation for testing WebSocket connectivity
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

logger = logging.getLogger(__name__)


class SimpleDashboardConsumer(AsyncWebsocketConsumer):
    """
    Simple WebSocket consumer for basic dashboard connectivity
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        try:
            # Get user from scope (set by authentication middleware)
            self.user = self.scope.get('user')
            
            if not self.user or not self.user.is_authenticated:
                logger.warning("WebSocket connection rejected: User not authenticated")
                await self.close(code=4001)
                return
            
            # Accept the connection
            await self.accept()
            logger.info(f"WebSocket connection accepted for user: {self.user.username}")
            
            # Send welcome message
            await self.send(text_data=json.dumps({
                'type': 'connection_status',
                'status': 'connected',
                'message': f'Welcome {self.user.username}! Dashboard WebSocket is ready.',
                'timestamp': timezone.now().isoformat()
            }))
            
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {e}")
            await self.close(code=4000)
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        try:
            user_name = getattr(self.user, 'username', 'Unknown') if hasattr(self, 'user') else 'Unknown'
            logger.info(f"WebSocket disconnected for user: {user_name}, code: {close_code}")
        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {e}")
    
    async def receive(self, text_data):
        """Handle messages from WebSocket"""
        try:
            logger.info(f"WebSocket received: {text_data}")
            
            # Parse the message
            try:
                data = json.loads(text_data)
            except json.JSONDecodeError:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Invalid JSON format'
                }))
                return
            
            message_type = data.get('type', 'unknown')
            
            # Handle different message types
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': timezone.now().isoformat()
                }))
            
            elif message_type == 'get_status':
                await self.send(text_data=json.dumps({
                    'type': 'status_response',
                    'user': self.user.username,
                    'connected': True,
                    'timestamp': timezone.now().isoformat()
                }))
            
            elif message_type == 'echo':
                # Echo back the message
                await self.send(text_data=json.dumps({
                    'type': 'echo_response',
                    'original_message': data,
                    'timestamp': timezone.now().isoformat()
                }))
            
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))
                
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error'
            }))
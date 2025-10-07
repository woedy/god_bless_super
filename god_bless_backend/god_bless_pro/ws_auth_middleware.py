"""
WebSocket Authentication Middleware for Django Channels
Handles token-based authentication for WebSocket connections
"""
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from urllib.parse import parse_qs

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_key):
    """Get user from authentication token"""
    try:
        token = Token.objects.select_related('user').get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()


class TokenAuthMiddleware(BaseMiddleware):
    """
    Custom middleware that takes a token from the query string
    and authenticates the user.
    """

    async def __call__(self, scope, receive, send):
        # Get the token from query string
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token_key = query_params.get('token', [None])[0]

        # Debug logging
        print(f"[WS Auth] Query string: {query_string}")
        print(f"[WS Auth] Token present: {bool(token_key)}")

        # Authenticate user
        if token_key:
            user = await get_user_from_token(token_key)
            scope['user'] = user
            print(f"[WS Auth] User authenticated: {user.username if not user.is_anonymous else 'Anonymous'}")
        else:
            scope['user'] = AnonymousUser()
            print(f"[WS Auth] No token provided, user is anonymous")

        return await super().__call__(scope, receive, send)

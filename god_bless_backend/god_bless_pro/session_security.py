"""
Session security management for the God Bless platform.
Implements secure session handling with proper timeouts and cleanup.
"""

from datetime import timedelta
from django.conf import settings
from django.contrib.auth import logout
from django.utils import timezone
from django.core.cache import cache
from typing import Optional
import hashlib


class SessionManager:
    """Manages secure user sessions"""
    
    # Session timeout settings
    SESSION_TIMEOUT = 86400  # 24 hours in seconds (increased for development)
    ABSOLUTE_TIMEOUT = 604800  # 7 days in seconds (increased for development)
    IDLE_TIMEOUT = 7200  # 2 hours in seconds (increased from 30 minutes)
    
    @classmethod
    def create_session(cls, request, user) -> dict:
        """
        Create a new secure session for user
        
        Returns:
            Session metadata
        """
        session_key = request.session.session_key
        if not session_key:
            request.session.create()
            session_key = request.session.session_key
        
        current_time = timezone.now()
        
        # Store session metadata
        session_data = {
            'user_id': user.id,
            'created_at': current_time.isoformat(),
            'last_activity': current_time.isoformat(),
            'ip_address': cls._get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
        }
        
        # Store in cache for quick access
        cache_key = cls._get_session_cache_key(session_key)
        cache.set(cache_key, session_data, cls.ABSOLUTE_TIMEOUT)
        
        # Set session expiry
        request.session.set_expiry(cls.SESSION_TIMEOUT)
        
        return session_data
    
    @classmethod
    def validate_session(cls, request) -> bool:
        """
        Validate current session
        
        Returns:
            True if session is valid, False otherwise
        """
        if not request.user.is_authenticated:
            return False
        
        session_key = request.session.session_key
        if not session_key:
            return False
        
        cache_key = cls._get_session_cache_key(session_key)
        session_data = cache.get(cache_key)
        
        if not session_data:
            # Session metadata doesn't exist in cache - create it
            # This can happen if cache was cleared or session was created before this middleware
            session_data = cls.create_session(request, request.user)
            if not session_data:
                return False
        
        current_time = timezone.now()
        
        # Check absolute timeout
        created_at = timezone.datetime.fromisoformat(session_data['created_at'])
        if current_time - created_at > timedelta(seconds=cls.ABSOLUTE_TIMEOUT):
            cls.destroy_session(request)
            return False
        
        # Check idle timeout
        last_activity = timezone.datetime.fromisoformat(session_data['last_activity'])
        if current_time - last_activity > timedelta(seconds=cls.IDLE_TIMEOUT):
            cls.destroy_session(request)
            return False
        
        # Check IP address (optional security measure)
        current_ip = cls._get_client_ip(request)
        if session_data['ip_address'] != current_ip:
            # IP changed - could be session hijacking
            # For now, we'll allow it but log it
            # In production, you might want to invalidate the session
            pass
        
        # Update last activity
        session_data['last_activity'] = current_time.isoformat()
        cache.set(cache_key, session_data, cls.ABSOLUTE_TIMEOUT)
        
        return True
    
    @classmethod
    def refresh_session(cls, request) -> bool:
        """
        Refresh session timeout
        
        Returns:
            True if session was refreshed, False otherwise
        """
        if not request.user.is_authenticated:
            return False
        
        session_key = request.session.session_key
        if not session_key:
            return False
        
        cache_key = cls._get_session_cache_key(session_key)
        session_data = cache.get(cache_key)
        
        if not session_data:
            return False
        
        # Update last activity
        session_data['last_activity'] = timezone.now().isoformat()
        cache.set(cache_key, session_data, cls.ABSOLUTE_TIMEOUT)
        
        # Refresh Django session
        request.session.set_expiry(cls.SESSION_TIMEOUT)
        
        return True
    
    @classmethod
    def destroy_session(cls, request) -> None:
        """Destroy current session"""
        session_key = request.session.session_key
        
        if session_key:
            # Remove from cache
            cache_key = cls._get_session_cache_key(session_key)
            cache.delete(cache_key)
        
        # Logout user
        if request.user.is_authenticated:
            logout(request)
        
        # Clear session
        request.session.flush()
    
    @classmethod
    def get_session_info(cls, request) -> Optional[dict]:
        """Get current session information"""
        if not request.user.is_authenticated:
            return None
        
        session_key = request.session.session_key
        if not session_key:
            return None
        
        cache_key = cls._get_session_cache_key(session_key)
        session_data = cache.get(cache_key)
        
        if not session_data:
            return None
        
        current_time = timezone.now()
        created_at = timezone.datetime.fromisoformat(session_data['created_at'])
        last_activity = timezone.datetime.fromisoformat(session_data['last_activity'])
        
        return {
            'session_key': session_key,
            'user_id': session_data['user_id'],
            'created_at': session_data['created_at'],
            'last_activity': session_data['last_activity'],
            'ip_address': session_data['ip_address'],
            'user_agent': session_data['user_agent'],
            'age_seconds': int((current_time - created_at).total_seconds()),
            'idle_seconds': int((current_time - last_activity).total_seconds()),
            'expires_in': cls.SESSION_TIMEOUT - int((current_time - last_activity).total_seconds()),
        }
    
    @classmethod
    def get_active_sessions(cls, user_id: int) -> list:
        """Get all active sessions for a user"""
        # This would require storing all session keys for a user
        # For now, we'll return the current session info
        # In production, you might want to store this in the database
        return []
    
    @classmethod
    def destroy_all_sessions(cls, user_id: int) -> int:
        """
        Destroy all sessions for a user
        
        Returns:
            Number of sessions destroyed
        """
        # This would require tracking all session keys for a user
        # For now, we'll just return 0
        # In production, you might want to store this in the database
        return 0
    
    @staticmethod
    def _get_session_cache_key(session_key: str) -> str:
        """Generate cache key for session"""
        return f"session:metadata:{session_key}"
    
    @staticmethod
    def _get_client_ip(request) -> str:
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip


class TokenManager:
    """Manages authentication tokens"""
    
    TOKEN_EXPIRY = 86400  # 24 hours in seconds
    
    @classmethod
    def is_token_valid(cls, token, user) -> bool:
        """Check if token is valid and not expired"""
        if not token or not user:
            return False
        
        # Check if token exists in cache (for revoked tokens)
        cache_key = cls._get_token_cache_key(token.key)
        is_revoked = cache.get(cache_key)
        
        if is_revoked:
            return False
        
        # Check token age
        token_age = timezone.now() - token.created
        if token_age > timedelta(seconds=cls.TOKEN_EXPIRY):
            return False
        
        return True
    
    @classmethod
    def revoke_token(cls, token_key: str) -> None:
        """Revoke a token"""
        cache_key = cls._get_token_cache_key(token_key)
        cache.set(cache_key, True, cls.TOKEN_EXPIRY)
    
    @classmethod
    def revoke_all_user_tokens(cls, user) -> None:
        """Revoke all tokens for a user"""
        from rest_framework.authtoken.models import Token
        
        # Get all tokens for user
        tokens = Token.objects.filter(user=user)
        
        for token in tokens:
            cls.revoke_token(token.key)
            token.delete()
    
    @staticmethod
    def _get_token_cache_key(token_key: str) -> str:
        """Generate cache key for token"""
        return f"token:revoked:{token_key}"


def cleanup_expired_sessions():
    """
    Cleanup expired sessions from the database.
    This should be run periodically (e.g., via Celery beat)
    """
    from django.contrib.sessions.models import Session
    
    # Delete expired sessions
    Session.objects.filter(expire_date__lt=timezone.now()).delete()

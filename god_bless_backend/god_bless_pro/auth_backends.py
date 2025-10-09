"""
Enhanced authentication backends for the God Bless platform.
Implements additional security measures for user authentication.
"""

import logging
from datetime import timedelta
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
from god_bless_pro.audit_logging import AuditLogger, AuditEventType

logger = logging.getLogger(__name__)
User = get_user_model()


class EnhancedModelBackend(ModelBackend):
    """
    Enhanced authentication backend with additional security features:
    - Account lockout after failed attempts
    - Suspicious activity detection
    - Audit logging
    - Rate limiting
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Authenticate user with enhanced security checks.
        """
        if username is None or password is None:
            return None
        
        # Get client IP for logging
        client_ip = self._get_client_ip(request)
        
        # Check if IP is blacklisted
        if self._is_ip_blacklisted(client_ip):
            logger.warning(f"Authentication attempt from blacklisted IP: {client_ip}")
            AuditLogger.log_event(
                event_type=AuditEventType.LOGIN_FAILED,
                request=request,
                details={'reason': 'Blacklisted IP', 'ip': client_ip},
                severity='HIGH'
            )
            return None
        
        # Check for account lockout
        if self._is_account_locked(username):
            logger.warning(f"Authentication attempt for locked account: {username}")
            AuditLogger.log_event(
                event_type=AuditEventType.LOGIN_FAILED,
                request=request,
                details={'reason': 'Account locked', 'username': username},
                severity='MEDIUM'
            )
            return None
        
        # Check rate limiting
        if self._is_rate_limited(client_ip, username):
            logger.warning(f"Rate limited authentication attempt: {username} from {client_ip}")
            AuditLogger.log_event(
                event_type=AuditEventType.LOGIN_FAILED,
                request=request,
                details={'reason': 'Rate limited', 'username': username, 'ip': client_ip},
                severity='MEDIUM'
            )
            return None
        
        try:
            # Get user
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            # Log failed attempt for non-existent user
            self._record_failed_attempt(username, client_ip, 'User not found')
            AuditLogger.log_event(
                event_type=AuditEventType.LOGIN_FAILED,
                request=request,
                details={'reason': 'User not found', 'username': username, 'ip': client_ip},
                severity='LOW'
            )
            return None
        
        # Check if user account is active
        if not user.is_active:
            self._record_failed_attempt(username, client_ip, 'Account inactive')
            AuditLogger.log_event(
                event_type=AuditEventType.LOGIN_FAILED,
                request=request,
                user=user,
                details={'reason': 'Account inactive', 'username': username, 'ip': client_ip},
                severity='MEDIUM'
            )
            return None
        
        # Check password
        if user.check_password(password):
            # Successful authentication
            self._clear_failed_attempts(username)
            self._record_successful_login(user, client_ip)
            
            # Check for suspicious login patterns
            if self._is_suspicious_login(user, client_ip, request):
                logger.warning(f"Suspicious login detected for user: {username}")
                AuditLogger.log_event(
                    event_type=AuditEventType.SUSPICIOUS_ACTIVITY,
                    request=request,
                    user=user,
                    details={'reason': 'Suspicious login pattern', 'ip': client_ip},
                    severity='HIGH'
                )
                # Still allow login but flag for review
            
            AuditLogger.log_event(
                event_type=AuditEventType.LOGIN_SUCCESS,
                request=request,
                user=user,
                details={'ip': client_ip, 'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200]},
                severity='INFO'
            )
            
            logger.info(f"Successful authentication for user: {username} from {client_ip}")
            return user
        else:
            # Failed authentication
            self._record_failed_attempt(username, client_ip, 'Invalid password')
            AuditLogger.log_event(
                event_type=AuditEventType.LOGIN_FAILED,
                request=request,
                user=user,
                details={'reason': 'Invalid password', 'username': username, 'ip': client_ip},
                severity='MEDIUM'
            )
            logger.warning(f"Failed authentication for user: {username} from {client_ip}")
            return None
    
    def _get_client_ip(self, request):
        """Get client IP address from request."""
        if not request:
            return 'unknown'
        
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'unknown')
        return ip
    
    def _is_ip_blacklisted(self, ip):
        """Check if IP is blacklisted."""
        blacklist = getattr(settings, 'IP_BLACKLIST', [])
        return ip in blacklist
    
    def _is_account_locked(self, username):
        """Check if account is locked due to failed attempts."""
        cache_key = f"account_locked:{username}"
        return cache.get(cache_key, False)
    
    def _is_rate_limited(self, ip, username):
        """Check if authentication is rate limited."""
        # IP-based rate limiting
        ip_cache_key = f"auth_rate_limit_ip:{ip}"
        ip_attempts = cache.get(ip_cache_key, 0)
        
        # Username-based rate limiting
        user_cache_key = f"auth_rate_limit_user:{username}"
        user_attempts = cache.get(user_cache_key, 0)
        
        # Allow 10 attempts per IP per hour, 5 attempts per username per hour
        return ip_attempts >= 10 or user_attempts >= 5
    
    def _record_failed_attempt(self, username, ip, reason):
        """Record failed authentication attempt."""
        # Record failed attempt for username
        user_cache_key = f"failed_attempts:{username}"
        attempts = cache.get(user_cache_key, 0) + 1
        cache.set(user_cache_key, attempts, timeout=getattr(settings, 'LOGIN_ATTEMPT_TIMEOUT', 900))
        
        # Record failed attempt for IP
        ip_cache_key = f"failed_attempts_ip:{ip}"
        ip_attempts = cache.get(ip_cache_key, 0) + 1
        cache.set(ip_cache_key, ip_attempts, timeout=3600)  # 1 hour
        
        # Lock account if too many failed attempts
        max_attempts = getattr(settings, 'MAX_LOGIN_ATTEMPTS', 5)
        if attempts >= max_attempts:
            lock_cache_key = f"account_locked:{username}"
            lockout_duration = getattr(settings, 'ACCOUNT_LOCKOUT_DURATION', 3600)
            cache.set(lock_cache_key, True, timeout=lockout_duration)
            logger.warning(f"Account locked due to failed attempts: {username}")
        
        # Update rate limiting counters
        self._update_rate_limit_counters(ip, username)
    
    def _update_rate_limit_counters(self, ip, username):
        """Update rate limiting counters."""
        # IP-based counter
        ip_cache_key = f"auth_rate_limit_ip:{ip}"
        ip_count = cache.get(ip_cache_key, 0) + 1
        cache.set(ip_cache_key, ip_count, timeout=3600)  # 1 hour
        
        # Username-based counter
        user_cache_key = f"auth_rate_limit_user:{username}"
        user_count = cache.get(user_cache_key, 0) + 1
        cache.set(user_cache_key, user_count, timeout=3600)  # 1 hour
    
    def _clear_failed_attempts(self, username):
        """Clear failed attempts after successful login."""
        cache_keys = [
            f"failed_attempts:{username}",
            f"account_locked:{username}",
        ]
        cache.delete_many(cache_keys)
    
    def _record_successful_login(self, user, ip):
        """Record successful login for analysis."""
        login_cache_key = f"last_login:{user.id}"
        login_data = {
            'timestamp': timezone.now().isoformat(),
            'ip': ip,
        }
        cache.set(login_cache_key, login_data, timeout=86400)  # 24 hours
        
        # Update user's last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
    
    def _is_suspicious_login(self, user, ip, request):
        """Detect suspicious login patterns."""
        suspicious_indicators = []
        
        # Check for login from new IP
        last_login_cache_key = f"last_login:{user.id}"
        last_login_data = cache.get(last_login_cache_key)
        
        if last_login_data and last_login_data.get('ip') != ip:
            suspicious_indicators.append('new_ip')
        
        # Check for unusual user agent
        user_agent = request.META.get('HTTP_USER_AGENT', '') if request else ''
        if self._is_suspicious_user_agent(user_agent):
            suspicious_indicators.append('suspicious_user_agent')
        
        # Check for rapid successive logins
        rapid_login_cache_key = f"rapid_login:{user.id}"
        last_rapid_login = cache.get(rapid_login_cache_key)
        
        if last_rapid_login:
            time_diff = timezone.now() - timezone.datetime.fromisoformat(last_rapid_login)
            if time_diff < timedelta(seconds=30):  # Less than 30 seconds
                suspicious_indicators.append('rapid_login')
        
        cache.set(rapid_login_cache_key, timezone.now().isoformat(), timeout=300)  # 5 minutes
        
        # Check for login outside normal hours (if we have historical data)
        current_hour = timezone.now().hour
        if current_hour < 6 or current_hour > 22:  # Outside 6 AM - 10 PM
            suspicious_indicators.append('unusual_time')
        
        return len(suspicious_indicators) >= 2  # Suspicious if 2 or more indicators
    
    def _is_suspicious_user_agent(self, user_agent):
        """Check if user agent is suspicious."""
        suspicious_patterns = [
            'bot', 'crawler', 'spider', 'scraper',
            'curl', 'wget', 'python', 'requests',
            'sqlmap', 'nikto', 'nmap', 'masscan',
        ]
        
        user_agent_lower = user_agent.lower()
        return any(pattern in user_agent_lower for pattern in suspicious_patterns)


class TokenAuthenticationBackend:
    """
    Enhanced token authentication backend with additional security.
    """
    
    def authenticate(self, request, token=None, **kwargs):
        """
        Authenticate using API token with enhanced security.
        """
        if not token:
            return None
        
        # Check if token is blacklisted
        if self._is_token_blacklisted(token):
            logger.warning(f"Authentication attempt with blacklisted token")
            return None
        
        try:
            from rest_framework.authtoken.models import Token
            token_obj = Token.objects.select_related('user').get(key=token)
        except Token.DoesNotExist:
            logger.warning(f"Authentication attempt with invalid token")
            return None
        
        # Check if token is expired
        if self._is_token_expired(token_obj):
            logger.warning(f"Authentication attempt with expired token for user: {token_obj.user.username}")
            return None
        
        # Check if user is active
        if not token_obj.user.is_active:
            logger.warning(f"Authentication attempt with token for inactive user: {token_obj.user.username}")
            return None
        
        # Record token usage
        self._record_token_usage(token_obj, request)
        
        return token_obj.user
    
    def _is_token_blacklisted(self, token):
        """Check if token is blacklisted."""
        cache_key = f"blacklisted_token:{token}"
        return cache.get(cache_key, False)
    
    def _is_token_expired(self, token_obj):
        """Check if token is expired."""
        expiry_hours = getattr(settings, 'AUTH_TOKEN_EXPIRY_HOURS', 24)
        expiry_time = token_obj.created + timedelta(hours=expiry_hours)
        return timezone.now() > expiry_time
    
    def _record_token_usage(self, token_obj, request):
        """Record token usage for monitoring."""
        usage_cache_key = f"token_usage:{token_obj.key}"
        usage_data = {
            'last_used': timezone.now().isoformat(),
            'ip': self._get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200] if request else '',
        }
        cache.set(usage_cache_key, usage_data, timeout=86400)  # 24 hours
    
    def _get_client_ip(self, request):
        """Get client IP address from request."""
        if not request:
            return 'unknown'
        
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'unknown')
        return ip
    
    def get_user(self, user_id):
        """Get user by ID."""
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
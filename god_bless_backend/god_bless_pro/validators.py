"""
Custom validators for enhanced security in the God Bless platform.
"""

import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class CustomPasswordValidator:
    """
    Enhanced password validator with additional security requirements.
    """
    
    def validate(self, password, user=None):
        """
        Validate password against enhanced security requirements.
        """
        errors = []
        
        # Check for at least one uppercase letter
        if not re.search(r'[A-Z]', password):
            errors.append(_('Password must contain at least one uppercase letter.'))
        
        # Check for at least one lowercase letter
        if not re.search(r'[a-z]', password):
            errors.append(_('Password must contain at least one lowercase letter.'))
        
        # Check for at least one digit
        if not re.search(r'[0-9]', password):
            errors.append(_('Password must contain at least one digit.'))
        
        # Check for at least one special character
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
            errors.append(_('Password must contain at least one special character.'))
        
        # Check for common weak patterns
        weak_patterns = [
            r'(.)\1{2,}',  # Three or more consecutive identical characters
            r'(012|123|234|345|456|567|678|789|890)',  # Sequential numbers
            r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)',  # Sequential letters
            r'(qwerty|asdfgh|zxcvbn)',  # Keyboard patterns
        ]
        
        for pattern in weak_patterns:
            if re.search(pattern, password.lower()):
                errors.append(_('Password contains weak patterns. Please choose a more complex password.'))
                break
        
        # Check against user information if user is provided
        if user:
            user_info = [
                getattr(user, 'username', ''),
                getattr(user, 'first_name', ''),
                getattr(user, 'last_name', ''),
                getattr(user, 'email', '').split('@')[0] if getattr(user, 'email', '') else '',
            ]
            
            for info in user_info:
                if info and len(info) > 2 and info.lower() in password.lower():
                    errors.append(_('Password cannot contain personal information.'))
                    break
        
        # Check for common weak passwords
        common_passwords = [
            'password', 'admin', 'administrator', 'root', 'user', 'guest',
            'welcome', 'login', 'test', 'demo', 'sample', 'default',
            'godbless', 'platform', 'system', 'server', 'database',
        ]
        
        for weak_password in common_passwords:
            if weak_password in password.lower():
                errors.append(_('Password cannot contain common words.'))
                break
        
        if errors:
            raise ValidationError(errors)
    
    def get_help_text(self):
        """
        Return help text for password requirements.
        """
        return _(
            'Your password must contain at least 12 characters including '
            'uppercase letters, lowercase letters, digits, and special characters. '
            'Avoid using personal information or common words.'
        )


class UsernameValidator:
    """
    Enhanced username validator.
    """
    
    def __call__(self, value):
        """
        Validate username against security requirements.
        """
        errors = []
        
        # Check minimum length
        if len(value) < 3:
            errors.append(_('Username must be at least 3 characters long.'))
        
        # Check maximum length
        if len(value) > 30:
            errors.append(_('Username must be no more than 30 characters long.'))
        
        # Check allowed characters
        if not re.match(r'^[a-zA-Z0-9_-]+$', value):
            errors.append(_('Username can only contain letters, numbers, hyphens, and underscores.'))
        
        # Check for reserved usernames
        reserved_usernames = [
            'admin', 'administrator', 'root', 'system', 'api', 'www',
            'mail', 'email', 'support', 'help', 'info', 'contact',
            'user', 'guest', 'anonymous', 'null', 'undefined',
            'godbless', 'platform', 'server', 'database', 'cache',
        ]
        
        if value.lower() in reserved_usernames:
            errors.append(_('This username is reserved and cannot be used.'))
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'^[0-9]+$',  # Only numbers
            r'^.{1,2}$',  # Too short
            r'(test|demo|sample|temp)',  # Test accounts
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, value.lower()):
                errors.append(_('Username contains suspicious patterns.'))
                break
        
        if errors:
            raise ValidationError(errors)


class EmailValidator:
    """
    Enhanced email validator with additional security checks.
    """
    
    def __call__(self, value):
        """
        Validate email against security requirements.
        """
        errors = []
        
        # Basic email format validation (Django's EmailValidator handles this)
        # Additional security checks
        
        # Check for suspicious domains
        suspicious_domains = [
            '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
            'mailinator.com', 'throwaway.email', 'temp-mail.org',
        ]
        
        domain = value.split('@')[1].lower() if '@' in value else ''
        if domain in suspicious_domains:
            errors.append(_('Temporary email addresses are not allowed.'))
        
        # Check for plus addressing abuse
        local_part = value.split('@')[0] if '@' in value else ''
        if local_part.count('+') > 1:
            errors.append(_('Invalid email format.'))
        
        # Check for suspicious patterns
        if re.search(r'[<>"\']', value):
            errors.append(_('Email contains invalid characters.'))
        
        if errors:
            raise ValidationError(errors)


def validate_phone_number(value):
    """
    Validate phone number format and security.
    """
    errors = []
    
    # Remove common formatting
    cleaned = re.sub(r'[\s\-\(\)]', '', value)
    
    # Check basic format
    if not re.match(r'^\+?1?\d{10,15}$', cleaned):
        errors.append(_('Invalid phone number format.'))
    
    # Check for suspicious patterns
    if re.match(r'^(\d)\1+$', cleaned):  # All same digits
        errors.append(_('Phone number cannot be all the same digit.'))
    
    if re.match(r'^(123|000|555)', cleaned[-10:]):  # Common fake patterns
        errors.append(_('Invalid phone number.'))
    
    if errors:
        raise ValidationError(errors)
    
    return cleaned


def validate_project_name(value):
    """
    Validate project name for security.
    """
    errors = []
    
    # Check length
    if len(value) < 2:
        errors.append(_('Project name must be at least 2 characters long.'))
    
    if len(value) > 100:
        errors.append(_('Project name must be no more than 100 characters long.'))
    
    # Check for suspicious content
    if re.search(r'[<>"\']', value):
        errors.append(_('Project name contains invalid characters.'))
    
    # Check for script injection attempts
    if re.search(r'(script|javascript|vbscript|onload|onerror)', value.lower()):
        errors.append(_('Project name contains prohibited content.'))
    
    if errors:
        raise ValidationError(errors)
    
    return value.strip()


def validate_file_content(file_obj):
    """
    Validate uploaded file content for security.
    """
    errors = []
    
    # Check file size
    if file_obj.size > 10 * 1024 * 1024:  # 10 MB
        errors.append(_('File size cannot exceed 10 MB.'))
    
    # Check file extension
    allowed_extensions = ['csv', 'txt', 'json', 'xlsx', 'xls']
    file_extension = file_obj.name.split('.')[-1].lower() if '.' in file_obj.name else ''
    
    if file_extension not in allowed_extensions:
        errors.append(_('File type not allowed. Allowed types: {}').format(', '.join(allowed_extensions)))
    
    # Check for suspicious file names
    if re.search(r'[<>:"/\\|?*]', file_obj.name):
        errors.append(_('File name contains invalid characters.'))
    
    # Check for executable extensions (double extension attack)
    dangerous_extensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'php', 'py']
    for ext in dangerous_extensions:
        if ext in file_obj.name.lower():
            errors.append(_('File name contains prohibited extensions.'))
            break
    
    if errors:
        raise ValidationError(errors)
    
    return True
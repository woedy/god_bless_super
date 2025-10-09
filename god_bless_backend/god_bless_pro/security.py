"""
Security utilities and validators for the God Bless platform.
Implements input validation, sanitization, and security checks.
"""

import re
import html
import bleach
from typing import Any, Dict, List, Optional
from django.core.exceptions import ValidationError
from django.utils.html import escape


class InputValidator:
    """Validates and sanitizes user input to prevent security vulnerabilities"""
    
    # Regex patterns for validation
    EMAIL_PATTERN = re.compile(r'^[\w\.-]+@[\w\.-]+\.\w+$')
    PHONE_PATTERN = re.compile(r'^\+?1?\d{10,15}$')
    AREA_CODE_PATTERN = re.compile(r'^\d{3}$')
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{3,30}$')
    UUID_PATTERN = re.compile(r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$', re.IGNORECASE)
    
    # SQL injection patterns to detect
    SQL_INJECTION_PATTERNS = [
        r"(\bUNION\b.*\bSELECT\b)",
        r"(\bDROP\b.*\bTABLE\b)",
        r"(\bINSERT\b.*\bINTO\b)",
        r"(\bDELETE\b.*\bFROM\b)",
        r"(\bUPDATE\b.*\bSET\b)",
        r"(--)",
        r"(;.*--)",
        r"(\bOR\b.*=.*)",
        r"(\bAND\b.*=.*)",
    ]
    
    # XSS patterns to detect
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"onerror\s*=",
        r"onload\s*=",
        r"onclick\s*=",
        r"<iframe",
        r"<embed",
        r"<object",
    ]
    
    @classmethod
    def validate_email(cls, email: str) -> str:
        """Validate and sanitize email address"""
        if not email:
            raise ValidationError("Email is required")
        
        email = email.strip().lower()
        
        if not cls.EMAIL_PATTERN.match(email):
            raise ValidationError("Invalid email format")
        
        if len(email) > 254:
            raise ValidationError("Email is too long")
        
        # Check for SQL injection attempts
        if cls._contains_sql_injection(email):
            raise ValidationError("Invalid email format")
        
        return email
    
    @classmethod
    def validate_phone_number(cls, phone: str) -> str:
        """Validate and sanitize phone number"""
        if not phone:
            raise ValidationError("Phone number is required")
        
        # Remove common formatting characters
        phone = re.sub(r'[\s\-\(\)]', '', phone)
        
        if not cls.PHONE_PATTERN.match(phone):
            raise ValidationError("Invalid phone number format")
        
        return phone
    
    @classmethod
    def validate_area_code(cls, area_code: str) -> str:
        """Validate area code"""
        if not area_code:
            raise ValidationError("Area code is required")
        
        area_code = area_code.strip()
        
        if not cls.AREA_CODE_PATTERN.match(area_code):
            raise ValidationError("Area code must be exactly 3 digits")
        
        return area_code
    
    @classmethod
    def validate_username(cls, username: str) -> str:
        """Validate and sanitize username"""
        if not username:
            raise ValidationError("Username is required")
        
        username = username.strip()
        
        if not cls.USERNAME_PATTERN.match(username):
            raise ValidationError(
                "Username must be 3-30 characters and contain only letters, numbers, hyphens, and underscores"
            )
        
        # Check for SQL injection attempts
        if cls._contains_sql_injection(username):
            raise ValidationError("Invalid username format")
        
        return username
    
    @classmethod
    def validate_uuid(cls, uuid_str: str) -> str:
        """Validate UUID format"""
        if not uuid_str:
            raise ValidationError("ID is required")
        
        uuid_str = uuid_str.strip()
        
        if not cls.UUID_PATTERN.match(uuid_str):
            raise ValidationError("Invalid ID format")
        
        return uuid_str
    
    @classmethod
    def validate_integer(cls, value: Any, min_val: Optional[int] = None, max_val: Optional[int] = None) -> int:
        """Validate integer value with optional range"""
        try:
            int_value = int(value)
        except (ValueError, TypeError):
            raise ValidationError("Invalid integer value")
        
        if min_val is not None and int_value < min_val:
            raise ValidationError(f"Value must be at least {min_val}")
        
        if max_val is not None and int_value > max_val:
            raise ValidationError(f"Value must be at most {max_val}")
        
        return int_value
    
    @classmethod
    def sanitize_text(cls, text: str, max_length: Optional[int] = None) -> str:
        """Sanitize text input to prevent XSS"""
        if not text:
            return ""
        
        # Remove any HTML tags
        text = bleach.clean(text, tags=[], strip=True)
        
        # Escape HTML entities
        text = escape(text)
        
        # Check for XSS patterns
        if cls._contains_xss(text):
            raise ValidationError("Invalid text content")
        
        # Truncate if needed
        if max_length and len(text) > max_length:
            text = text[:max_length]
        
        return text.strip()
    
    @classmethod
    def sanitize_html(cls, html_content: str, allowed_tags: Optional[List[str]] = None) -> str:
        """Sanitize HTML content allowing only specific tags"""
        if not html_content:
            return ""
        
        if allowed_tags is None:
            allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li']
        
        allowed_attributes = {
            'a': ['href', 'title'],
        }
        
        # Clean HTML with bleach
        clean_html = bleach.clean(
            html_content,
            tags=allowed_tags,
            attributes=allowed_attributes,
            strip=True
        )
        
        return clean_html
    
    @classmethod
    def validate_password(cls, password: str) -> str:
        """Validate password strength"""
        if not password:
            raise ValidationError("Password is required")
        
        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters long")
        
        if len(password) > 128:
            raise ValidationError("Password is too long")
        
        # Check for uppercase letter
        if not re.search(r'[A-Z]', password):
            raise ValidationError("Password must contain at least one uppercase letter")
        
        # Check for lowercase letter
        if not re.search(r'[a-z]', password):
            raise ValidationError("Password must contain at least one lowercase letter")
        
        # Check for digit
        if not re.search(r'[0-9]', password):
            raise ValidationError("Password must contain at least one digit")
        
        # Check for special character
        if not re.search(r'[-!@#\$%^&*_()-+=/.,<>?"~`£{}|:;]', password):
            raise ValidationError("Password must contain at least one special character")
        
        return password
    
    @classmethod
    def _contains_sql_injection(cls, text: str) -> bool:
        """Check if text contains SQL injection patterns"""
        text_upper = text.upper()
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, text_upper, re.IGNORECASE):
                return True
        return False
    
    @classmethod
    def _contains_xss(cls, text: str) -> bool:
        """Check if text contains XSS patterns"""
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False
    
    @classmethod
    def validate_json_field(cls, data: Dict, required_fields: List[str]) -> Dict:
        """Validate JSON data structure"""
        if not isinstance(data, dict):
            raise ValidationError("Invalid data format")
        
        # Check required fields
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
        
        return data
    
    @classmethod
    def validate_file_upload(cls, filename: str, allowed_extensions: List[str]) -> str:
        """Validate file upload"""
        if not filename:
            raise ValidationError("Filename is required")
        
        # Get file extension
        if '.' not in filename:
            raise ValidationError("File must have an extension")
        
        ext = filename.rsplit('.', 1)[1].lower()
        
        if ext not in allowed_extensions:
            raise ValidationError(f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}")
        
        # Sanitize filename
        filename = re.sub(r'[^\w\s.-]', '', filename)
        
        return filename


class SecurityHeaders:
    """Security headers configuration"""
    
    @staticmethod
    def get_security_headers() -> Dict[str, str]:
        """Get recommended security headers"""
        return {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        }

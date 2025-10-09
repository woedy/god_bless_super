#!/usr/bin/env python
"""
Simple script to test Django settings configuration without full system check
"""
import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')

try:
    # Setup Django
    django.setup()
    
    # Import settings
    from django.conf import settings
    
    print("✅ Django settings loaded successfully!")
    print(f"DEBUG: {settings.DEBUG}")
    print(f"SECRET_KEY: {'*' * len(settings.SECRET_KEY)}")
    print(f"ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
    print(f"DATABASE ENGINE: {settings.DATABASES['default']['ENGINE']}")
    print(f"REDIS_HOST: {getattr(settings, 'REDIS_HOST', 'Not set')}")
    print(f"CELERY_BROKER_URL: {settings.CELERY_BROKER_URL}")
    
    # Test basic Django functionality
    from django.core.management import execute_from_command_line
    print("\n🔍 Running basic Django check...")
    execute_from_command_line(['manage.py', 'check', '--tag', 'models'])
    
    print("\n✅ Basic checks passed! Simplified settings are working correctly.")
    
    # Test database connection (if using PostgreSQL)
    if 'postgresql' in settings.DATABASES['default']['ENGINE']:
        print("\n🔍 Testing PostgreSQL connection...")
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            print("✅ PostgreSQL connection successful!")
    
    print("\n🎉 All simplified settings tests passed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
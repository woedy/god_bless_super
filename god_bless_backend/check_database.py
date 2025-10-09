#!/usr/bin/env python
"""
Check which database is being used and show some data
"""

import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.conf import settings
from phone_number_validator.models import PhonePrefix
from accounts.models import User

def check_database():
    """Check database configuration and data"""
    
    print("🔍 Database Configuration Check")
    print("=" * 50)
    
    # Check Django settings
    db_config = settings.DATABASES['default']
    print(f"Database Engine: {db_config['ENGINE']}")
    
    if 'sqlite' in db_config['ENGINE']:
        print(f"SQLite Database File: {db_config['NAME']}")
        print("✅ Using SQLite")
    else:
        print(f"Database Name: {db_config['NAME']}")
        print(f"Database Host: {db_config['HOST']}")
        print("✅ Using PostgreSQL")
    
    print("\n📊 Data Check")
    print("=" * 50)
    
    try:
        # Check PhonePrefix (carrier data)
        carrier_count = PhonePrefix.objects.count()
        print(f"Carrier Records (PhonePrefix): {carrier_count}")
        
        if carrier_count > 0:
            # Show sample carrier data
            sample = PhonePrefix.objects.first()
            print(f"Sample: {sample.prefix} -> {sample.carrier} ({sample.city}, {sample.state})")
        
        # Check Users
        user_count = User.objects.count()
        print(f"User Accounts: {user_count}")
        
        if user_count > 0:
            users = User.objects.all()[:3]
            print("Users:")
            for user in users:
                print(f"  - {user.username} (superuser: {user.is_superuser})")
        
        # Determine if this looks like your original data
        if carrier_count > 100000:
            print("\n✅ This looks like your original SQLite data!")
        elif carrier_count == 0:
            print("\n❌ No carrier data found - might be using empty PostgreSQL")
        else:
            print(f"\n⚠️  Found {carrier_count} carrier records - check if this is correct")
            
    except Exception as e:
        print(f"❌ Error checking data: {e}")

if __name__ == '__main__':
    check_database()
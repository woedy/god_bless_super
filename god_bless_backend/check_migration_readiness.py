#!/usr/bin/env python
"""
Check if system is ready for PostgreSQL migration
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from phone_number_validator.models import PhonePrefix
from accounts.models import User

def check_readiness():
    """Check if migration is safe to proceed"""
    
    print("🔍 Pre-Migration Readiness Check")
    print("=" * 50)
    
    checks_passed = 0
    total_checks = 5
    
    # Check 1: SQLite database exists
    if os.path.exists('db.sqlite3'):
        print("✅ SQLite database found")
        checks_passed += 1
    else:
        print("❌ SQLite database not found")
    
    # Check 2: Carrier data exists
    try:
        carrier_count = PhonePrefix.objects.count()
        if carrier_count > 0:
            print(f"✅ Carrier data: {carrier_count} records")
            checks_passed += 1
        else:
            print("❌ No carrier data found")
    except Exception as e:
        print(f"❌ Error checking carrier data: {e}")
    
    # Check 3: User accounts exist
    try:
        user_count = User.objects.count()
        if user_count > 0:
            print(f"✅ User accounts: {user_count} users")
            checks_passed += 1
        else:
            print("❌ No user accounts found")
    except Exception as e:
        print(f"❌ Error checking users: {e}")
    
    # Check 4: Docker is running
    try:
        import subprocess
        result = subprocess.run(['docker', 'ps'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Docker is running")
            checks_passed += 1
        else:
            print("❌ Docker is not running")
    except Exception as e:
        print("❌ Docker check failed")
    
    # Check 5: Backup directory is writable
    try:
        os.makedirs('full_backup', exist_ok=True)
        test_file = 'full_backup/test_write.tmp'
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        print("✅ Backup directory is writable")
        checks_passed += 1
    except Exception as e:
        print("❌ Cannot write to backup directory")
    
    print("\n" + "=" * 50)
    print(f"Readiness Score: {checks_passed}/{total_checks}")
    
    if checks_passed == total_checks:
        print("🎉 System is ready for PostgreSQL migration!")
        print("✅ You can safely run: migrate_to_postgres.bat")
        return True
    else:
        print("⚠️  System is not ready for migration")
        print("❌ Please fix the issues above before migrating")
        return False

if __name__ == '__main__':
    check_readiness()
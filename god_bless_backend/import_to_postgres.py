#!/usr/bin/env python
"""
Import carrier data to PostgreSQL after switching databases
Run this after switching to PostgreSQL and running migrations
"""

import os
import sys
import django
import json
from datetime import datetime

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

# Import Django models
from phone_number_validator.models import PhonePrefix

def import_carrier_data():
    """Import carrier data from JSON backup to PostgreSQL"""
    
    # Find the most recent backup file
    backup_dir = 'carrier_backup'
    if not os.path.exists(backup_dir):
        print('❌ No carrier_backup directory found. Please export your data first.')
        return
    
    # Find JSON files
    json_files = [f for f in os.listdir(backup_dir) if f.startswith('phoneprefix_carrier_data_') and f.endswith('.json')]
    
    if not json_files:
        print('❌ No carrier backup JSON files found. Please export your data first.')
        return
    
    # Use the most recent file
    latest_file = sorted(json_files)[-1]
    json_path = os.path.join(backup_dir, latest_file)
    
    print(f'📂 Found backup file: {latest_file}')
    
    try:
        # Check if data already exists
        existing_count = PhonePrefix.objects.count()
        if existing_count > 0:
            response = input(f'⚠️  PostgreSQL already has {existing_count} records. Clear and reimport? (y/N): ')
            if response.lower() == 'y':
                PhonePrefix.objects.all().delete()
                print(f'🗑️  Cleared {existing_count} existing records')
            else:
                print('❌ Import cancelled')
                return
        
        # Load JSON data
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f'📊 Loading {len(data)} carrier records...')
        
        # Import data in batches for better performance
        batch_size = 1000
        imported_count = 0
        
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            records_to_create = []
            
            for item in batch:
                records_to_create.append(PhonePrefix(
                    prefix=item['prefix'],
                    carrier=item['carrier'],
                    city=item['city'],
                    state=item['state'],
                    line_type=item['line_type']
                ))
            
            # Bulk create for better performance
            PhonePrefix.objects.bulk_create(records_to_create, ignore_conflicts=True)
            imported_count += len(records_to_create)
            
            # Show progress
            print(f'📈 Imported {imported_count}/{len(data)} records...')
        
        # Verify import
        final_count = PhonePrefix.objects.count()
        
        print(f'✅ Successfully imported {final_count} carrier records to PostgreSQL!')
        print(f'📋 Sample records:')
        
        # Show a few sample records
        for record in PhonePrefix.objects.all()[:3]:
            print(f'   {record.prefix} -> {record.carrier} ({record.city}, {record.state}) [{record.line_type}]')
        
    except Exception as e:
        print(f'❌ Import failed: {str(e)}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    import_carrier_data()
#!/usr/bin/env python
"""
Complete database backup before PostgreSQL migration
Exports ALL data from SQLite for seamless migration
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

from django.core import serializers
from django.apps import apps

def export_all_data():
    """Export all data from all models for complete backup"""
    
    # Create output directory
    output_dir = 'full_backup'
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    print(f"🔄 Starting complete database backup...")
    
    # Get all models from all apps
    all_models = []
    for app_config in apps.get_app_configs():
        if not app_config.name.startswith('django.'):  # Skip Django built-in apps
            for model in app_config.get_models():
                all_models.append(model)
    
    exported_data = {}
    total_records = 0
    
    for model in all_models:
        app_label = model._meta.app_label
        model_name = model._meta.model_name
        
        try:
            queryset = model.objects.all()
            count = queryset.count()
            
            if count > 0:
                # Export using Django serializer
                serialized_data = serializers.serialize('json', queryset, indent=2)
                
                # Store in our backup structure
                if app_label not in exported_data:
                    exported_data[app_label] = {}
                
                exported_data[app_label][model_name] = {
                    'count': count,
                    'data': json.loads(serialized_data)
                }
                
                total_records += count
                print(f"✅ {app_label}.{model_name}: {count} records")
            else:
                print(f"⚠️  {app_label}.{model_name}: 0 records (skipped)")
                
        except Exception as e:
            print(f"❌ Error exporting {app_label}.{model_name}: {e}")
    
    # Save complete backup
    backup_filename = f'complete_backup_{timestamp}.json'
    backup_filepath = os.path.join(output_dir, backup_filename)
    
    with open(backup_filepath, 'w', encoding='utf-8') as f:
        json.dump(exported_data, f, indent=2, ensure_ascii=False)
    
    # Create migration script
    migration_script = f'migrate_to_postgres_{timestamp}.py'
    migration_filepath = os.path.join(output_dir, migration_script)
    
    with open(migration_filepath, 'w', encoding='utf-8') as f:
        f.write(f'''#!/usr/bin/env python
"""
Auto-generated migration script for PostgreSQL
Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

import os
import sys
import django
import json
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from django.core import serializers
from django.db import transaction

def migrate_data():
    """Import all data into PostgreSQL"""
    
    backup_file = '{backup_filename}'
    
    if not os.path.exists(backup_file):
        print(f"❌ Backup file not found: {{backup_file}}")
        return
    
    print("🔄 Loading backup data...")
    with open(backup_file, 'r', encoding='utf-8') as f:
        backup_data = json.load(f)
    
    total_imported = 0
    
    with transaction.atomic():
        print("🔄 Starting PostgreSQL import...")
        
        for app_label, models in backup_data.items():
            print(f"\\n📦 Importing {{app_label}} app...")
            
            for model_name, model_data in models.items():
                try:
                    count = model_data['count']
                    data = model_data['data']
                    
                    print(f"  🔄 Importing {{model_name}}: {{count}} records...")
                    
                    # Import using Django deserializer
                    for obj in serializers.deserialize('json', json.dumps(data)):
                        obj.save()
                    
                    total_imported += count
                    print(f"  ✅ {{model_name}}: {{count}} records imported")
                    
                except Exception as e:
                    print(f"  ❌ Error importing {{model_name}}: {{e}}")
    
    print(f"\\n🎉 Migration complete! Total records imported: {{total_imported}}")

if __name__ == '__main__':
    migrate_data()
''')
    
    print(f"\n🎉 Complete backup created!")
    print(f"📄 Backup file: {backup_filename}")
    print(f"🔧 Migration script: {migration_script}")
    print(f"📊 Total records: {total_records}")
    print(f"📁 Location: {os.path.abspath(output_dir)}")

if __name__ == '__main__':
    export_all_data()
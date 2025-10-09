#!/usr/bin/env python
"""
Standalone script to export carrier data from SQLite to JSON
Run this script from the god_bless_backend directory
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

# Now import Django models
from phone_number_validator.models import PhonePrefix

def export_carrier_data():
    """Export PhonePrefix carrier data to JSON files"""
    
    # Create output directory
    output_dir = 'carrier_backup'
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    try:
        # Get all PhonePrefix records
        queryset = PhonePrefix.objects.all()
        count = queryset.count()
        
        if count == 0:
            print('No PhonePrefix carrier records found to export')
            return
        
        print(f'Found {count} carrier records to export...')
        
        # Create simplified format for easy import to other databases
        simplified_data = []
        for obj in queryset:
            simplified_data.append({
                'id': obj.id,
                'prefix': obj.prefix,
                'carrier': obj.carrier,
                'city': obj.city,
                'state': obj.state,
                'line_type': obj.line_type
            })
        
        # Save simplified JSON format
        simple_filename = f'phoneprefix_carrier_data_{timestamp}.json'
        simple_filepath = os.path.join(output_dir, simple_filename)
        with open(simple_filepath, 'w', encoding='utf-8') as f:
            json.dump(simplified_data, f, indent=2, ensure_ascii=False)
        
        # Create PostgreSQL SQL script
        sql_filename = f'phoneprefix_postgresql_{timestamp}.sql'
        sql_filepath = os.path.join(output_dir, sql_filename)
        with open(sql_filepath, 'w', encoding='utf-8') as f:
            f.write("-- PostgreSQL import script for PhonePrefix carrier data\n")
            f.write("-- Create table if it doesn't exist\n")
            f.write("CREATE TABLE IF NOT EXISTS phone_prefix (\n")
            f.write("    id SERIAL PRIMARY KEY,\n")
            f.write("    prefix VARCHAR(6) UNIQUE NOT NULL,\n")
            f.write("    carrier VARCHAR(255) NOT NULL,\n")
            f.write("    city VARCHAR(255) NOT NULL,\n")
            f.write("    state VARCHAR(255) NOT NULL,\n")
            f.write("    line_type VARCHAR(50) NOT NULL\n")
            f.write(");\n\n")
            f.write("-- Insert carrier data\n")
            
            for obj in queryset:
                # Escape single quotes in data
                prefix = obj.prefix.replace("'", "''") if obj.prefix else ''
                carrier = obj.carrier.replace("'", "''") if obj.carrier else ''
                city = obj.city.replace("'", "''") if obj.city else ''
                state = obj.state.replace("'", "''") if obj.state else ''
                line_type = obj.line_type.replace("'", "''") if obj.line_type else ''
                
                f.write(f"INSERT INTO phone_prefix (prefix, carrier, city, state, line_type) VALUES ('{prefix}', '{carrier}', '{city}', '{state}', '{line_type}') ON CONFLICT (prefix) DO NOTHING;\n")
        
        # Create CSV format for easy viewing
        csv_filename = f'phoneprefix_carrier_data_{timestamp}.csv'
        csv_filepath = os.path.join(output_dir, csv_filename)
        with open(csv_filepath, 'w', encoding='utf-8') as f:
            f.write("id,prefix,carrier,city,state,line_type\n")
            for obj in queryset:
                # Escape commas and quotes in CSV
                prefix = f'"{obj.prefix}"' if ',' in str(obj.prefix) else str(obj.prefix)
                carrier = f'"{obj.carrier}"' if ',' in str(obj.carrier) else str(obj.carrier)
                city = f'"{obj.city}"' if ',' in str(obj.city) else str(obj.city)
                state = f'"{obj.state}"' if ',' in str(obj.state) else str(obj.state)
                line_type = f'"{obj.line_type}"' if ',' in str(obj.line_type) else str(obj.line_type)
                
                f.write(f"{obj.id},{prefix},{carrier},{city},{state},{line_type}\n")
        
        print(f'✅ Successfully exported {count} carrier records to:')
        print(f'   📄 {simple_filename} (JSON format)')
        print(f'   🐘 {sql_filename} (PostgreSQL format)')
        print(f'   📊 {csv_filename} (CSV format)')
        print(f'\nFiles saved in: {os.path.abspath(output_dir)}')
        
    except Exception as e:
        print(f'❌ Export failed: {str(e)}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    export_carrier_data()
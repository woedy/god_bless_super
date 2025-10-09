import json
import os
from datetime import datetime
from django.core.management.base import BaseCommand
from django.core import serializers
from phone_number_validator.models import PhonePrefix


class Command(BaseCommand):
    help = 'Export carrier data (PhonePrefix) to JSON files for backup and migration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            default='carrier_backup',
            help='Directory to save exported JSON files (default: carrier_backup)'
        )

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        try:
            self.export_phoneprefix(output_dir, timestamp)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Export failed: {str(e)}')
            )

    def export_phoneprefix(self, output_dir, timestamp):
        """Export PhonePrefix carrier data to JSON"""
        queryset = PhonePrefix.objects.all()
        count = queryset.count()
        
        if count == 0:
            self.stdout.write(
                self.style.WARNING('No PhonePrefix carrier records found to export')
            )
            return
        
        # Export using Django's serializers for proper format (for Django re-import)
        serialized_data = serializers.serialize('json', queryset, indent=2)
        
        # Create simplified format for easier import to other databases like PostgreSQL
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
        
        # Save Django format (for Django imports)
        django_filename = f'phoneprefix_django_{timestamp}.json'
        django_filepath = os.path.join(output_dir, django_filename)
        with open(django_filepath, 'w', encoding='utf-8') as f:
            f.write(serialized_data)
        
        # Save simplified format (for PostgreSQL and other databases)
        simple_filename = f'phoneprefix_simple_{timestamp}.json'
        simple_filepath = os.path.join(output_dir, simple_filename)
        with open(simple_filepath, 'w', encoding='utf-8') as f:
            json.dump(simplified_data, f, indent=2, ensure_ascii=False)
        
        # Create SQL insert statements for easy PostgreSQL import
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
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully exported {count} carrier records to:\n'
                f'  - {django_filename} (Django format)\n'
                f'  - {simple_filename} (JSON format)\n'
                f'  - {sql_filename} (PostgreSQL format)'
            )
        )
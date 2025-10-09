import json
import os
from datetime import datetime
from django.core.management.base import BaseCommand
from django.core import serializers
from validator.models import Proxy, PhoneNumber
from phone_number_validator.models import PhonePrefix, Proxy as ValidatorProxy
from client.models import Client


class Command(BaseCommand):
    help = 'Export validator data (Proxy and PhoneNumber) to JSON files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            default='data_exports',
            help='Directory to save exported JSON files (default: data_exports)'
        )
        parser.add_argument(
            '--models',
            type=str,
            nargs='+',
            choices=['proxy', 'phonenumber', 'phoneprefix', 'validatorproxy', 'client', 'all'],
            default=['all'],
            help='Models to export: proxy, phonenumber, phoneprefix, validatorproxy, client, or all (default: all)'
        )

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        models_to_export = options['models']
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Determine which models to export
        if 'all' in models_to_export:
            models_to_export = ['proxy', 'phonenumber', 'phoneprefix', 'validatorproxy', 'client']
        
        exported_files = []
        
        try:
            if 'proxy' in models_to_export:
                self.export_model(Proxy, 'proxy', output_dir, timestamp, exported_files)
            
            if 'phonenumber' in models_to_export:
                self.export_model(PhoneNumber, 'phonenumber', output_dir, timestamp, exported_files)
            
            if 'phoneprefix' in models_to_export:
                self.export_model(PhonePrefix, 'phoneprefix', output_dir, timestamp, exported_files)
            
            if 'validatorproxy' in models_to_export:
                self.export_model(ValidatorProxy, 'validatorproxy', output_dir, timestamp, exported_files)
            
            if 'client' in models_to_export:
                self.export_model(Client, 'client', output_dir, timestamp, exported_files)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully exported {len(exported_files)} files:\n' + 
                    '\n'.join(f'  - {file}' for file in exported_files)
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Export failed: {str(e)}')
            )

    def export_model(self, model_class, model_name, output_dir, timestamp, exported_files):
        """Export a single model to JSON"""
        queryset = model_class.objects.all()
        count = queryset.count()
        
        if count == 0:
            self.stdout.write(
                self.style.WARNING(f'No {model_name} records found to export')
            )
            return
        
        # Export using Django's serializers for proper format
        serialized_data = serializers.serialize('json', queryset, indent=2)
        
        # Also create a simplified format for easier import to other systems
        simplified_data = []
        for obj in queryset:
            if model_name == 'proxy':
                simplified_data.append({
                    'id': obj.id,
                    'ip_address': obj.ip_address,
                    'port': obj.port,
                    'is_active': obj.is_active
                })
            elif model_name == 'phonenumber':
                simplified_data.append({
                    'id': obj.id,
                    'number': obj.number,
                    'status': obj.status,
                    'carrier': obj.carrier
                })
            elif model_name == 'phoneprefix':
                simplified_data.append({
                    'id': obj.id,
                    'prefix': obj.prefix,
                    'carrier': obj.carrier,
                    'city': obj.city,
                    'state': obj.state,
                    'line_type': obj.line_type
                })
            elif model_name == 'validatorproxy':
                simplified_data.append({
                    'id': obj.id,
                    'ip_address': obj.ip_address,
                    'port': obj.port,
                    'country': obj.country,
                    'ssl': obj.ssl,
                    'anonymity': obj.anonymity,
                    'valid': obj.valid,
                    'created_at': obj.created_at.isoformat() if obj.created_at else None
                })
            elif model_name == 'client':
                simplified_data.append({
                    'id': obj.id,
                    'full_name': obj.full_name,
                    'phone': obj.phone,
                    'carrier': obj.carrier,
                    'location': obj.location,
                    'country': obj.country,
                    'created_at': obj.created_at.isoformat() if obj.created_at else None
                })
        
        # Save Django format (for Django imports)
        django_filename = f'{model_name}_django_{timestamp}.json'
        django_filepath = os.path.join(output_dir, django_filename)
        with open(django_filepath, 'w', encoding='utf-8') as f:
            f.write(serialized_data)
        
        # Save simplified format (for other systems)
        simple_filename = f'{model_name}_simple_{timestamp}.json'
        simple_filepath = os.path.join(output_dir, simple_filename)
        with open(simple_filepath, 'w', encoding='utf-8') as f:
            json.dump(simplified_data, f, indent=2, ensure_ascii=False)
        
        exported_files.extend([django_filename, simple_filename])
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Exported {count} {model_name} records to {django_filename} and {simple_filename}'
            )
        )
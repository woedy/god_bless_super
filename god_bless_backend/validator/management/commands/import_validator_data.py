import json
import os
from datetime import datetime
from django.core.management.base import BaseCommand
from django.core import serializers
from django.db import transaction
from validator.models import Proxy, PhoneNumber
from phone_number_validator.models import PhonePrefix, Proxy as ValidatorProxy
from client.models import Client


class Command(BaseCommand):
    help = 'Import validator data from JSON files'

    def add_arguments(self, parser):
        parser.add_argument(
            'json_file',
            type=str,
            help='Path to JSON file to import'
        )
        parser.add_argument(
            '--model',
            type=str,
            choices=['proxy', 'phonenumber', 'phoneprefix', 'validatorproxy', 'client'],
            required=True,
            help='Model to import: proxy, phonenumber, phoneprefix, validatorproxy, or client'
        )
        parser.add_argument(
            '--format',
            type=str,
            choices=['django', 'simple'],
            default='simple',
            help='JSON format: django (Django serialized) or simple (default: simple)'
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Clear existing data before import'
        )

    def handle(self, *args, **options):
        json_file = options['json_file']
        model_name = options['model']
        json_format = options['format']
        clear_existing = options['clear_existing']
        
        if not os.path.exists(json_file):
            self.stdout.write(
                self.style.ERROR(f'File not found: {json_file}')
            )
            return
        
        model_mapping = {
            'proxy': Proxy,
            'phonenumber': PhoneNumber,
            'phoneprefix': PhonePrefix,
            'validatorproxy': ValidatorProxy,
            'client': Client
        }
        model_class = model_mapping[model_name]
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            with transaction.atomic():
                if clear_existing:
                    deleted_count = model_class.objects.count()
                    model_class.objects.all().delete()
                    self.stdout.write(
                        self.style.WARNING(f'Deleted {deleted_count} existing {model_name} records')
                    )
                
                if json_format == 'django':
                    self.import_django_format(data, model_class, model_name)
                else:
                    self.import_simple_format(data, model_class, model_name)
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Import failed: {str(e)}')
            )

    def import_django_format(self, data, model_class, model_name):
        """Import Django serialized format"""
        # Convert JSON string back to objects if needed
        if isinstance(data, str):
            objects = serializers.deserialize('json', data)
        else:
            objects = serializers.deserialize('json', json.dumps(data))
        
        imported_count = 0
        for obj in objects:
            obj.save()
            imported_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully imported {imported_count} {model_name} records')
        )

    def import_simple_format(self, data, model_class, model_name):
        """Import simplified JSON format"""
        imported_count = 0
        
        for item in data:
            if model_name == 'proxy':
                obj, created = model_class.objects.get_or_create(
                    ip_address=item['ip_address'],
                    port=item['port'],
                    defaults={
                        'is_active': item.get('is_active', True)
                    }
                )
            elif model_name == 'phonenumber':
                obj, created = model_class.objects.get_or_create(
                    number=item['number'],
                    defaults={
                        'status': item.get('status', 'PENDING'),
                        'carrier': item.get('carrier')
                    }
                )
            elif model_name == 'phoneprefix':
                obj, created = model_class.objects.get_or_create(
                    prefix=item['prefix'],
                    defaults={
                        'carrier': item.get('carrier'),
                        'city': item.get('city'),
                        'state': item.get('state'),
                        'line_type': item.get('line_type')
                    }
                )
            elif model_name == 'validatorproxy':
                obj, created = model_class.objects.get_or_create(
                    ip_address=item['ip_address'],
                    port=item['port'],
                    defaults={
                        'country': item.get('country'),
                        'ssl': item.get('ssl', False),
                        'anonymity': item.get('anonymity'),
                        'valid': item.get('valid', False),
                        'created_at': datetime.fromisoformat(item['created_at']) if item.get('created_at') else None
                    }
                )
            elif model_name == 'client':
                obj, created = model_class.objects.get_or_create(
                    phone=item['phone'],
                    defaults={
                        'full_name': item.get('full_name'),
                        'carrier': item.get('carrier'),
                        'location': item.get('location'),
                        'country': item.get('country'),
                        'created_at': datetime.fromisoformat(item['created_at']) if item.get('created_at') else None
                    }
                )
            
            if created:
                imported_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully imported {imported_count} new {model_name} records')
        )
"""
Management command to load sample phone prefixes for testing
"""
from django.core.management.base import BaseCommand
from phone_number_validator.models import PhonePrefix


class Command(BaseCommand):
    help = 'Load sample phone prefixes for testing phone validation'

    def handle(self, *args, **options):
        """Load sample phone prefixes"""
        
        # Sample phone prefixes for testing
        sample_prefixes = [
            # New York area codes
            {'prefix': '212200', 'carrier': 'Verizon', 'city': 'New York', 'state': 'New York', 'line_type': 'Mobile'},
            {'prefix': '212201', 'carrier': 'AT&T', 'city': 'New York', 'state': 'New York', 'line_type': 'Mobile'},
            {'prefix': '212202', 'carrier': 'T-Mobile', 'city': 'New York', 'state': 'New York', 'line_type': 'Mobile'},
            {'prefix': '212203', 'carrier': 'Sprint', 'city': 'New York', 'state': 'New York', 'line_type': 'Mobile'},
            {'prefix': '212204', 'carrier': 'Verizon', 'city': 'New York', 'state': 'New York', 'line_type': 'Landline'},
            
            # Los Angeles area codes
            {'prefix': '213200', 'carrier': 'Verizon', 'city': 'Los Angeles', 'state': 'California', 'line_type': 'Mobile'},
            {'prefix': '213201', 'carrier': 'AT&T', 'city': 'Los Angeles', 'state': 'California', 'line_type': 'Mobile'},
            {'prefix': '213202', 'carrier': 'T-Mobile', 'city': 'Los Angeles', 'state': 'California', 'line_type': 'Mobile'},
            {'prefix': '213203', 'carrier': 'Sprint', 'city': 'Los Angeles', 'state': 'California', 'line_type': 'Mobile'},
            {'prefix': '213204', 'carrier': 'AT&T', 'city': 'Los Angeles', 'state': 'California', 'line_type': 'Landline'},
            
            # Chicago area codes
            {'prefix': '312200', 'carrier': 'Verizon', 'city': 'Chicago', 'state': 'Illinois', 'line_type': 'Mobile'},
            {'prefix': '312201', 'carrier': 'AT&T', 'city': 'Chicago', 'state': 'Illinois', 'line_type': 'Mobile'},
            {'prefix': '312202', 'carrier': 'T-Mobile', 'city': 'Chicago', 'state': 'Illinois', 'line_type': 'Mobile'},
            {'prefix': '312203', 'carrier': 'Sprint', 'city': 'Chicago', 'state': 'Illinois', 'line_type': 'Mobile'},
            {'prefix': '312204', 'carrier': 'Verizon', 'city': 'Chicago', 'state': 'Illinois', 'line_type': 'Landline'},
            
            # Houston area codes
            {'prefix': '713200', 'carrier': 'Verizon', 'city': 'Houston', 'state': 'Texas', 'line_type': 'Mobile'},
            {'prefix': '713201', 'carrier': 'AT&T', 'city': 'Houston', 'state': 'Texas', 'line_type': 'Mobile'},
            {'prefix': '713202', 'carrier': 'T-Mobile', 'city': 'Houston', 'state': 'Texas', 'line_type': 'Mobile'},
            {'prefix': '713203', 'carrier': 'Sprint', 'city': 'Houston', 'state': 'Texas', 'line_type': 'Mobile'},
            {'prefix': '713204', 'carrier': 'AT&T', 'city': 'Houston', 'state': 'Texas', 'line_type': 'Landline'},
            
            # Miami area codes
            {'prefix': '305200', 'carrier': 'Verizon', 'city': 'Miami', 'state': 'Florida', 'line_type': 'Mobile'},
            {'prefix': '305201', 'carrier': 'AT&T', 'city': 'Miami', 'state': 'Florida', 'line_type': 'Mobile'},
            {'prefix': '305202', 'carrier': 'T-Mobile', 'city': 'Miami', 'state': 'Florida', 'line_type': 'Mobile'},
            {'prefix': '305203', 'carrier': 'Sprint', 'city': 'Miami', 'state': 'Florida', 'line_type': 'Mobile'},
            {'prefix': '305204', 'carrier': 'Verizon', 'city': 'Miami', 'state': 'Florida', 'line_type': 'Landline'},
        ]
        
        created_count = 0
        updated_count = 0
        
        for prefix_data in sample_prefixes:
            prefix_obj, created = PhonePrefix.objects.get_or_create(
                prefix=prefix_data['prefix'],
                defaults=prefix_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created prefix: {prefix_data["prefix"]} - {prefix_data["carrier"]}')
                )
            else:
                # Update existing record
                for key, value in prefix_data.items():
                    setattr(prefix_obj, key, value)
                prefix_obj.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated prefix: {prefix_data["prefix"]} - {prefix_data["carrier"]}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully loaded {created_count} new prefixes and updated {updated_count} existing prefixes'
            )
        )
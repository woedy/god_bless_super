"""
Tests for export and import functionality
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from phone_generator.models import PhoneNumber
from phone_generator.export_utils import export_to_csv, export_to_txt, export_to_json, export_to_doc
from phone_generator.import_utils import parse_csv_import, parse_txt_import, parse_json_import
from projects.models import Project

User = get_user_model()


class ExportUtilsTestCase(TestCase):
    def setUp(self):
        self.test_data = [
            {
                'phone_number': '15551234567',
                'carrier': 'AT&T',
                'type': 'Mobile',
                'area_code': '555',
                'valid_number': True
            },
            {
                'phone_number': '15559876543',
                'carrier': 'Verizon',
                'type': 'Mobile',
                'area_code': '555',
                'valid_number': True
            }
        ]
        self.fields = ['phone_number', 'carrier', 'type', 'area_code', 'valid_number']

    def test_export_to_csv(self):
        """Test CSV export"""
        result = export_to_csv(self.test_data, self.fields)
        self.assertIn('phone_number,carrier,type,area_code,valid_number', result)
        self.assertIn('15551234567', result)
        self.assertIn('AT&T', result)

    def test_export_to_txt(self):
        """Test TXT export"""
        result = export_to_txt(self.test_data, self.fields)
        self.assertIn('phone_number', result)
        self.assertIn('15551234567', result)
        self.assertIn('|', result)  # Column separator

    def test_export_to_json(self):
        """Test JSON export"""
        result = export_to_json(self.test_data, self.fields)
        self.assertIn('"phone_number"', result)
        self.assertIn('15551234567', result)
        self.assertIn('[', result)
        self.assertIn(']', result)

    def test_export_to_doc(self):
        """Test DOC export"""
        result = export_to_doc(self.test_data, self.fields)
        self.assertIn('<table', result)
        self.assertIn('<th', result)
        self.assertIn('15551234567', result)


class ImportUtilsTestCase(TestCase):
    def test_parse_csv_with_headers(self):
        """Test CSV import with headers"""
        csv_content = """phone_number,carrier,type
15551234567,AT&T,Mobile
15559876543,Verizon,Mobile"""
        
        records, errors = parse_csv_import(csv_content)
        
        self.assertEqual(len(records), 2)
        self.assertEqual(len(errors), 0)
        self.assertEqual(records[0]['phone_number'], '15551234567')
        self.assertEqual(records[0]['carrier'], 'AT&T')

    def test_parse_csv_without_headers(self):
        """Test CSV import without headers"""
        csv_content = """15551234567,AT&T,Mobile
15559876543,Verizon,Mobile"""
        
        records, errors = parse_csv_import(csv_content)
        
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]['phone_number'], '15551234567')

    def test_parse_txt_simple(self):
        """Test TXT import with simple format"""
        txt_content = """15551234567
15559876543
15551112222"""
        
        records, errors = parse_txt_import(txt_content)
        
        self.assertEqual(len(records), 3)
        self.assertEqual(len(errors), 0)
        self.assertEqual(records[0]['phone_number'], '15551234567')

    def test_parse_txt_with_metadata(self):
        """Test TXT import with metadata"""
        txt_content = """15551234567,AT&T,Mobile
15559876543,Verizon,Mobile"""
        
        records, errors = parse_txt_import(txt_content)
        
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]['carrier'], 'AT&T')

    def test_parse_json(self):
        """Test JSON import"""
        json_content = """[
            {"phone_number": "15551234567", "carrier": "AT&T", "type": "Mobile"},
            {"phone_number": "15559876543", "carrier": "Verizon", "type": "Mobile"}
        ]"""
        
        records, errors = parse_json_import(json_content)
        
        self.assertEqual(len(records), 2)
        self.assertEqual(len(errors), 0)
        self.assertEqual(records[0]['phone_number'], '15551234567')

    def test_invalid_phone_number(self):
        """Test import with invalid phone number"""
        csv_content = """phone_number,carrier
123,AT&T
15551234567,Verizon"""
        
        records, errors = parse_csv_import(csv_content)
        
        self.assertEqual(len(records), 1)  # Only valid record
        self.assertEqual(len(errors), 1)   # One error for invalid number
        self.assertIn('Invalid phone number', errors[0])

    def test_phone_number_normalization(self):
        """Test phone number normalization"""
        # Test with TXT format (simpler, no CSV header detection issues)
        txt_content = """(555) 123-4567
555-987-6543
5551112222
1-555-333-4444"""
        
        records, errors = parse_txt_import(txt_content)
        
        self.assertEqual(len(records), 4)
        # All should be normalized to 11 digits starting with 1
        expected_numbers = ['15551234567', '15559876543', '15551112222', '15553334444']
        for i, record in enumerate(records):
            self.assertEqual(record['phone_number'], expected_numbers[i])


class ExportImportIntegrationTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.project = Project.objects.create(
            project_name='Test Project',
            user=self.user
        )

    def test_export_import_roundtrip_csv(self):
        """Test exporting and re-importing CSV data"""
        # Create test phone numbers
        PhoneNumber.objects.create(
            user=self.user,
            project=self.project,
            phone_number='15551234567',
            carrier='AT&T',
            type='Mobile',
            area_code='555'
        )
        PhoneNumber.objects.create(
            user=self.user,
            project=self.project,
            phone_number='15559876543',
            carrier='Verizon',
            type='Mobile',
            area_code='555'
        )

        # Export
        queryset = PhoneNumber.objects.filter(user=self.user)
        fields = ['phone_number', 'carrier', 'type', 'area_code']
        csv_content = export_to_csv(list(queryset.values(*fields)), fields)

        # Clear database
        PhoneNumber.objects.all().delete()

        # Import
        records, errors = parse_csv_import(csv_content)
        
        self.assertEqual(len(records), 2)
        self.assertEqual(len(errors), 0)
        
        # Verify data integrity
        self.assertEqual(records[0]['phone_number'], '15551234567')
        self.assertEqual(records[1]['phone_number'], '15559876543')


if __name__ == '__main__':
    import unittest
    unittest.main()

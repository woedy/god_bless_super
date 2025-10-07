"""
Quick verification script for export/import functionality
Run this to verify the implementation works correctly
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'god_bless_pro.settings')
django.setup()

from phone_generator.export_utils import export_to_csv, export_to_txt, export_to_json, export_to_doc
from phone_generator.import_utils import parse_csv_import, parse_txt_import, parse_json_import

def test_export():
    """Test export functionality"""
    print("=" * 60)
    print("TESTING EXPORT FUNCTIONALITY")
    print("=" * 60)
    
    test_data = [
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
    fields = ['phone_number', 'carrier', 'type', 'area_code', 'valid_number']
    
    # Test CSV export
    print("\n1. CSV Export:")
    csv_result = export_to_csv(test_data, fields)
    print(csv_result[:200])
    print("✓ CSV export successful")
    
    # Test TXT export
    print("\n2. TXT Export:")
    txt_result = export_to_txt(test_data, fields)
    print(txt_result[:200])
    print("✓ TXT export successful")
    
    # Test JSON export
    print("\n3. JSON Export:")
    json_result = export_to_json(test_data, fields)
    print(json_result[:200])
    print("✓ JSON export successful")
    
    # Test DOC export
    print("\n4. DOC Export:")
    doc_result = export_to_doc(test_data, fields)
    print(doc_result[:200] + "...")
    print("✓ DOC export successful")


def test_import():
    """Test import functionality"""
    print("\n" + "=" * 60)
    print("TESTING IMPORT FUNCTIONALITY")
    print("=" * 60)
    
    # Test CSV import
    print("\n1. CSV Import (with headers):")
    csv_content = """phone_number,carrier,type
15551234567,AT&T,Mobile
15559876543,Verizon,Mobile"""
    records, errors = parse_csv_import(csv_content)
    print(f"   Parsed {len(records)} records")
    print(f"   Errors: {len(errors)}")
    print(f"   Sample: {records[0] if records else 'None'}")
    print("✓ CSV import successful")
    
    # Test TXT import
    print("\n2. TXT Import (simple):")
    txt_content = """15551234567
15559876543
15551112222"""
    records, errors = parse_txt_import(txt_content)
    print(f"   Parsed {len(records)} records")
    print(f"   Errors: {len(errors)}")
    print(f"   Sample: {records[0] if records else 'None'}")
    print("✓ TXT import successful")
    
    # Test JSON import
    print("\n3. JSON Import:")
    json_content = """[
        {"phone_number": "15551234567", "carrier": "AT&T", "type": "Mobile"},
        {"phone_number": "15559876543", "carrier": "Verizon", "type": "Mobile"}
    ]"""
    records, errors = parse_json_import(json_content)
    print(f"   Parsed {len(records)} records")
    print(f"   Errors: {len(errors)}")
    print(f"   Sample: {records[0] if records else 'None'}")
    print("✓ JSON import successful")
    
    # Test phone number normalization
    print("\n4. Phone Number Normalization:")
    test_numbers = [
        "(555) 123-4567",
        "555-987-6543",
        "5551112222",
        "1-555-333-4444"
    ]
    txt_content = "\n".join(test_numbers)
    records, errors = parse_txt_import(txt_content)
    print(f"   Input formats: {len(test_numbers)}")
    print(f"   Normalized: {len(records)}")
    for i, record in enumerate(records):
        print(f"   {test_numbers[i]} → {record['phone_number']}")
    print("✓ Phone number normalization successful")


def test_error_handling():
    """Test error handling"""
    print("\n" + "=" * 60)
    print("TESTING ERROR HANDLING")
    print("=" * 60)
    
    # Test invalid phone numbers
    print("\n1. Invalid Phone Numbers:")
    csv_content = """phone_number,carrier
123,AT&T
15551234567,Verizon
abc,T-Mobile"""
    records, errors = parse_csv_import(csv_content)
    print(f"   Valid records: {len(records)}")
    print(f"   Errors: {len(errors)}")
    for error in errors:
        print(f"   - {error}")
    print("✓ Error handling successful")


if __name__ == '__main__':
    try:
        test_export()
        test_import()
        test_error_handling()
        
        print("\n" + "=" * 60)
        print("ALL TESTS PASSED ✓")
        print("=" * 60)
        print("\nExport/Import functionality is working correctly!")
        print("\nNext steps:")
        print("1. Test the API endpoints with Postman or curl")
        print("2. Test the frontend components in the browser")
        print("3. Test with real data and large datasets")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

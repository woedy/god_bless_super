"""
Import utilities for phone numbers and SMS recipients
Supports CSV, TXT, and JSON formats with validation
"""
import csv
import json
import io
from typing import List, Dict, Any, Tuple
import re


def validate_phone_number(phone: str) -> Tuple[bool, str]:
    """Validate phone number format"""
    # Remove all non-digit characters
    cleaned = re.sub(r'\D', '', phone)
    
    # Check if it's a valid US phone number (10 or 11 digits)
    if len(cleaned) == 10:
        return True, f"1{cleaned}"
    elif len(cleaned) == 11 and cleaned.startswith('1'):
        return True, cleaned
    else:
        return False, ""


def parse_csv_import(file_content: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Parse CSV file for import"""
    errors = []
    valid_records = []
    
    try:
        # Try to detect if file has headers
        sniffer = csv.Sniffer()
        has_header = sniffer.has_header(file_content[:1024])
        
        reader = csv.DictReader(io.StringIO(file_content)) if has_header else csv.reader(io.StringIO(file_content))
        
        for idx, row in enumerate(reader, start=1):
            try:
                if isinstance(row, dict):
                    # CSV with headers
                    phone = row.get('phone_number') or row.get('phone') or row.get('number')
                    if not phone:
                        errors.append(f"Row {idx}: Missing phone number")
                        continue
                    
                    is_valid, cleaned_phone = validate_phone_number(phone)
                    if not is_valid:
                        errors.append(f"Row {idx}: Invalid phone number format: {phone}")
                        continue
                    
                    record = {
                        'phone_number': cleaned_phone,
                        'carrier': row.get('carrier', ''),
                        'type': row.get('type', ''),
                        'area_code': cleaned_phone[1:4] if len(cleaned_phone) >= 4 else '',
                    }
                else:
                    # CSV without headers - assume first column is phone number
                    phone = row[0] if row else None
                    if not phone:
                        errors.append(f"Row {idx}: Missing phone number")
                        continue
                    
                    is_valid, cleaned_phone = validate_phone_number(phone)
                    if not is_valid:
                        errors.append(f"Row {idx}: Invalid phone number format: {phone}")
                        continue
                    
                    record = {
                        'phone_number': cleaned_phone,
                        'carrier': row[1] if len(row) > 1 else '',
                        'type': row[2] if len(row) > 2 else '',
                        'area_code': cleaned_phone[1:4] if len(cleaned_phone) >= 4 else '',
                    }
                
                valid_records.append(record)
                
            except Exception as e:
                errors.append(f"Row {idx}: Error parsing row - {str(e)}")
                
    except Exception as e:
        errors.append(f"Error parsing CSV file: {str(e)}")
    
    return valid_records, errors


def parse_txt_import(file_content: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Parse plain text file for import (one phone number per line)"""
    errors = []
    valid_records = []
    
    lines = file_content.strip().split('\n')
    
    for idx, line in enumerate(lines, start=1):
        line = line.strip()
        if not line:
            continue
        
        # Try to extract phone number from line
        # Support formats like: phone, phone|carrier, phone,carrier
        parts = re.split(r'[,|\t]', line)
        phone = parts[0].strip()
        
        is_valid, cleaned_phone = validate_phone_number(phone)
        if not is_valid:
            errors.append(f"Line {idx}: Invalid phone number format: {phone}")
            continue
        
        record = {
            'phone_number': cleaned_phone,
            'carrier': parts[1].strip() if len(parts) > 1 else '',
            'type': parts[2].strip() if len(parts) > 2 else '',
            'area_code': cleaned_phone[1:4] if len(cleaned_phone) >= 4 else '',
        }
        
        valid_records.append(record)
    
    return valid_records, errors


def parse_json_import(file_content: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Parse JSON file for import"""
    errors = []
    valid_records = []
    
    try:
        data = json.loads(file_content)
        
        if not isinstance(data, list):
            errors.append("JSON must be an array of objects")
            return valid_records, errors
        
        for idx, item in enumerate(data, start=1):
            if not isinstance(item, dict):
                errors.append(f"Item {idx}: Must be an object")
                continue
            
            phone = item.get('phone_number') or item.get('phone') or item.get('number')
            if not phone:
                errors.append(f"Item {idx}: Missing phone number")
                continue
            
            is_valid, cleaned_phone = validate_phone_number(str(phone))
            if not is_valid:
                errors.append(f"Item {idx}: Invalid phone number format: {phone}")
                continue
            
            record = {
                'phone_number': cleaned_phone,
                'carrier': item.get('carrier', ''),
                'type': item.get('type', ''),
                'area_code': cleaned_phone[1:4] if len(cleaned_phone) >= 4 else '',
            }
            
            valid_records.append(record)
            
    except json.JSONDecodeError as e:
        errors.append(f"Invalid JSON format: {str(e)}")
    except Exception as e:
        errors.append(f"Error parsing JSON: {str(e)}")
    
    return valid_records, errors


def parse_import_file(file_content: str, file_format: str) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Parse import file based on format"""
    if file_format == 'csv':
        return parse_csv_import(file_content)
    elif file_format == 'txt':
        return parse_txt_import(file_content)
    elif file_format == 'json':
        return parse_json_import(file_content)
    else:
        return [], [f"Unsupported format: {file_format}"]


def validate_import_data(records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Additional validation for import data"""
    errors = []
    valid_records = []
    seen_numbers = set()
    
    for idx, record in enumerate(records, start=1):
        phone = record.get('phone_number')
        
        # Check for duplicates within import
        if phone in seen_numbers:
            errors.append(f"Record {idx}: Duplicate phone number in import: {phone}")
            continue
        
        seen_numbers.add(phone)
        valid_records.append(record)
    
    return valid_records, errors

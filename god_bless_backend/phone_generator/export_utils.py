"""
Export utilities for phone numbers and SMS data
Supports CSV, TXT, JSON, and DOC formats
"""
import csv
import json
import io
from typing import List, Dict, Any
from django.http import HttpResponse


def export_to_csv(data: List[Dict[str, Any]], fields: List[str]) -> str:
    """Export data to CSV format"""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    writer.writerows(data)
    return output.getvalue()


def export_to_txt(data: List[Dict[str, Any]], fields: List[str]) -> str:
    """Export data to plain text format"""
    if not data:
        return ""
    
    # Calculate column widths
    widths = {}
    for field in fields:
        widths[field] = max(
            len(field),
            max(len(str(row.get(field, ''))) for row in data)
        ) + 2
    
    # Create header
    header = ' | '.join(field.ljust(widths[field]) for field in fields)
    separator = '-+-'.join('-' * widths[field] for field in fields)
    
    # Create rows
    rows = []
    for row in data:
        row_str = ' | '.join(str(row.get(field, '')).ljust(widths[field]) for field in fields)
        rows.append(row_str)
    
    return '\n'.join([header, separator] + rows)


def export_to_json(data: List[Dict[str, Any]], fields: List[str]) -> str:
    """Export data to JSON format"""
    # Filter to only include specified fields
    filtered_data = [
        {field: row.get(field) for field in fields}
        for row in data
    ]
    return json.dumps(filtered_data, indent=2, default=str)


def export_to_doc(data: List[Dict[str, Any]], fields: List[str]) -> str:
    """Export data to DOC format (HTML-based Word document)"""
    # Create HTML table
    header = '<tr>' + ''.join(
        f'<th style="border: 1px solid black; padding: 8px; background-color: #f0f0f0;">{field}</th>'
        for field in fields
    ) + '</tr>'
    
    rows = []
    for row in data:
        row_html = '<tr>' + ''.join(
            f'<td style="border: 1px solid black; padding: 8px;">{row.get(field, "")}</td>'
            for field in fields
        ) + '</tr>'
        rows.append(row_html)
    
    html = f"""
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Export</title>
      </head>
      <body>
        <table style="border-collapse: collapse; width: 100%;">
          <thead>{header}</thead>
          <tbody>{''.join(rows)}</tbody>
        </table>
      </body>
    </html>
    """
    return html


def create_export_response(content: str, format: str, filename: str) -> HttpResponse:
    """Create HTTP response for file download"""
    content_types = {
        'csv': 'text/csv',
        'txt': 'text/plain',
        'json': 'application/json',
        'doc': 'application/msword',
    }
    
    response = HttpResponse(content, content_type=content_types.get(format, 'text/plain'))
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


def export_phone_numbers(queryset, format: str, fields: List[str] = None) -> str:
    """Export phone numbers in specified format"""
    if fields is None:
        fields = ['phone_number', 'carrier', 'type', 'area_code', 'valid_number', 'created_at']
    
    # Convert queryset to list of dicts
    data = list(queryset.values(*fields))
    
    # Convert datetime and date objects to strings
    import datetime
    for row in data:
        for key, value in row.items():
            if isinstance(value, datetime.datetime):
                row[key] = value.isoformat()
            elif isinstance(value, datetime.date):
                row[key] = value.isoformat()
            elif value is None:
                row[key] = ''
    
    if format == 'csv':
        return export_to_csv(data, fields)
    elif format == 'txt':
        return export_to_txt(data, fields)
    elif format == 'json':
        return export_to_json(data, fields)
    elif format == 'doc':
        return export_to_doc(data, fields)
    else:
        raise ValueError(f"Unsupported format: {format}")

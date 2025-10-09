# Export/Import Quick Reference Guide

## Quick Start

### Backend API Endpoints

#### Export Phone Numbers
```bash
curl -X POST http://localhost:6161/api/phone-generator/export/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "user_id=123" \
  -F "project_id=456" \
  -F "format=csv" \
  -F "filters={\"carrier\":\"AT&T\",\"type\":\"Mobile\"}"
```

#### Import Phone Numbers
```bash
curl -X POST http://localhost:6161/api/phone-generator/import/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "user_id=123" \
  -F "project_id=456" \
  -F "format=csv" \
  -F "file=@phone_numbers.csv" \
  -F "validate_on_import=true"
```

#### Import SMS Recipients
```bash
curl -X POST http://localhost:6161/api/phone-generator/import-sms-recipients/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "user_id=123" \
  -F "campaign_id=789" \
  -F "format=csv" \
  -F "file=@recipients.csv"
```

### Frontend Usage

#### Basic DataTable with Export/Import
```tsx
import { DataTable } from '@/components/DataTable';
import { exportPhoneNumbers, importPhoneNumbers } from '@/common/exportImportApi';

function MyComponent() {
  const handleExport = async (format, filteredData) => {
    const result = await exportPhoneNumbers({
      user_id: user.user_id,
      project_id: project.id,
      format: format,
      filters: currentFilters
    }, token);
    
    if (result instanceof Blob) {
      downloadBlob(result, `export.${format}`);
    } else if (result.data?.task_id) {
      toast.success('Export started!');
    }
  };

  const handleImport = async (file, format, options) => {
    const result = await importPhoneNumbers({
      user_id: user.user_id,
      project_id: project.id,
      format: format,
      file: file,
      validate_on_import: options?.validateOnImport
    }, token);
    
    if (result.data?.task_id) {
      toast.success('Import started!');
    }
  };

  return (
    <DataTable
      data={data}
      columns={columns}
      onExport={handleExport}
      onImport={handleImport}
      enableExport={true}
      enableImport={true}
    />
  );
}
```

#### Standalone Import Modal
```tsx
import { ImportModal } from '@/components/DataTable';

function MyComponent() {
  const [showImport, setShowImport] = useState(false);

  return (
    <>
      <button onClick={() => setShowImport(true)}>
        Import Data
      </button>
      
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        showValidationOption={true}
      />
    </>
  );
}
```

## File Format Templates

### CSV Template
```csv
phone_number,carrier,type,area_code
15551234567,AT&T,Mobile,555
15559876543,Verizon,Mobile,555
```

### TXT Template (Simple)
```
15551234567
15559876543
15551112222
```

### TXT Template (With Metadata)
```
15551234567,AT&T,Mobile
15559876543,Verizon,Mobile
```

### JSON Template
```json
[
  {
    "phone_number": "15551234567",
    "carrier": "AT&T",
    "type": "Mobile",
    "area_code": "555"
  },
  {
    "phone_number": "15559876543",
    "carrier": "Verizon",
    "type": "Mobile",
    "area_code": "555"
  }
]
```

## Phone Number Formats Supported

All these formats are automatically normalized to `15551234567`:
- `(555) 123-4567`
- `555-123-4567`
- `5551234567`
- `1-555-123-4567`
- `15551234567`

## Common Tasks

### Export Filtered Data
```tsx
// Apply filters first
setFilters({ carrier: 'AT&T', type: 'Mobile' });

// Then export
handleExport('csv', filteredData);
```

### Import with Validation
```tsx
// Enable validation option in import
const options = { validateOnImport: true };
handleImport(file, 'csv', options);
```

### Track Import/Export Progress
```tsx
import { useTaskWebSocket } from '@/hooks/useTaskWebSocket';

function MyComponent() {
  const { taskStatus, progress } = useTaskWebSocket(user.user_id);
  
  useEffect(() => {
    if (taskStatus === 'SUCCESS') {
      toast.success('Operation completed!');
      refreshData();
    }
  }, [taskStatus]);
  
  return (
    <div>
      {progress > 0 && progress < 100 && (
        <ProgressBar value={progress} />
      )}
    </div>
  );
}
```

## Error Handling

### Backend Error Response
```json
{
  "message": "Errors",
  "errors": {
    "file": ["File is required."],
    "format": ["Invalid format. Must be csv, txt, or json."]
  }
}
```

### Import Result with Errors
```json
{
  "success": true,
  "imported": 95,
  "duplicates_skipped": 5,
  "parse_errors": [
    "Row 3: Invalid phone number format: 123",
    "Row 7: Missing phone number"
  ],
  "validation_errors": [
    "Record 15: Duplicate phone number in import: 15551234567"
  ]
}
```

## Performance Tips

1. **Large Exports**: Set `use_background=true` for datasets > 10,000
2. **Batch Imports**: Split large files into chunks of 50,000 records
3. **Validation**: Only enable validation when necessary (adds processing time)
4. **Filters**: Apply filters before export to reduce dataset size
5. **Format Selection**: Use CSV for best performance, JSON for complex data

## Testing

### Run Backend Tests
```bash
cd god_bless_backend
.\.venv\Scripts\Activate.ps1
python manage.py test phone_generator.test_export_import
```

### Run Verification Script
```bash
cd god_bless_backend
.\.venv\Scripts\Activate.ps1
python verify_export_import.py
```

## Troubleshooting

### Import Fails
- Check file format matches selected format
- Ensure phone numbers are valid (10 or 11 digits)
- Verify CSV has proper headers if using CSV format

### Export Takes Too Long
- Use background processing for large datasets
- Apply filters to reduce dataset size
- Check Celery workers are running

### Duplicates Not Detected
- Ensure phone numbers are in consistent format
- Check that numbers include country code (1 for US)

## API Response Examples

### Successful Export (Background)
```json
{
  "message": "Export task started",
  "data": {
    "task_id": "abc-123-def-456",
    "total_records": 50000,
    "message": "Export started in background. Use task_id to track progress."
  }
}
```

### Successful Import
```json
{
  "message": "Import task started",
  "data": {
    "task_id": "xyz-789-abc-012",
    "message": "Import started in background. Use task_id to track progress."
  }
}
```

### Task Progress
```json
{
  "message": "Successful",
  "data": {
    "task_id": "abc-123-def-456",
    "status": "PROGRESS",
    "progress": 65,
    "current_step": "Imported 32500/50000 records",
    "processed_items": 32500,
    "total_items": 50000
  }
}
```

### Task Completed
```json
{
  "message": "Successful",
  "data": {
    "task_id": "abc-123-def-456",
    "status": "SUCCESS",
    "progress": 100,
    "result_data": {
      "file_path": "exports/phone_numbers_20240104_153045.csv",
      "file_url": "/media/exports/phone_numbers_20240104_153045.csv",
      "total_records": 50000,
      "format": "csv",
      "filename": "phone_numbers_20240104_153045.csv"
    }
  }
}
```

## Support

For detailed documentation, see:
- `EXPORT_IMPORT_GUIDE.md` - Comprehensive guide
- `TASK_17_EXPORT_IMPORT_IMPLEMENTATION.md` - Technical details
- `TASK_17_COMPLETION_SUMMARY.md` - Implementation summary

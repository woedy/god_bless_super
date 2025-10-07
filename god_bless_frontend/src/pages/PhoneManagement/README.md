# Phone Management Pages - Implementation Guide

This directory contains the redesigned phone number management pages with modern UI, real-time progress tracking, and advanced filtering capabilities.

## Pages Overview

### 1. GenerateNumbersPage.tsx
Modern phone number generation page with real-time progress tracking.

**Features:**
- Clean, modern form interface
- Real-time progress tracking via WebSocket
- Polling fallback for progress updates
- Configurable batch sizes
- Auto-validation option
- Task cancellation support
- Responsive design

**Key Components:**
- Area code and quantity input with validation
- Batch size selector (500, 1000, 2000, 5000)
- Auto-validate checkbox
- Real-time progress bar
- Status indicators
- Estimated completion time

**WebSocket Integration:**
```typescript
ws://localhost:6161/ws/tasks/${userID}/
```

**API Endpoints:**
- `POST /api/phone-generator/generate-numbers-config/` - Start generation
- `GET /api/phone-generator/tasks/${taskId}/progress/` - Poll progress
- `POST /api/phone-generator/tasks/${taskId}/cancel/` - Cancel task

---

### 2. AllNumbersPage.tsx
Enhanced phone numbers listing page with DataTable component integration.

**Features:**
- Advanced filtering (search, status, type)
- Server-side pagination
- Bulk selection and deletion
- Single number validation
- Bulk validation support
- Export to CSV/JSON (filtered results)
- Real-time data refresh
- Responsive table layout

**Key Components:**
- DataTable with custom columns
- Filter panel (search, validation status, type)
- Bulk action buttons
- Export functionality
- Pagination controls

**Columns:**
- Checkbox (selection)
- Phone Number
- Status (Valid/Invalid/Pending)
- Carrier
- Location
- Type
- Country
- Actions (Validate, Delete)

**API Endpoints:**
- `GET /api/phone-generator/list-numbers/` - Fetch numbers
- `POST /api/phone-generator/delete-numbers/` - Delete numbers
- `GET /api/phone-generator/clear-numbers/` - Clear invalid numbers
- `POST /api/phone-validator/start-validation-free/` - Start validation

---

### 3. ValidateNumbersPage.tsx
Redesigned validation page with single and batch validation support.

**Features:**
- Single number validation
- Batch validation with provider selection
- Real-time progress tracking
- WebSocket integration
- Polling fallback
- Detailed validation results
- Task cancellation support

**Validation Providers:**
1. **Free Validation** - Basic validation using internal library
2. **Abstract API** - Advanced validation with carrier info
3. **IPQuality Score** - Premium validation with quality scoring

**Single Validation:**
- Input: 11-digit phone number (e.g., 14155091612)
- Real-time validation
- Detailed result display (status, carrier, location, type, country)

**Batch Validation:**
- Provider selection
- Background processing
- Real-time progress tracking
- Estimated completion time
- Task cancellation

**API Endpoints:**
- `POST /api/phone-validator/validate-number/` - Single validation
- `POST /api/phone-validator/start-validation-free/` - Free batch validation
- `POST /api/phone-validator/start-validation/` - Abstract API validation
- `POST /api/phone-validator/start-validation-quality/` - IPQuality validation
- `GET /api/phone-generator/tasks/${taskId}/progress/` - Poll progress
- `POST /api/phone-generator/tasks/${taskId}/cancel/` - Cancel task

---

## Common Features

### Real-Time Progress Tracking

All pages support real-time progress tracking via WebSocket with polling fallback:

```typescript
// WebSocket connection
const websocket = new WebSocket(`ws://localhost:6161/ws/tasks/${userID}/`);

websocket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  // Handle different message types
  if (message.type === 'task_progress') {
    // Update progress
  } else if (message.type === 'task_completed') {
    // Handle completion
  } else if (message.type === 'task_failed') {
    // Handle failure
  }
};

// Polling fallback
const pollInterval = setInterval(async () => {
  const response = await fetch(
    `${baseUrl}api/phone-generator/tasks/${taskId}/progress/?user_id=${userID}`
  );
  const data = await response.json();
  // Update progress
}, 3000);
```

### Toast Notifications

All pages use `react-hot-toast` for user feedback:

```typescript
import toast from 'react-hot-toast';

toast.success('Operation completed successfully');
toast.error('Operation failed');
toast.info('Processing...');
```

### Form Validation

Client-side validation with error display:

```typescript
const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};
  
  if (!areaCode) {
    newErrors.areaCode = 'Area code is required';
  } else if (!/^\d{3}$/.test(areaCode)) {
    newErrors.areaCode = 'Area code must be exactly 3 digits';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

---

## DataTable Integration

The AllNumbersPage uses the DataTable component for advanced data management:

### Column Configuration

```typescript
const columns: Column<PhoneNumber>[] = [
  {
    key: 'phone_number',
    label: 'Phone Number',
    sortable: true,
    width: '180px',
  },
  {
    key: 'valid_number',
    label: 'Status',
    sortable: true,
    width: '120px',
    render: (value) => {
      // Custom rendering logic
    },
  },
  // ... more columns
];
```

### Filter Configuration

```typescript
const filters: Filter[] = [
  {
    key: 'search',
    label: 'Search',
    type: 'text',
    placeholder: 'Search phone numbers...',
  },
  {
    key: 'valid_number',
    label: 'Validation Status',
    type: 'select',
    options: [
      { label: 'All', value: '' },
      { label: 'Valid', value: 'true' },
      { label: 'Invalid', value: 'false' },
    ],
  },
];
```

### Export Functionality

```typescript
const handleExport = (format: 'csv' | 'json', filteredData: PhoneNumber[]) => {
  const exportData = filteredData.map((row) => ({
    'Phone Number': row.phone_number,
    Status: row.valid_number === null ? 'Pending' : row.valid_number ? 'Valid' : 'Invalid',
    Carrier: row.carrier || '',
    // ... more fields
  }));

  if (format === 'csv') {
    exportToCSV(exportData, 'phone-numbers');
  } else {
    exportToJSON(exportData, 'phone-numbers');
  }
};
```

---

## Styling

All pages use Tailwind CSS with the TailAdmin theme:

### Color Classes
- `bg-primary` - Primary blue color
- `bg-meta-1` - Red (errors, invalid)
- `bg-meta-3` - Green (success, valid)
- `bg-meta-4` - Dark background
- `text-gray` - Light text
- `border-stroke` - Border color

### Dark Mode Support
All components support dark mode with `dark:` prefixes:

```typescript
className="bg-white dark:bg-boxdark text-black dark:text-white"
```

---

## Usage Examples

### Generate Numbers

```typescript
// Navigate to generation page
navigate('/generate-numbers');

// Or use the button in AllNumbersPage
<button onClick={() => navigate('/generate-numbers')}>
  Generate Numbers
</button>
```

### Validate Numbers

```typescript
// Single validation
const handleSingleValidation = async (phoneNumber: string) => {
  const response = await fetch(
    `${baseUrl}api/phone-validator/validate-number/`,
    {
      method: 'POST',
      body: formData,
    }
  );
};

// Batch validation
const handleBatchValidation = async () => {
  const response = await fetch(
    `${baseUrl}api/phone-validator/start-validation-free/`,
    {
      method: 'POST',
      body: JSON.stringify({ user_id, project_id }),
    }
  );
};
```

### Export Data

```typescript
// Export filtered results
const handleExport = (format: 'csv' | 'json') => {
  const filteredData = data.filter(/* filter logic */);
  
  if (format === 'csv') {
    exportToCSV(filteredData, 'phone-numbers');
  } else {
    exportToJSON(filteredData, 'phone-numbers');
  }
};
```

---

## Error Handling

All pages implement comprehensive error handling:

```typescript
try {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const data = await response.json();
    if (data.errors) {
      // Handle validation errors
      setErrors(data.errors);
    }
    toast.error('Operation failed');
    return;
  }
  
  // Handle success
  toast.success('Operation completed');
} catch (error) {
  console.error('Error:', error);
  toast.error('An unexpected error occurred');
}
```

---

## Performance Considerations

### Batch Sizes
- **500**: Slower, more stable (recommended for low-resource environments)
- **1000**: Balanced (default)
- **2000**: Faster (recommended for most cases)
- **5000**: Fastest, high load (use with caution)

### Pagination
- Default page size: 50 items
- Configurable: 10, 25, 50, 100 items per page
- Server-side pagination for large datasets

### WebSocket vs Polling
- WebSocket: Real-time updates, lower server load
- Polling: Fallback mechanism, 3-second intervals
- Automatic fallback if WebSocket fails

---

## Testing

### Manual Testing Checklist

**GenerateNumbersPage:**
- [ ] Form validation works correctly
- [ ] Generation starts successfully
- [ ] Progress updates in real-time
- [ ] Task can be cancelled
- [ ] Redirects to AllNumbers on completion
- [ ] Error handling works

**AllNumbersPage:**
- [ ] Data loads correctly
- [ ] Filters work (search, status, type)
- [ ] Pagination works
- [ ] Selection works (single and bulk)
- [ ] Delete works (single and bulk)
- [ ] Export works (CSV and JSON)
- [ ] Validation buttons work

**ValidateNumbersPage:**
- [ ] Single validation works
- [ ] Batch validation starts
- [ ] Progress updates in real-time
- [ ] Provider selection works
- [ ] Task can be cancelled
- [ ] Results display correctly

---

## Troubleshooting

### WebSocket Connection Issues
If WebSocket fails to connect:
1. Check if backend WebSocket server is running
2. Verify WebSocket URL is correct
3. Check browser console for errors
4. Polling fallback should activate automatically

### Progress Not Updating
1. Check WebSocket connection status
2. Verify task_id is correct
3. Check backend task is running
4. Verify user_id matches

### Export Not Working
1. Check if data is loaded
2. Verify export utilities are imported
3. Check browser console for errors
4. Ensure filtered data is not empty

---

## Future Enhancements

1. **Advanced Filters**
   - Date range filtering
   - Carrier filtering
   - Location filtering
   - Custom filter combinations

2. **Bulk Operations**
   - Bulk edit
   - Bulk export with custom fields
   - Bulk validation with custom providers

3. **Analytics**
   - Validation success rate charts
   - Carrier distribution charts
   - Type distribution charts
   - Historical trends

4. **Notifications**
   - Email notifications on completion
   - Browser notifications
   - SMS notifications

5. **Scheduling**
   - Schedule generation tasks
   - Schedule validation tasks
   - Recurring tasks

---

## Dependencies

- React 18+
- React Router DOM
- Tailwind CSS
- React Hot Toast
- React Icons (FiLoader, FiCheckCircle, etc.)
- DataTable component (custom)

---

## Support

For issues or questions:
1. Check this documentation
2. Review the API Quick Reference
3. Check browser console for errors
4. Review backend logs
5. Contact development team

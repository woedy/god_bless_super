# Mobile/Landline Export Filter Fix

## Problem
The export functionality was not properly filtering phone numbers by mobile/landline types based on the current filter state. Users could not export only mobile numbers or only landline numbers.

## Solution
Updated both frontend and backend components to properly handle line type filtering during export.

### Backend Changes

#### 1. Updated `export_phone_numbers_view` in `god_bless_backend/phone_generator/api/views.py`
- Added proper handling of the `type` filter for mobile/landline filtering
- Ensured filter consistency between list view and export view

#### 2. Updated `export_phone_numbers_task` in `god_bless_backend/phone_generator/tasks.py`
- Added Q import for complex queries
- Updated filter handling to match the export view
- Added support for all filter types including line type filtering

### Frontend Changes

#### 1. Updated `phoneNumbers.ts` service
- Added proper mapping of `lineType` filter to backend `type` parameter
- Added debug logging to track filter mapping

#### 2. Updated `NumberListPage.tsx`
- Added `availableLineTypes` prop to FilterPanel with mobile/landline options

#### 3. Updated `ExportDialog.tsx`
- Added visual indicators for active filters
- Added specific display for line type filters (📱 Mobile, 🏠 Landline)
- Added active filters summary card

## How It Works

1. **Filter Selection**: User selects line type filter in the FilterPanel (mobile, landline, or both)
2. **Filter State**: The filter state is maintained in the NumberListPage component
3. **Export Trigger**: When user clicks "Export Numbers", the current filter state is passed to ExportDialog
4. **Filter Mapping**: Frontend service maps `lineType` to backend `type` parameter
5. **Backend Filtering**: Backend applies the type filter to the queryset before export
6. **Export Generation**: Only numbers matching the filter criteria are included in the export

## Filter Mapping

| Frontend Filter | Backend Parameter | Description |
|----------------|-------------------|-------------|
| `lineType: 'mobile'` | `type: 'mobile'` | Export only mobile numbers |
| `lineType: 'landline'` | `type: 'landline'` | Export only landline numbers |
| `lineType: undefined` | No type filter | Export all line types |

## Testing

### Manual Testing
1. Open the phone numbers list page
2. Apply line type filter (mobile or landline)
3. Click "Export Numbers"
4. Verify the export contains only the filtered line type

### Automated Testing
Use the provided test scripts:
- `test-export-mobile-landline-complete.js` - Comprehensive backend API testing
- `test-frontend-export-filters.html` - Frontend filter testing interface

### Test Scenarios
1. **Mobile Only**: Filter by mobile, export should contain only mobile numbers
2. **Landline Only**: Filter by landline, export should contain only landline numbers
3. **Both Types**: No line type filter, export should contain both mobile and landline
4. **Combined Filters**: Line type + carrier/validation status filters

## Verification

To verify the fix is working:

1. **Check Export Content**: Exported files should only contain numbers matching the filter
2. **Check Line Type Column**: CSV exports should show correct line types in the 'type' column
3. **Check Record Count**: Export record count should match filtered list count
4. **Check UI Indicators**: Export dialog should show active filter badges

## Files Modified

### Backend
- `god_bless_backend/phone_generator/api/views.py` - Export view filter handling
- `god_bless_backend/phone_generator/tasks.py` - Background export task filters

### Frontend
- `god_bless_platform/src/services/phoneNumbers.ts` - Filter mapping
- `god_bless_platform/src/pages/phone-numbers/NumberListPage.tsx` - Available line types
- `god_bless_platform/src/components/phone-numbers/ExportDialog.tsx` - Filter display

### Test Files
- `test-export-mobile-landline-complete.js` - Backend API tests
- `test-frontend-export-filters.html` - Frontend testing interface
- `test-export-with-filters.js` - Basic export filter tests

## Usage

After applying this fix, users can:

1. **Filter by Mobile**: Select "Mobile" in line type filter, export will contain only mobile numbers
2. **Filter by Landline**: Select "Landline" in line type filter, export will contain only landline numbers
3. **Export All**: Leave line type filter empty, export will contain both mobile and landline numbers
4. **Combine Filters**: Use line type filter with other filters (carrier, validation status, etc.)

The export dialog will clearly show which filters are active, and the exported file will only contain numbers matching those filters.
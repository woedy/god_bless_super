# Phone Numbers Page - Recent Numbers Section Fix

## Issue Fixed
The "Recent Numbers" section on the Phone Numbers page was displaying hardcoded dummy data instead of real phone numbers from the database.

## Changes Made

### 1. **Added Real Data Fetching**
```typescript
// Added new imports
import { phoneNumberService } from '../../services'
import type { PhoneNumber } from '../../types'

// Added new state variables
const [recentNumbers, setRecentNumbers] = useState<PhoneNumber[]>([])
const [isLoadingNumbers, setIsLoadingNumbers] = useState<boolean>(false)
```

### 2. **Implemented API Call Function**
```typescript
const loadRecentNumbers = async (projectId: string) => {
  try {
    setIsLoadingNumbers(true)
    const response = await phoneNumberService.getNumbers({
      projectId,
      page: 1,
      pageSize: 5, // Only get 5 recent numbers
      sortBy: 'created_at',
      sortOrder: 'desc'
    })
    
    if (response.success) {
      setRecentNumbers(response.data.results || [])
    } else {
      setRecentNumbers([])
    }
  } catch (err) {
    console.error('Failed to load recent numbers:', err)
    setRecentNumbers([])
  } finally {
    setIsLoadingNumbers(false)
  }
}
```

### 3. **Added Automatic Loading**
```typescript
// Load recent numbers when project changes
useEffect(() => {
  if (selectedProject) {
    loadRecentNumbers(selectedProject)
  } else {
    setRecentNumbers([])
  }
}, [selectedProject])
```

### 4. **Enhanced Phone Number Formatting**
```typescript
const formatPhoneNumber = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const areaCode = cleaned.slice(1, 4)
    const exchange = cleaned.slice(4, 7)
    const number = cleaned.slice(7)
    return `+1 (${areaCode}) ${exchange}-${number}`
  }
  
  if (cleaned.length === 10) {
    const areaCode = cleaned.slice(0, 3)
    const exchange = cleaned.slice(3, 6)
    const number = cleaned.slice(6)
    return `+1 (${areaCode}) ${exchange}-${number}`
  }
  
  return phoneNumber
}
```

### 5. **Added Relative Time Formatting**
```typescript
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes} min ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  } else {
    return date.toLocaleDateString()
  }
}
```

### 6. **Replaced Hardcoded Table with Dynamic Content**

**Before (Dummy Data):**
```typescript
<tbody className="bg-white divide-y divide-gray-200">
  <tr>
    <td>+1 (555) 123-4567</td>
    <td>Verizon</td>
    <td><span className="...">Valid</span></td>
    <td>Project Alpha</td>
    <td>2 hours ago</td>
  </tr>
  // ... more hardcoded rows
</tbody>
```

**After (Real Data):**
```typescript
{isLoadingNumbers ? (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-500">Loading recent numbers...</span>
  </div>
) : !selectedProject ? (
  <div className="text-center py-8">
    <p className="text-gray-500">Select a project to view recent numbers</p>
  </div>
) : recentNumbers.length === 0 ? (
  <div className="text-center py-8">
    <p className="text-gray-500 mb-4">No phone numbers found for this project</p>
    <Button onClick={() => handleActionClick('generate')} size="sm">
      Generate Numbers
    </Button>
  </div>
) : (
  <table className="w-full">
    <tbody className="bg-white divide-y divide-gray-200">
      {recentNumbers.map((number) => (
        <tr key={number.id}>
          <td>{formatPhoneNumber(number.phone_number || number.number || '')}</td>
          <td>{number.carrier || 'Unknown'}</td>
          <td>
            <span className={`px-2 py-1 text-xs rounded-full ${
              number.valid_number || number.isValid
                ? 'bg-green-100 text-green-800'
                : number.validation_attempted
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {number.valid_number || number.isValid
                ? 'Valid'
                : number.validation_attempted
                ? 'Invalid'
                : 'Pending'}
            </span>
          </td>
          <td>{number.area_code || 'N/A'}</td>
          <td>{number.created_at ? formatRelativeTime(number.created_at) : 'Unknown'}</td>
        </tr>
      ))}
    </tbody>
  </table>
)}
```

## Key Improvements

### ✅ **Real Data Integration**
- Fetches actual phone numbers from the database
- Shows the 5 most recent numbers for the selected project
- Updates automatically when project selection changes

### ✅ **Better User Experience**
- Loading states while fetching data
- Empty states with helpful messages
- Call-to-action buttons when no data exists

### ✅ **Enhanced Data Display**
- Properly formatted phone numbers: `+1 (555) 123-4567`
- Relative time formatting: "2 hours ago", "3 days ago"
- Dynamic status badges based on validation state
- Area code display instead of project name (more relevant)

### ✅ **Robust Error Handling**
- Graceful handling of API failures
- Fallback to empty state if data can't be loaded
- Console logging for debugging

### ✅ **Performance Optimized**
- Only loads 5 recent numbers (not all numbers)
- Sorted by creation date (most recent first)
- Efficient re-loading when project changes

## Expected Behavior Now

### ✅ **When No Project Selected**
- Shows message: "Select a project to view recent numbers"

### ✅ **When Project Selected (Loading)**
- Shows loading spinner with "Loading recent numbers..." message

### ✅ **When Project Has Numbers**
- Displays table with 5 most recent phone numbers
- Shows formatted phone numbers, carrier, validation status, area code, and relative time
- "View All" button navigates to full numbers list

### ✅ **When Project Has No Numbers**
- Shows message: "No phone numbers found for this project"
- Provides "Generate Numbers" button to create numbers

## Files Modified

**`god_bless_platform/src/pages/phone-numbers/PhoneNumbersPage.tsx`**
- Added real data fetching functionality
- Replaced hardcoded table with dynamic content
- Added phone number and time formatting helpers
- Enhanced user experience with loading and empty states

The Recent Numbers section now displays real, up-to-date phone number data from your database instead of dummy data!
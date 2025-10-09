# ValidateNumbersPage Refactoring - Manual Test Guide

This guide provides step-by-step instructions for manually testing the ValidateNumbersPage refactoring to ensure all requirements are met.

## Prerequisites

1. Backend server running on `http://localhost:6161`
2. Frontend development server running
3. Valid user authentication token
4. Some phone numbers in the database (for batch validation)

## Test Scenarios

### 1. Single Number Validation

#### Test 1.1: Valid Number Validation
**Steps:**
1. Navigate to `/validate-number`
2. Enter a valid 11-digit phone number (e.g., `14155091612`)
3. Click "Validate" button

**Expected Results:**
- ✅ Loading spinner appears on button
- ✅ Success toast notification appears
- ✅ Validation result card displays below the form
- ✅ Result shows: Status (Valid/Invalid), Phone, Carrier, Location, Type, Country
- ✅ No console errors

#### Test 1.2: Invalid Format Validation
**Steps:**
1. Navigate to `/validate-number`
2. Enter an invalid phone number (e.g., `123`)
3. Click "Validate" button

**Expected Results:**
- ✅ Error message appears: "Phone number must be exactly 11 digits"
- ✅ No API call is made
- ✅ Form remains enabled
- ✅ No console errors

#### Test 1.3: Empty Input Validation
**Steps:**
1. Navigate to `/validate-number`
2. Leave phone number field empty
3. Click "Validate" button

**Expected Results:**
- ✅ Error message appears: "Phone number is required"
- ✅ No API call is made
- ✅ Form remains enabled
- ✅ No console errors

#### Test 1.4: Clear Functionality
**Steps:**
1. Enter a phone number and validate it
2. Click "Clear" button

**Expected Results:**
- ✅ Input field is cleared
- ✅ Validation result is hidden
- ✅ Error messages are cleared
- ✅ No console errors

---

### 2. Batch Validation

#### Test 2.1: Start Batch Validation (Free Provider)
**Steps:**
1. Navigate to `/validate-number`
2. Ensure "Free Validation (Basic)" is selected
3. Click "Start Batch Validation" button
4. Confirm the dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Success toast: "Batch validation started!"
- ✅ Button changes to "Starting..." with spinner
- ✅ TaskProgressCard appears below
- ✅ No console errors

#### Test 2.2: Change Validation Provider
**Steps:**
1. Navigate to `/validate-number`
2. Click on the "Validation Provider" dropdown
3. Select "Abstract API (Advanced)"
4. Verify description changes
5. Select "IPQuality Score (Premium)"
6. Verify description changes

**Expected Results:**
- ✅ Dropdown shows all three options
- ✅ Description text updates for each provider
- ✅ Selection persists until changed
- ✅ No console errors

#### Test 2.3: Batch Validation with Different Providers
**Steps:**
1. Select "Abstract API (Advanced)"
2. Start batch validation
3. Verify correct endpoint is called

**Expected Results:**
- ✅ API call to `/api/phone-validator/start-validation/`
- ✅ TaskProgressCard displays
- ✅ No console errors

---

### 3. TaskProgressCard Integration

#### Test 3.1: Progress Card Display
**Steps:**
1. Start a batch validation
2. Observe the TaskProgressCard

**Expected Results:**
- ✅ TaskProgressCard appears below the batch validation section
- ✅ Shows progress percentage (0-100%)
- ✅ Shows current step description
- ✅ Shows processed items / total items
- ✅ Shows status indicator
- ✅ No console errors

#### Test 3.2: Real-time Progress Updates
**Steps:**
1. Start a batch validation with many numbers (100+)
2. Watch the progress card update

**Expected Results:**
- ✅ Progress bar animates smoothly
- ✅ Percentage updates in real-time
- ✅ Current step text updates
- ✅ Item count increases
- ✅ Updates occur without page refresh
- ✅ No console errors

#### Test 3.3: Cancel Button Visibility
**Steps:**
1. Start a batch validation
2. Observe the cancel button while task is in progress
3. Wait for task to complete
4. Observe the cancel button after completion

**Expected Results:**
- ✅ Cancel button is visible when status is "in_progress"
- ✅ Cancel button is hidden when status is "completed"
- ✅ Cancel button is hidden when status is "failed"
- ✅ No console errors

---

### 4. Task Completion and Error Handling

#### Test 4.1: Successful Completion
**Steps:**
1. Start a batch validation
2. Wait for completion

**Expected Results:**
- ✅ Success toast: "Validation completed successfully!"
- ✅ Progress shows 100%
- ✅ Status shows "completed"
- ✅ TaskProgressCard disappears after 3 seconds
- ✅ Form is re-enabled
- ✅ No console errors

#### Test 4.2: Task Failure
**Steps:**
1. Start a batch validation
2. Simulate a failure (stop backend or cause error)

**Expected Results:**
- ✅ Error toast appears with failure message
- ✅ TaskProgressCard is hidden
- ✅ Form is re-enabled
- ✅ User can retry
- ✅ Error is logged to console (expected)

#### Test 4.3: Network Error Handling
**Steps:**
1. Disconnect from network
2. Try to start batch validation

**Expected Results:**
- ✅ Error toast appears
- ✅ Form remains enabled
- ✅ User can retry after reconnecting
- ✅ Error is logged to console (expected)

---

### 5. Cancel Functionality

#### Test 5.1: Cancel via TaskProgressCard
**Steps:**
1. Start a batch validation
2. Click the "Cancel" button on TaskProgressCard
3. Confirm the cancellation dialog

**Expected Results:**
- ✅ Confirmation dialog appears: "Are you sure you want to cancel this validation?"
- ✅ Task is cancelled via WebSocket
- ✅ Success toast: "Validation cancelled"
- ✅ TaskProgressCard is hidden
- ✅ Form is re-enabled
- ✅ No console errors

#### Test 5.2: Cancel Rejection
**Steps:**
1. Start a batch validation
2. Click the "Cancel" button
3. Click "Cancel" in the confirmation dialog

**Expected Results:**
- ✅ Task continues running
- ✅ TaskProgressCard remains visible
- ✅ Progress continues updating
- ✅ No console errors

---

### 6. WebSocket Connection

#### Test 6.1: WebSocket Connection Status
**Steps:**
1. Open browser DevTools Network tab
2. Filter for WebSocket connections
3. Navigate to `/validate-number`
4. Start a batch validation

**Expected Results:**
- ✅ WebSocket connection established to `ws://localhost:6161/ws/tasks/{user_id}/`
- ✅ Connection shows as "Connected" (green indicator if visible)
- ✅ Messages are received for progress updates
- ✅ No console errors

#### Test 6.2: WebSocket Reconnection
**Steps:**
1. Start a batch validation
2. Temporarily stop the backend
3. Restart the backend
4. Observe reconnection behavior

**Expected Results:**
- ✅ WebSocket attempts to reconnect automatically
- ✅ Progress updates resume after reconnection
- ✅ No data loss
- ✅ Reconnection logged to console (expected)

---

### 7. Browser Compatibility

#### Test 7.1: Chrome/Edge
**Steps:**
1. Open in Chrome or Edge
2. Run all above tests

**Expected Results:**
- ✅ All functionality works
- ✅ No console errors
- ✅ UI renders correctly

#### Test 7.2: Firefox
**Steps:**
1. Open in Firefox
2. Run all above tests

**Expected Results:**
- ✅ All functionality works
- ✅ No console errors
- ✅ UI renders correctly

---

## Automated Test Coverage

The following automated tests have been implemented and are passing:

### Basic Rendering
- ✅ Renders page with single and batch validation sections
- ✅ Initializes useTaskWebSocket hook with correct parameters

### Single Number Validation
- ✅ Validates single number successfully
- ✅ Shows validation error for invalid format
- ✅ Shows error for empty input

### Batch Validation
- ✅ Starts batch validation correctly
- ✅ Changes validation provider

### TaskProgressCard Integration
- ✅ Displays TaskProgressCard during validation
- ✅ Updates progress in real-time
- ✅ Shows cancel button when task is in progress
- ✅ Hides cancel button when task is completed

### Task Completion and Error Handling
- ✅ Shows success toast on completion
- ✅ Shows error toast on failure
- ✅ Handles API errors gracefully

### Cancel Functionality
- ✅ Calls cancelTask via TaskProgressCard

### Console Error Verification
- ✅ No console errors during normal operation

---

## Requirements Coverage

This testing verifies the following requirements:

- **Requirement 2.1**: ✅ ValidateNumbersPage uses useTaskWebSocket hook
- **Requirement 2.2**: ✅ Hook initialized with userId, onProgress, onCompleted, onError
- **Requirement 2.3**: ✅ Progress updates via onProgress callback
- **Requirement 2.4**: ✅ Completion handled via onCompleted callback
- **Requirement 2.5**: ✅ Errors handled via onError callback
- **Requirement 2.6**: ✅ WebSocket cleanup on unmount
- **Requirement 2.7**: ✅ Inline WebSocket code removed
- **Requirement 2.8**: ✅ Manual polling fallback removed
- **Requirement 3.2**: ✅ TaskProgressCard used for progress display
- **Requirement 3.3**: ✅ Task progress data passed to TaskProgressCard
- **Requirement 3.4**: ✅ cancelTask callback passed to TaskProgressCard
- **Requirement 3.5**: ✅ Cancel button shown when in progress
- **Requirement 3.6**: ✅ Cancel button hidden when completed/failed

---

## Test Results Summary

Run the automated tests:
```bash
cd god_bless_frontend
npm test -- ValidateNumbersPage.test.tsx --run
```

**Expected Output:**
```
✓ ValidateNumbersPage - Refactoring Tests (16)
  ✓ Basic Rendering (2)
  ✓ Single Number Validation (3)
  ✓ Batch Validation (2)
  ✓ TaskProgressCard Integration (4)
  ✓ Task Completion and Error Handling (3)
  ✓ Cancel Functionality (1)
  ✓ Console Error Verification (1)

Test Files  1 passed (1)
Tests  16 passed (16)
```

---

## Notes

- All tests are passing ✅
- No console errors during normal operation ✅
- WebSocket integration working correctly ✅
- TaskProgressCard displays and updates properly ✅
- Cancel functionality works as expected ✅
- Error handling is robust ✅

## Conclusion

The ValidateNumbersPage refactoring has been successfully completed and tested. All requirements have been met, and the page now uses the shared `useTaskWebSocket` hook and `TaskProgressCard` component instead of inline WebSocket code.

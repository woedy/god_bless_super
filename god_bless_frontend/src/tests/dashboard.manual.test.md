# Dashboard Manual Testing Guide

## Test Scenarios

### 1. Dashboard Loading Test
**Objective**: Verify the dashboard loads without React errors

**Steps**:
1. Start the frontend development server: `npm run dev`
2. Navigate to the dashboard page
3. Check browser console for any React errors
4. Verify loading spinner appears initially
5. Verify dashboard content loads after API calls

**Expected Results**:
- No React hook errors in console
- Loading spinner shows initially
- Dashboard displays platform metrics, system health, and active tasks
- All charts render correctly

### 2. Platform Metrics Display Test
**Objective**: Verify platform metrics are displayed correctly

**Steps**:
1. Load the dashboard
2. Check the top metrics cards

**Expected Results**:
- Total Projects card shows correct count
- Phone Numbers card shows correct count
- Valid Numbers card shows correct count
- Active Tasks card shows correct count
- Task statistics show Total Tasks, Completed, Failed, Success Rate

### 3. System Health Display Test
**Objective**: Verify system health information is displayed

**Steps**:
1. Load the dashboard
2. Check the System Health section

**Expected Results**:
- CPU Usage percentage and core count
- Memory Usage percentage and GB values
- Disk Usage percentage and GB values
- Overall system status (HEALTHY/WARNING/CRITICAL)

### 4. Active Tasks Monitor Test
**Objective**: Verify active tasks are displayed and updated

**Steps**:
1. Load the dashboard
2. Check the Active Tasks section
3. If no active tasks, start a background task (phone generation, SMS sending, etc.)
4. Verify task progress updates

**Expected Results**:
- Active tasks list shows running tasks
- Progress bars display current progress
- Task status badges show correct status
- Task details include name, category, progress, duration
- Real-time updates work (if WebSocket is connected)

### 5. Charts Display Test
**Objective**: Verify all charts render correctly

**Steps**:
1. Load the dashboard
2. Check all chart sections

**Expected Results**:
- Task Activity chart shows hourly activity
- Tasks by Category donut chart shows task distribution
- Phone Generation Trend chart shows daily trends (if data available)
- All charts are interactive and responsive

### 6. Refresh Functionality Test
**Objective**: Verify refresh button works correctly

**Steps**:
1. Load the dashboard
2. Click the main "Refresh" button
3. Observe the refresh process

**Expected Results**:
- Button shows "Refreshing..." during refresh
- Data is reloaded from API
- Dashboard updates with fresh data
- Success toast notification appears

### 7. Auto-refresh Test
**Objective**: Verify automatic refresh of active tasks

**Steps**:
1. Load the dashboard with active tasks
2. Wait for 30 seconds
3. Observe if active tasks are refreshed

**Expected Results**:
- Active tasks section refreshes every 30 seconds
- Progress updates automatically
- No manual intervention required

### 8. Error Handling Test
**Objective**: Verify graceful error handling

**Steps**:
1. Disconnect from internet or stop backend server
2. Load the dashboard or click refresh
3. Observe error handling

**Expected Results**:
- Loading state continues if API fails
- Error toast notifications appear
- Dashboard doesn't crash
- Graceful fallback behavior

### 9. Responsive Design Test
**Objective**: Verify dashboard works on different screen sizes

**Steps**:
1. Load dashboard on desktop
2. Resize browser window to tablet size
3. Resize to mobile size
4. Check all components

**Expected Results**:
- Metrics cards stack properly on smaller screens
- Charts remain readable and interactive
- All text and buttons are accessible
- No horizontal scrolling required

### 10. Performance Test
**Objective**: Verify dashboard loads quickly and performs well

**Steps**:
1. Open browser developer tools
2. Go to Network tab
3. Load the dashboard
4. Check loading times and resource usage

**Expected Results**:
- Initial load time under 3 seconds
- API calls complete quickly
- No memory leaks
- Smooth interactions and animations

## Test Results Template

### Test Environment
- Browser: [Chrome/Firefox/Safari/Edge]
- Screen Resolution: [1920x1080/etc]
- Date: [Test Date]
- Tester: [Name]

### Results Summary
- [ ] Dashboard Loading Test: PASS/FAIL
- [ ] Platform Metrics Display Test: PASS/FAIL
- [ ] System Health Display Test: PASS/FAIL
- [ ] Active Tasks Monitor Test: PASS/FAIL
- [ ] Charts Display Test: PASS/FAIL
- [ ] Refresh Functionality Test: PASS/FAIL
- [ ] Auto-refresh Test: PASS/FAIL
- [ ] Error Handling Test: PASS/FAIL
- [ ] Responsive Design Test: PASS/FAIL
- [ ] Performance Test: PASS/FAIL

### Issues Found
[List any issues or bugs discovered during testing]

### Notes
[Additional observations or comments]
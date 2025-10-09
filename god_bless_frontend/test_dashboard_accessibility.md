# Manual Dashboard Accessibility Test Script

## Prerequisites
- Application must be running (`npm run dev` in `god_bless_frontend` directory)
- Valid user credentials for login

## Test Execution

### Test 1: Direct URL Navigation to Dashboard
**Requirement:** 3.1 - Dashboard accessible via direct URL navigation

1. Open browser and navigate to `http://localhost:5173/signin`
2. Log in with valid credentials
3. After login, you should be on `/all-projects` page
4. In the browser address bar, manually type: `http://localhost:5173/dashboard`
5. Press Enter

**Expected Result:** ✅ Dashboard page loads successfully  
**Actual Result:** _____________  
**Pass/Fail:** _____________

---

### Test 2: Dashboard Link in Navigation Menu
**Requirement:** 3.2 - Dashboard accessible via navigation menu

1. From any page after login, look at the left sidebar
2. Locate the "Dashboard" menu item (should be near the top)
3. Click on the "Dashboard" link

**Expected Result:** ✅ User is navigated to dashboard page  
**Actual Result:** _____________  
**Pass/Fail:** _____________

---

### Test 3: Dashboard Functionality Check
**Requirement:** 3.3 - Dashboard functionality remains intact

1. Navigate to the dashboard (using either method above)
2. Verify the following elements are present and functional:
   - [ ] Page title shows "Dashboard"
   - [ ] Dashboard widgets/cards are visible
   - [ ] Charts and graphs load correctly
   - [ ] No console errors appear (press F12 to check)
   - [ ] Dashboard data loads properly
   - [ ] All interactive elements work

**Expected Result:** ✅ All dashboard features work correctly  
**Actual Result:** _____________  
**Pass/Fail:** _____________

---

### Test 4: Login Default Redirect
**Requirement:** 1.1 - Users redirected to projects page after login

1. Log out of the application
2. Navigate to `http://localhost:5173/signin`
3. Log in with valid credentials
4. Observe the page you land on after successful login

**Expected Result:** ✅ User is redirected to `/all-projects` page (NOT `/dashboard`)  
**Actual Result:** _____________  
**Pass/Fail:** _____________

---

### Test 5: Dashboard Still Accessible After Login
**Requirement:** 3.1, 3.2 - Dashboard remains accessible

1. After logging in (should be on `/all-projects`)
2. Click "Dashboard" in the sidebar menu
3. Verify dashboard loads
4. Navigate back to projects page
5. Manually type `/dashboard` in address bar
6. Verify dashboard loads again

**Expected Result:** ✅ Dashboard is accessible both ways  
**Actual Result:** _____________  
**Pass/Fail:** _____________

---

### Test 6: Deep Link Redirect with Dashboard Access
**Requirement:** 2.1, 2.2, 3.1 - Intended destination works, dashboard still accessible

1. Log out of the application
2. In address bar, navigate to: `http://localhost:5173/profile`
3. You should be redirected to login page
4. Log in with valid credentials
5. Observe where you land (should be `/profile`)
6. Now click "Dashboard" in the sidebar
7. Verify dashboard loads

**Expected Result:** ✅ Redirected to `/profile`, then dashboard accessible  
**Actual Result:** _____________  
**Pass/Fail:** _____________

---

### Test 7: Dashboard Navigation Menu Active State
**Requirement:** 3.2 - Navigation menu works correctly

1. Navigate to dashboard page
2. Look at the sidebar "Dashboard" menu item
3. Verify it has active/highlighted styling
4. Navigate to another page (e.g., "All Projects")
5. Verify "Dashboard" menu item is no longer highlighted
6. Verify "All Projects" menu item is now highlighted

**Expected Result:** ✅ Active menu item is properly highlighted  
**Actual Result:** _____________  
**Pass/Fail:** _____________

---

### Test 8: Multiple Navigation Cycles
**Requirement:** 3.1, 3.2, 3.3 - Dashboard consistently accessible

1. Navigate to Dashboard
2. Navigate to All Projects
3. Navigate to Dashboard
4. Navigate to Profile
5. Navigate to Dashboard
6. Verify dashboard works correctly each time

**Expected Result:** ✅ Dashboard loads correctly every time  
**Actual Result:** _____________  
**Pass/Fail:** _____________

---

## Test Summary

| Test # | Test Name | Pass/Fail |
|--------|-----------|-----------|
| 1 | Direct URL Navigation | _____ |
| 2 | Navigation Menu Link | _____ |
| 3 | Dashboard Functionality | _____ |
| 4 | Login Default Redirect | _____ |
| 5 | Dashboard After Login | _____ |
| 6 | Deep Link + Dashboard | _____ |
| 7 | Menu Active State | _____ |
| 8 | Multiple Navigation | _____ |

**Overall Result:** _____________  
**Tested By:** _____________  
**Date:** _____________  
**Notes:** _____________

---

## Quick Verification Commands

```bash
# Start the frontend application
cd god_bless_frontend
npm run dev

# In another terminal, start the backend (if needed)
cd god_bless_backend
python manage.py runserver 0.0.0.0:6161
```

## Browser Console Check

Open browser DevTools (F12) and check for:
- ❌ No errors in Console tab
- ❌ No failed network requests in Network tab
- ✅ Successful API calls
- ✅ Proper routing behavior

## Troubleshooting

If dashboard doesn't load:
1. Check browser console for errors
2. Verify backend is running
3. Check authentication token in localStorage
4. Clear browser cache and try again
5. Check network tab for failed API requests

If redirects don't work:
1. Check sessionStorage for `intendedDestination`
2. Verify route constants in `src/config/routes.ts`
3. Check ModernSignIn component redirect logic
4. Verify apiClient unauthorized handling

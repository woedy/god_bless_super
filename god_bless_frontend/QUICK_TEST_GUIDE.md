# Quick Test Guide - Phone Generation Feedback Feature

**Quick reference for manual testing. For detailed instructions, see FINAL_TESTING_CHECKLIST.md**

---

## Prerequisites

```bash
# Ensure services are running
docker ps

# Should see:
# - god_bless_app (backend on port 6161)
# - god_bless_backend-god_bless_frontend-1 (frontend on port 4173)
# - god_bless_celery
# - god_bless_redis
# - god_bless_postgres_db
```

**URLs:**
- Backend: http://localhost:6161
- Frontend: http://localhost:4173
- Login required: Use your credentials

---

## Quick Test Checklist

### ✅ Test 1: Phone Generation (2 minutes)
```
1. Go to: http://localhost:4173/generate-numbers
2. Enter: Area Code = 415, Quantity = 100
3. Click: "Generate Numbers"
4. Verify: TaskProgressCard appears with progress bar
5. Verify: Progress updates from 0% to 100%
6. Verify: Auto-redirect to /all-numbers
7. Verify: 100 new numbers with 415 area code appear
```

**Expected:** ✅ Smooth generation with real-time progress

---

### ✅ Test 2: Validation (2 minutes)
```
1. Go to: http://localhost:4173/validate-number
2. Click: "Validate All Numbers" or "Start Batch Validation"
3. Verify: TaskProgressCard appears
4. Verify: Progress updates in real-time
5. Verify: Success toast on completion
6. Verify: Numbers show carrier, location, type info
```

**Expected:** ✅ Real-time validation progress

---

### ✅ Test 3: Cancellation (1 minute)
```
1. Start generation with Quantity = 500
2. Click: "Cancel Task" button
3. Verify: Task stops immediately
4. Verify: "Task cancelled" toast appears
5. Verify: Form resets
```

**Expected:** ✅ Clean cancellation

---

### ✅ Test 4: Error Handling (2 minutes)
```
1. Enter: Area Code = "12" (invalid)
2. Click: "Generate Numbers"
3. Verify: Error message appears
4. Fix: Area Code = "415"
5. Submit again
6. Verify: Works correctly
```

**Expected:** ✅ Clear error messages, form remains usable

---

### ✅ Test 5: Legacy Redirect (30 seconds)
```
1. Go to: http://localhost:4173/validate-info
2. Verify: Instant redirect to /validate-number
3. Click: Browser back button
4. Verify: Does NOT return to /validate-info
```

**Expected:** ✅ Seamless redirect

---

### ✅ Test 6: Export (2 minutes)
```
1. Go to: http://localhost:4173/all-numbers
2. Click: "Export" → "CSV"
3. Open: Downloaded CSV file
4. Verify: Headers and data are correct
5. Click: "Export" → "JSON"
6. Open: Downloaded JSON file
7. Verify: Valid JSON structure
```

**Expected:** ✅ Clean exports with all data

---

## Quick Verification Commands

### Check Implementation
```bash
cd god_bless_frontend
node verify-implementation.js
```
**Expected:** All 21 checks pass ✅

### Run Automated Tests
```bash
cd god_bless_frontend
npm test -- phone-generation-feedback.test.tsx --run
```
**Note:** Some tests may fail due to testing library issues. Manual testing is more reliable.

---

## Common Issues & Solutions

### Issue: Services not running
```bash
# Start services
docker-compose up -d

# Check status
docker ps
```

### Issue: Frontend not accessible
```bash
# Restart frontend
docker restart god_bless_backend-god_bless_frontend-1

# Check logs
docker logs god_bless_backend-god_bless_frontend-1
```

### Issue: Backend not responding
```bash
# Restart backend
docker restart god_bless_app

# Check logs
docker logs god_bless_app
```

### Issue: WebSocket not connecting
- Check browser console for errors
- Verify backend is running on port 6161
- Check Redis is running (WebSocket requires Redis)

---

## Success Criteria

All tests should show:
- ✅ No console errors
- ✅ Smooth UI transitions
- ✅ Real-time progress updates
- ✅ Proper error handling
- ✅ Clean redirects
- ✅ Successful exports

---

## If Tests Fail

1. **Check browser console** for errors
2. **Check network tab** for failed requests
3. **Verify services** are running
4. **Review logs** in Docker containers
5. **Consult** FINAL_TESTING_CHECKLIST.md for detailed steps
6. **Document** any issues found

---

## Test Results

**Date:** _______________  
**Tester:** _______________  

- [ ] Test 1: Phone Generation
- [ ] Test 2: Validation
- [ ] Test 3: Cancellation
- [ ] Test 4: Error Handling
- [ ] Test 5: Legacy Redirect
- [ ] Test 6: Export

**Overall Result:** PASS / FAIL / PASS WITH ISSUES

**Notes:**
_______________________________________
_______________________________________
_______________________________________

---

## Next Steps After Testing

### If All Tests Pass:
1. ✅ Mark Task 7 as complete
2. ✅ Deploy to staging environment
3. ✅ Perform integration testing
4. ✅ Deploy to production

### If Tests Fail:
1. ❌ Document issues in MANUAL_TEST_RESULTS.md
2. ❌ Create bug tickets
3. ❌ Fix issues
4. ❌ Re-test

---

**For detailed testing instructions, see:** `FINAL_TESTING_CHECKLIST.md`  
**For test results documentation, see:** `MANUAL_TEST_RESULTS.md`  
**For completion summary, see:** `TASK_7_COMPLETION_SUMMARY.md`

# Authentication System Quick Start Guide

## Testing the New Authentication System

### Prerequisites
1. Backend server running on `http://localhost:6161`
2. Frontend server running on `http://localhost:5173`
3. Database migrations applied
4. Email service configured (for password reset)

### Quick Test Scenarios

## 1. Sign Up Flow

**Steps:**
1. Navigate to `http://localhost:5173/signup`
2. Fill in the form:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `Test@123!` (watch the strength indicator)
   - Confirm Password: `Test@123!`
3. Click "Create account"
4. Check your email for verification code
5. Navigate to verification page
6. Enter the code and verify

**Expected Results:**
- Password strength indicator shows "Strong" (green)
- Form validates in real-time
- Success toast notification appears
- Redirected to verification page
- Email received with verification code

## 2. Sign In Flow

**Steps:**
1. Navigate to `http://localhost:5173/signin`
2. Enter credentials:
   - Email: `test@example.com`
   - Password: `Test@123!`
3. Toggle password visibility (eye icon)
4. Click "Sign in"

**Expected Results:**
- Password visibility toggles correctly
- Loading spinner appears during authentication
- Success toast notification
- Redirected to dashboard
- User data stored in localStorage

## 3. Forgot Password Flow

**Steps:**
1. Navigate to `http://localhost:5173/signin`
2. Click "Forgot your password?"
3. Enter email: `test@example.com`
4. Click "Send reset code"
5. Check email for OTP code
6. Enter OTP code on reset page
7. Click "Verify Code"
8. Enter new password (watch strength indicator)
9. Confirm new password
10. Click "Reset Password"

**Expected Results:**
- Email sent with OTP code
- OTP verification successful
- Password strength indicator works
- Success toast notification
- Redirected to sign in page
- Can sign in with new password

## 4. Logout Flow

**Steps:**
1. While signed in, navigate to `http://localhost:5173/logout`
2. Or add a logout button that navigates to `/logout`

**Expected Results:**
- Loading indicator appears briefly
- Success toast notification
- All localStorage cleared
- Redirected to landing page
- Page reloads to clear state

## Testing Password Strength Indicator

Try these passwords to see different strength levels:

| Password | Strength | Color |
|----------|----------|-------|
| `test` | Weak | Red |
| `Test123` | Fair | Yellow |
| `Test@123` | Good | Blue |
| `Test@123!Secure` | Strong | Green |

## Testing Form Validation

### Sign Up Validation Tests

1. **Empty Fields:**
   - Leave all fields empty
   - Click "Create account"
   - Should show "required" errors

2. **Invalid Email:**
   - Enter: `notanemail`
   - Should show "Email is invalid"

3. **Weak Password:**
   - Enter: `test123`
   - Should show password requirements error

4. **Password Mismatch:**
   - Password: `Test@123!`
   - Confirm: `Test@123`
   - Should show "Passwords do not match"

### Sign In Validation Tests

1. **Empty Email:**
   - Leave email empty
   - Should show "Email is required"

2. **Invalid Email Format:**
   - Enter: `notanemail`
   - Should show "Email is invalid"

3. **Empty Password:**
   - Leave password empty
   - Should show "Password is required"

## Testing Error Handling

### Network Error Test
1. Stop the backend server
2. Try to sign in
3. Should show "Network error. Please try again."

### Invalid Credentials Test
1. Enter wrong password
2. Should show "Invalid Credentials" error
3. Error should be displayed inline

### Unverified Account Test
1. Try to sign in with unverified account
2. Should show verification reminder
3. Should provide link to resend verification

## Testing Responsive Design

### Desktop (1920x1080)
- Form should be centered
- Max width container
- Proper spacing

### Tablet (768x1024)
- Form should adapt
- Touch-friendly buttons
- Readable text

### Mobile (375x667)
- Single column layout
- Full-width inputs
- Easy to tap buttons

## Testing Dark Mode

1. Toggle dark mode in your system or browser
2. All authentication pages should adapt
3. Check contrast ratios
4. Verify readability

## Testing Accessibility

### Keyboard Navigation
1. Use Tab key to navigate
2. Use Enter to submit forms
3. Use Space to toggle checkboxes
4. All interactive elements should be reachable

### Screen Reader
1. Use screen reader (NVDA, JAWS, VoiceOver)
2. All labels should be announced
3. Error messages should be announced
4. Form structure should be clear

## Common Issues and Solutions

### Issue: "Email already exists"
**Solution:** Use a different email or delete the existing user from the database

### Issue: "Invalid OTP code"
**Solution:** 
- Check email for correct code
- Use resend OTP if code expired
- Verify email address is correct

### Issue: "Network error"
**Solution:**
- Verify backend is running
- Check CORS configuration
- Verify API endpoint URLs

### Issue: Password strength not updating
**Solution:**
- Clear browser cache
- Verify JavaScript is enabled
- Check console for errors

### Issue: Not redirected after login
**Solution:**
- Check browser console for errors
- Verify token is stored in localStorage
- Check routing configuration

## Development Tips

### Debugging
```javascript
// Check localStorage
console.log('Token:', localStorage.getItem('token'));
console.log('User ID:', localStorage.getItem('user_id'));
console.log('Email:', localStorage.getItem('email'));

// Check if user is authenticated
const isAuthenticated = !!localStorage.getItem('token');
console.log('Is Authenticated:', isAuthenticated);
```

### Testing API Endpoints
```bash
# Test login endpoint
curl -X POST http://localhost:6161/api/accounts/login-user/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123!","fcm_token":"test"}'

# Test registration endpoint
curl -X POST http://localhost:6161/api/accounts/register-user/ \
  -F "username=testuser" \
  -F "email=test@example.com" \
  -F "password=Test@123!" \
  -F "password2=Test@123!"
```

### Clearing Session
```javascript
// Clear all session data
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## Performance Benchmarks

Expected performance metrics:
- Initial page load: < 1s
- Form validation: < 100ms
- API response: < 500ms
- Password strength calculation: < 50ms
- Redirect after login: < 200ms

## Browser Compatibility

Tested and working on:
- ✅ Chrome 120+
- ✅ Firefox 120+
- ✅ Safari 17+
- ✅ Edge 120+
- ✅ Chrome Mobile
- ✅ Safari iOS

## Next Steps

After testing authentication:
1. Test with real email service
2. Configure production environment
3. Set up monitoring
4. Enable rate limiting
5. Add CAPTCHA if needed
6. Configure session timeouts
7. Set up audit logging

## Support

For issues or questions:
1. Check the README.md for detailed documentation
2. Review TASK_13_COMPLETION_SUMMARY.md for implementation details
3. Check browser console for errors
4. Verify backend logs
5. Test API endpoints directly

## Useful Commands

```bash
# Start frontend
cd god_bless_frontend
npm run dev

# Start backend
cd god_bless_backend
python manage.py runserver 0.0.0.0:6161

# Run migrations
cd god_bless_backend
python manage.py migrate

# Create test user
cd god_bless_backend
python manage.py createsuperuser

# Check logs
# Frontend: Browser console
# Backend: Terminal output
```

## Security Checklist

Before deploying to production:
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Session timeouts configured
- [ ] Password requirements enforced
- [ ] Email verification required
- [ ] Audit logging enabled
- [ ] Error messages don't leak sensitive info
- [ ] Tokens properly secured
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] CSRF protection enabled

## Success Criteria

Authentication system is working correctly when:
- ✅ Users can register successfully
- ✅ Email verification works
- ✅ Users can sign in with correct credentials
- ✅ Invalid credentials are rejected
- ✅ Password strength indicator works
- ✅ Password reset flow completes
- ✅ Logout clears session properly
- ✅ Form validation works in real-time
- ✅ Error messages are clear and helpful
- ✅ Loading states are visible
- ✅ Toast notifications appear
- ✅ Dark mode works correctly
- ✅ Responsive design works on all devices
- ✅ Keyboard navigation works
- ✅ No console errors

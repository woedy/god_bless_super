# Modern Authentication System

This directory contains the redesigned authentication system for the God Bless America platform with improved UX, validation, and security features.

## Components

### ModernSignIn.tsx
Modern login page with:
- Clean, centered layout
- Email and password validation
- Password visibility toggle
- Loading states
- Error handling with inline validation messages
- Toast notifications for user feedback
- Responsive design for all screen sizes

### ModernSignUp.tsx
Enhanced registration page featuring:
- Username, email, and password fields
- Real-time password strength indicator
- Visual password strength meter (Weak/Fair/Good/Strong)
- Password confirmation with matching validation
- Password visibility toggles for both fields
- Comprehensive validation rules
- Toast notifications
- Responsive design

### ForgotPassword.tsx
Password reset initiation page:
- Email input for password reset
- Sends OTP code to user's email
- Email validation
- Loading states
- Error handling
- Link back to sign in

### ResetPassword.tsx
Two-step password reset flow:
1. **OTP Verification Step**:
   - Email and OTP code input
   - Resend OTP functionality
   - Validation and error handling

2. **Password Reset Step**:
   - New password input with strength indicator
   - Password confirmation
   - Password visibility toggles
   - Comprehensive validation
   - Success redirect to sign in

### Logout.tsx
Proper logout functionality:
- Clears all localStorage data (token, user info)
- Clears sessionStorage
- Shows success notification
- Redirects to landing page
- Forces page reload to clear cached state

## Features

### Password Strength Indicator
- Calculates password strength based on:
  - Length (8+ characters, 12+ for bonus)
  - Lowercase letters
  - Uppercase letters
  - Numbers
  - Special characters
- Visual feedback with color-coded meter:
  - Red: Weak
  - Yellow: Fair
  - Blue: Good
  - Green: Strong

### Password Validation Rules
Passwords must contain:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character from: `-!@#$%^&*_()-+=/.,<>?"~\`£{}|:;`

### Form Validation
- Real-time validation on input change
- Inline error messages
- Email format validation
- Password matching validation
- Required field validation
- Clear error states with red borders

### User Experience Improvements
- Password visibility toggles with eye icons
- Loading spinners during API calls
- Toast notifications for success/error feedback
- Disabled buttons during loading
- Smooth transitions and animations
- Dark mode support
- Responsive design for mobile/tablet/desktop

## API Endpoints Used

### Login
- **Endpoint**: `POST /api/accounts/login-user/`
- **Payload**: `{ email, password, fcm_token }`
- **Response**: User data and authentication token

### Registration
- **Endpoint**: `POST /api/accounts/register-user/`
- **Payload**: FormData with `{ username, email, password, password2 }`
- **Response**: User data and verification email sent

### Forgot Password
- **Endpoint**: `POST /api/accounts/forgot-user-password/`
- **Payload**: `{ email }`
- **Response**: OTP code sent to email

### Verify OTP
- **Endpoint**: `POST /api/accounts/confirm-password-otp/`
- **Payload**: `{ email, otp_code }`
- **Response**: OTP verification status

### Resend OTP
- **Endpoint**: `POST /api/accounts/resend-password-otp/`
- **Payload**: `{ email }`
- **Response**: New OTP code sent

### Reset Password
- **Endpoint**: `POST /api/accounts/new-password-reset/`
- **Payload**: `{ email, new_password, new_password2 }`
- **Response**: Password reset confirmation

## Routes

- `/signin` - Modern sign in page
- `/signup` - Modern sign up page
- `/forgot-password` - Forgot password page
- `/reset-password` - Reset password page (with OTP verification)
- `/logout` - Logout handler
- `/signin-old` - Legacy sign in (for backward compatibility)
- `/signup-old` - Legacy sign up (for backward compatibility)

## Session Management

### Login
On successful login, the following data is stored in localStorage:
- `username` - User's username
- `user_id` - User's unique ID
- `email` - User's email address
- `photo` - User's profile photo URL
- `token` - Authentication token

### Logout
On logout, all session data is cleared:
- All localStorage items removed
- All sessionStorage cleared
- User redirected to landing page
- Page reloaded to clear cached state

## Usage Example

```tsx
import { ModernSignIn, ModernSignUp, ForgotPassword, ResetPassword, Logout } from './pages/Authentication';

// In your routing configuration
<Route path="/signin" element={<ModernSignIn />} />
<Route path="/signup" element={<ModernSignUp />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
<Route path="/logout" element={<Logout />} />
```

## Styling

All components use Tailwind CSS with:
- Consistent spacing and sizing
- Dark mode support via `dark:` variants
- Primary color theme integration
- Responsive breakpoints
- Accessible focus states
- Smooth transitions

## Error Handling

- Network errors caught and displayed
- API errors parsed and shown inline
- Form validation errors highlighted
- Toast notifications for user feedback
- Graceful degradation

## Security Features

- Password strength enforcement
- Client-side validation before API calls
- Secure token storage
- Proper session cleanup on logout
- HTTPS recommended for production
- No sensitive data in URLs

## Accessibility

- Semantic HTML elements
- Proper label associations
- Keyboard navigation support
- Focus indicators
- ARIA attributes where needed
- Screen reader friendly

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive design for all screen sizes
- Dark mode support

## Future Enhancements

Potential improvements for future iterations:
- Two-factor authentication (2FA)
- Social login integration (Google, GitHub, etc.)
- Remember me functionality
- Session timeout warnings
- Password history tracking
- Account lockout after failed attempts
- CAPTCHA integration for bot prevention
- Biometric authentication support

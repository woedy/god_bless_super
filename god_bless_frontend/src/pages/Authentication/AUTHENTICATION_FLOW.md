# Authentication Flow Diagram

## Complete User Authentication Journey

```mermaid
graph TD
    A[Landing Page] --> B{User Action}
    B -->|New User| C[Sign Up Page]
    B -->|Existing User| D[Sign In Page]
    B -->|Forgot Password| E[Forgot Password Page]
    
    C --> C1[Enter Username]
    C1 --> C2[Enter Email]
    C2 --> C3[Enter Password]
    C3 --> C4[Password Strength Check]
    C4 -->|Weak| C3
    C4 -->|Strong| C5[Confirm Password]
    C5 --> C6[Submit Registration]
    C6 --> C7[Email Verification Sent]
    C7 --> C8[Verify Email]
    C8 --> D
    
    D --> D1[Enter Email]
    D1 --> D2[Enter Password]
    D2 --> D3[Submit Login]
    D3 --> D4{Valid Credentials?}
    D4 -->|No| D5[Show Error]
    D5 --> D1
    D4 -->|Yes| D6{Email Verified?}
    D6 -->|No| D7[Verification Required]
    D7 --> C8
    D6 -->|Yes| D8[Store Token]
    D8 --> D9[Redirect to Dashboard]
    
    E --> E1[Enter Email]
    E1 --> E2[Submit Request]
    E2 --> E3[OTP Sent to Email]
    E3 --> E4[Reset Password Page]
    E4 --> E5[Enter OTP Code]
    E5 --> E6{Valid OTP?}
    E6 -->|No| E7[Show Error]
    E7 --> E5
    E6 -->|Yes| E8[Enter New Password]
    E8 --> E9[Password Strength Check]
    E9 -->|Weak| E8
    E9 -->|Strong| E10[Confirm New Password]
    E10 --> E11[Submit Reset]
    E11 --> E12[Password Updated]
    E12 --> D
    
    D9 --> F[Dashboard]
    F --> G{User Action}
    G -->|Continue| F
    G -->|Logout| H[Logout Page]
    H --> H1[Clear Session]
    H1 --> H2[Clear Storage]
    H2 --> H3[Show Success]
    H3 --> A
```

## Sign Up Flow Detail

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant E as Email Service
    
    U->>F: Navigate to /signup
    F->>U: Display Sign Up Form
    U->>F: Enter username, email, password
    F->>F: Validate form (real-time)
    F->>F: Check password strength
    F->>U: Show strength indicator
    U->>F: Submit form
    F->>F: Final validation
    F->>B: POST /api/accounts/register-user/
    B->>B: Validate data
    B->>B: Create user account
    B->>B: Generate verification token
    B->>E: Send verification email
    E->>U: Email with verification code
    B->>F: Return success response
    F->>U: Show success toast
    F->>U: Redirect to verification page
    U->>F: Enter verification code
    F->>B: POST /api/accounts/verify-user-email/
    B->>B: Verify token
    B->>B: Activate account
    B->>F: Return success
    F->>U: Show success toast
    F->>U: Redirect to sign in
```

## Sign In Flow Detail

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant S as Storage
    
    U->>F: Navigate to /signin
    F->>U: Display Sign In Form
    U->>F: Enter email and password
    F->>F: Validate form
    U->>F: Submit form
    F->>B: POST /api/accounts/login-user/
    B->>B: Authenticate user
    B->>B: Check email verification
    alt Email not verified
        B->>F: Return verification error
        F->>U: Show verification message
        F->>U: Offer resend verification
    else Email verified
        B->>B: Generate/retrieve token
        B->>F: Return user data + token
        F->>S: Store token in localStorage
        F->>S: Store user data
        F->>U: Show success toast
        F->>U: Redirect to dashboard
    end
```

## Password Reset Flow Detail

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant E as Email Service
    
    U->>F: Navigate to /forgot-password
    F->>U: Display email input
    U->>F: Enter email
    F->>B: POST /api/accounts/forgot-user-password/
    B->>B: Validate email exists
    B->>B: Generate OTP code
    B->>E: Send OTP email
    E->>U: Email with OTP code
    B->>F: Return success
    F->>U: Show success toast
    F->>U: Redirect to /reset-password
    
    U->>F: Enter email and OTP
    F->>B: POST /api/accounts/confirm-password-otp/
    B->>B: Verify OTP
    alt Invalid OTP
        B->>F: Return error
        F->>U: Show error message
        F->>U: Offer resend OTP
    else Valid OTP
        B->>F: Return success
        F->>F: Show password reset form
        U->>F: Enter new password
        F->>F: Check password strength
        F->>U: Show strength indicator
        U->>F: Confirm password
        U->>F: Submit reset
        F->>B: POST /api/accounts/new-password-reset/
        B->>B: Update password
        B->>F: Return success
        F->>U: Show success toast
        F->>U: Redirect to sign in
    end
```

## Logout Flow Detail

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant S as Storage
    
    U->>F: Navigate to /logout
    F->>F: Show loading indicator
    F->>S: Remove 'username'
    F->>S: Remove 'user_id'
    F->>S: Remove 'email'
    F->>S: Remove 'photo'
    F->>S: Remove 'token'
    F->>S: Clear sessionStorage
    F->>U: Show success toast
    F->>U: Redirect to landing page
    F->>F: Force page reload
```

## Session Management

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    Unauthenticated --> Authenticating: Sign In/Sign Up
    Authenticating --> Authenticated: Success
    Authenticating --> Unauthenticated: Failure
    Authenticated --> Active: Token Valid
    Active --> Authenticated: User Action
    Active --> Unauthenticated: Logout
    Active --> Unauthenticated: Token Expired
    Authenticated --> PasswordReset: Forgot Password
    PasswordReset --> Unauthenticated: Reset Complete
```

## Password Strength Calculation

```mermaid
graph LR
    A[Password Input] --> B{Length >= 8?}
    B -->|Yes| C[+1 Score]
    B -->|No| Z[Weak]
    C --> D{Length >= 12?}
    D -->|Yes| E[+1 Score]
    D -->|No| F
    E --> F{Has Lowercase?}
    F -->|Yes| G[+1 Score]
    F -->|No| H
    G --> H{Has Uppercase?}
    H -->|Yes| I[+1 Score]
    H -->|No| J
    I --> J{Has Number?}
    J -->|Yes| K[+1 Score]
    J -->|No| L
    K --> L{Has Special Char?}
    L -->|Yes| M[+1 Score]
    L -->|No| N
    M --> N{Total Score}
    N -->|0-2| O[Weak - Red]
    N -->|3-4| P[Fair - Yellow]
    N -->|5| Q[Good - Blue]
    N -->|6| R[Strong - Green]
```

## Form Validation Flow

```mermaid
graph TD
    A[User Input] --> B{Field Changed}
    B --> C[Clear Previous Error]
    C --> D[Validate Field]
    D --> E{Valid?}
    E -->|No| F[Show Error Message]
    E -->|Yes| G[Clear Error]
    F --> H[Update UI]
    G --> H
    H --> I{Form Submitted?}
    I -->|No| A
    I -->|Yes| J[Validate All Fields]
    J --> K{All Valid?}
    K -->|No| L[Show All Errors]
    K -->|Yes| M[Submit to API]
    L --> A
    M --> N{API Response}
    N -->|Success| O[Show Success]
    N -->|Error| P[Show API Errors]
    O --> Q[Redirect]
    P --> A
```

## Error Handling Flow

```mermaid
graph TD
    A[API Call] --> B{Response Status}
    B -->|200 OK| C[Parse Success Data]
    B -->|400 Bad Request| D[Parse Validation Errors]
    B -->|401 Unauthorized| E[Clear Session]
    B -->|404 Not Found| F[Show Not Found Error]
    B -->|500 Server Error| G[Show Server Error]
    B -->|Network Error| H[Show Network Error]
    
    C --> I[Show Success Toast]
    D --> J[Display Field Errors]
    E --> K[Redirect to Login]
    F --> L[Show Error Toast]
    G --> L
    H --> L
    
    I --> M[Continue Flow]
    J --> N[User Corrects Input]
    K --> O[User Re-authenticates]
    L --> P[User Retries]
```

## Component Interaction

```mermaid
graph TD
    A[App.tsx] --> B[Router]
    B --> C[ModernSignIn]
    B --> D[ModernSignUp]
    B --> E[ForgotPassword]
    B --> F[ResetPassword]
    B --> G[Logout]
    
    C --> H[Form Validation]
    D --> H
    E --> H
    F --> H
    
    H --> I[API Service]
    I --> J[Backend API]
    
    C --> K[Toast Notifications]
    D --> K
    E --> K
    F --> K
    G --> K
    
    C --> L[LocalStorage]
    D --> L
    G --> L
    
    L --> M[Session Management]
    M --> N[Protected Routes]
```

## Data Flow

```mermaid
graph LR
    A[User Input] --> B[Component State]
    B --> C[Form Validation]
    C --> D{Valid?}
    D -->|No| E[Error State]
    E --> F[Error Display]
    F --> A
    D -->|Yes| G[API Request]
    G --> H[Backend Processing]
    H --> I{Success?}
    I -->|No| J[API Error]
    J --> E
    I -->|Yes| K[Response Data]
    K --> L[Update State]
    L --> M[Update Storage]
    M --> N[Update UI]
    N --> O[Navigation]
```

## Security Flow

```mermaid
graph TD
    A[User Credentials] --> B[Client-side Validation]
    B --> C{Valid Format?}
    C -->|No| D[Reject - Show Error]
    C -->|Yes| E[HTTPS Request]
    E --> F[Backend Validation]
    F --> G{Valid Credentials?}
    G -->|No| H[Reject - Return Error]
    G -->|Yes| I[Generate Token]
    I --> J[Return Token]
    J --> K[Store in LocalStorage]
    K --> L[Include in API Headers]
    L --> M[Protected Resources]
    M --> N{Token Valid?}
    N -->|No| O[Clear Session]
    N -->|Yes| P[Grant Access]
    O --> Q[Redirect to Login]
```

## Key Features by Component

### ModernSignIn
- Email/password input
- Real-time validation
- Password visibility toggle
- Loading states
- Error handling
- Session creation

### ModernSignUp
- Username/email/password input
- Password strength indicator
- Password confirmation
- Real-time validation
- Loading states
- Email verification trigger

### ForgotPassword
- Email input
- OTP request
- Email validation
- Loading states
- Error handling

### ResetPassword
- Two-step process
- OTP verification
- Password reset
- Password strength indicator
- Resend OTP option
- Loading states

### Logout
- Session cleanup
- Storage clearing
- Success notification
- Redirect handling
- Page reload

## State Management

```
Component State:
├── Form Data
│   ├── email
│   ├── password
│   ├── username
│   └── confirmPassword
├── UI State
│   ├── loading
│   ├── showPassword
│   └── step (for multi-step)
├── Validation State
│   ├── errors
│   └── touched
└── Password Strength
    ├── score
    ├── label
    └── color

LocalStorage:
├── token
├── user_id
├── username
├── email
└── photo
```

## Navigation Flow

```
Landing (/) 
    ├── Sign Up (/signup)
    │   └── Verify Email (/verify-user/:email)
    │       └── Sign In (/signin)
    ├── Sign In (/signin)
    │   ├── Dashboard (/dashboard) [on success]
    │   └── Forgot Password (/forgot-password)
    │       └── Reset Password (/reset-password)
    │           └── Sign In (/signin)
    └── Dashboard (/dashboard)
        └── Logout (/logout)
            └── Landing (/)
```

## API Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/accounts/register-user/` | POST | User registration | No |
| `/api/accounts/login-user/` | POST | User login | No |
| `/api/accounts/verify-user-email/` | POST | Email verification | No |
| `/api/accounts/forgot-user-password/` | POST | Request password reset | No |
| `/api/accounts/confirm-password-otp/` | POST | Verify OTP code | No |
| `/api/accounts/resend-password-otp/` | POST | Resend OTP code | No |
| `/api/accounts/new-password-reset/` | POST | Reset password | No |

## Success Criteria Checklist

- ✅ User can register with valid credentials
- ✅ Email verification works
- ✅ User can sign in with correct credentials
- ✅ Invalid credentials are rejected
- ✅ Password strength indicator updates in real-time
- ✅ Password reset flow completes successfully
- ✅ OTP verification works
- ✅ Logout clears all session data
- ✅ Form validation works in real-time
- ✅ Error messages are clear and helpful
- ✅ Loading states are visible during API calls
- ✅ Toast notifications appear for all actions
- ✅ Dark mode works correctly
- ✅ Responsive design works on all devices
- ✅ Keyboard navigation works
- ✅ No console errors
- ✅ Session persists across page reloads
- ✅ Protected routes redirect to login when not authenticated

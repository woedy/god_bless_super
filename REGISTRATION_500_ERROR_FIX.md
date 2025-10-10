# Registration 500 Error - Troubleshooting Guide

## Error
```
POST https://yourdomain.com/api/accounts/register-user/
HTTP 500 Internal Server Error
```

## Common Causes & Solutions

### 1. Check Backend Logs (MOST IMPORTANT)

In Coolify, go to your **app service** and check the logs. Look for Python traceback errors around the time you tried to register. The error will tell you exactly what's wrong.

**Common errors you might see:**
- `relation "accounts_user" does not exist` → Database migration issue
- `SMTP connection failed` → Email configuration issue
- `IntegrityError` → Database constraint violation
- `KeyError` → Missing environment variable

---

### 2. Database Migrations Not Applied

**Symptoms:** Error mentions missing tables or relations

**Solution:** Run migrations manually in Coolify

1. Go to Coolify → Your app service
2. Open **Terminal/Console**
3. Run:
```bash
python manage.py migrate
python manage.py migrate accounts
```

---

### 3. Email Configuration Issue

**Symptoms:** Error mentions SMTP, email, or mail server

**Solution:** Either configure email properly OR disable email verification

#### Option A: Configure Email (Recommended)
Add these to Coolify environment variables:
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_PORT=587
EMAIL_USE_TLS=true
```

#### Option B: Disable Email Verification (Quick Fix)
In Coolify terminal:
```bash
# Edit settings to skip email verification
python manage.py shell
>>> from django.conf import settings
>>> # Check if email backend is causing issues
```

---

### 4. Database Connection Issue

**Symptoms:** Error mentions database connection, PostgreSQL, or connection refused

**Solution:** Verify database service is running

1. Check Coolify → **database service** is healthy
2. Verify environment variables:
```bash
POSTGRES_HOST=database
POSTGRES_PORT=5432
POSTGRES_DB=god_bless_db
POSTGRES_USER=god_bless_user
POSTGRES_PASSWORD=<your-password>
```

---

### 5. Missing Required Fields

**Symptoms:** Error mentions "required field" or "null value"

**Solution:** Check what data you're sending in registration form

The registration endpoint might require:
- username
- email
- password
- first_name (optional)
- last_name (optional)

---

## Quick Diagnostic Steps

### Step 1: Check if migrations are applied
```bash
# In Coolify app terminal
python manage.py showmigrations accounts
```

Should show `[X]` for all migrations. If you see `[ ]`, run:
```bash
python manage.py migrate accounts
```

### Step 2: Test database connection
```bash
# In Coolify app terminal
python manage.py dbshell
# If this works, database is fine
# Type \q to exit
```

### Step 3: Check Django admin works
Visit: `https://yourdomain.com/admin/`

If admin loads, Django is working. If not, there's a bigger issue.

### Step 4: Create superuser manually
```bash
# In Coolify app terminal
python manage.py createsuperuser
```

If this works, you can log in with this user to test.

---

## Most Likely Issue

Based on typical deployments, the issue is probably:

**Email configuration** - Django is trying to send a verification email but can't connect to SMTP server.

### Quick Fix:

Add to Coolify environment variables:
```bash
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

This will print emails to console instead of sending them, allowing registration to work.

---

## How to Get Exact Error

1. Go to Coolify
2. Click on your **app** service
3. Click **Logs** tab
4. Try to register again
5. Look for Python traceback in logs
6. Share the error message

The traceback will show exactly what's failing, like:
```python
Traceback (most recent call last):
  File "...", line X, in register_user
    send_verification_email(user)
  File "...", line Y, in send_verification_email
    connection.send_messages([email])
SMTPException: Connection refused
```

---

## Need More Help?

Share the **exact error from the backend logs** and I can provide a specific fix!

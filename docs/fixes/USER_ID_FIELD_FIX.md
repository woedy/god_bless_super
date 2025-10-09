# User ID Field Fix

## Issue
When trying to generate phone numbers, getting this error:
```
ValueError: Field 'id' expected a number but got 'f46f6khc76tjmal5e8i92is0r461sju'.
```

## Root Cause
The code was using `User.objects.get(id=user_id)` to query users, but:
- The `id` field in the User model is an **integer** (auto-increment primary key)
- The `user_id` field in the User model is a **string** (custom UUID-like identifier)
- The application uses `user_id` (string) throughout, not `id` (integer)

When the code tried to query `User.objects.get(id='f46f6khc76tjmal5e8i92is0r461sju')`, Django expected an integer for the `id` field but received a string, causing the ValueError.

## Solution

Changed all occurrences of:
```python
User.objects.get(id=user_id)
```

To:
```python
User.objects.get(user_id=user_id)
```

This correctly queries the User model using the `user_id` field (which is a string) instead of the `id` field (which is an integer).

## Files Modified

1. **phone_generator/tasks.py** - Multiple occurrences in:
   - `generate_phone_numbers_task`
   - `validate_phone_numbers_task`
   - `clear_phone_numbers_task`
   - `export_phone_numbers_task`
   - `import_phone_numbers_task`
   - `send_bulk_sms_task`

2. **phone_generator/consumers.py** - In:
   - `PhoneGeneratorConsumer.get_user`
   - `PhoneValidatorConsumer.get_user`

3. **tasks/base.py** - In:
   - `BaseTask.mark_started`

4. **projects/views.py** - In:
   - `add_collaborator_view`
   - `remove_collaborator_view`

## Testing

After restarting the backend server:
1. Try generating phone numbers
2. Try validating phone numbers
3. Try any task-related operations
4. All should work without the ValueError

## Why This Happened

The custom User model has two ID fields:
- `id` - Django's default auto-increment integer primary key
- `user_id` - Custom string field used as the application's user identifier

The application consistently uses `user_id` (the string) in localStorage and API calls, but some backend code was incorrectly trying to query by `id` (the integer).

## Prevention

When querying the User model:
- ✅ Use `User.objects.get(user_id=user_id)` when you have the string user_id
- ✅ Use `User.objects.get(id=pk)` only when you have the integer primary key
- ✅ Use `User.objects.get(email=email)` when querying by email

## Related

This fix ensures all Celery tasks and WebSocket consumers can correctly identify users when processing background tasks like phone number generation and validation.

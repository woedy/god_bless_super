# Browser Cache Issue - How to Fix

## Problem
The frontend code has been updated, but your browser is still using the old cached version without the authentication token.

## Solution: Clear Browser Cache

### Method 1: Hard Refresh (Recommended)
1. Open the page: http://localhost:4173/validate-number
2. Open Developer Tools (F12)
3. **Right-click the refresh button** in the browser toolbar
4. Select **"Empty Cache and Hard Reload"** or **"Hard Reload"**

OR use keyboard shortcut:
- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

### Method 2: Clear All Cache
1. Open Developer Tools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **"Clear storage"** or **"Clear site data"**
4. Check all boxes
5. Click **"Clear data"**
6. Refresh the page

### Method 3: Disable Cache (For Testing)
1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Check **"Disable cache"** checkbox
4. Keep DevTools open
5. Refresh the page

## Verify the Fix

After clearing cache, check the browser console (F12 → Console tab):

### ✅ Success - You should see:
```
Connecting to WebSocket: ws://localhost:4173/ws/tasks/?token=***
WebSocket connected
```

### ❌ Still broken - You'll see:
```
WebSocket connection to 'ws://localhost:6161/ws/tasks/' failed: Insufficient resources
Max reconnection attempts reached
```

## Additional Check

In the **Network** tab of DevTools:
1. Look for the WebSocket connection (filter by "WS")
2. Check the URL - it should include `?token=***`
3. Status should be "101 Switching Protocols" (success)

## If Still Not Working

### Check 1: Verify Frontend is Running
```cmd
docker logs god_bless_backend-god_bless_frontend-1
```

Should show:
```
VITE v4.5.3  ready in 675 ms
➜  Local:   http://localhost:4173/
```

### Check 2: Verify Backend is Running
```cmd
docker logs god_bless_app --tail 10
```

Should show:
```
[INFO] Listening on TCP address 0.0.0.0:6161
```

### Check 3: Test WebSocket Manually

Open browser console and run:
```javascript
const token = localStorage.getItem('token');
console.log('Token:', token ? 'Found' : 'Missing');

if (token) {
  const ws = new WebSocket(`ws://localhost:6161/ws/tasks/?token=${token}`);
  ws.onopen = () => console.log('✅ WebSocket connected!');
  ws.onerror = (e) => console.error('❌ WebSocket error:', e);
  ws.onclose = () => console.log('WebSocket closed');
}
```

If this works but the page doesn't, the issue is with the React component, not the WebSocket.

## Still Having Issues?

1. **Check if you're logged in**: The token must exist in localStorage
   ```javascript
   localStorage.getItem('token')  // Should return a token string
   ```

2. **Check the WebSocket URL in code**: Open DevTools → Sources → find `useTaskWebSocket.ts`
   - Look for the line with `const wsUrl = ...`
   - It should include `?token=${token}`

3. **Restart everything**:
   ```cmd
   cd god_bless_backend
   docker-compose down
   docker-compose up -d --build
   ```

4. **Check for JavaScript errors**: Look in the Console tab for any red errors

## Why This Happens

Browsers aggressively cache JavaScript files for performance. When you update the code:
- The server has the new code ✅
- The browser is still using the old cached code ❌

A hard refresh forces the browser to download fresh files from the server.

# WebSocket Diagnostic Script

## Run This in Browser Console

Go to http://localhost:4173/validate-number and open the browser console (F12), then paste and run this script:

```javascript
console.log('=== WebSocket Diagnostic ===');

// Check 1: Authentication
const token = localStorage.getItem('token');
const userId = localStorage.getItem('user_id');

console.log('1. Authentication Check:');
console.log('   Token exists:', !!token);
console.log('   Token value:', token ? token.substring(0, 20) + '...' : 'MISSING');
console.log('   User ID:', userId || 'MISSING');

if (!token) {
  console.error('❌ NO TOKEN FOUND - You need to log in first!');
} else {
  console.log('✅ Token found');
}

if (!userId) {
  console.error('❌ NO USER ID FOUND - You need to log in first!');
} else {
  console.log('✅ User ID found');
}

// Check 2: WebSocket URL Construction
const baseUrl = 'http://localhost:6161/';
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsHost = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
const wsUrl = `${wsProtocol}//${wsHost}/ws/tasks/?token=${token}`;

console.log('\n2. WebSocket URL:');
console.log('   Protocol:', wsProtocol);
console.log('   Host:', wsHost);
console.log('   Full URL:', wsUrl.replace(token, '***TOKEN***'));

// Check 3: Test WebSocket Connection
console.log('\n3. Testing WebSocket Connection...');

if (token && userId) {
  const testWs = new WebSocket(wsUrl);
  
  testWs.onopen = () => {
    console.log('✅ WebSocket CONNECTED successfully!');
    console.log('   Connection is working properly');
    testWs.close();
  };
  
  testWs.onerror = (error) => {
    console.error('❌ WebSocket ERROR:', error);
    console.error('   Connection failed - check backend logs');
  };
  
  testWs.onclose = (event) => {
    console.log('WebSocket closed');
    console.log('   Code:', event.code);
    console.log('   Reason:', event.reason || 'No reason provided');
    console.log('   Clean:', event.wasClean);
    
    if (event.code === 1006) {
      console.error('❌ Connection closed abnormally - likely authentication failure');
    }
  };
  
  testWs.onmessage = (event) => {
    console.log('📨 Message received:', event.data);
  };
} else {
  console.error('❌ Cannot test WebSocket - missing token or user ID');
  console.error('   Please log in first!');
}

// Check 4: Check if useTaskWebSocket hook is loaded
console.log('\n4. Checking React Hook:');
setTimeout(() => {
  const wsConnections = performance.getEntriesByType('resource')
    .filter(r => r.name.includes('ws://') || r.name.includes('wss://'));
  
  console.log('   WebSocket connections attempted:', wsConnections.length);
  wsConnections.forEach((conn, i) => {
    console.log(`   ${i + 1}. ${conn.name}`);
  });
}, 2000);

console.log('\n=== End Diagnostic ===');
console.log('\nNext Steps:');
console.log('1. If token/userId is missing → Log in again');
console.log('2. If WebSocket connects but closes immediately → Check backend logs');
console.log('3. If WebSocket fails to connect → Check if backend is running');
console.log('4. Run: docker logs god_bless_app --tail 50');
```

## What to Look For

### ✅ Success Output:
```
=== WebSocket Diagnostic ===
1. Authentication Check:
   Token exists: true
   Token value: abc123def456...
   User ID: 8
✅ Token found
✅ User ID found

2. WebSocket URL:
   Protocol: ws:
   Host: localhost:6161
   Full URL: ws://localhost:6161/ws/tasks/?token=***TOKEN***

3. Testing WebSocket Connection...
✅ WebSocket CONNECTED successfully!
   Connection is working properly
```

### ❌ Problem: No Token
```
1. Authentication Check:
   Token exists: false
   Token value: MISSING
   User ID: MISSING
❌ NO TOKEN FOUND - You need to log in first!
❌ NO USER ID FOUND - You need to log in first!
```

**Solution**: Log out and log in again

### ❌ Problem: Connection Closes Immediately
```
3. Testing WebSocket Connection...
WebSocket closed
   Code: 1006
   Reason: 
   Clean: false
❌ Connection closed abnormally - likely authentication failure
```

**Solution**: Check backend logs for authentication errors

## Backend Logs Check

After running the diagnostic, check backend logs:

```cmd
docker logs god_bless_app --tail 50
```

Look for:
```
[WS Auth] Query string: token=abc123...
[WS Auth] Token present: True
[WS Auth] User authenticated: username
```

If you see:
```
[WS Auth] Token present: False
[WS Auth] No token provided, user is anonymous
```

Then the frontend is NOT sending the token (browser cache issue).

## Clear Cache and Retry

If the diagnostic shows the token exists but the WebSocket still fails:

1. **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear all site data**:
   - F12 → Application → Clear storage → Clear site data
3. **Restart frontend container**:
   ```cmd
   cd god_bless_backend
   docker-compose restart god_bless_backend-god_bless_frontend-1
   ```
4. **Log out and log in again**

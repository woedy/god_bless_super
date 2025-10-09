/**
 * Simple WebSocket Connection Test
 * Tests basic WebSocket connectivity and authentication
 */

const WebSocket = require('ws')

const API_BASE_URL = 'http://localhost:6161'
const WS_BASE_URL = 'ws://localhost:6161'

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpass123',
  fcm_token: 'test_fcm_token_123'
}

async function testWebSocketEndpoints() {
  console.log('🔌 Testing WebSocket Endpoints...')
  
  // First authenticate to get token
  console.log('\n1. Authenticating...')
  const loginResponse = await fetch(`${API_BASE_URL}/api/accounts/login-user/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  })
  
  const loginData = await loginResponse.json()
  if (!loginResponse.ok || !loginData.data?.token) {
    console.log('❌ Authentication failed')
    return
  }
  
  const token = loginData.data.token
  console.log('✅ Authentication successful')
  console.log(`   Token: ${token.substring(0, 20)}...`)
  
  // Test different WebSocket endpoints
  const endpoints = [
    '/ws/',
    '/ws/tasks/',
    '/ws/notifications/',
    '/ws/phone-numbers/',
    '/websocket/',
    '/api/ws/'
  ]
  
  console.log('\n2. Testing WebSocket endpoints...')
  
  for (const endpoint of endpoints) {
    await testWebSocketEndpoint(endpoint, token)
  }
}

function testWebSocketEndpoint(endpoint, token) {
  return new Promise((resolve) => {
    const wsUrl = `${WS_BASE_URL}${endpoint}`
    console.log(`\n   Testing: ${wsUrl}`)
    
    try {
      // Try different authentication methods
      const authMethods = [
        // Method 1: Token in URL
        () => new WebSocket(`${wsUrl}?token=${token}`),
        // Method 2: Token in headers (if supported)
        () => new WebSocket(wsUrl, { headers: { 'Authorization': `Token ${token}` } }),
        // Method 3: No auth
        () => new WebSocket(wsUrl)
      ]
      
      let methodIndex = 0
      
      function tryNextMethod() {
        if (methodIndex >= authMethods.length) {
          console.log(`   ❌ All methods failed for ${endpoint}`)
          resolve()
          return
        }
        
        const method = authMethods[methodIndex]
        methodIndex++
        
        try {
          const ws = method()
          
          const timeout = setTimeout(() => {
            ws.close()
            tryNextMethod()
          }, 3000)
          
          ws.on('open', () => {
            clearTimeout(timeout)
            console.log(`   ✅ Connected to ${endpoint} (method ${methodIndex})`)
            
            // Send a test message
            ws.send(JSON.stringify({
              type: 'ping',
              data: { test: true }
            }))
            
            setTimeout(() => {
              ws.close()
              resolve()
            }, 1000)
          })
          
          ws.on('message', (data) => {
            console.log(`   📨 Message from ${endpoint}:`, data.toString())
          })
          
          ws.on('error', (error) => {
            clearTimeout(timeout)
            console.log(`   ⚠️ Error on ${endpoint} (method ${methodIndex}):`, error.message)
            tryNextMethod()
          })
          
          ws.on('close', (code, reason) => {
            clearTimeout(timeout)
            if (code !== 1000) {
              console.log(`   ⚠️ Closed ${endpoint} (method ${methodIndex}): ${code} - ${reason}`)
              tryNextMethod()
            }
          })
          
        } catch (error) {
          console.log(`   ⚠️ Failed to create WebSocket for ${endpoint} (method ${methodIndex}):`, error.message)
          tryNextMethod()
        }
      }
      
      tryNextMethod()
      
    } catch (error) {
      console.log(`   ❌ Error testing ${endpoint}:`, error.message)
      resolve()
    }
  })
}

// Test if backend supports WebSocket at all
async function testWebSocketSupport() {
  console.log('\n3. Testing general WebSocket support...')
  
  // Try to connect to root WebSocket
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_BASE_URL}/`)
    
    const timeout = setTimeout(() => {
      ws.close()
      console.log('   ⚠️ WebSocket connection timeout')
      resolve(false)
    }, 5000)
    
    ws.on('open', () => {
      clearTimeout(timeout)
      console.log('   ✅ Basic WebSocket connection successful')
      ws.close()
      resolve(true)
    })
    
    ws.on('error', (error) => {
      clearTimeout(timeout)
      console.log('   ❌ WebSocket not supported:', error.message)
      resolve(false)
    })
  })
}

async function main() {
  console.log('🚀 WebSocket Connectivity Test')
  console.log('Testing WebSocket endpoints and authentication methods')
  
  try {
    await testWebSocketEndpoints()
    await testWebSocketSupport()
    
    console.log('\n📊 WebSocket Test Summary:')
    console.log('• Tested multiple WebSocket endpoints')
    console.log('• Tested different authentication methods')
    console.log('• Checked basic WebSocket support')
    console.log('\nIf no endpoints worked, the backend may not have WebSocket support configured.')
    console.log('This is normal - the system can work with HTTP polling as fallback.')
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

main().catch(console.error)
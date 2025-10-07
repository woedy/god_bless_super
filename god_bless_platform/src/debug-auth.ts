/**
 * Authentication Debug Helper
 * Simple script to check authentication state and test login
 */

import { authService, apiClient } from './services'

export async function debugAuthentication() {
  console.log('🔍 Authentication Debug Report')
  console.log('================================')
  
  // Check stored tokens
  const authToken = localStorage.getItem('god_bless_auth_token')
  const userData = localStorage.getItem('god_bless_user_data')
  
  console.log('📦 Local Storage Check:')
  console.log('- Auth Token exists:', !!authToken)
  console.log('- User Data exists:', !!userData)
  
  if (authToken) {
    console.log('- Token preview:', authToken.substring(0, 20) + '...')
  }
  
  if (userData) {
    try {
      const user = JSON.parse(userData)
      console.log('- User ID:', user.id || user.user_id)
      console.log('- User Email:', user.email)
    } catch (error) {
      console.error('- Error parsing user data:', error)
    }
  }
  
  // Check API client state
  console.log('\n🔧 API Client State:')
  console.log('- Is Authenticated:', apiClient.isAuthenticated())
  console.log('- Auth Token:', apiClient.getAuthToken() ? 'Present' : 'Missing')
  
  // Check auth service state
  console.log('\n👤 Auth Service State:')
  console.log('- Is Authenticated:', authService.isAuthenticated())
  console.log('- Stored User:', authService.getStoredUser() ? 'Present' : 'Missing')
  
  return {
    hasToken: !!authToken,
    hasUserData: !!userData,
    apiClientAuth: apiClient.isAuthenticated(),
    authServiceAuth: authService.isAuthenticated()
  }
}

// Test login function
export async function testLogin(email: string, password: string) {
  console.log('\n🧪 Testing Login...')
  console.log('Email:', email)
  
  try {
    const result = await authService.login({
      email,
      password,
      rememberMe: true
    })
    
    console.log('✅ Login successful!')
    console.log('- Token received:', !!result.token)
    console.log('- User data:', result.user.email)
    
    // Check if data was stored
    await debugAuthentication()
    
    return result
  } catch (error) {
    console.error('❌ Login failed:', error)
    throw error
  }
}

// Auto-run debug on import in development
if (import.meta.env.DEV) {
  debugAuthentication()
}
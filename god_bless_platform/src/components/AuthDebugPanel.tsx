/**
 * Authentication Debug Panel
 * Component to help debug authentication issues
 */

import { useState } from 'react'
import { debugAuthentication, testLogin } from '../debug-auth'
import { projectService } from '../services'

export function AuthDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<any[]>([])

  const handleDebugAuth = async () => {
    const info = await debugAuthentication()
    setDebugInfo(info)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      await testLogin(loginForm.email, loginForm.password)
      await handleDebugAuth()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleTestProjects = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await projectService.getProjects({ pageSize: 10 })
      setProjects(response.data.results)
      console.log('Projects loaded successfully:', response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
      console.error('Projects error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white border rounded-lg shadow-sm max-w-2xl">
      <h2 className="text-xl font-bold mb-4">🔍 Authentication Debug Panel</h2>
      
      {/* Debug Info */}
      <div className="mb-6">
        <button
          onClick={handleDebugAuth}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Check Auth Status
        </button>
        
        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Debug Results:</h3>
            <ul className="space-y-1 text-sm">
              <li>Has Token: {debugInfo.hasToken ? '✅' : '❌'}</li>
              <li>Has User Data: {debugInfo.hasUserData ? '✅' : '❌'}</li>
              <li>API Client Auth: {debugInfo.apiClientAuth ? '✅' : '❌'}</li>
              <li>Auth Service Auth: {debugInfo.authServiceAuth ? '✅' : '❌'}</li>
            </ul>
          </div>
        )}
      </div>

      {/* Login Form */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Test Login</h3>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={loginForm.email}
            onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
            className="w-full px-3 py-2 border rounded"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Test Login'}
          </button>
        </form>
      </div>

      {/* Test Projects */}
      <div className="mb-6">
        <button
          onClick={handleTestProjects}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Test Load Projects'}
        </button>
        
        {projects.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 rounded">
            <h4 className="font-semibold text-green-800">Projects Loaded Successfully!</h4>
            <p className="text-green-700">Found {projects.length} projects</p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h4 className="font-semibold text-red-800">Error:</h4>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h4 className="font-semibold text-blue-800">Instructions:</h4>
        <ol className="text-blue-700 text-sm mt-2 space-y-1">
          <li>1. Click "Check Auth Status" to see current authentication state</li>
          <li>2. If not authenticated, use the login form to test authentication</li>
          <li>3. Once logged in, click "Test Load Projects" to test the API</li>
          <li>4. Check the browser console for detailed logs</li>
        </ol>
      </div>
    </div>
  )
}
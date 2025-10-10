/**
 * Environment Configuration System
 * Handles environment variables with validation and type safety
 */

export interface EnvironmentConfig {
  // API Configuration
  apiUrl: string
  wsUrl: string
  
  // Application Configuration
  appName: string
  version: string
  environment: 'development' | 'production' | 'test'
  
  // Optional Configuration
  enableAnalytics: boolean
  sentryDsn?: string
}

/**
 * Validates that required environment variables are present
 */
function validateEnvironment(): void {
  const requiredVars = [
    'VITE_API_URL',
    'VITE_WS_URL',
    'VITE_APP_NAME',
    'VITE_VERSION',
    'VITE_ENVIRONMENT'
  ]

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file or environment configuration.'
    )
  }

  // Validate environment value
  const validEnvironments = ['development', 'production', 'test']
  const environment = import.meta.env.VITE_ENVIRONMENT
  if (!validEnvironments.includes(environment)) {
    throw new Error(
      `Invalid VITE_ENVIRONMENT value: ${environment}\n` +
      `Must be one of: ${validEnvironments.join(', ')}`
    )
  }

  // Validate URLs (allow relative paths for production builds)
  const apiUrl = import.meta.env.VITE_API_URL
  if (!apiUrl.startsWith('/') && !apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    throw new Error(`Invalid VITE_API_URL: ${apiUrl}. Must be a relative path (/) or full URL (http/https)`)
  }

  // Validate WebSocket URL format (allow relative paths)
  const wsUrl = import.meta.env.VITE_WS_URL
  if (!wsUrl.startsWith('/') && !wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
    throw new Error(`Invalid VITE_WS_URL format: ${wsUrl}. Must be a relative path (/) or full URL (ws/wss)`)
  }
}

/**
 * Creates and validates the environment configuration
 */
function createEnvironmentConfig(): EnvironmentConfig {
  validateEnvironment()

  return {
    // API Configuration
    apiUrl: import.meta.env.VITE_API_URL,
    wsUrl: import.meta.env.VITE_WS_URL,
    
    // Application Configuration
    appName: import.meta.env.VITE_APP_NAME,
    version: import.meta.env.VITE_VERSION,
    environment: import.meta.env.VITE_ENVIRONMENT as 'development' | 'production' | 'test',
    
    // Optional Configuration
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    sentryDsn: import.meta.env.VITE_SENTRY_DSN || undefined
  }
}

// Export the validated configuration
export const config = createEnvironmentConfig()

// Export individual configuration sections for convenience
export const apiConfig = {
  baseUrl: config.apiUrl,
  wsUrl: config.wsUrl
}

export const appConfig = {
  name: config.appName,
  version: config.version,
  environment: config.environment,
  isDevelopment: config.environment === 'development',
  isProduction: config.environment === 'production',
  isTest: config.environment === 'test'
}

export const featureConfig = {
  enableAnalytics: config.enableAnalytics,
  sentryDsn: config.sentryDsn
}

// Development helpers
if (appConfig.isDevelopment) {
  console.log('🔧 Environment Configuration:', {
    environment: config.environment,
    apiUrl: config.apiUrl,
    wsUrl: config.wsUrl,
    appName: config.appName,
    version: config.version
  })
}
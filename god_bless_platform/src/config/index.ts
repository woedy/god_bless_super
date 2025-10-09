/**
 * Configuration Index
 * Central export point for all configuration modules
 */

export {
  config,
  apiConfig,
  appConfig,
  featureConfig,
  type EnvironmentConfig
} from './environment'

export * from './constants'
export * from './routes'

// Re-export for convenience
import { apiConfig, appConfig } from './environment'

export const {
  baseUrl: API_BASE_URL,
  wsUrl: WS_URL
} = apiConfig

export const {
  name: APP_NAME,
  version: APP_VERSION,
  environment: ENVIRONMENT,
  isDevelopment: IS_DEVELOPMENT,
  isProduction: IS_PRODUCTION,
  isTest: IS_TEST
} = appConfig
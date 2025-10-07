interface EnvironmentConfig {
  VITE_API_URL: string;
  VITE_WS_URL: string;
  VITE_APP_NAME: string;
  VITE_VERSION: string;
  VITE_ENVIRONMENT: string;
}

const config: EnvironmentConfig = {
  VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  VITE_WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws',
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME || 'God Bless Platform',
  VITE_VERSION: import.meta.env.VITE_VERSION || '1.0.0',
  VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || 'development',
};

export default config;
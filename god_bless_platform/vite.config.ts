import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')

  // Get API configuration from environment variables
  const apiUrl = env.VITE_API_URL || 'http://localhost:6161/api'
  const wsUrl = env.VITE_WS_URL || 'ws://localhost:6161/ws'

  // Extract host and port from API URL for proxy configuration
  const apiUrlObj = new URL(apiUrl)
  const backendHost = apiUrlObj.hostname
  const backendPort = apiUrlObj.port || (apiUrlObj.protocol === 'https:' ? '443' : '80')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: `${apiUrlObj.protocol}//${backendHost}:${backendPort}`,
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: wsUrl,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
          },
        },
      },
    },
  }
})

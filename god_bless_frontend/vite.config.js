import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // allow access from external IPs
    port: 5173,  // match docker port
    watch: {
      usePolling: true,
    },
    hmr: {
      port: 5173,
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['react-icons', 'react-hot-toast', 'react-toastify'],
          'chart-vendor': ['apexcharts', 'react-apexcharts'],
          'data-vendor': ['papaparse'],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-icons',
      'react-hot-toast',
    ],
  },
  // Ensure React is resolved correctly
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})


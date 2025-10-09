import '@testing-library/jest-dom';

// Mock environment variables for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_URL: 'http://localhost:8000/api',
    VITE_WS_URL: 'ws://localhost:8000/ws',
    VITE_APP_NAME: 'God Bless Platform',
    VITE_VERSION: '1.0.0',
    VITE_ENVIRONMENT: 'test',
  },
  writable: true,
});

// Mock WebSocket for tests
(globalThis as any).WebSocket = class MockWebSocket {
  constructor(_url: string) {
    // Mock implementation
  }
  
  close() {}
  send() {}
  
  addEventListener() {}
  removeEventListener() {}
};
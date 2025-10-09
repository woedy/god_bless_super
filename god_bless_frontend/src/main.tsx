import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

// Import CSS files after React to avoid any potential conflicts
import './css/style.css';
import './css/satoshi.css';
import 'jsvectormap/dist/css/jsvectormap.css';
import 'flatpickr/dist/flatpickr.min.css';

// Debug React version
console.log('React version:', React.version);
console.log('ReactDOM version:', ReactDOM.version);

// Ensure DOM is ready and root element exists
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure you have a div with id="root" in your HTML.');
}

// Create React root with error handling
try {
  console.log('Creating React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('Rendering React application...');
  root.render(
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <App />
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
  console.log('React application rendered successfully');
} catch (error) {
  console.error('Failed to render React application:', error);
  console.error('Error stack:', error.stack);
  
  // Fallback error display
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, sans-serif;">
      <div style="text-align: center; padding: 2rem;">
        <h1 style="color: #dc2626; margin-bottom: 1rem;">Application Failed to Load</h1>
        <p style="color: #6b7280; margin-bottom: 1rem;">There was an error initializing the application.</p>
        <p style="color: #6b7280; margin-bottom: 1rem; font-family: monospace; font-size: 12px;">${error.message}</p>
        <button onclick="window.location.reload()" style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; cursor: pointer;">
          Reload Page
        </button>
      </div>
    </div>
  `;
}

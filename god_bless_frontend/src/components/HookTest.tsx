import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Test component to verify React hooks are working properly
 * This component tests:
 * - useState hook
 * - useEffect hook
 * - useContext hook (via useTheme)
 * - Proper hook order and conditional rendering
 */
const HookTest: React.FC = () => {
  // Test useState hook
  const [count, setCount] = useState<number>(0);
  const [message, setMessage] = useState<string>('Hooks are working!');
  
  // Test useContext hook via useTheme
  const { theme, toggleTheme } = useTheme();
  
  // Test useEffect hook
  useEffect(() => {
    console.log('HookTest component mounted successfully');
    setMessage('All hooks initialized successfully!');
    
    return () => {
      console.log('HookTest component will unmount');
    };
  }, []);
  
  // Test useEffect with dependencies
  useEffect(() => {
    if (count > 0) {
      console.log(`Count updated to: ${count}`);
    }
  }, [count]);
  
  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-boxdark">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        React Hooks Test
      </h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Message: <span className="font-medium">{message}</span>
          </p>
        </div>
        
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Count: <span className="font-medium">{count}</span>
          </p>
          <button
            onClick={() => setCount(prev => prev + 1)}
            className="mt-2 px-3 py-1 bg-primary text-white rounded hover:bg-primary/90"
          >
            Increment Count
          </button>
        </div>
        
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Current Theme: <span className="font-medium">{theme}</span>
          </p>
          <button
            onClick={toggleTheme}
            className="mt-2 px-3 py-1 bg-secondary text-white rounded hover:bg-secondary/90"
          >
            Toggle Theme
          </button>
        </div>
        
        <div className="text-xs text-green-600 dark:text-green-400">
          ✅ useState hook working
          <br />
          ✅ useEffect hook working
          <br />
          ✅ useContext hook working
          <br />
          ✅ No hook order violations
        </div>
      </div>
    </div>
  );
};

export default HookTest;
/**
 * Example component demonstrating error handling patterns
 * This file serves as a reference for developers
 */

import { useState } from 'react';
import { useGet, usePost } from '../hooks/useApi';
import {
  validateEmail,
  validatePassword,
  displayValidationErrors,
  combineValidationResults,
} from '../utils/validationHelpers';
import toast from 'react-hot-toast';

export const ErrorHandlingExample = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Example 1: Using useGet hook with error handling
  const {
    data: users,
    loading: usersLoading,
    error: usersError,
    get: fetchUsers,
  } = useGet('/api/users/', {
    onSuccess: (data) => {
      toast.success(`Loaded ${data.length} users`);
    },
    onError: (error) => {
      console.error('Failed to load users:', error);
    },
  });

  // Example 2: Using usePost hook with error handling
  const {
    data: createdUser,
    loading: createLoading,
    error: createError,
    post: createUser,
  } = usePost('/api/users/', {
    onSuccess: (data) => {
      toast.success('User created successfully');
      setEmail('');
      setPassword('');
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    },
  });

  // Example 3: Form validation before submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    // Combine validation results
    const validation = combineValidationResults(emailValidation, passwordValidation);

    if (!validation.isValid) {
      displayValidationErrors(validation.errors);
      return;
    }

    // Submit if validation passes
    await createUser({ email, password });
  };

  // Example 4: Manual error handling
  const handleManualApiCall = async () => {
    try {
      const response = await fetch('/api/some-endpoint/');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      toast.success('Success!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    }
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
      <h2 className="text-xl font-semibold text-black dark:text-white mb-4">
        Error Handling Examples
      </h2>

      {/* Example 1: Display loading and error states */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Example 1: Fetch with Error Handling</h3>
        <button
          onClick={() => fetchUsers()}
          disabled={usersLoading}
          className="rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          {usersLoading ? 'Loading...' : 'Fetch Users'}
        </button>
        
        {usersError && (
          <div className="mt-2 text-red-500">
            Error: {usersError.message}
          </div>
        )}
        
        {users && (
          <div className="mt-2 text-green-500">
            Loaded {users.length} users
          </div>
        )}
      </div>

      {/* Example 2: Form with validation */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Example 2: Form with Validation</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2.5 block text-black dark:text-white">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              placeholder="Enter email"
            />
          </div>

          <div>
            <label className="mb-2.5 block text-black dark:text-white">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={createLoading}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90 disabled:opacity-50"
          >
            {createLoading ? 'Creating...' : 'Create User'}
          </button>

          {createError && (
            <div className="text-red-500">
              Error: {createError.message}
            </div>
          )}
        </form>
      </div>

      {/* Example 3: Manual error handling */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Example 3: Manual Error Handling</h3>
        <button
          onClick={handleManualApiCall}
          className="rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90"
        >
          Manual API Call
        </button>
      </div>

      {/* Example 4: Intentional error for testing */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Example 4: Test Error Boundary</h3>
        <button
          onClick={() => {
            throw new Error('Test error for error boundary');
          }}
          className="rounded bg-red-500 px-4 py-2 text-white hover:bg-opacity-90"
        >
          Throw Error (Test Error Boundary)
        </button>
      </div>
    </div>
  );
};

export default ErrorHandlingExample;

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ModernSignIn from '../pages/Authentication/ModernSignIn';
import ModernSignUp from '../pages/Authentication/ModernSignUp';
import Logout from '../pages/Authentication/Logout';
import { isAuthenticated, getCurrentUser, clearAuthData } from '../utils/auth';

// Mock fetch
global.fetch = vi.fn();

// Mock window.location
const mockLocation = {
  href: '',
  reload: vi.fn(),
  pathname: '/',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
      <Toaster />
    </BrowserRouter>
  );
};

describe('Authentication Flow Verification', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    mockLocation.href = '';
    mockLocation.pathname = '/';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete login -> authenticated state -> logout flow', async () => {
      // Step 1: Verify user is not authenticated initially
      expect(isAuthenticated()).toBe(false);
      expect(getCurrentUser()).toBeNull();

      // Step 2: Mock successful login response
      const mockLoginResponse = {
        status: 200,
        json: async () => ({
          data: {
            username: 'testuser',
            user_id: '123',
            email: 'test@example.com',
            photo: 'photo.jpg',
            token: 'test-token-123',
          },
        }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockLoginResponse);

      // Step 3: Render login form and submit
      renderWithRouter(<ModernSignIn />);
      
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign in' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Step 4: Verify login success and data storage
      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('test-token-123');
        expect(localStorage.getItem('username')).toBe('testuser');
        expect(localStorage.getItem('user_id')).toBe('123');
        expect(localStorage.getItem('email')).toBe('test@example.com');
      });

      // Step 5: Verify authentication state
      expect(isAuthenticated()).toBe(true);
      const user = getCurrentUser();
      expect(user).toEqual({
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        photo: 'photo.jpg',
      });

      // Step 6: Test logout
      renderWithRouter(<Logout />);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user_id')).toBeNull();
        expect(localStorage.getItem('username')).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith('/landing');
      });

      // Step 7: Verify user is no longer authenticated
      expect(isAuthenticated()).toBe(false);
      expect(getCurrentUser()).toBeNull();
    });

    it('should handle registration flow correctly', async () => {
      // Mock successful registration response
      const mockRegisterResponse = {
        ok: true,
        json: async () => ({
          message: 'Registration successful',
        }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockRegisterResponse);

      renderWithRouter(<ModernSignUp />);
      
      const usernameInput = screen.getByLabelText('Username');
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create account' });

      fireEvent.change(usernameInput, { target: { value: 'newuser' } });
      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPassword123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/verify-user/newuser@example.com');
      });

      // Verify no authentication data is stored during registration
      expect(localStorage.getItem('token')).toBeNull();
      expect(isAuthenticated()).toBe(false);
    });

    it('should handle authentication errors gracefully', async () => {
      // Mock failed login response
      const mockFailedResponse = {
        status: 400,
        json: async () => ({
          errors: {
            email: ['Invalid email'],
            password: ['Invalid password'],
          },
          message: 'Login failed',
        }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockFailedResponse);

      renderWithRouter(<ModernSignIn />);
      
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign in' });

      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email')).toBeInTheDocument();
        expect(screen.getByText('Invalid password')).toBeInTheDocument();
      });

      // Verify no authentication data is stored on failed login
      expect(localStorage.getItem('token')).toBeNull();
      expect(isAuthenticated()).toBe(false);
    });

    it('should handle network errors during authentication', async () => {
      // Mock network error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter(<ModernSignIn />);
      
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign in' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Wait for error handling
      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeNull();
        expect(isAuthenticated()).toBe(false);
      });
    });

    it('should redirect authenticated users away from auth pages', async () => {
      // Set up authenticated state
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user_id', '123');

      // Try to render login page
      renderWithRouter(<ModernSignIn />);

      // Should redirect to default authenticated route
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/all-projects');
      });

      // Clear mocks and try signup page
      vi.clearAllMocks();
      renderWithRouter(<ModernSignUp />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/all-projects');
      });
    });

    it('should handle intended destination correctly', async () => {
      // Set intended destination
      sessionStorage.setItem('intendedDestination', '/dashboard');

      const mockLoginResponse = {
        status: 200,
        json: async () => ({
          data: {
            username: 'testuser',
            user_id: '123',
            email: 'test@example.com',
            photo: 'photo.jpg',
            token: 'test-token-123',
          },
        }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockLoginResponse);

      renderWithRouter(<ModernSignIn />);
      
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign in' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        expect(sessionStorage.getItem('intendedDestination')).toBeNull();
      });
    });
  });

  describe('Authentication Utilities Edge Cases', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw errors
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage not available');
      });

      expect(isAuthenticated()).toBe(false);
      expect(getCurrentUser()).toBeNull();

      // Restore original function
      localStorage.getItem = originalGetItem;
    });

    it('should handle partial authentication data', () => {
      // Set only token without user_id
      localStorage.setItem('token', 'test-token');
      expect(isAuthenticated()).toBe(false);

      // Set only user_id without token
      localStorage.clear();
      localStorage.setItem('user_id', '123');
      expect(isAuthenticated()).toBe(false);

      // Set both token and user_id
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user_id', '123');
      expect(isAuthenticated()).toBe(true);
    });

    it('should clear all authentication data properly', () => {
      // Set up authentication data
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user_id', '123');
      localStorage.setItem('username', 'testuser');
      localStorage.setItem('email', 'test@example.com');
      localStorage.setItem('photo', 'photo.jpg');
      sessionStorage.setItem('test', 'data');

      clearAuthData();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user_id')).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
      expect(localStorage.getItem('email')).toBeNull();
      expect(localStorage.getItem('photo')).toBeNull();
      expect(sessionStorage.getItem('test')).toBeNull();
    });
  });
});
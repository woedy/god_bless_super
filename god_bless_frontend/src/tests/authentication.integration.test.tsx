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

describe('Authentication System Integration Tests', () => {
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

  describe('ModernSignIn Component', () => {
    it('should render login form correctly', () => {
      renderWithRouter(<ModernSignIn />);
      
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('should validate form fields', async () => {
      renderWithRouter(<ModernSignIn />);
      
      const submitButton = screen.getByRole('button', { name: 'Sign in' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });

    it('should handle successful login', async () => {
      const mockResponse = {
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

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      renderWithRouter(<ModernSignIn />);
      
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign in' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('test-token-123');
        expect(localStorage.getItem('username')).toBe('testuser');
        expect(localStorage.getItem('user_id')).toBe('123');
        expect(localStorage.getItem('email')).toBe('test@example.com');
        expect(mockNavigate).toHaveBeenCalledWith('/all-projects');
      });
    });

    it('should handle login failure', async () => {
      const mockResponse = {
        status: 400,
        json: async () => ({
          errors: {
            email: ['Invalid email'],
            password: ['Invalid password'],
          },
          message: 'Login failed',
        }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      renderWithRouter(<ModernSignIn />);
      
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign in' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email')).toBeInTheDocument();
        expect(screen.getByText('Invalid password')).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBeNull();
      });
    });

    it('should redirect to intended destination after login', async () => {
      sessionStorage.setItem('intendedDestination', '/dashboard');

      const mockResponse = {
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

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

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

  describe('ModernSignUp Component', () => {
    it('should render signup form correctly', () => {
      renderWithRouter(<ModernSignUp />);
      
      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('should validate password strength', async () => {
      renderWithRouter(<ModernSignUp />);
      
      const passwordInput = screen.getByLabelText('Password');
      fireEvent.change(passwordInput, { target: { value: 'weak' } });

      await waitFor(() => {
        expect(screen.getByText('Weak')).toBeInTheDocument();
      });

      fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });

      await waitFor(() => {
        expect(screen.getByText('Strong')).toBeInTheDocument();
      });
    });

    it('should handle successful registration', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          message: 'Registration successful',
        }),
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      renderWithRouter(<ModernSignUp />);
      
      const usernameInput = screen.getByLabelText('Username');
      const emailInput = screen.getByLabelText('Email address');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create account' });

      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPassword123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/verify-user/test@example.com');
      });
    });
  });

  describe('Logout Component', () => {
    it('should clear authentication data and redirect', async () => {
      // Set up authenticated state
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user_id', '123');
      localStorage.setItem('username', 'testuser');

      renderWithRouter(<Logout />);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user_id')).toBeNull();
        expect(localStorage.getItem('username')).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith('/landing');
      });
    });
  });

  describe('Authentication Utilities', () => {
    it('should correctly identify authenticated users', () => {
      expect(isAuthenticated()).toBe(false);

      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user_id', '123');
      expect(isAuthenticated()).toBe(true);
    });

    it('should get current user data', () => {
      expect(getCurrentUser()).toBeNull();

      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user_id', '123');
      localStorage.setItem('username', 'testuser');
      localStorage.setItem('email', 'test@example.com');

      const user = getCurrentUser();
      expect(user).toEqual({
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
      });
    });

    it('should clear authentication data', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user_id', '123');
      sessionStorage.setItem('test', 'data');

      clearAuthData();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user_id')).toBeNull();
      expect(sessionStorage.getItem('test')).toBeNull();
    });
  });

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', () => {
      mockLocation.pathname = '/dashboard';
      
      // Simulate accessing a protected route without authentication
      expect(isAuthenticated()).toBe(false);
      
      // The ProtectedRoute component would handle this redirect
      // This test verifies the authentication check works
    });

    it('should allow authenticated users to access protected routes', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user_id', '123');
      
      expect(isAuthenticated()).toBe(true);
    });
  });
});
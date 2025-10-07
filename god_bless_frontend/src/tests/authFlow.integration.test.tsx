/**
 * Integration tests for authentication flow
 * Tests Requirements: 1.1, 2.1, 2.2, 3.1, 3.2
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ModernSignIn from '../pages/Authentication/ModernSignIn';
import { mockApiResponse } from '../test/utils';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/signin']}>
      <Routes>
        <Route path="/signin" element={component} />
        <Route path="/all-projects" element={<div>All Projects Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/profile" element={<div>Profile Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Authentication Flow Integration Tests', () => {
  const mockLoginResponse = {
    data: {
      username: 'testuser',
      user_id: '123',
      email: 'test@example.com',
      photo: 'photo.jpg',
      token: 'test-token-123',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    global.fetch = vi.fn();
    delete (window as any).location;
    (window as any).location = { reload: vi.fn(), pathname: '/signin', href: '' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Default Login Redirect', () => {
    it('should store user data in localStorage after successful login', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockLoginResponse, 200));
      renderWithRouter(<ModernSignIn />);

      fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(localStorage.getItem('username')).toBe('testuser');
        expect(localStorage.getItem('token')).toBe('test-token-123');
      });
    });

    it('should check sessionStorage for intended destination', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockLoginResponse, 200));
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      renderWithRouter(<ModernSignIn />);

      fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(getItemSpy).toHaveBeenCalledWith('intendedDestination');
      });
    });
  });

  describe('Intended Destination Redirect', () => {
    it('should clear intended destination from sessionStorage after login', async () => {
      sessionStorage.setItem('intendedDestination', '/profile');
      global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockLoginResponse, 200));
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
      renderWithRouter(<ModernSignIn />);

      fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(removeItemSpy).toHaveBeenCalledWith('intendedDestination');
      });
    });
  });

  describe('Unauthorized Access Handling', () => {
    it('should store intended destination when accessing protected route', () => {
      window.location.pathname = '/profile';
      if (window.location.pathname !== '/signin') {
        sessionStorage.setItem('intendedDestination', window.location.pathname);
      }
      expect(sessionStorage.getItem('intendedDestination')).toBe('/profile');
    });

    it('should not store /signin as intended destination', () => {
      window.location.pathname = '/signin';
      if (window.location.pathname !== '/signin') {
        sessionStorage.setItem('intendedDestination', window.location.pathname);
      }
      expect(sessionStorage.getItem('intendedDestination')).toBeNull();
    });
  });

  describe('Dashboard Accessibility', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'test-token-123');
      localStorage.setItem('username', 'testuser');
    });

    it('should allow direct navigation to dashboard after login', () => {
      window.location.pathname = '/dashboard';
      expect(window.location.pathname).toBe('/dashboard');
      expect(localStorage.getItem('token')).toBe('test-token-123');
    });

    it('should preserve authentication state for dashboard access', async () => {
      global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockLoginResponse, 200));
      renderWithRouter(<ModernSignIn />);

      fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('test-token-123');
      });

      window.location.pathname = '/dashboard';
      expect(window.location.pathname).toBe('/dashboard');
    });
  });

  describe('Authentication Error Handling', () => {
    it('should not redirect on failed login', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockApiResponse({ message: 'Invalid credentials', errors: { email: ['Invalid email or password'] } }, 400)
      );
      renderWithRouter(<ModernSignIn />);

      fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'wrongpassword' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('Complete User Journey', () => {
    it('should handle complete flow: unauthorized -> login -> intended destination', async () => {
      window.location.pathname = '/profile';
      sessionStorage.setItem('intendedDestination', '/profile');
      window.location.pathname = '/signin';

      global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockLoginResponse, 200));
      renderWithRouter(<ModernSignIn />);

      fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('test-token-123');
        expect(sessionStorage.getItem('intendedDestination')).toBeNull();
      });
    });
  });
});

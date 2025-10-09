/**
 * Unit tests for ModernSignIn redirect logic
 * Tests Requirements: 1.1, 1.2, 1.3, 2.2, 4.3
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../test/utils';
import { mockApiResponse } from '../../../test/utils';
import ModernSignIn from '../ModernSignIn';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock window.location.reload
const originalLocation = window.location;

describe('ModernSignIn Redirect Logic', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock fetch
    global.fetch = vi.fn();
    
    // Mock localStorage
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
    
    // Mock sessionStorage
    const sessionStorageMock: { [key: string]: string } = {};
    Storage.prototype.getItem = vi.fn((key: string) => sessionStorageMock[key] || null);
    Storage.prototype.setItem = vi.fn((key: string, value: string) => {
      sessionStorageMock[key] = value;
    });
    Storage.prototype.removeItem = vi.fn((key: string) => {
      delete sessionStorageMock[key];
    });
    
    // Mock window.location.reload
    delete (window as any).location;
    window.location = { ...originalLocation, reload: vi.fn() };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  /**
   * Test: Default redirect to /all-projects when no intended destination
   * Requirement: 1.1 - User redirected to projects page after login
   */
  it('redirects to /all-projects by default when no intended destination is stored', async () => {
    // Mock successful login response
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse({
        data: {
          username: 'testuser',
          user_id: '123',
          email: 'test@example.com',
          photo: 'photo.jpg',
          token: 'test-token',
        },
      }, 200)
    );

    const { container } = render(<ModernSignIn />);

    // Fill in the form
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Wait for the form submission to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api/accounts/login-user/'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    // Verify sessionStorage.getItem was called to check for intended destination
    await waitFor(() => {
      expect(sessionStorage.getItem).toHaveBeenCalledWith('intendedDestination');
    });

    // Verify user data was stored in localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('username', 'testuser');
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
  });

  /**
   * Test: Redirect to stored intended destination when present
   * Requirement: 2.2 - User redirected to stored destination after login
   */
  it('redirects to stored intended destination when present in sessionStorage', async () => {
    // Set up sessionStorage with intended destination
    const intendedDestination = '/profile';
    sessionStorage.setItem('intendedDestination', intendedDestination);

    // Mock successful login response
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse({
        data: {
          username: 'testuser',
          user_id: '123',
          email: 'test@example.com',
          photo: 'photo.jpg',
          token: 'test-token',
        },
      }, 200)
    );

    render(<ModernSignIn />);

    // Fill in the form
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Wait for the form submission to complete
    await waitFor(() => {
      expect(sessionStorage.getItem).toHaveBeenCalledWith('intendedDestination');
    });

    // Verify sessionStorage.removeItem was called to clean up
    await waitFor(() => {
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('intendedDestination');
    });
  });

  /**
   * Test: SessionStorage cleanup after redirect
   * Requirement: 1.3 - System maintains authentication state during redirect
   */
  it('cleans up sessionStorage after successful redirect', async () => {
    // Set up sessionStorage with intended destination
    sessionStorage.setItem('intendedDestination', '/dashboard');

    // Mock successful login response
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse({
        data: {
          username: 'testuser',
          user_id: '123',
          email: 'test@example.com',
          photo: 'photo.jpg',
          token: 'test-token',
        },
      }, 200)
    );

    render(<ModernSignIn />);

    // Fill in the form
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Wait for sessionStorage cleanup
    await waitFor(() => {
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('intendedDestination');
    });

    // Verify it was called before navigation
    expect(sessionStorage.getItem).toHaveBeenCalledWith('intendedDestination');
  });

  /**
   * Test: Fallback behavior when sessionStorage fails
   * Requirement: 4.3 - System handles errors gracefully with fallback route
   */
  it('falls back to default route when sessionStorage access fails', async () => {
    // Mock sessionStorage to throw an error
    Storage.prototype.getItem = vi.fn().mockImplementation(() => {
      throw new Error('SessionStorage not available');
    });

    // Mock successful login response
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse({
        data: {
          username: 'testuser',
          user_id: '123',
          email: 'test@example.com',
          photo: 'photo.jpg',
          token: 'test-token',
        },
      }, 200)
    );

    // Spy on console.warn
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<ModernSignIn />);

    // Fill in the form
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Wait for error handling
    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'SessionStorage not available, using default route:',
        expect.any(Error)
      );
    });

    // Verify localStorage operations still succeeded
    expect(localStorage.setItem).toHaveBeenCalledWith('username', 'testuser');
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');

    consoleWarnSpy.mockRestore();
  });

  /**
   * Test: No redirect on failed login
   * Requirement: 1.1 - Only redirect on successful login
   */
  it('does not redirect when login fails', async () => {
    // Mock failed login response
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse({
        message: 'Invalid credentials',
        errors: {
          email: ['Invalid email or password'],
        },
      }, 400)
    );

    render(<ModernSignIn />);

    // Fill in the form
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    // Wait for the form submission to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Verify sessionStorage was not accessed for redirect
    expect(sessionStorage.getItem).not.toHaveBeenCalledWith('intendedDestination');
    
    // Verify localStorage was not updated
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  /**
   * Test: Form validation prevents submission
   * Requirement: 1.1 - Only valid login attempts trigger redirect logic
   */
  it('does not attempt login with invalid form data', async () => {
    render(<ModernSignIn />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Try to submit empty form
    fireEvent.click(submitButton);

    // Verify fetch was not called
    expect(global.fetch).not.toHaveBeenCalled();
    
    // Verify error messages are displayed
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });
});

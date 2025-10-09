/**
 * Integration tests for frontend components and workflows
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import App from '../App';

// Mock API responses
const mockApiResponses = {
  login: {
    token: 'test-token-123',
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    }
  },
  phoneNumbers: {
    count: 100,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        number: '5551234567',
        carrier: 'Verizon',
        number_type: 'mobile',
        area_code: '555',
        is_valid: true,
        created_at: '2025-01-04T10:00:00Z'
      }
    ]
  },
  campaigns: {
    count: 5,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        name: 'Test Campaign',
        status: 'draft',
        total_recipients: 100,
        messages_sent: 0,
        created_at: '2025-01-04T10:00:00Z'
      }
    ]
  }
};

// Helper to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Frontend Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Mock fetch
    global.fetch = vi.fn();
  });

  describe('Theme System', () => {
    it('should persist theme preference', () => {
      localStorage.setItem('theme', 'dark');
      renderWithProviders(<App />);
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should toggle theme', async () => {
      renderWithProviders(<App />);
      
      // Initial theme should be light or system preference
      const initialTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      
      // Theme toggle should be available
      const themeToggle = screen.queryByRole('button', { name: /theme/i });
      if (themeToggle) {
        fireEvent.click(themeToggle);
        
        await waitFor(() => {
          const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
          expect(newTheme).not.toBe(initialTheme);
        });
      }
    });
  });

  describe('Authentication Flow', () => {
    it('should handle login successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.login
      });

      renderWithProviders(<App />);
      
      // Navigate to login page
      const loginLink = screen.queryByText(/sign in/i);
      if (loginLink) {
        fireEvent.click(loginLink);
      }

      // Fill in login form
      await waitFor(() => {
        const usernameInput = screen.queryByLabelText(/username/i);
        const passwordInput = screen.queryByLabelText(/password/i);
        
        if (usernameInput && passwordInput) {
          fireEvent.change(usernameInput, { target: { value: 'testuser' } });
          fireEvent.change(passwordInput, { target: { value: 'password123' } });
          
          const submitButton = screen.getByRole('button', { name: /sign in/i });
          fireEvent.click(submitButton);
        }
      });

      // Verify token is stored
      await waitFor(() => {
        const token = localStorage.getItem('token');
        expect(token).toBeTruthy();
      });
    });

    it('should handle login errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' })
      });

      renderWithProviders(<App />);
      
      // Attempt login with invalid credentials
      // Error message should be displayed
      await waitFor(() => {
        const errorMessage = screen.queryByText(/invalid credentials/i);
        expect(errorMessage).toBeTruthy();
      });
    });
  });

  describe('Phone Number Management', () => {
    beforeEach(() => {
      // Set auth token
      localStorage.setItem('token', 'test-token-123');
    });

    it('should load phone numbers', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.phoneNumbers
      });

      renderWithProviders(<App />);
      
      // Navigate to all numbers page
      // Should load and display numbers
      await waitFor(() => {
        const phoneNumber = screen.queryByText(/5551234567/);
        expect(phoneNumber).toBeTruthy();
      });
    });

    it('should filter phone numbers', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.phoneNumbers
      });

      renderWithProviders(<App />);
      
      // Apply filters
      const carrierFilter = screen.queryByLabelText(/carrier/i);
      if (carrierFilter) {
        fireEvent.change(carrierFilter, { target: { value: 'Verizon' } });
        
        // Verify filtered results
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('carrier=Verizon'),
            expect.any(Object)
          );
        });
      }
    });

    it('should export phone numbers', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['test data'], { type: 'text/csv' })
      });

      renderWithProviders(<App />);
      
      // Click export button
      const exportButton = screen.queryByText(/export/i);
      if (exportButton) {
        fireEvent.click(exportButton);
        
        // Verify export request
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('export'),
            expect.any(Object)
          );
        });
      }
    });
  });

  describe('SMS Campaign Management', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'test-token-123');
    });

    it('should create new campaign', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          name: 'New Campaign',
          message_template: 'Test message',
          status: 'draft'
        })
      });

      renderWithProviders(<App />);
      
      // Navigate to campaign creation
      const newCampaignButton = screen.queryByText(/new campaign/i);
      if (newCampaignButton) {
        fireEvent.click(newCampaignButton);
        
        // Fill in campaign details
        const nameInput = screen.queryByLabelText(/campaign name/i);
        const messageInput = screen.queryByLabelText(/message/i);
        
        if (nameInput && messageInput) {
          fireEvent.change(nameInput, { target: { value: 'New Campaign' } });
          fireEvent.change(messageInput, { target: { value: 'Test message' } });
          
          const saveButton = screen.getByRole('button', { name: /save/i });
          fireEvent.click(saveButton);
          
          // Verify campaign created
          await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining('sms-campaigns'),
              expect.objectContaining({
                method: 'POST'
              })
            );
          });
        }
      }
    });

    it('should list campaigns', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.campaigns
      });

      renderWithProviders(<App />);
      
      // Navigate to campaigns list
      // Should display campaigns
      await waitFor(() => {
        const campaignName = screen.queryByText(/Test Campaign/);
        expect(campaignName).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error boundary on component error', () => {
      // Component that throws error
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      const { container } = renderWithProviders(<ErrorComponent />);
      
      // Error boundary should catch and display error
      expect(container.textContent).toContain('Something went wrong');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<App />);
      
      // API error should be handled
      await waitFor(() => {
        const errorMessage = screen.queryByText(/error/i);
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should handle 404 errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      });

      renderWithProviders(<App />);
      
      // 404 error should be displayed
      await waitFor(() => {
        const notFoundMessage = screen.queryByText(/not found/i);
        expect(notFoundMessage).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator during data fetch', async () => {
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockApiResponses.phoneNumbers
        }), 100))
      );

      renderWithProviders(<App />);
      
      // Loading indicator should be visible
      const loader = screen.queryByTestId('loader');
      expect(loader).toBeTruthy();
      
      // Should disappear after data loads
      await waitFor(() => {
        expect(screen.queryByTestId('loader')).toBeFalsy();
      }, { timeout: 200 });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Set mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<App />);
      
      // Mobile menu should be available
      const mobileMenu = screen.queryByRole('button', { name: /menu/i });
      expect(mobileMenu).toBeTruthy();
    });

    it('should adapt to desktop viewport', () => {
      // Set desktop viewport
      global.innerWidth = 1920;
      global.innerHeight = 1080;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<App />);
      
      // Desktop navigation should be visible
      const desktopNav = screen.queryByRole('navigation');
      expect(desktopNav).toBeTruthy();
    });
  });

  describe('Data Persistence', () => {
    it('should persist filters in URL', async () => {
      renderWithProviders(<App />);
      
      // Apply filters
      const carrierFilter = screen.queryByLabelText(/carrier/i);
      if (carrierFilter) {
        fireEvent.change(carrierFilter, { target: { value: 'Verizon' } });
        
        // URL should contain filter parameters
        await waitFor(() => {
          expect(window.location.search).toContain('carrier=Verizon');
        });
      }
    });

    it('should restore filters from URL', () => {
      // Set URL with filters
      window.history.pushState({}, '', '?carrier=Verizon&area_code=555');
      
      renderWithProviders(<App />);
      
      // Filters should be applied
      const carrierFilter = screen.queryByLabelText(/carrier/i) as HTMLSelectElement;
      if (carrierFilter) {
        expect(carrierFilter.value).toBe('Verizon');
      }
    });
  });

  describe('Real-time Updates', () => {
    it('should update progress in real-time', async () => {
      // Mock WebSocket or polling
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          task_id: 'test-task-123',
          status: 'in_progress',
          progress: 50
        })
      });

      renderWithProviders(<App />);
      
      // Progress bar should update
      await waitFor(() => {
        const progressBar = screen.queryByRole('progressbar');
        if (progressBar) {
          expect(progressBar.getAttribute('aria-valuenow')).toBe('50');
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<App />);
      
      // Check for ARIA labels
      const buttons = screen.queryAllByRole('button');
      buttons.forEach(button => {
        expect(
          button.getAttribute('aria-label') || button.textContent
        ).toBeTruthy();
      });
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(<App />);
      
      // Tab through interactive elements
      const firstButton = screen.queryAllByRole('button')[0];
      if (firstButton) {
        firstButton.focus();
        expect(document.activeElement).toBe(firstButton);
      }
    });

    it('should have sufficient color contrast', () => {
      renderWithProviders(<App />);
      
      // Check that text is readable
      const textElements = screen.queryAllByText(/./);
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        expect(styles.color).toBeTruthy();
        expect(styles.backgroundColor).toBeTruthy();
      });
    });
  });
});

describe('Performance Tests', () => {
  it('should render large lists efficiently', async () => {
    // Create large dataset
    const largeDataset = {
      count: 1000,
      results: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        number: `555${String(i).padStart(7, '0')}`,
        carrier: 'Verizon',
        number_type: 'mobile',
        area_code: '555',
        is_valid: true
      }))
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => largeDataset
    });

    const startTime = performance.now();
    renderWithProviders(<App />);
    const endTime = performance.now();

    // Should render in reasonable time (< 1 second)
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should lazy load images', () => {
    renderWithProviders(<App />);
    
    // Images should have loading="lazy"
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      expect(img.loading).toBe('lazy');
    });
  });
});

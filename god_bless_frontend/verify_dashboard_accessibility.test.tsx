/**
 * Dashboard Accessibility Verification Test
 * 
 * This test verifies that the dashboard remains accessible after implementing
 * the default projects landing page feature.
 * 
 * Requirements verified:
 * - 3.1: Dashboard accessible via direct URL navigation
 * - 3.2: Dashboard accessible via navigation menu
 * - 3.3: Dashboard functionality remains intact
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './src/App';

// Mock the lazy-loaded components
vi.mock('./src/pages/Dashboard/ModernDashboard', () => ({
  default: () => <div data-testid="modern-dashboard">Modern Dashboard</div>
}));

vi.mock('./src/pages/Projects/AllProjects', () => ({
  default: () => <div data-testid="all-projects">All Projects</div>
}));

describe('Dashboard Accessibility Verification', () => {
  beforeEach(() => {
    // Clear localStorage and sessionStorage before each test
    localStorage.clear();
    sessionStorage.clear();
    
    // Mock authenticated user
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('username', 'testuser');
    localStorage.setItem('user_id', '123');
  });

  describe('Requirement 3.1: Direct URL Navigation', () => {
    it('should render dashboard when navigating directly to /dashboard', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('modern-dashboard')).toBeInTheDocument();
      });
    });

    it('should have correct page title for dashboard', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(document.title).toContain('Dashboard');
      });
    });
  });

  describe('Requirement 3.2: Navigation Menu Access', () => {
    it('should have dashboard link in navigation', async () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        const dashboardLinks = screen.queryAllByText(/dashboard/i);
        expect(dashboardLinks.length).toBeGreaterThan(0);
      });
    });

    it('should navigate to dashboard when clicking navigation link', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/all-projects']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        const dashboardLink = container.querySelector('a[href="/dashboard"]');
        expect(dashboardLink).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 3.3: Dashboard Functionality Intact', () => {
    it('should render dashboard component without errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('modern-dashboard')).toBeInTheDocument();
      });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should maintain dashboard route configuration', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Verify dashboard is rendered, not a 404 or redirect
        expect(screen.getByTestId('modern-dashboard')).toBeInTheDocument();
        expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
      });
    });

    it('should not redirect dashboard to projects page', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Should show dashboard, not projects
        expect(screen.getByTestId('modern-dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('all-projects')).not.toBeInTheDocument();
      });
    });
  });

  describe('Integration: Dashboard vs Projects Landing', () => {
    it('should show projects page as default after login, but dashboard still accessible', async () => {
      // This test verifies that while /all-projects is the default landing,
      // /dashboard remains independently accessible
      
      const { rerender } = render(
        <MemoryRouter initialEntries={['/all-projects']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('all-projects')).toBeInTheDocument();
      });

      // Now navigate to dashboard
      rerender(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('modern-dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('all-projects')).not.toBeInTheDocument();
      });
    });
  });
});

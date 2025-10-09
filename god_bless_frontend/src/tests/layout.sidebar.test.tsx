import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DefaultLayout from '../layout/DefaultLayout';

// Mock components to avoid complex dependencies
vi.mock('../components/Header/index', () => ({
  default: ({ sidebarOpen, setSidebarOpen }: any) => (
    <div data-testid="header">
      Header - Sidebar Open: {sidebarOpen.toString()}
    </div>
  ),
}));

vi.mock('../components/Sidebar', () => ({
  default: ({ sidebarOpen, setSidebarOpen }: any) => (
    <div data-testid="sidebar">
      Sidebar - Open: {sidebarOpen.toString()}
    </div>
  ),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('DefaultLayout Sidebar Rendering', () => {
  beforeEach(() => {
    // Mock window dimensions for desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280, // Desktop width
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Mock addEventListener/removeEventListener
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render sidebar and header on dashboard route', () => {
    // Mock location to be dashboard
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useLocation: () => ({ pathname: '/dashboard' }),
      };
    });

    render(
      <TestWrapper>
        <DefaultLayout hiddenOnRoutes={['/signin', '/signup']}>
          <div data-testid="dashboard-content">Dashboard Content</div>
        </DefaultLayout>
      </TestWrapper>
    );

    // Should render sidebar and header
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
  });

  it('should hide sidebar and header on hidden routes', () => {
    // Mock location to be signin
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useLocation: () => ({ pathname: '/signin' }),
      };
    });

    render(
      <TestWrapper>
        <DefaultLayout hiddenOnRoutes={['/signin', '/signup']}>
          <div data-testid="signin-content">Sign In Content</div>
        </DefaultLayout>
      </TestWrapper>
    );

    // Should not render sidebar and header
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
    expect(screen.getByTestId('signin-content')).toBeInTheDocument();
  });

  it('should handle project routes correctly', () => {
    // Mock location to be project route
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useLocation: () => ({ pathname: '/project/123' }),
      };
    });

    render(
      <TestWrapper>
        <DefaultLayout hiddenOnRoutes={['/signin', '/signup']}>
          <div data-testid="project-content">Project Content</div>
        </DefaultLayout>
      </TestWrapper>
    );

    // Project routes should render children directly
    expect(screen.getByTestId('project-content')).toBeInTheDocument();
  });

  it('should initialize sidebar state based on screen size', () => {
    // Test desktop initialization
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280, // Desktop
    });

    render(
      <TestWrapper>
        <DefaultLayout hiddenOnRoutes={[]}>
          <div>Content</div>
        </DefaultLayout>
      </TestWrapper>
    );

    // Should show sidebar as open on desktop
    expect(screen.getByText(/Sidebar - Open: true/)).toBeInTheDocument();
  });

  it('should handle mobile screen size', () => {
    // Test mobile initialization
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768, // Mobile
    });

    render(
      <TestWrapper>
        <DefaultLayout hiddenOnRoutes={[]}>
          <div>Content</div>
        </DefaultLayout>
      </TestWrapper>
    );

    // Should show sidebar as closed on mobile
    expect(screen.getByText(/Sidebar - Open: false/)).toBeInTheDocument();
  });
});
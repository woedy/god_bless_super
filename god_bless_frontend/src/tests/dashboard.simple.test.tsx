import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ModernDashboard from '../pages/Dashboard/ModernDashboard';
import { BrowserRouter } from 'react-router-dom';

// Mock the constants
vi.mock('../constants', () => ({
  baseUrl: 'http://localhost:6161/',
  userToken: 'mock-token',
  userID: 'mock-user-id',
  projectID: 'mock-project-id',
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ApexCharts
vi.mock('react-apexcharts', () => ({
  default: ({ options, series, type, height }: any) => (
    <div data-testid={`mock-chart-${type}`} data-height={height}>
      Mock Chart ({type})
    </div>
  ),
}));

// Mock data for dashboard analytics
const mockAnalyticsData = {
  platform_metrics: {
    total_projects: 5,
    total_phone_numbers: 1000,
    valid_phone_numbers: 850,
    total_smtps: 3,
    active_tasks: 2,
  },
  task_stats: {
    total_tasks: 50,
    completed_tasks: 45,
    failed_tasks: 3,
    pending_tasks: 2,
    tasks_24h: 10,
  },
  task_by_category: [
    { category: 'Phone Generation', count: 20 },
    { category: 'SMS Sending', count: 15 },
  ],
  recent_activity: [
    { hour: '2024-01-01T10:00:00Z', count: 5 },
    { hour: '2024-01-01T11:00:00Z', count: 8 },
  ],
  phone_generation_trend: [
    { date: '2024-01-01', count: 100 },
    { date: '2024-01-02', count: 150 },
  ],
  system_health: {
    cpu: {
      usage_percent: 45,
      count: 4,
      status: 'healthy',
    },
    memory: {
      usage_percent: 60,
      available_gb: 4.5,
      total_gb: 8.0,
      used_gb: 3.5,
      status: 'healthy',
    },
    disk: {
      usage_percent: 75,
      free_gb: 25.0,
      total_gb: 100.0,
      used_gb: 75.0,
      status: 'warning',
    },
    overall_status: 'healthy',
  },
  user_activity: {
    total_activities: 100,
    activities_24h: 15,
    activities_7d: 75,
  },
};

const mockActiveTasks = [
  {
    task_id: 'task-1',
    task_name: 'Generate Phone Numbers',
    category: 'Phone Generation',
    status: 'progress',
    progress: 75,
    current_step: 'Generating numbers for area code 555',
    created_at: '2024-01-01T10:00:00Z',
    estimated_completion: '2024-01-01T10:30:00Z',
    duration: 1800,
    is_complete: false,
  },
];

// Wrapper component for testing
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('ModernDashboard Simple Tests', () => {
  let fetchMock: any;

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          const items: Record<string, string> = {
            token: 'mock-token',
            user_id: 'mock-user-id',
            projectID: 'mock-project-id',
          };
          return items[key] || null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should load dashboard without errors', async () => {
    // Mock successful API responses
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAnalyticsData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockActiveTasks }),
      });

    render(
      <TestWrapper>
        <ModernDashboard />
      </TestWrapper>,
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    // Verify API calls were made
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:6161/api/dashboard/analytics/?project_id=mock-project-id',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token mock-token',
        },
      }),
    );
  });

  it('should display platform metrics correctly', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAnalyticsData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockActiveTasks }),
      });

    render(
      <TestWrapper>
        <ModernDashboard />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    // Check platform metrics
    expect(screen.getByText('Total Projects')).toBeInTheDocument();
    expect(screen.getByText('Phone Numbers')).toBeInTheDocument();
    expect(screen.getByText('Valid Numbers')).toBeInTheDocument();
    expect(screen.getByText('Active Tasks')).toBeInTheDocument();

    // Check specific values
    expect(screen.getByText('5')).toBeInTheDocument(); // Total Projects
    expect(screen.getByText('1000')).toBeInTheDocument(); // Phone Numbers
    expect(screen.getByText('850')).toBeInTheDocument(); // Valid Numbers
  });

  it('should display system health information', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAnalyticsData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockActiveTasks }),
      });

    render(
      <TestWrapper>
        <ModernDashboard />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    // Check system health section
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('Disk Usage')).toBeInTheDocument();
    expect(screen.getByText('HEALTHY')).toBeInTheDocument();
  });

  it('should display active tasks correctly', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAnalyticsData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockActiveTasks }),
      });

    render(
      <TestWrapper>
        <ModernDashboard />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    // Check active tasks section
    expect(screen.getAllByText('Active Tasks')[0]).toBeInTheDocument(); // Header
    expect(screen.getByText('Generate Phone Numbers')).toBeInTheDocument();
    expect(screen.getByText('progress')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should handle refresh functionality', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAnalyticsData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockActiveTasks }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAnalyticsData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockActiveTasks }),
      });

    render(
      <TestWrapper>
        <ModernDashboard />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    // Click the main refresh button (not the one in Active Tasks)
    const refreshButtons = screen.getAllByText('Refresh');
    const mainRefreshButton = refreshButtons[0]; // First one is the main dashboard refresh
    fireEvent.click(mainRefreshButton);

    // Should show refreshing state
    await waitFor(() => {
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });

    // Should complete refresh
    await waitFor(() => {
      expect(screen.getAllByText('Refresh')[0]).toBeInTheDocument();
    });

    // Should have made additional API calls
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('should display charts correctly', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAnalyticsData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockActiveTasks }),
      });

    render(
      <TestWrapper>
        <ModernDashboard />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    // Check for chart components
    expect(screen.getByTestId('mock-chart-area')).toBeInTheDocument();
    expect(screen.getByTestId('mock-chart-donut')).toBeInTheDocument();
    expect(
      screen.getByText('Task Activity (Last 24 Hours)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Tasks by Category')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    // Mock failed API responses
    fetchMock
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <ModernDashboard />
      </TestWrapper>,
    );

    // Should show loading initially
    const loadingSpinner = screen.getByRole('generic');
    expect(loadingSpinner).toBeInTheDocument();

    // Should handle errors and continue showing loading
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    // Should still be in loading state due to error
    expect(screen.getByRole('generic')).toBeInTheDocument();
  });

  it('should calculate success rate correctly', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAnalyticsData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockActiveTasks }),
      });

    render(
      <TestWrapper>
        <ModernDashboard />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    // Check success rate calculation (45/50 * 100 = 90.0%)
    expect(screen.getByText('90.0%')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
  });
});

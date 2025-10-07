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
    <div data-testid={`apex-chart-${type}`} data-height={height}>
      Mock Chart - Series: {JSON.stringify(series)} Options: {JSON.stringify(options)}
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
    { category: 'Validation', count: 10 },
    { category: 'Export', count: 5 },
  ],
  recent_activity: [
    { hour: '2024-01-01T10:00:00Z', count: 5 },
    { hour: '2024-01-01T11:00:00Z', count: 8 },
    { hour: '2024-01-01T12:00:00Z', count: 12 },
  ],
  phone_generation_trend: [
    { date: '2024-01-01', count: 100 },
    { date: '2024-01-02', count: 150 },
    { date: '2024-01-03', count: 200 },
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
  {
    task_id: 'task-2',
    task_name: 'Send Bulk SMS',
    category: 'SMS Sending',
    status: 'started',
    progress: 25,
    current_step: 'Preparing message queue',
    created_at: '2024-01-01T10:15:00Z',
    estimated_completion: null,
    duration: 900,
    is_complete: false,
  },
];

const mockProjectsData = {
  data: {
    projects: [
      {
        id: 'project-1',
        name: 'Test Project',
        description: 'Test project description',
      },
    ],
  },
};

// Wrapper component for testing
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('ModernDashboard Integration Tests', () => {
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
    vi.useRealTimers();
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
      </TestWrapper>
    );

    // Should show loading initially
    expect(screen.getByRole('generic')).toBeInTheDocument();

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
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:6161/api/dashboard/tasks/active/',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token mock-token',
        },
      })
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
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    // Check platform metrics
    expect(screen.getByText('5')).toBeInTheDocument(); // Total Projects
    expect(screen.getByText('1000')).toBeInTheDocument(); // Phone Numbers
    expect(screen.getByText('850')).toBeInTheDocument(); // Valid Numbers
    expect(screen.getByText('2')).toBeInTheDocument(); // Active Tasks

    // Check task statistics
    expect(screen.getByText('50')).toBeInTheDocument(); // Total Tasks
    expect(screen.getByText('45')).toBeInTheDocument(); // Completed
    expect(screen.getByText('3')).toBeInTheDocument(); // Failed
    expect(screen.getByText('90.0%')).toBeInTheDocument(); // Success Rate
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
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeInTheDocument();
    });

    // Check system health metrics
    expect(screen.getByText('45%')).toBeInTheDocument(); // CPU Usage
    expect(screen.getByText('60%')).toBeInTheDocument(); // Memory Usage
    expect(screen.getByText('75%')).toBeInTheDocument(); // Disk Usage
    expect(screen.getByText('HEALTHY')).toBeInTheDocument(); // Overall Status
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
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Active Tasks')).toBeInTheDocument();
    });

    // Check active tasks
    expect(screen.getByText('Generate Phone Numbers')).toBeInTheDocument();
    expect(screen.getByText('Send Bulk SMS')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument(); // Progress
    expect(screen.getByText('25%')).toBeInTheDocument(); // Progress
    expect(screen.getByText('progress')).toBeInTheDocument(); // Status
    expect(screen.getByText('started')).toBeInTheDocument(); // Status
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
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    // Should show refreshing state
    await waitFor(() => {
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });

    // Should complete refresh
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    // Should have made additional API calls
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('should handle API errors gracefully', async () => {
    // Mock failed API responses
    fetchMock
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <ModernDashboard />
      </TestWrapper>
    );

    // Should show loading initially
    expect(screen.getByRole('generic')).toBeInTheDocument();

    // Should handle errors and show loading state indefinitely
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle missing project ID by fetching user projects', async () => {
    // Mock localStorage without projectID
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          const items: Record<string, string> = {
            token: 'mock-token',
            user_id: 'mock-user-id',
            projectID: '', // Empty project ID
          };
          return items[key] || null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectsData,
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
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    // Should have called projects API first
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:6161/api/projects/get-all-projects/?user_id=mock-user-id&page_size=1',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Token mock-token',
        },
      })
    );
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
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    // Check for chart components
    expect(screen.getByTestId('apex-chart-area')).toBeInTheDocument();
    expect(screen.getByTestId('apex-chart-donut')).toBeInTheDocument();
    expect(screen.getByText('Task Activity (Last 24 Hours)')).toBeInTheDocument();
    expect(screen.getByText('Tasks by Category')).toBeInTheDocument();
    expect(screen.getByText('Phone Number Generation (Last 7 Days)')).toBeInTheDocument();
  });

  it('should auto-refresh active tasks every 30 seconds', async () => {
    vi.useFakeTimers();

    fetchMock
      .mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockAnalyticsData }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockActiveTasks }),
      });

    render(
      <TestWrapper>
        <ModernDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    });

    // Clear initial calls
    fetchMock.mockClear();

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:6161/api/dashboard/tasks/active/',
        expect.any(Object)
      );
    });

    vi.useRealTimers();
  });
});
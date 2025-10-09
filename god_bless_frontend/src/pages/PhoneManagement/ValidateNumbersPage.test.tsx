import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ValidateNumbersPage from './ValidateNumbersPage';
import * as useTaskWebSocketModule from '../../hooks/useTaskWebSocket';
import toast from 'react-hot-toast';

// Mock the constants
vi.mock('../../constants', () => ({
  baseUrl: 'http://localhost:6161/',
  projectID: '1',
  userID: '1',
  userToken: 'test-token',
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock TaskProgressCard
vi.mock('../../components/TaskProgress/TaskProgressCard', () => ({
  default: ({ task, onCancel, showCancel }: any) => (
    <div data-testid="task-progress-card">
      <div data-testid="progress-value">Progress: {task.progress}%</div>
      <div data-testid="status-value">Status: {task.status}</div>
      <div data-testid="current-step">Step: {task.current_step}</div>
      <div data-testid="items-count">{task.processed_items} / {task.total_items}</div>
      {showCancel && <button data-testid="cancel-button" onClick={onCancel}>Cancel</button>}
    </div>
  ),
}));

// Mock Breadcrumb
vi.mock('../../components/Breadcrumbs/Breadcrumb', () => ({
  default: ({ pageName }: any) => <div>{pageName}</div>,
}));

describe('ValidateNumbersPage - Refactoring Tests', () => {
  const mockCancelTask = vi.fn();
  const mockUseTaskWebSocket = {
    isConnected: true,
    cancelTask: mockCancelTask,
    activeTasks: [],
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendMessage: vi.fn(),
    getTaskStatus: vi.fn(),
    refreshActiveTasks: vi.fn(),
  };

  let onProgressCallback: any;
  let onCompletedCallback: any;
  let onErrorCallback: any;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.confirm = vi.fn(() => true);
    
    vi.spyOn(useTaskWebSocketModule, 'useTaskWebSocket').mockImplementation((config) => {
      onProgressCallback = config.onProgress;
      onCompletedCallback = config.onCompleted;
      onErrorCallback = config.onError;
      return mockUseTaskWebSocket;
    });

    // Spy on console.error to verify no errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the page with single and batch validation sections', () => {
      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      expect(screen.getByText('Validate Phone Numbers')).toBeInTheDocument();
      expect(screen.getByText('Single Number Validation')).toBeInTheDocument();
      expect(screen.getByText('Batch Validation')).toBeInTheDocument();
    });

    it('should initialize useTaskWebSocket hook with correct parameters', () => {
      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      expect(useTaskWebSocketModule.useTaskWebSocket).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: '1',
          onProgress: expect.any(Function),
          onCompleted: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });
  });

  describe('Single Number Validation', () => {
    it('should validate single number successfully', async () => {
      const mockResponse = {
        data: {
          phone: '14155091612',
          valid: true,
          carrier: 'AT&T',
          location: 'San Francisco, CA',
          type: 'mobile',
          country: { name: 'United States', prefix: '1' },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText('e.g., 14155091612');
      const validateButton = screen.getByText('Validate');

      await act(async () => {
        fireEvent.change(input, { target: { value: '14155091612' } });
        fireEvent.click(validateButton);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Number validated successfully');
      });

      expect(screen.getByText('Validation Result')).toBeInTheDocument();
      expect(screen.getByText('14155091612')).toBeInTheDocument();
    });

    it('should show validation error for invalid format', async () => {
      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText('e.g., 14155091612');
      const validateButton = screen.getByText('Validate');

      await act(async () => {
        fireEvent.change(input, { target: { value: '123' } });
        fireEvent.click(validateButton);
      });

      expect(screen.getByText(/Phone number must be exactly 11 digits/i)).toBeInTheDocument();
    });

    it('should show error for empty input', async () => {
      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      const validateButton = screen.getByText('Validate');

      await act(async () => {
        fireEvent.click(validateButton);
      });

      expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    });
  });

  describe('Batch Validation', () => {
    it('should start batch validation correctly', async () => {
      const mockResponse = {
        data: {
          task_id: 'test-task-123',
          message: 'Validation started',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      const startButton = screen.getByText('Start Batch Validation');

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Batch validation started!');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:6161/api/phone-validator/start-validation-free/',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Token test-token',
          }),
        })
      );
    });

    it('should change validation provider', () => {
      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      const select = screen.getByDisplayValue('Free Validation (Basic)');
      
      fireEvent.change(select, { target: { value: 'abstract' } });
      expect(screen.getByDisplayValue('Abstract API (Advanced)')).toBeInTheDocument();

      fireEvent.change(select, { target: { value: 'ipquality' } });
      expect(screen.getByDisplayValue('IPQuality Score (Premium)')).toBeInTheDocument();
    });
  });

  describe('TaskProgressCard Integration', () => {
    it('should display TaskProgressCard during validation', async () => {
      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      // Initially no progress card
      expect(screen.queryByTestId('task-progress-card')).not.toBeInTheDocument();

      // Simulate progress update
      await act(async () => {
        onProgressCallback({
          task_id: 'test-task-123',
          status: 'in_progress',
          progress: 50,
          current_step: 'Validating numbers',
          processed_items: 50,
          total_items: 100,
        });
      });

      // Progress card should now be visible
      await waitFor(() => {
        expect(screen.getByTestId('task-progress-card')).toBeInTheDocument();
      });

      expect(screen.getByTestId('progress-value')).toHaveTextContent('Progress: 50%');
      expect(screen.getByTestId('status-value')).toHaveTextContent('Status: in_progress');
      expect(screen.getByTestId('current-step')).toHaveTextContent('Step: Validating numbers');
      expect(screen.getByTestId('items-count')).toHaveTextContent('50 / 100');
    });

    it('should update progress in real-time', async () => {
      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      // First progress update
      await act(async () => {
        onProgressCallback({
          task_id: 'test-task-123',
          status: 'in_progress',
          progress: 25,
          current_step: 'Starting validation',
          processed_items: 25,
          total_items: 100,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('progress-value')).toHaveTextContent('Progress: 25%');
      });

      // Second progress update
      await act(async () => {
        onProgressCallback({
          task_id: 'test-task-123',
          status: 'in_progress',
          progress: 75,
          current_step: 'Almost done',
          processed_items: 75,
          total_items: 100,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('progress-value')).toHaveTextContent('Progress: 75%');
        expect(screen.getByTestId('current-step')).toHaveTextContent('Step: Almost done');
      });
    });

    it('should show cancel button when task is in progress', async () => {
      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      await act(async () => {
        onProgressCallback({
          task_id: 'test-task-123',
          status: 'in_progress',
          progress: 50,
          current_step: 'Validating numbers',
          processed_items: 50,
          total_items: 100,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      });
    });

    it('should hide cancel button when task is completed', async () => {
      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      await act(async () => {
        onProgressCallback({
          task_id: 'test-task-123',
          status: 'completed',
          progress: 100,
          current_step: 'Completed',
          processed_items: 100,
          total_items: 100,
        });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Task Completion and Error Handling', () => {
    it('should show success toast on completion', async () => {
      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      await act(async () => {
        onCompletedCallback({
          task_id: 'test-task-123',
          result_data: {
            total_validated: 100,
          },
        });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Validation completed successfully!');
      });
    });

    it('should show error toast on failure', async () => {
      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      await act(async () => {
        onErrorCallback('Network error occurred');
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Validation failed: Network error occurred');
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockErrorResponse = {
        errors: { detail: ['Invalid request'] },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse,
      });

      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      const startButton = screen.getByText('Start Batch Validation');

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should call cancelTask via TaskProgressCard', async () => {
      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      // Start a task
      const mockResponse = {
        data: {
          task_id: 'test-task-123',
          message: 'Validation started',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const startButton = screen.getByText('Start Batch Validation');

      await act(async () => {
        fireEvent.click(startButton);
      });

      // Simulate progress
      await act(async () => {
        onProgressCallback({
          task_id: 'test-task-123',
          status: 'in_progress',
          progress: 50,
          current_step: 'Validating numbers',
          processed_items: 50,
          total_items: 100,
        });
      });

      // Click cancel button
      await waitFor(() => {
        expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId('cancel-button');

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to cancel this validation?');
      expect(mockCancelTask).toHaveBeenCalledWith('test-task-123');
      expect(toast.success).toHaveBeenCalledWith('Validation cancelled');
    });
  });

  describe('Console Error Verification', () => {
    it('should not log console errors during normal operation', async () => {
      const mockResponse = {
        data: {
          task_id: 'test-task-123',
          message: 'Validation started',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(
        <BrowserRouter>
          <ValidateNumbersPage />
        </BrowserRouter>
      );

      const startButton = screen.getByText('Start Batch Validation');

      await act(async () => {
        fireEvent.click(startButton);
      });

      await act(async () => {
        onProgressCallback({
          task_id: 'test-task-123',
          status: 'in_progress',
          progress: 50,
          current_step: 'Validating numbers',
          processed_items: 50,
          total_items: 100,
        });
      });

      await act(async () => {
        onCompletedCallback({
          task_id: 'test-task-123',
          result_data: { total_validated: 100 },
        });
      });

      // Verify no console errors were logged (except for expected React warnings)
      const errorCalls = (console.error as any).mock.calls.filter(
        (call: any[]) => !call[0]?.includes?.('Warning: An update to')
      );
      expect(errorCalls.length).toBe(0);
    });
  });
});

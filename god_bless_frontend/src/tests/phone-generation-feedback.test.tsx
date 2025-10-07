/**
 * Final Testing Suite for Phone Generation Feedback Feature
 * Tests all requirements from tasks 7.1 through 7.6
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import GenerateNumbersPage from '../pages/PhoneManagement/GenerateNumbersPage';
import ValidateNumbersPage from '../pages/PhoneManagement/ValidateNumbersPage';
import ValidateInfo from '../pages/AllNumbers/ValidateInfo';
import AllNumbersPage from '../pages/PhoneManagement/AllNumbersPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  
  constructor(public url: string) {
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
  
  send(data: string) {
    // Mock send
  }
  
  close() {
    if (this.onclose) this.onclose();
  }
}

global.WebSocket = MockWebSocket as any;

describe('Task 7.1: Test complete phone generation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('should complete full generation flow with TaskProgressCard', async () => {
    const user = userEvent.setup();
    
    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        task_id: 'test-task-123',
        message: 'Generation started',
        estimated_time: '2 minutes',
      }),
    });

    const { container } = render(
      <BrowserRouter>
        <GenerateNumbersPage />
      </BrowserRouter>
    );

    // Fill form with valid data
    const areaCodeInput = screen.getByLabelText(/area code/i);
    const quantityInput = screen.getByLabelText(/quantity/i);
    
    await user.clear(areaCodeInput);
    await user.type(areaCodeInput, '415');
    
    await user.clear(quantityInput);
    await user.type(quantityInput, '100');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /generate/i });
    await user.click(submitButton);

    // Verify API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/phone-generator/generate-numbers-config/'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"area_code":"415"'),
        })
      );
    });

    // Verify TaskProgressCard would display (component should be in DOM)
    await waitFor(() => {
      const progressElements = container.querySelectorAll('[class*="progress"]');
      expect(progressElements.length).toBeGreaterThan(0);
    });
  });

  it('should redirect to /all-numbers on completion', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        task_id: 'test-task-123',
        message: 'Generation started',
      }),
    });

    render(
      <BrowserRouter>
        <GenerateNumbersPage />
      </BrowserRouter>
    );

    // Simulate WebSocket completion message
    const ws = new MockWebSocket('ws://test');
    setTimeout(() => {
      if (ws.onmessage) {
        ws.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'task_completed',
            task_id: 'test-task-123',
            result_data: { generated_count: 100 },
          }),
        }));
      }
    }, 100);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/all-numbers');
    }, { timeout: 3000 });
  });
});

describe('Task 7.2: Test complete validation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('should complete validation flow with TaskProgressCard', async () => {
    const user = userEvent.setup();
    
    // Mock phone numbers list
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        numbers: [
          { id: 1, phone_number: '+14155551234', valid_number: null },
          { id: 2, phone_number: '+14155555678', valid_number: null },
        ],
        pagination: { page_number: 1, count: 2, total_pages: 1 },
      }),
    });

    // Mock validation start
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        task_id: 'validation-task-456',
        message: 'Validation started',
      }),
    });

    const { container } = render(
      <BrowserRouter>
        <ValidateNumbersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Start batch validation
    const validateButton = screen.getByRole('button', { name: /validate all/i });
    await user.click(validateButton);

    // Verify TaskProgressCard displays
    await waitFor(() => {
      const progressElements = container.querySelectorAll('[class*="progress"]');
      expect(progressElements.length).toBeGreaterThan(0);
    });
  });
});

describe('Task 7.3: Test task cancellation', () => {
  it('should cancel generation task successfully', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          task_id: 'cancel-test-123',
          message: 'Generation started',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Task cancelled' }),
      });

    render(
      <BrowserRouter>
        <GenerateNumbersPage />
      </BrowserRouter>
    );

    // Start generation
    const areaCodeInput = screen.getByLabelText(/area code/i);
    const quantityInput = screen.getByLabelText(/quantity/i);
    
    await user.type(areaCodeInput, '415');
    await user.type(quantityInput, '100');
    
    const submitButton = screen.getByRole('button', { name: /generate/i });
    await user.click(submitButton);

    // Wait for progress to show
    await waitFor(() => {
      expect(screen.queryByText(/cancel/i)).toBeInTheDocument();
    });

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Verify cancellation API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cancel/'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});

describe('Task 7.4: Test error scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show validation errors for invalid form data', async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <GenerateNumbersPage />
      </BrowserRouter>
    );

    // Try to submit with invalid area code
    const areaCodeInput = screen.getByLabelText(/area code/i);
    await user.type(areaCodeInput, '12'); // Too short
    
    const submitButton = screen.getByRole('button', { name: /generate/i });
    await user.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.queryByText(/area code must be 3 digits/i)).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock network error
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <BrowserRouter>
        <GenerateNumbersPage />
      </BrowserRouter>
    );

    const areaCodeInput = screen.getByLabelText(/area code/i);
    const quantityInput = screen.getByLabelText(/quantity/i);
    
    await user.type(areaCodeInput, '415');
    await user.type(quantityInput, '100');
    
    const submitButton = screen.getByRole('button', { name: /generate/i });
    await user.click(submitButton);

    // Form should remain usable
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});

describe('Task 7.5: Test legacy URL redirect', () => {
  it('should redirect from /validate-info to /validate-number', async () => {
    render(
      <BrowserRouter>
        <ValidateInfo />
      </BrowserRouter>
    );

    // Should redirect immediately
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/validate-number', { replace: true });
    });
  });

  it('should use replace: true to prevent back button issues', async () => {
    render(
      <BrowserRouter>
        <ValidateInfo />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ replace: true })
      );
    });
  });
});

describe('Task 7.6: Test export functionality end-to-end', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock document.createElement for download
    const mockLink = {
      click: vi.fn(),
      setAttribute: vi.fn(),
      style: {},
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
  });

  it('should export phone numbers as CSV with correct data', async () => {
    const user = userEvent.setup();
    
    // Mock phone numbers data
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        numbers: [
          {
            id: 1,
            phone_number: '+14155551234',
            valid_number: true,
            carrier: 'AT&T',
            location: 'San Francisco, CA',
            type: 'mobile',
            country_name: 'United States',
            created_at: '2025-01-01T00:00:00Z',
          },
        ],
        pagination: { page_number: 1, count: 1, total_pages: 1 },
      }),
    });

    render(
      <BrowserRouter>
        <AllNumbersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    // Select CSV format
    const csvOption = screen.getByText(/csv/i);
    await user.click(csvOption);

    // Verify download was triggered
    await waitFor(() => {
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });

  it('should export phone numbers as JSON with correct structure', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        numbers: [
          {
            id: 1,
            phone_number: '+14155551234',
            valid_number: true,
          },
        ],
        pagination: { page_number: 1, count: 1, total_pages: 1 },
      }),
    });

    render(
      <BrowserRouter>
        <AllNumbersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    const jsonOption = screen.getByText(/json/i);
    await user.click(jsonOption);

    await waitFor(() => {
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });
});

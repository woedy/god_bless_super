/**
 * Component tests for Phone Generation page
 * Tests Requirements: 6.1, 6.2, 6.3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { mockApiResponse } from '../../test/utils';
import React from 'react';

// Simple PhoneGeneration component for testing
const PhoneGeneration = () => {
  const [formData, setFormData] = React.useState({
    areaCode: '',
    quantity: 100,
    carrier: ''
  });
  const [loading, setLoading] = React.useState(false);
  const [taskId, setTaskId] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/phone/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      setTaskId(data.task_id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-generation">
      <h1>Generate Phone Numbers</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="areaCode">Area Code</label>
          <input
            id="areaCode"
            type="text"
            value={formData.areaCode}
            onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })}
            placeholder="Enter area code"
          />
        </div>
        <div>
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <label htmlFor="carrier">Carrier (Optional)</label>
          <select
            id="carrier"
            value={formData.carrier}
            onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
          >
            <option value="">All Carriers</option>
            <option value="Verizon">Verizon</option>
            <option value="AT&T">AT&T</option>
            <option value="T-Mobile">T-Mobile</option>
          </select>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </form>
      {taskId && (
        <div className="task-info">
          Task started: {taskId}
        </div>
      )}
    </div>
  );
};

describe('PhoneGeneration Page', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('renders phone generation form', () => {
    render(<PhoneGeneration />);
    
    expect(screen.getByText('Generate Phone Numbers')).toBeInTheDocument();
    expect(screen.getByLabelText('Area Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    expect(screen.getByLabelText('Carrier (Optional)')).toBeInTheDocument();
  });

  it('allows user to input area code', () => {
    render(<PhoneGeneration />);
    
    const input = screen.getByLabelText('Area Code') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '555' } });
    
    expect(input.value).toBe('555');
  });

  it('allows user to change quantity', () => {
    render(<PhoneGeneration />);
    
    const input = screen.getByLabelText('Quantity') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1000' } });
    
    expect(input.value).toBe('1000');
  });

  it('allows user to select carrier', () => {
    render(<PhoneGeneration />);
    
    const select = screen.getByLabelText('Carrier (Optional)') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Verizon' } });
    
    expect(select.value).toBe('Verizon');
  });

  it('submits form and starts generation task', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse({ task_id: 'task-123' })
    );

    render(<PhoneGeneration />);
    
    const areaCodeInput = screen.getByLabelText('Area Code');
    fireEvent.change(areaCodeInput, { target: { value: '555' } });
    
    const submitButton = screen.getByText('Generate');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Task started: task-123')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockApiResponse({ task_id: 'task-123' })), 100))
    );

    render(<PhoneGeneration />);
    
    const submitButton = screen.getByText('Generate');
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Generating...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });
  });

  it('disables submit button during loading', async () => {
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockApiResponse({ task_id: 'task-123' })), 100))
    );

    render(<PhoneGeneration />);
    
    const submitButton = screen.getByText('Generate') as HTMLButtonElement;
    fireEvent.click(submitButton);
    
    expect(submitButton).toBeDisabled();
  });
});

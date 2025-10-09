import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock providers wrapper
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock API responses
export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
};

// Mock user data
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  theme_preference: 'light',
  notification_preferences: {},
};

// Mock phone number data
export const mockPhoneNumber = {
  id: 1,
  phone_number: '1234567890',
  carrier: 'Verizon',
  type: 'mobile',
  area_code: '123',
  valid_number: true,
  created_at: '2024-01-01T00:00:00Z',
};

// Mock SMS campaign data
export const mockCampaign = {
  id: 1,
  name: 'Test Campaign',
  message_template: 'Hello {name}!',
  status: 'draft',
  total_recipients: 100,
  messages_sent: 0,
  messages_delivered: 0,
  created_at: '2024-01-01T00:00:00Z',
};

// Mock task data
export const mockTask = {
  task_id: 'test-task-123',
  task_name: 'Generate Phone Numbers',
  status: 'PENDING',
  progress: 0,
  total_items: 1000,
  processed_items: 0,
  created_at: '2024-01-01T00:00:00Z',
};

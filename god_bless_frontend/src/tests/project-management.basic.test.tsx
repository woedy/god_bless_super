import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AddProject from '../pages/Projects/AddProject';
import AllProjects from '../pages/Projects/AllProjects';

// Mock the constants
vi.mock('../constants', async () => {
  const actual = await vi.importActual('../constants');
  return {
    ...actual,
    baseUrl: 'http://localhost:6161/',
    getUserID: vi.fn(() => '1'),
    getUserToken: vi.fn(() => 'mock-token'),
    getUserEmail: vi.fn(() => 'test@example.com'),
    getUsername: vi.fn(() => 'testuser'),
    getUserPhoto: vi.fn(() => null),
    getProjectName: vi.fn(() => 'Test Project'),
    userToken: 'mock-token'
  };
});

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: '1' })
  };
});

// Mock fetch globally
global.fetch = vi.fn();

const mockProjects = [
  {
    id: 1,
    project_name: 'Test Project 1',
    description: 'Test Description 1',
    status: 'active',
    priority: 'high',
    start_date: '2024-01-01',
    due_date: '2024-12-31',
    target_phone_count: 1000,
    target_sms_count: 500,
    budget: 1000,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_id: 1,
    task_stats: {
      total: 10,
      completed: 5,
      in_progress: 3,
      pending: 2,
      completion_rate: 50
    },
    phone_stats: {
      total: 100,
      valid: 80,
      invalid: 20
    },
    sms_stats: {
      total: 50,
      sent: 40,
      pending: 5,
      failed: 5
    },
    collaborators_count: 3
  }
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Project Management Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API responses by default
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          projects: mockProjects
        }
      })
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('AddProject Component', () => {
    it('should render add project form correctly', async () => {
      renderWithRouter(<AddProject />);
      
      expect(screen.getByText('Create New Project')).toBeInTheDocument();
      expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Priority')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '+ Add Project' })).toBeInTheDocument();
    });

    it('should show validation error for empty project name', async () => {
      renderWithRouter(<AddProject />);
      
      const submitButton = screen.getByRole('button', { name: '+ Add Project' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project required.')).toBeInTheDocument();
      });
    });

    it('should create a new project successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Project created successfully' })
      });

      renderWithRouter(<AddProject />);
      
      const projectNameInput = screen.getByLabelText('Project Name');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: '+ Add Project' });

      fireEvent.change(projectNameInput, { target: { value: 'New Test Project' } });
      fireEvent.change(descriptionInput, { target: { value: 'New project description' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:6161/api/projects/add-new-project/',
          expect.objectContaining({
            method: 'POST',
            headers: {
              Authorization: 'Token mock-token'
            }
          })
        );
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/all-projects');
      });
    });
  });

  describe('AllProjects Component', () => {
    it('should render all projects correctly', async () => {
      renderWithRouter(<AllProjects />);
      
      expect(screen.getByText('Project Management')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });
    });

    it('should navigate to add project page', async () => {
      renderWithRouter(<AllProjects />);
      
      const addButton = screen.getByRole('button', { name: '+ Add Project' });
      fireEvent.click(addButton);

      expect(mockNavigate).toHaveBeenCalledWith('/add-project');
    });

    it('should filter projects by status', async () => {
      renderWithRouter(<AllProjects />);
      
      const statusFilter = screen.getByDisplayValue('All Status');
      fireEvent.change(statusFilter, { target: { value: 'active' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('status=active'),
          expect.any(Object)
        );
      });
    });
  });
});
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AddProject from '../pages/Projects/AddProject';
import AllProjects from '../pages/Projects/AllProjects';

// Mock the constants with proper return values
vi.mock('../constants', async () => {
  const actual = await vi.importActual('../constants');
  return {
    ...actual,
    baseUrl: 'http://localhost:6161/',
    getUserID: () => '1',
    getUserToken: () => 'mock-token',
    getUserEmail: () => 'test@example.com',
    getUsername: () => 'testuser',
    getUserPhoto: () => null,
    getProjectName: () => 'Test Project',
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

describe('Project Management Functional Tests', () => {
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

  describe('AddProject Component Functionality', () => {
    it('should render the form with all required fields', async () => {
      renderWithRouter(<AddProject />);
      
      // Check that all form elements are present
      expect(screen.getByText('Create New Project')).toBeInTheDocument();
      expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Priority')).toBeInTheDocument();
      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Target Phone Count')).toBeInTheDocument();
      expect(screen.getByLabelText('Target SMS Count')).toBeInTheDocument();
      expect(screen.getByLabelText('Budget (Optional)')).toBeInTheDocument();
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

    it('should allow user to fill out the form', async () => {
      renderWithRouter(<AddProject />);
      
      const projectNameInput = screen.getByLabelText('Project Name');
      const descriptionInput = screen.getByLabelText('Description');
      const statusSelect = screen.getByLabelText('Status');
      const prioritySelect = screen.getByLabelText('Priority');
      const targetPhoneInput = screen.getByLabelText('Target Phone Count');
      const targetSmsInput = screen.getByLabelText('Target SMS Count');

      // Fill out the form
      fireEvent.change(projectNameInput, { target: { value: 'New Test Project' } });
      fireEvent.change(descriptionInput, { target: { value: 'New project description' } });
      fireEvent.change(statusSelect, { target: { value: 'active' } });
      fireEvent.change(prioritySelect, { target: { value: 'high' } });
      fireEvent.change(targetPhoneInput, { target: { value: '1000' } });
      fireEvent.change(targetSmsInput, { target: { value: '500' } });

      // Verify form values
      expect(projectNameInput).toHaveValue('New Test Project');
      expect(descriptionInput).toHaveValue('New project description');
      expect(statusSelect).toHaveValue('active');
      expect(prioritySelect).toHaveValue('high');
      expect(targetPhoneInput).toHaveValue(1000);
      expect(targetSmsInput).toHaveValue(500);
    });

    it('should display existing projects in the sidebar', async () => {
      renderWithRouter(<AddProject />);
      
      await waitFor(() => {
        expect(screen.getByText('My Projects')).toBeInTheDocument();
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
        expect(screen.getByText('Test Description 1')).toBeInTheDocument();
      });
    });
  });

  describe('AllProjects Component Functionality', () => {
    it('should render the projects grid view', async () => {
      renderWithRouter(<AllProjects />);
      
      expect(screen.getByText('Project Management')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Priority')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '+ Add Project' })).toBeInTheDocument();
    });

    it('should display project cards with correct information', async () => {
      renderWithRouter(<AllProjects />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
        expect(screen.getByText('Test Description 1')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('high')).toBeInTheDocument();
      });
    });

    it('should allow filtering by status', async () => {
      renderWithRouter(<AllProjects />);
      
      const statusFilter = screen.getByDisplayValue('All Status');
      fireEvent.change(statusFilter, { target: { value: 'active' } });

      expect(statusFilter).toHaveValue('active');
    });

    it('should allow filtering by priority', async () => {
      renderWithRouter(<AllProjects />);
      
      const priorityFilter = screen.getByDisplayValue('All Priority');
      fireEvent.change(priorityFilter, { target: { value: 'high' } });

      expect(priorityFilter).toHaveValue('high');
    });

    it('should allow searching projects', async () => {
      renderWithRouter(<AllProjects />);
      
      const searchInput = screen.getByPlaceholderText('Search projects...');
      fireEvent.change(searchInput, { target: { value: 'Test Project' } });

      expect(searchInput).toHaveValue('Test Project');
    });

    it('should navigate to add project when button is clicked', async () => {
      renderWithRouter(<AllProjects />);
      
      const addButton = screen.getByRole('button', { name: '+ Add Project' });
      fireEvent.click(addButton);

      expect(mockNavigate).toHaveBeenCalledWith('/add-project');
    });
  });

  describe('Project Management Integration', () => {
    it('should handle the complete project creation workflow', async () => {
      // Mock successful project creation
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { projects: [] } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Project created successfully' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { projects: mockProjects } })
        });

      renderWithRouter(<AddProject />);
      
      // Fill out and submit the form
      const projectNameInput = screen.getByLabelText('Project Name');
      const descriptionInput = screen.getByLabelText('Description');
      const submitButton = screen.getByRole('button', { name: '+ Add Project' });

      fireEvent.change(projectNameInput, { target: { value: 'Integration Test Project' } });
      fireEvent.change(descriptionInput, { target: { value: 'Integration test description' } });
      fireEvent.click(submitButton);

      // Verify API call was made
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

      // Verify navigation to all projects
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/all-projects');
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter(<AddProject />);
      
      const projectNameInput = screen.getByLabelText('Project Name');
      const submitButton = screen.getByRole('button', { name: '+ Add Project' });

      fireEvent.change(projectNameInput, { target: { value: 'Test Project' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to add project/)).toBeInTheDocument();
      });
    });
  });
});
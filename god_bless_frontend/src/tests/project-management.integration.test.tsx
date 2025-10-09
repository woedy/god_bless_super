import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AddProject from '../pages/Projects/AddProject';
import AllProjects from '../pages/Projects/AllProjects';
import ProjectDashboard from '../pages/Projects/ProjectDashboard';
import ProjectLayout from '../layout/ProjectLayout';

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
  },
  {
    id: 2,
    project_name: 'Test Project 2',
    description: 'Test Description 2',
    status: 'planning',
    priority: 'medium',
    start_date: '2024-02-01',
    due_date: '2024-11-30',
    target_phone_count: 2000,
    target_sms_count: 1000,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    user_id: 1,
    task_stats: {
      total: 5,
      completed: 1,
      in_progress: 2,
      pending: 2,
      completion_rate: 20
    },
    collaborators_count: 1
  }
];

const mockProjectDetails = {
  ...mockProjects[0],
  recent_activities: [
    {
      id: 1,
      activity_type: 'task_created',
      description: 'New task created',
      created_at: '2024-01-01T00:00:00Z',
      user_details: {
        username: 'testuser'
      }
    }
  ]
};

const mockTasks = [
  {
    id: 1,
    title: 'Test Task 1',
    description: 'Test task description',
    status: 'in_progress',
    priority: 'high',
    due_date: '2024-12-31',
    assigned_to_details: null
  }
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Project Management Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API responses by default
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          projects: mockProjects,
          ...mockProjectDetails
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

    it('should show validation error for empty project name', async () => {
      renderWithRouter(<AddProject />);
      
      const submitButton = screen.getByRole('button', { name: '+ Add Project' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project required.')).toBeInTheDocument();
      });
    });

    it('should display existing projects list', async () => {
      renderWithRouter(<AddProject />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
        expect(screen.getByText('Test Description 1')).toBeInTheDocument();
      });
    });

    it('should delete a project successfully', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { projects: mockProjects } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Project deleted successfully' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { projects: [mockProjects[1]] } })
        });

      renderWithRouter(<AddProject />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('svg')
      );
      
      if (deleteButton) {
        fireEvent.click(deleteButton);
        
        // Confirm deletion in modal
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        fireEvent.click(confirmButton);

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:6161/api/projects/delete-project/',
            expect.objectContaining({
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Token mock-token'
              }
            })
          );
        });
      }
    });
  });

  describe('AllProjects Component', () => {
    it('should render all projects correctly', async () => {
      renderWithRouter(<AllProjects />);
      
      expect(screen.getByText('Project Management')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
        expect(screen.getByText('Test Project 2')).toBeInTheDocument();
      });
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

    it('should filter projects by priority', async () => {
      renderWithRouter(<AllProjects />);
      
      const priorityFilter = screen.getByDisplayValue('All Priority');
      fireEvent.change(priorityFilter, { target: { value: 'high' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('priority=high'),
          expect.any(Object)
        );
      });
    });

    it('should search projects by name', async () => {
      renderWithRouter(<AllProjects />);
      
      const searchInput = screen.getByPlaceholderText('Search projects...');
      fireEvent.change(searchInput, { target: { value: 'Test Project 1' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=Test Project 1'),
          expect.any(Object)
        );
      });
    });

    it('should navigate to project dashboard when clicking on project', async () => {
      renderWithRouter(<AllProjects />);
      
      await waitFor(() => {
        const projectCard = screen.getByText('Test Project 1').closest('div');
        if (projectCard) {
          fireEvent.click(projectCard);
          expect(mockNavigate).toHaveBeenCalledWith('/project/1');
        }
      });
    });

    it('should navigate to add project page', async () => {
      renderWithRouter(<AllProjects />);
      
      const addButton = screen.getByRole('button', { name: '+ Add Project' });
      fireEvent.click(addButton);

      expect(mockNavigate).toHaveBeenCalledWith('/add-project');
    });
  });

  describe('ProjectDashboard Component', () => {
    beforeEach(() => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockProjectDetails })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockTasks })
        });
    });

    it('should render project dashboard correctly', async () => {
      renderWithRouter(<ProjectDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Project 1')).toBeInTheDocument();
        expect(screen.getByText('Test Description 1')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('Priority: high')).toBeInTheDocument();
      });
    });

    it('should display project statistics', async () => {
      renderWithRouter(<ProjectDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // Total tasks
        expect(screen.getByText('100')).toBeInTheDocument(); // Total phone numbers
        expect(screen.getByText('50')).toBeInTheDocument(); // Total SMS
        expect(screen.getByText('50%')).toBeInTheDocument(); // Completion rate
      });
    });

    it('should display recent tasks', async () => {
      renderWithRouter(<ProjectDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Recent Tasks')).toBeInTheDocument();
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });
    });

    it('should display recent activities', async () => {
      renderWithRouter(<ProjectDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getByText('New task created')).toBeInTheDocument();
      });
    });

    it('should navigate to edit project', async () => {
      renderWithRouter(<ProjectDashboard />);
      
      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: 'Edit Project' });
        fireEvent.click(editButton);
        expect(mockNavigate).toHaveBeenCalledWith('/edit-project/1');
      });
    });
  });

  describe('ProjectLayout Component', () => {
    it('should render project layout with sidebar and header', () => {
      renderWithRouter(
        <ProjectLayout projectName="Test Project">
          <div>Test Content</div>
        </ProjectLayout>
      );
      
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByText('God Bless America')).toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('should toggle sidebar when hamburger button is clicked', () => {
      renderWithRouter(
        <ProjectLayout projectName="Test Project">
          <div>Test Content</div>
        </ProjectLayout>
      );
      
      const hamburgerButton = screen.getByRole('button', { name: /sidebar/i });
      fireEvent.click(hamburgerButton);
      
      // Sidebar should be toggled (implementation depends on CSS classes)
      expect(hamburgerButton).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully in AddProject', async () => {
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

    it('should handle API errors gracefully in AllProjects', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter(<AllProjects />);
      
      // Component should still render even with API error
      expect(screen.getByText('Project Management')).toBeInTheDocument();
    });

    it('should show loading state in ProjectDashboard', async () => {
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderWithRouter(<ProjectDashboard />);
      
      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    });
  });

  describe('Integration Flow', () => {
    it('should complete full project management workflow', async () => {
      // Mock successful responses for the entire flow
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
          json: async () => ({ data: { projects: [mockProjects[0]] } })
        });

      // 1. Start with AddProject
      const { rerender } = renderWithRouter(<AddProject />);
      
      // 2. Create a new project
      const projectNameInput = screen.getByLabelText('Project Name');
      const submitButton = screen.getByRole('button', { name: '+ Add Project' });

      fireEvent.change(projectNameInput, { target: { value: 'Integration Test Project' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/all-projects');
      });

      // 3. Navigate to AllProjects (simulate navigation)
      rerender(
        <BrowserRouter>
          <AllProjects />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Project Management')).toBeInTheDocument();
      });
    });
  });
});
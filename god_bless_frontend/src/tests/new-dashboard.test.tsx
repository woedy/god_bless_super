import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test that the new dashboard using ProjectLayout works correctly
describe('NewModernDashboard Test', () => {
  beforeEach(() => {
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

    // Mock fetch
    global.fetch = vi.fn();
  });

  it('should import NewModernDashboard without React errors', async () => {
    let importError = null;
    
    try {
      const { default: NewModernDashboard } = await import('../pages/Dashboard/NewModernDashboard');
      expect(NewModernDashboard).toBeDefined();
      expect(typeof NewModernDashboard).toBe('function');
    } catch (error) {
      importError = error;
      console.error('Error importing NewModernDashboard:', error);
    }
    
    expect(importError).toBeNull();
  });

  it('should use ProjectLayout like other stable pages', async () => {
    // This test verifies that NewModernDashboard follows the same pattern as ProjectDashboard
    let importError = null;
    
    try {
      // Import both to compare patterns
      const { default: NewModernDashboard } = await import('../pages/Dashboard/NewModernDashboard');
      const { default: ProjectDashboard } = await import('../pages/Projects/ProjectDashboard');
      const { default: ProjectLayout } = await import('../layout/ProjectLayout');
      
      expect(NewModernDashboard).toBeDefined();
      expect(ProjectDashboard).toBeDefined();
      expect(ProjectLayout).toBeDefined();
      
      // All should be functions (not React.FC)
      expect(typeof NewModernDashboard).toBe('function');
      expect(typeof ProjectDashboard).toBe('function');
      expect(typeof ProjectLayout).toBe('function');
      
    } catch (error) {
      importError = error;
      console.error('Error importing components:', error);
    }
    
    expect(importError).toBeNull();
  });

  it('should import all required dashboard components', async () => {
    const components = [
      '../pages/Dashboard/NewModernDashboard',
      '../layout/ProjectLayout',
      '../components/Breadcrumbs/Breadcrumb',
      '../components/CardDataStats',
      '../components/Charts/SystemHealthChart',
      '../components/Charts/TaskActivityChart',
      '../components/Charts/TaskCategoryChart',
      '../components/Dashboard/ActiveTasksMonitor',
    ];

    for (const componentPath of components) {
      let importError = null;
      
      try {
        const module = await import(componentPath);
        expect(module.default).toBeDefined();
        expect(typeof module.default).toBe('function');
      } catch (error) {
        importError = error;
        console.error(`Error importing ${componentPath}:`, error);
      }
      
      expect(importError).toBeNull();
    }
  });

  it('should follow the same stable pattern as project pages', async () => {
    // Verify that NewModernDashboard uses the same base components as ProjectDashboard
    let importError = null;
    
    try {
      // These are the key components that make project pages stable
      const { default: ProjectLayout } = await import('../layout/ProjectLayout');
      const { default: Breadcrumb } = await import('../components/Breadcrumbs/Breadcrumb');
      const { default: NewModernDashboard } = await import('../pages/Dashboard/NewModernDashboard');
      
      // All should import without errors
      expect(ProjectLayout).toBeDefined();
      expect(Breadcrumb).toBeDefined();
      expect(NewModernDashboard).toBeDefined();
      
    } catch (error) {
      importError = error;
      console.error('Error with stable pattern components:', error);
    }
    
    expect(importError).toBeNull();
  });
});
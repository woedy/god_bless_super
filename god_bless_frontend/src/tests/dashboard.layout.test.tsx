import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test that the new DashboardLayout can be imported and used without React errors
describe('DashboardLayout React Import Test', () => {
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

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });

    // Mock event listeners
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  it('should import DashboardLayout without React errors', async () => {
    let importError = null;
    
    try {
      const { default: DashboardLayout } = await import('../layout/DashboardLayout');
      expect(DashboardLayout).toBeDefined();
      expect(typeof DashboardLayout).toBe('function');
    } catch (error) {
      importError = error;
    }
    
    expect(importError).toBeNull();
  });

  it('should import ModernDashboard with DashboardLayout without React errors', async () => {
    let importError = null;
    
    try {
      const { default: ModernDashboard } = await import('../pages/Dashboard/ModernDashboard');
      expect(ModernDashboard).toBeDefined();
      expect(typeof ModernDashboard).toBe('function');
    } catch (error) {
      importError = error;
      console.error('Error importing ModernDashboard:', error);
    }
    
    expect(importError).toBeNull();
  });

  it('should import ProjectLayout without React errors', async () => {
    let importError = null;
    
    try {
      const { default: ProjectLayout } = await import('../layout/ProjectLayout');
      expect(ProjectLayout).toBeDefined();
      expect(typeof ProjectLayout).toBe('function');
    } catch (error) {
      importError = error;
    }
    
    expect(importError).toBeNull();
  });

  it('should verify all layout components use consistent patterns', async () => {
    const layouts = [
      '../layout/DashboardLayout',
      '../layout/ProjectLayout',
    ];

    for (const layoutPath of layouts) {
      let importError = null;
      let layout = null;
      
      try {
        const module = await import(layoutPath);
        layout = module.default;
        
        // Verify the layout is a function (not a React.FC)
        expect(typeof layout).toBe('function');
        
      } catch (error) {
        importError = error;
        console.error(`Error with layout ${layoutPath}:`, error);
      }
      
      expect(importError).toBeNull();
      expect(layout).toBeDefined();
    }
  });
});
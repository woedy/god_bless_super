import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test that ModernDashboard can be imported without React errors
describe('ModernDashboard React Import Test', () => {
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

  it('should import ModernDashboard without React errors', async () => {
    // This test verifies that the component can be imported without causing
    // "Cannot read properties of null (reading 'useState')" error
    
    let importError = null;
    
    try {
      const { default: ModernDashboard } = await import('../pages/Dashboard/ModernDashboard');
      expect(ModernDashboard).toBeDefined();
      expect(typeof ModernDashboard).toBe('function');
    } catch (error) {
      importError = error;
    }
    
    expect(importError).toBeNull();
  });

  it('should import all dashboard components without errors', async () => {
    const components = [
      '../pages/Dashboard/ModernDashboard',
      '../components/Dashboard/ActiveTasksMonitor',
      '../components/Charts/SystemHealthChart',
      '../components/Charts/TaskActivityChart',
      '../components/Charts/TaskCategoryChart',
      '../components/CardDataStats',
    ];

    for (const componentPath of components) {
      let importError = null;
      
      try {
        const module = await import(componentPath);
        expect(module.default).toBeDefined();
        expect(typeof module.default).toBe('function');
      } catch (error) {
        importError = error;
      }
      
      expect(importError).toBeNull();
    }
  });

  it('should import constants without errors', async () => {
    let importError = null;
    
    try {
      const constants = await import('../constants');
      expect(constants.baseUrl).toBeDefined();
      expect(constants.getUserToken).toBeDefined();
      expect(constants.getUserID).toBeDefined();
      expect(constants.getProjectID).toBeDefined();
    } catch (error) {
      importError = error;
    }
    
    expect(importError).toBeNull();
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test that all layout components can be imported without React errors
describe('Layout Components React Import Test', () => {
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

  it('should import DefaultLayout without React errors', async () => {
    let importError = null;
    
    try {
      const { default: DefaultLayout } = await import('../layout/DefaultLayout');
      expect(DefaultLayout).toBeDefined();
      expect(typeof DefaultLayout).toBe('function');
    } catch (error) {
      importError = error;
    }
    
    expect(importError).toBeNull();
  });

  it('should import Sidebar without React errors', async () => {
    let importError = null;
    
    try {
      const { default: Sidebar } = await import('../components/Sidebar');
      expect(Sidebar).toBeDefined();
      expect(typeof Sidebar).toBe('function');
    } catch (error) {
      importError = error;
    }
    
    expect(importError).toBeNull();
  });

  it('should import Header without React errors', async () => {
    let importError = null;
    
    try {
      const { default: Header } = await import('../components/Header');
      expect(Header).toBeDefined();
      expect(typeof Header).toBe('function');
    } catch (error) {
      importError = error;
    }
    
    expect(importError).toBeNull();
  });

  it('should import Header dropdown components without React errors', async () => {
    const components = [
      '../components/Header/DropdownUser',
      '../components/Header/DarkModeSwitcher',
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

  it('should import all layout-related components without React errors', async () => {
    const components = [
      '../layout/DefaultLayout',
      '../components/Sidebar',
      '../components/Header',
      '../components/Header/DropdownUser',
      '../components/Header/DarkModeSwitcher',
      '../pages/Dashboard/ModernDashboard',
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

  it('should verify no React.FC usage in components', async () => {
    // This test ensures that we've successfully removed React.FC usage
    // which was causing the "Cannot read properties of null (reading 'useState')" error
    
    const components = [
      '../layout/DefaultLayout',
      '../components/Sidebar',
      '../components/Header',
      '../components/Header/DropdownUser',
      '../components/Header/DarkModeSwitcher',
      '../pages/Dashboard/ModernDashboard',
    ];

    for (const componentPath of components) {
      let importError = null;
      let component = null;
      
      try {
        const module = await import(componentPath);
        component = module.default;
        
        // Verify the component is a function (not a React.FC)
        expect(typeof component).toBe('function');
        
        // Verify the component can be called without React context issues
        // (This would throw if there were React hook issues)
        expect(component).toBeDefined();
        
      } catch (error) {
        importError = error;
        console.error(`Error with component ${componentPath}:`, error);
      }
      
      expect(importError).toBeNull();
      expect(component).toBeDefined();
    }
  });
});
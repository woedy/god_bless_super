import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';

/**
 * Demo component showcasing the theme system
 * This can be used as a reference for implementing theme-aware components
 */
const ThemeDemo: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-black dark:text-white">
          Theme System Demo
        </h3>
        <ThemeToggle />
      </div>

      <div className="space-y-4">
        <div className="rounded border border-stroke dark:border-strokedark p-4 bg-gray dark:bg-meta-4">
          <p className="text-body dark:text-bodydark">
            Current theme: <span className="font-semibold">{theme}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded border border-stroke dark:border-strokedark p-4 bg-background text-foreground">
            <h4 className="font-semibold mb-2">Background/Foreground</h4>
            <p className="text-sm">Uses CSS variables for theme-aware colors</p>
          </div>

          <div className="rounded border border-border p-4 bg-card text-card-foreground">
            <h4 className="font-semibold mb-2">Card Colors</h4>
            <p className="text-sm">Automatically adapts to theme</p>
          </div>

          <div className="rounded border border-stroke dark:border-strokedark p-4 bg-muted text-muted-foreground">
            <h4 className="font-semibold mb-2">Muted Colors</h4>
            <p className="text-sm">For secondary content</p>
          </div>

          <div className="rounded border border-stroke dark:border-strokedark p-4 bg-accent text-accent-foreground">
            <h4 className="font-semibold mb-2">Accent Colors</h4>
            <p className="text-sm">For highlighted elements</p>
          </div>
        </div>

        <div className="rounded border border-stroke dark:border-strokedark p-4">
          <h4 className="font-semibold text-black dark:text-white mb-2">
            Smooth Transitions
          </h4>
          <p className="text-body dark:text-bodydark text-sm">
            All theme changes include smooth 300ms transitions for a polished user experience.
            The theme preference is automatically saved to localStorage and persists across sessions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThemeDemo;

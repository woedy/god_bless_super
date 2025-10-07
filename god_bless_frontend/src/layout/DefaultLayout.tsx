import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar';

interface DefaultLayoutProps {
  children: ReactNode;
  hiddenOnRoutes: string[];
}

const DefaultLayout = ({ children, hiddenOnRoutes }: DefaultLayoutProps) => {
  // Initialize sidebar state with proper default for desktop
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    // On desktop, sidebar should be open by default
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return false;
  });
  const location = useLocation();
  
  // Use React Router's location instead of window.location
  const pathname = location.pathname;

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        // On desktop, keep sidebar open; on mobile, close it
        if (window.innerWidth >= 1024) {
          setSidebarOpen(true);
        } else {
          setSidebarOpen(false);
        }
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Check if this is a project route
  const isProjectRoute = pathname.startsWith('/project');
  
  // Determine if the current route should hide the sidebar and header
  const hideSidebarAndHeader = hiddenOnRoutes.some(route => {
    if (route.includes(':')) {
      // For dynamic routes like /verify-user/:user_email, check if the pathname starts with the route
      return pathname.startsWith(route.split('/:')[0]);
    }
    return pathname === route; // Exact match for non-dynamic routes
  });

  return (
    <div className="dark:bg-boxdark-2 dark:text-bodydark">
      {isProjectRoute ? (
        // For project routes, render children directly (they have their own layout)
        children
      ) : (
        <div className="flex h-screen overflow-hidden">
          {/* Conditionally render Sidebar */}
          {!hideSidebarAndHeader && (
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          )}

          <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
            {/* Conditionally render Header */}
            {!hideSidebarAndHeader && (
              <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            )}

            <main>
              <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
                {children}
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefaultLayout;

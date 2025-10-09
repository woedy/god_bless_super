import { ReactNode, useState } from 'react';
import ProjectHeader from '../components/ProjectHeader';
import ProjectSidebar from '../components/ProjectSidebar';

interface ProjectLayoutProps {
  children: ReactNode;
  projectName?: string;
}

const ProjectLayout = ({ children, projectName }: ProjectLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        {/* Project Sidebar */}
        <ProjectSidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          projectName={projectName}
        />

        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {/* Project Header */}
          <ProjectHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main>
            <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default ProjectLayout;
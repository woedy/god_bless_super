import ProjectLayout from '../../layout/ProjectLayout';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';

const ProjectSettings = () => {
  return (
    <ProjectLayout>
      <div className="mx-auto max-w-350 mt-5">
        <Breadcrumb pageName="Project Settings" />
        
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">Project Settings</h2>
            <p className="text-gray-600 dark:text-gray-400">This page is under development.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Here you'll be able to configure settings specific to this project.
            </p>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
};

export default ProjectSettings;
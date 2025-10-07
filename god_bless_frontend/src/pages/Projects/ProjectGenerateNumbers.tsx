import { useParams } from 'react-router-dom';
import ProjectLayout from '../../layout/ProjectLayout';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { GenerateNumbersPage } from '../PhoneManagement';

const ProjectGenerateNumbers = () => {
  const { projectId } = useParams();

  return (
    <ProjectLayout>
      <div className="mx-auto max-w-350 mt-5">
        <Breadcrumb pageName="Generate Numbers" />
        
        <div className="mb-6 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Project ID: {projectId} | Generate phone numbers for this project</span>
          </div>
        </div>

        {/* Embed the existing GenerateNumbersPage component */}
        <GenerateNumbersPage />
      </div>
    </ProjectLayout>
  );
};

export default ProjectGenerateNumbers;
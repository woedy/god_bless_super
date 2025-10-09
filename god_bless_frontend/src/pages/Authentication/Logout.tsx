import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthData } from '../../utils/auth';
import toast from 'react-hot-toast';

const Logout: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear all authentication data
    clearAuthData();

    // Show success message
    toast.success('Logged out successfully');

    // Redirect to landing page
    navigate('/landing');
    
    // Force reload to clear any cached state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-boxdark-2">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Logging out...</p>
      </div>
    </div>
  );
};

export default Logout;

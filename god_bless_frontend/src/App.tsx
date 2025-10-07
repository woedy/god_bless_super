import { useEffect, useState, lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import DefaultLayout from './layout/DefaultLayout';

// Eager load critical components
import { LandingPage } from './pages/Landing';
import { ModernSignIn, ModernSignUp } from './pages/Authentication';

// Lazy load non-critical pages
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const ModernDashboard = lazy(() => import('./pages/Dashboard/ModernDashboard'));
const NewModernDashboard = lazy(() => import('./pages/Dashboard/NewModernDashboard'));
const SignUp = lazy(() => import('./pages/Authentication/SignUp'));
const SignIn = lazy(() => import('./pages/Authentication/SignIn'));
const ForgotPassword = lazy(() =>
  import('./pages/Authentication').then((m) => ({ default: m.ForgotPassword })),
);
const ResetPassword = lazy(() =>
  import('./pages/Authentication').then((m) => ({ default: m.ResetPassword })),
);
const Logout = lazy(() =>
  import('./pages/Authentication').then((m) => ({ default: m.Logout })),
);
const GenerateNumbers = lazy(
  () => import('./pages/AllNumbers/GenerateNumbers'),
);
const ValidateNumber = lazy(() => import('./pages/Validation/ValidateNumber'));
const ValidateInfo = lazy(() => import('./pages/AllNumbers/ValidateInfo'));
const VerifyUser = lazy(() => import('./pages/Authentication/VerifyUser'));
const AllNumbers = lazy(() => import('./pages/AllNumbers/AllNumbers'));
const GenerateNumbersPage = lazy(
  () => import('./pages/PhoneManagement/GenerateNumbersPage'),
);
const AllNumbersPage = lazy(
  () => import('./pages/PhoneManagement/AllNumbersPage'),
);
const ValidateNumbersPage = lazy(
  () => import('./pages/PhoneManagement/ValidateNumbersPage'),
);
const Profile = lazy(() => import('./pages/Profile/Profile'));
const EnhancedSettings = lazy(() =>
  import('./pages/Settings').then((m) => ({ default: m.EnhancedSettings })),
);
const PhoneNumberCSVGenerator = lazy(
  () => import('./pages/Download/DownloadCSV'),
);
const SMTPManager = lazy(() => import('./pages/SMTP/SMTPManager'));
const SmsSender = lazy(() => import('./pages/SmsSender/SmsSender'));
const BulkSmsSender = lazy(() => import('./pages/SmsSender/BulkSmsSender'));
const AddProject = lazy(() => import('./pages/Projects/AddProject'));
const AllProjects = lazy(() => import('./pages/Projects/AllProjects'));
const ProjectDashboard = lazy(
  () => import('./pages/Projects/ProjectDashboard'),
);
const ProjectTasks = lazy(() => import('./pages/Projects/ProjectTasks'));
const ProjectPhoneNumbers = lazy(
  () => import('./pages/Projects/ProjectPhoneNumbers'),
);
const ProjectSMSCampaigns = lazy(
  () => import('./pages/Projects/ProjectSMSCampaigns'),
);
const ProjectAnalytics = lazy(
  () => import('./pages/Projects/ProjectAnalytics'),
);
const ProjectSettings = lazy(() => import('./pages/Projects/ProjectSettings'));
const ProjectGenerateNumbers = lazy(
  () => import('./pages/Projects/ProjectGenerateNumbers'),
);
const ProjectAllNumbers = lazy(
  () => import('./pages/Projects/ProjectAllNumbers'),
);
const ProjectValidateNumbers = lazy(
  () => import('./pages/Projects/ProjectValidateNumbers'),
);
const ProjectSendSMS = lazy(() => import('./pages/Projects/ProjectSendSMS'));
const CampaignBuilder = lazy(() =>
  import('./pages/SMSCampaign').then((m) => ({ default: m.CampaignBuilder })),
);
const CampaignList = lazy(() =>
  import('./pages/SMSCampaign').then((m) => ({ default: m.CampaignList })),
);
const CampaignDetail = lazy(() =>
  import('./pages/SMSCampaign').then((m) => ({ default: m.CampaignDetail })),
);
const BulkSMS = lazy(() =>
  import('./pages/SMSCampaign').then((m) => ({ default: m.BulkSMS })),
);
const CampaignDashboard = lazy(() =>
  import('./pages/SMSCampaign').then((m) => ({ default: m.CampaignDashboard })),
);

const hiddenOnRoutes = [
  '/',
  '/landing',
  '/signup',
  '/signin',
  '/verify-user',
  '/all-projects',
  '/add-project',
  '/forgot-password',
  '/reset-password',
  '/logout',
  '/dashboard',
];

function App() {
  // Always call hooks at the top level - never conditionally
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize app and handle any startup errors
  useEffect(() => {
    try {
      // Safe scroll to top
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    } catch (err) {
      console.warn('Error scrolling to top:', err);
    }
  }, []);

  useEffect(() => {
    try {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Error in loading timer:', err);
      setError('Failed to initialize application');
      setLoading(false);
    }
  }, []);

  // Handle error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-boxdark-2">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Application Error
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (loading) {
    return <Loader />;
  }

  // Main app render
  return (
    <DefaultLayout hiddenOnRoutes={hiddenOnRoutes}>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Project Routes - These use ProjectLayout internally */}
          <Route
            path="/project/:projectId"
            element={
              <>
                <PageTitle title="Project Dashboard - God Bless America" />
                <ProjectDashboard />
              </>
            }
          />
          <Route
            path="/project/:projectId/tasks"
            element={
              <>
                <PageTitle title="Project Tasks - God Bless America" />
                <ProjectTasks />
              </>
            }
          />
          <Route
            path="/project/:projectId/phone-numbers"
            element={
              <>
                <PageTitle title="Project Phone Numbers - God Bless America" />
                <ProjectPhoneNumbers />
              </>
            }
          />
          <Route
            path="/project/:projectId/sms-campaigns"
            element={
              <>
                <PageTitle title="Project SMS Campaigns - God Bless America" />
                <ProjectSMSCampaigns />
              </>
            }
          />
          <Route
            path="/project/:projectId/analytics"
            element={
              <>
                <PageTitle title="Project Analytics - God Bless America" />
                <ProjectAnalytics />
              </>
            }
          />
          <Route
            path="/project/:projectId/settings"
            element={
              <>
                <PageTitle title="Project Settings - God Bless America" />
                <ProjectSettings />
              </>
            }
          />
          <Route
            path="/project/:projectId/generate-numbers"
            element={
              <>
                <PageTitle title="Generate Numbers - God Bless America" />
                <ProjectGenerateNumbers />
              </>
            }
          />
          <Route
            path="/project/:projectId/all-numbers"
            element={
              <>
                <PageTitle title="All Numbers - God Bless America" />
                <ProjectAllNumbers />
              </>
            }
          />
          <Route
            path="/project/:projectId/validate-numbers"
            element={
              <>
                <PageTitle title="Validate Numbers - God Bless America" />
                <ProjectValidateNumbers />
              </>
            }
          />
          <Route
            path="/project/:projectId/send-sms"
            element={
              <>
                <PageTitle title="Send SMS - God Bless America" />
                <ProjectSendSMS />
              </>
            }
          />
          <Route
            index
            element={
              <>
                <PageTitle title="God Bless America | Open Source Intelligence Platform" />
                <LandingPage />
              </>
            }
          />
          <Route
            path="/landing"
            element={
              <>
                <PageTitle title="God Bless America | Open Source Intelligence Platform" />
                <LandingPage />
              </>
            }
          />
          <Route
            path="/dashboard"
            element={
              <>
                <PageTitle title="Dashboard | God Bless America" />
                <ModernDashboard />
              </>
            }
          />
          <Route
            path="/dashboard-new"
            element={
              <>
                <PageTitle title="New Dashboard | God Bless America" />
                <NewModernDashboard />
              </>
            }
          />
          <Route
            path="/dashboard-legacy"
            element={
              <>
                <PageTitle title="Dashboard (Legacy) | God Bless America" />
                <Dashboard />
              </>
            }
          />
          <Route
            path="/signup"
            element={
              <>
                <PageTitle title="Sign Up | God Bless America" />
                <ModernSignUp />
              </>
            }
          />
          <Route
            path="/signin"
            element={
              <>
                <PageTitle title="Sign In | God Bless America" />
                <ModernSignIn />
              </>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <>
                <PageTitle title="Forgot Password | God Bless America" />
                <ForgotPassword />
              </>
            }
          />
          <Route
            path="/reset-password"
            element={
              <>
                <PageTitle title="Reset Password | God Bless America" />
                <ResetPassword />
              </>
            }
          />
          <Route
            path="/logout"
            element={
              <>
                <PageTitle title="Logout | God Bless America" />
                <Logout />
              </>
            }
          />
          {/* Legacy authentication routes */}
          <Route
            path="/signup-old"
            element={
              <>
                <PageTitle title="Sign Up (Legacy) | God Bless America" />
                <SignUp />
              </>
            }
          />
          <Route
            path="/signin-old"
            element={
              <>
                <PageTitle title="Sign In (Legacy) | God Bless America" />
                <SignIn />
              </>
            }
          />
          <Route
            path="/verify-user/:user_email"
            element={
              <>
                <PageTitle title="Verify User | God Bless America" />
                <VerifyUser />
              </>
            }
          />
          <Route
            path="/all-numbers"
            element={
              <>
                <PageTitle title="All Numbers - God Bless America" />
                <AllNumbersPage />
              </>
            }
          />
          <Route
            path="/validate-number"
            element={
              <>
                <PageTitle title="Validate Number - God Bless America" />
                <ValidateNumbersPage />
              </>
            }
          />
          <Route
            path="/generate-numbers"
            element={
              <>
                <PageTitle title="Generate Numbers - God Bless America" />
                <GenerateNumbersPage />
              </>
            }
          />
          {/* Legacy routes for backward compatibility */}
          <Route
            path="/all-numbers-old"
            element={
              <>
                <PageTitle title="All Numbers (Legacy) - God Bless America" />
                <AllNumbers />
              </>
            }
          />
          <Route
            path="/validate-number-old"
            element={
              <>
                <PageTitle title="Validate Number (Legacy) - God Bless America" />
                <ValidateNumber />
              </>
            }
          />
          <Route
            path="/generate-numbers-old"
            element={
              <>
                <PageTitle title="Generate Numbers (Legacy) - God Bless America" />
                <GenerateNumbers />
              </>
            }
          />
          <Route
            path="/validate-info"
            element={
              <>
                <PageTitle title="Validate Info - God Bless America" />
                <ValidateInfo />
              </>
            }
          />
          <Route
            path="/profile"
            element={
              <>
                <PageTitle title="Validate Info - God Bless America" />
                <Profile />
              </>
            }
          />

          <Route
            path="/download-csv"
            element={
              <>
                <PageTitle title="Download CSV - God Bless America" />
                <PhoneNumberCSVGenerator />
              </>
            }
          />

          <Route
            path="/settings"
            element={
              <>
                <PageTitle title="Settings - God Bless America" />
                <EnhancedSettings />
              </>
            }
          />

          <Route
            path="/smtp-manager"
            element={
              <>
                <PageTitle title="SMTP Manager - God Bless America" />
                <SMTPManager />
              </>
            }
          />
          <Route
            path="/sms-sender"
            element={
              <>
                <PageTitle title="SMS Sender - God Bless America" />
                <SmsSender />
              </>
            }
          />
          <Route
            path="/sms-sender/bulk"
            element={
              <>
                <PageTitle title="Bulk SMS Sender - God Bless America" />
                <BulkSmsSender />
              </>
            }
          />
          <Route
            path="/add-project"
            element={
              <>
                <PageTitle title="Add Project - God Bless America" />
                <AddProject />
              </>
            }
          />
          <Route
            path="/all-projects"
            element={
              <>
                <PageTitle title="All Projects - God Bless America" />
                <AllProjects />
              </>
            }
          />
          {/* SMS Campaign Routes */}
          <Route
            path="/sms-campaigns"
            element={
              <>
                <PageTitle title="SMS Campaigns - God Bless America" />
                <CampaignList />
              </>
            }
          />
          <Route
            path="/sms-campaigns/new"
            element={
              <>
                <PageTitle title="New Campaign - God Bless America" />
                <CampaignBuilder />
              </>
            }
          />
          <Route
            path="/sms-campaigns/:id"
            element={
              <>
                <PageTitle title="Campaign Details - God Bless America" />
                <CampaignDetail />
              </>
            }
          />
          <Route
            path="/sms-campaigns/:id/edit"
            element={
              <>
                <PageTitle title="Edit Campaign - God Bless America" />
                <CampaignBuilder />
              </>
            }
          />
          <Route
            path="/sms-campaigns/:campaignId/bulk-import"
            element={
              <>
                <PageTitle title="Bulk SMS Import - God Bless America" />
                <BulkSMS />
              </>
            }
          />
          <Route
            path="/sms-dashboard"
            element={
              <>
                <PageTitle title="SMS Dashboard - God Bless America" />
                <CampaignDashboard />
              </>
            }
          />
        </Routes>
      </Suspense>
    </DefaultLayout>
  );
}

export default App;

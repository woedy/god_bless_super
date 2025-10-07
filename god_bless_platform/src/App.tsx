/**
 * Main App Component
 * Root component with routing and authentication provider
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts'
import { ProtectedRoute, PublicRoute } from './components/common'
import { 
  LoginPage, 
  RegisterPage, 
  ForgotPasswordPage, 
  ResetPasswordPage,
  DashboardPage,
  ProjectsPage,
  AddProjectPage,
  EditProjectPage,
  ProjectDetailPage,
  PhoneNumbersPage,
  GenerateNumbersPage,
  ValidateNumbersPage,
  NumberListPage,
  SMSPage,
  CampaignsPage,
  CreateCampaignPage,
  CampaignDetailsPage,
  EditCampaignPage,
  BulkSMSPage,
  TasksPage,
  LandingPage 
} from './pages'
import { ROUTES } from './config/routes'

/**
 * App Component
 */
function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public Routes - Only accessible when not authenticated */}
            <Route 
              path={ROUTES.LOGIN}
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path={ROUTES.REGISTER}
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              } 
            />
            <Route 
              path={ROUTES.FORGOT_PASSWORD}
              element={
                <PublicRoute>
                  <ForgotPasswordPage />
                </PublicRoute>
              } 
            />
            <Route 
              path={ROUTES.RESET_PASSWORD}
              element={
                <PublicRoute>
                  <ResetPasswordPage />
                </PublicRoute>
              } 
            />

            {/* Protected Routes - Require authentication */}
            <Route 
              path={ROUTES.DASHBOARD}
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.PROJECTS}
              element={
                <ProtectedRoute>
                  <ProjectsPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/projects/add"
              element={
                <ProtectedRoute>
                  <AddProjectPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetailPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/projects/:id/edit"
              element={
                <ProtectedRoute>
                  <EditProjectPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.PHONE_NUMBERS}
              element={
                <ProtectedRoute>
                  <PhoneNumbersPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.PHONE_GENERATE}
              element={
                <ProtectedRoute>
                  <GenerateNumbersPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.PHONE_VALIDATE}
              element={
                <ProtectedRoute>
                  <ValidateNumbersPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.PHONE_LIST}
              element={
                <ProtectedRoute>
                  <NumberListPage />
                </ProtectedRoute>
              } 
            />
            
            {/* SMS Campaign Routes */}
            <Route 
              path={ROUTES.SMS}
              element={
                <ProtectedRoute>
                  <SMSPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.SMS_CAMPAIGNS}
              element={
                <ProtectedRoute>
                  <CampaignsPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.SMS_CREATE}
              element={
                <ProtectedRoute>
                  <CreateCampaignPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.SMS_CAMPAIGN_VIEW}
              element={
                <ProtectedRoute>
                  <CampaignDetailsPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.SMS_CAMPAIGN_EDIT}
              element={
                <ProtectedRoute>
                  <EditCampaignPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.SMS_BULK}
              element={
                <ProtectedRoute>
                  <BulkSMSPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.TASKS}
              element={
                <ProtectedRoute>
                  <TasksPage />
                </ProtectedRoute>
              } 
            />

            {/* Landing Page - Default route */}
            <Route path={ROUTES.HOME} element={<LandingPage />} />
            
            {/* Catch all - redirect to dashboard if authenticated, otherwise to landing */}
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App

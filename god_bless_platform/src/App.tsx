/**
 * Main App Component
 * Root component with routing and authentication provider
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, TaskMonitoringProvider, ErrorProvider, ThemeProvider } from './contexts'
import { ProtectedRoute, PublicRoute, ErrorBoundary, ToastProvider } from './components/common'
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
  OptimizationPage,
  TemplatesPage,
  TasksPage,
  TaskHistoryPage,
  ActiveTasksPage,
  TaskDetailsPage,
  LandingPage 
} from './pages'
import { ROUTES } from './config/routes'

/**
 * App Component
 */
function App() {
  return (
    <ErrorBoundary level="global">
      <ThemeProvider>
        <Router>
          <ErrorProvider>
            <ToastProvider position="top-right" maxToasts={5}>
              <AuthProvider>
                <TaskMonitoringProvider>
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
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
                  <ErrorBoundary level="page">
                    <DashboardPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.PROJECTS}
              element={
                <ProtectedRoute>
                  <ErrorBoundary level="page">
                    <ProjectsPage />
                  </ErrorBoundary>
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
                  <ErrorBoundary level="page">
                    <PhoneNumbersPage />
                  </ErrorBoundary>
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
              path={ROUTES.SMS_OPTIMIZATION}
              element={
                <ProtectedRoute>
                  <OptimizationPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.SMS_TEMPLATES}
              element={
                <ProtectedRoute>
                  <TemplatesPage />
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
            
            <Route 
              path={ROUTES.TASK_HISTORY}
              element={
                <ProtectedRoute>
                  <TaskHistoryPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/tasks/active"
              element={
                <ProtectedRoute>
                  <ActiveTasksPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path={ROUTES.TASK_VIEW}
              element={
                <ProtectedRoute>
                  <TaskDetailsPage />
                </ProtectedRoute>
              } 
            />

            {/* Landing Page - Default route */}
            <Route path={ROUTES.HOME} element={<LandingPage />} />
            
            {/* Catch all - redirect to dashboard if authenticated, otherwise to landing */}
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>
                  </div>
                </TaskMonitoringProvider>
              </AuthProvider>
            </ToastProvider>
          </ErrorProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App

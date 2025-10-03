import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';

import Dashboard from './pages/Dashboard/Dashboard';
import DefaultLayout from './layout/DefaultLayout';
import SignUp from './pages/Authentication/SignUp';
import SignIn from './pages/Authentication/SignIn';
import GenerateNumbers from './pages/AllNumbers/GenerateNumbers';
import ValidateNumber from './pages/Validation/ValidateNumber.tsx';
import ValidateInfo from './pages/AllNumbers/ValidateInfo.tsx';
import VerifyUser from './pages/Authentication/VerifyUser.tsx';
import AllNumbers from './pages/AllNumbers/AllNumbers.tsx';
import Profile from './pages/Profile/Profile.tsx';
import Settings from './pages/Profile/Settings.tsx';
import PhoneNumberCSVGenerator from './pages/Download/DownloadCSV.tsx';
import SMTPManager from './pages/SMTP/SMTPManager.tsx';
import SmsSender from './pages/SmsSender/SmsSender.tsx';
import AddProject from './pages/Projects/AddProject.tsx';
import AllProjects from './pages/Projects/AllProjects.tsx';

const hiddenOnRoutes = ['/', '/signup', '/signin', '/verify-user', '/all-projects', '/add-project'];

function App() {
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return loading ? (
    <Loader />
  ) : (
    <DefaultLayout hiddenOnRoutes={hiddenOnRoutes}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <>
              <PageTitle title="Dashboard | God Bless America" />
              <Dashboard />
            </>
          }
        />
        <Route
          index
          element={
            <>
              <PageTitle title="Sign In | God Bless America" />
              <SignIn />
            </>
          }
        />
        <Route
          path="/signup"
          element={
            <>
              <PageTitle title="Sign Up | God Bless America" />
              <SignUp />
            </>
          }
        />
        <Route
          path="/signin"
          element={
            <>
              <PageTitle title="Sign In | God Bless America" />
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
              <AllNumbers />
            </>
          }
        />
        <Route
          path="/validate-number"
          element={
            <>
              <PageTitle title="Validate Number - God Bless America" />
              <ValidateNumber />
            </>
          }
        />
        <Route
          path="/generate-numbers"
          element={
            <>
              <PageTitle title="Generate Numbers - God Bless America" />
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
              <Settings />
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
      </Routes>
    </DefaultLayout>
  );
}

export default App;

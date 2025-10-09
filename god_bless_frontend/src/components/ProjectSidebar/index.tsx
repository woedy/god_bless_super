import { useEffect, useRef, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import Logo from '../../images/logo/logo-icon.svg';

interface ProjectSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
  projectName?: string;
}

const ProjectSidebar = ({ sidebarOpen, setSidebarOpen, projectName }: ProjectSidebarProps) => {
  const { projectId } = useParams();

  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);

  const storedSidebarExpanded = localStorage.getItem('project-sidebar-expanded');
  const [sidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true',
  );

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  useEffect(() => {
    localStorage.setItem('project-sidebar-expanded', sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  }, [sidebarExpanded]);

  return (
    <aside
      ref={sidebar}
      className={`absolute left-0 top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden bg-primary duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* <!-- SIDEBAR HEADER --> */}
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <NavLink to="/all-projects">
          <div className="flex items-center gap-2">
            <img className="h-10" src={Logo} alt="Logo" />
            <div>
              <h4 className="text-lg font-semibold text-white dark:text-white">
                God Bless America
              </h4>
              {projectName && (
                <p className="text-sm text-white/80 truncate max-w-40">
                  {projectName}
                </p>
              )}
            </div>
          </div>
        </NavLink>

        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          <svg
            className="fill-current"
            width="20"
            height="18"
            viewBox="0 0 20 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z"
              fill=""
            />
          </svg>
        </button>
      </div>
      {/* <!-- SIDEBAR HEADER --> */}

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        {/* <!-- Sidebar Menu --> */}
        <nav className="mt-5 py-4 px-4 lg:mt-9 lg:px-6">
          {/* <!-- Menu Group --> */}
          <div>
            <h3 className="mb-4 ml-4 text-sm font-semibold text-white">PROJECT NAVIGATION</h3>

            <ul className="mb-6 flex flex-col gap-1.5">
              {/* <!-- Back to All Projects --> */}
              <li>
                <NavLink
                  to="/all-projects"
                  className="group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium text-bodydark1 hover:bg-white hover:text-black dark:hover:bg-meta-4 duration-300 ease-in-out"
                >
                  <svg
                    className="fill-current"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 8.25H4.87L8.61 4.51C8.85 4.27 8.85 3.88 8.61 3.64C8.37 3.4 7.98 3.4 7.74 3.64L2.64 8.74C2.4 8.98 2.4 9.37 2.64 9.61L7.74 14.71C7.86 14.83 8.02 14.89 8.18 14.89C8.34 14.89 8.5 14.83 8.62 14.71C8.86 14.47 8.86 14.08 8.62 13.84L4.87 10.1H15C15.41 10.1 15.75 9.76 15.75 9.35C15.75 8.94 15.41 8.25 15 8.25Z"
                      fill=""
                    />
                  </svg>
                  ← All Projects
                </NavLink>
              </li>

              {/* <!-- Platform Dashboard --> */}
              <li>
                <NavLink
                  to="/dashboard-new"
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium ${
                      isActive
                        ? 'bg-white text-black dark:bg-meta-4 dark:text-white'
                        : 'text-bodydark1 hover:bg-white hover:text-black dark:hover:bg-meta-4'
                    } duration-300 ease-in-out`
                  }
                >
                  <svg
                    className="fill-current"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.10322 0.956299H2.53135C1.5751 0.956299 0.787598 1.7438 0.787598 2.70005V6.27192C0.787598 7.22817 1.5751 8.01567 2.53135 8.01567H6.10322C7.05947 8.01567 7.84697 7.22817 7.84697 6.27192V2.72817C7.8751 1.7438 7.0876 0.956299 6.10322 0.956299ZM6.60947 6.30005C6.60947 6.5813 6.38447 6.8063 6.10322 6.8063H2.53135C2.2501 6.8063 2.0251 6.5813 2.0251 6.30005V2.72817C2.0251 2.44692 2.2501 2.22192 2.53135 2.22192H6.10322C6.38447 2.22192 6.60947 2.44692 6.60947 2.72817V6.30005Z"
                      fill=""
                    />
                    <path
                      d="M15.4689 0.956299H11.8971C10.9408 0.956299 10.1533 1.7438 10.1533 2.70005V6.27192C10.1533 7.22817 10.9408 8.01567 11.8971 8.01567H15.4689C16.4252 8.01567 17.2127 7.22817 17.2127 6.27192V2.72817C17.2127 1.7438 16.4252 0.956299 15.4689 0.956299ZM15.9752 6.30005C15.9752 6.5813 15.7502 6.8063 15.4689 6.8063H11.8971C11.6158 6.8063 11.3908 6.5813 11.3908 6.30005V2.72817C11.3908 2.44692 11.6158 2.22192 11.8971 2.22192H15.4689C15.7502 2.22192 15.9752 2.44692 15.9752 2.72817V6.30005Z"
                      fill=""
                    />
                    <path
                      d="M6.10322 9.92822H2.53135C1.5751 9.92822 0.787598 10.7157 0.787598 11.672V15.2438C0.787598 16.2001 1.5751 16.9876 2.53135 16.9876H6.10322C7.05947 16.9876 7.84697 16.2001 7.84697 15.2438V11.7001C7.8751 10.7157 7.0876 9.92822 6.10322 9.92822ZM6.60947 15.272C6.60947 15.5532 6.38447 15.7782 6.10322 15.7782H2.53135C2.2501 15.7782 2.0251 15.5532 2.0251 15.272V11.7001C2.0251 11.4188 2.2501 11.1938 2.53135 11.1938H6.10322C6.38447 11.1938 6.60947 11.4188 6.60947 11.7001V15.272Z"
                      fill=""
                    />
                    <path
                      d="M15.4689 9.92822H11.8971C10.9408 9.92822 10.1533 10.7157 10.1533 11.672V15.2438C10.1533 16.2001 10.9408 16.9876 11.8971 16.9876H15.4689C16.4252 16.9876 17.2127 16.2001 17.2127 15.2438V11.7001C17.2127 10.7157 16.4252 9.92822 15.4689 9.92822ZM15.9752 15.272C15.9752 15.5532 15.7502 15.7782 15.4689 15.7782H11.8971C11.6158 15.7782 11.3908 15.5532 11.3908 15.272V11.7001C11.3908 11.4188 11.6158 11.1938 11.8971 11.1938H15.4689C15.7502 11.1938 15.9752 11.4188 15.9752 11.7001V15.272Z"
                      fill=""
                    />
                  </svg>
                  🌐 Platform Dashboard
                </NavLink>
              </li>

              {/* <!-- Project Dashboard --> */}
              <li>
                <NavLink
                  to={`/project/${projectId}`}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium ${
                      isActive
                        ? 'bg-white text-black dark:bg-meta-4 dark:text-white'
                        : 'text-bodydark1 hover:bg-white hover:text-black dark:hover:bg-meta-4'
                    } duration-300 ease-in-out`
                  }
                >
                  <svg
                    className="fill-current"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.10322 0.956299H2.53135C1.5751 0.956299 0.787598 1.7438 0.787598 2.70005V6.27192C0.787598 7.22817 1.5751 8.01567 2.53135 8.01567H6.10322C7.05947 8.01567 7.84697 7.22817 7.84697 6.27192V2.72817C7.8751 1.7438 7.0876 0.956299 6.10322 0.956299ZM6.60947 6.30005C6.60947 6.5813 6.38447 6.8063 6.10322 6.8063H2.53135C2.2501 6.8063 2.0251 6.5813 2.0251 6.30005V2.72817C2.0251 2.44692 2.2501 2.22192 2.53135 2.22192H6.10322C6.38447 2.22192 6.60947 2.44692 6.60947 2.72817V6.30005Z"
                      fill=""
                    />
                    <path
                      d="M15.4689 0.956299H11.8971C10.9408 0.956299 10.1533 1.7438 10.1533 2.70005V6.27192C10.1533 7.22817 10.9408 8.01567 11.8971 8.01567H15.4689C16.4252 8.01567 17.2127 7.22817 17.2127 6.27192V2.72817C17.2127 1.7438 16.4252 0.956299 15.4689 0.956299ZM15.9752 6.30005C15.9752 6.5813 15.7502 6.8063 15.4689 6.8063H11.8971C11.6158 6.8063 11.3908 6.5813 11.3908 6.30005V2.72817C11.3908 2.44692 11.6158 2.22192 11.8971 2.22192H15.4689C15.7502 2.22192 15.9752 2.44692 15.9752 2.72817V6.30005Z"
                      fill=""
                    />
                    <path
                      d="M6.10322 9.92822H2.53135C1.5751 9.92822 0.787598 10.7157 0.787598 11.672V15.2438C0.787598 16.2001 1.5751 16.9876 2.53135 16.9876H6.10322C7.05947 16.9876 7.84697 16.2001 7.84697 15.2438V11.7001C7.8751 10.7157 7.0876 9.92822 6.10322 9.92822ZM6.60947 15.272C6.60947 15.5532 6.38447 15.7782 6.10322 15.7782H2.53135C2.2501 15.7782 2.0251 15.5532 2.0251 15.272V11.7001C2.0251 11.4188 2.2501 11.1938 2.53135 11.1938H6.10322C6.38447 11.1938 6.60947 11.4188 6.60947 11.7001V15.272Z"
                      fill=""
                    />
                    <path
                      d="M15.4689 9.92822H11.8971C10.9408 9.92822 10.1533 10.7157 10.1533 11.672V15.2438C10.1533 16.2001 10.9408 16.9876 11.8971 16.9876H15.4689C16.4252 16.9876 17.2127 16.2001 17.2127 15.2438V11.7001C17.2127 10.7157 16.4252 9.92822 15.4689 9.92822ZM15.9752 15.272C15.9752 15.5532 15.7502 15.7782 15.4689 15.7782H11.8971C11.6158 15.7782 11.3908 15.5532 11.3908 15.272V11.7001C11.3908 11.4188 11.6158 11.1938 11.8971 11.1938H15.4689C15.7502 11.1938 15.9752 11.4188 15.9752 11.7001V15.272Z"
                      fill=""
                    />
                  </svg>
                  Dashboard
                </NavLink>
              </li>

              {/* <!-- Project Tasks --> */}
              <li>
                <NavLink
                  to={`/project/${projectId}/tasks`}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium ${
                      isActive
                        ? 'bg-white text-black dark:bg-meta-4 dark:text-white'
                        : 'text-bodydark1 hover:bg-white hover:text-black dark:hover:bg-meta-4'
                    } duration-300 ease-in-out`
                  }
                >
                  <svg
                    className="fill-current"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15.7499 2.9812H14.2874V2.36245C14.2874 2.02495 14.0062 1.71558 13.6405 1.71558C13.2749 1.71558 12.9937 1.99683 12.9937 2.36245V2.9812H4.97803V2.36245C4.97803 2.02495 4.69678 1.71558 4.33115 1.71558C3.96553 1.71558 3.68428 1.99683 3.68428 2.36245V2.9812H2.2499C1.29365 2.9812 0.478027 3.7687 0.478027 4.75308V14.5406C0.478027 15.4968 1.26553 16.3125 2.2499 16.3125H15.7499C16.7062 16.3125 17.5218 15.525 17.5218 14.5406V4.72495C17.5218 3.7687 16.7062 2.9812 15.7499 2.9812ZM1.77178 8.21245H4.1624V10.9968H1.77178V8.21245ZM5.42803 8.21245H8.38115V10.9968H5.42803V8.21245ZM8.38115 12.2625V15.0187H5.42803V12.2625H8.38115ZM9.64678 8.21245H12.5999V10.9968H9.64678V8.21245ZM9.64678 12.2625H12.5999V15.0187H9.64678V12.2625ZM13.8374 8.21245H16.2281V10.9968H13.8374V8.21245Z"
                      fill=""
                    />
                  </svg>
                  Tasks
                </NavLink>
              </li>

              {/* <!-- Generate Numbers --> */}
              <li>
                <NavLink
                  to={`/project/${projectId}/generate-numbers`}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium ${
                      isActive
                        ? 'bg-white text-black dark:bg-meta-4 dark:text-white'
                        : 'text-bodydark1 hover:bg-white hover:text-black dark:hover:bg-meta-4'
                    } duration-300 ease-in-out`
                  }
                >
                  <svg
                    className="fill-current"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 0.5625C4.30664 0.5625 0.5625 4.30664 0.5625 9C0.5625 13.6934 4.30664 17.4375 9 17.4375C13.6934 17.4375 17.4375 13.6934 17.4375 9C17.4375 4.30664 13.6934 0.5625 9 0.5625ZM12.375 9.5625H9.5625V12.375C9.5625 12.6855 9.31055 12.9375 9 12.9375C8.68945 12.9375 8.4375 12.6855 8.4375 12.375V9.5625H5.625C5.31445 9.5625 5.0625 9.31055 5.0625 9C5.0625 8.68945 5.31445 8.4375 5.625 8.4375H8.4375V5.625C8.4375 5.31445 8.68945 5.0625 9 5.0625C9.31055 5.0625 9.5625 5.31445 9.5625 5.625V8.4375H12.375C12.6855 8.4375 12.9375 8.68945 12.9375 9C12.9375 9.31055 12.6855 9.5625 12.375 9.5625Z"
                      fill=""
                    />
                  </svg>
                  Generate Numbers
                </NavLink>
              </li>

              {/* <!-- All Numbers --> */}
              <li>
                <NavLink
                  to={`/project/${projectId}/all-numbers`}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium ${
                      isActive
                        ? 'bg-white text-black dark:bg-meta-4 dark:text-white'
                        : 'text-bodydark1 hover:bg-white hover:text-black dark:hover:bg-meta-4'
                    } duration-300 ease-in-out`
                  }
                >
                  <svg
                    className="fill-current"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15.7312 11.0312L13.2937 9.39372C12.8062 9.03747 12.0937 9.12497 11.7375 9.61247L10.875 10.8937C10.6875 11.1562 10.3312 11.2437 10.0687 11.0562C8.79375 10.3125 7.68748 9.20622 6.94373 7.9312C6.75623 7.66872 6.84373 7.31247 7.10623 7.12497L8.38748 6.26247C8.87498 5.90622 8.96248 5.19372 8.60623 4.70622L6.96873 2.26872C6.61248 1.78122 5.89998 1.69372 5.41248 2.04997L4.04998 3.05622C3.56248 3.41247 3.24998 3.93747 3.24998 4.49997C3.24998 8.24997 6.24998 14.25 9.99998 14.25C10.5625 14.25 11.0875 13.9375 11.4437 13.45L12.45 12.0875C12.8062 11.6 12.7187 10.8875 12.2312 10.5312L15.7312 11.0312Z"
                      fill=""
                    />
                  </svg>
                  All Numbers
                </NavLink>
              </li>

              {/* <!-- Validate Numbers --> */}
              <li>
                <NavLink
                  to={`/project/${projectId}/validate-numbers`}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium ${
                      isActive
                        ? 'bg-white text-black dark:bg-meta-4 dark:text-white'
                        : 'text-bodydark1 hover:bg-white hover:text-black dark:hover:bg-meta-4'
                    } duration-300 ease-in-out`
                  }
                >
                  <svg
                    className="fill-current"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 0.5625C4.30664 0.5625 0.5625 4.30664 0.5625 9C0.5625 13.6934 4.30664 17.4375 9 17.4375C13.6934 17.4375 17.4375 13.6934 17.4375 9C17.4375 4.30664 13.6934 0.5625 9 0.5625ZM12.7266 7.42969L8.22656 11.9297C8.08594 12.0703 7.89844 12.1406 7.71094 12.1406C7.52344 12.1406 7.33594 12.0703 7.19531 11.9297L5.27344 10.0078C5.00391 9.73828 5.00391 9.29297 5.27344 9.02344C5.54297 8.75391 5.98828 8.75391 6.25781 9.02344L7.71094 10.4766L11.7422 6.44531C12.0117 6.17578 12.457 6.17578 12.7266 6.44531C12.9961 6.71484 12.9961 7.16016 12.7266 7.42969Z"
                      fill=""
                    />
                  </svg>
                  Validate Numbers
                </NavLink>
              </li>

              {/* <!-- Send SMS --> */}
              <li>
                <NavLink
                  to={`/project/${projectId}/send-sms`}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium ${
                      isActive
                        ? 'bg-white text-black dark:bg-meta-4 dark:text-white'
                        : 'text-bodydark1 hover:bg-white hover:text-black dark:hover:bg-meta-4'
                    } duration-300 ease-in-out`
                  }
                >
                  <svg
                    className="fill-current"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16.8754 11.6719C16.5379 11.6719 16.2285 11.9531 16.2285 12.3187V14.8219C16.2285 15.075 16.0316 15.2719 15.7785 15.2719H2.22227C1.96914 15.2719 1.77227 15.075 1.77227 14.8219V12.3187C1.77227 11.9812 1.49102 11.6719 1.12539 11.6719C0.759766 11.6719 0.478516 11.9531 0.478516 12.3187V14.8219C0.478516 15.7781 1.23789 16.5375 2.19414 16.5375H15.7785C16.7348 16.5375 17.4941 15.7781 17.4941 14.8219V12.3187C17.5223 11.9531 17.2129 11.6719 16.8754 11.6719Z"
                      fill=""
                    />
                    <path
                      d="M8.55074 12.3469C8.66324 12.4594 8.83199 12.5156 9.00074 12.5156C9.16949 12.5156 9.33824 12.4594 9.45074 12.3469L13.4726 8.43752C13.7257 8.1844 13.7257 7.79065 13.5007 7.53752C13.2476 7.2844 12.8539 7.2844 12.6007 7.5094L9.64762 10.4063V2.1094C9.64762 1.7719 9.36637 1.46252 9.00074 1.46252C8.66324 1.46252 8.35387 1.74377 8.35387 2.1094V10.4063L5.40074 7.53752C5.14762 7.2844 4.75387 7.31252 4.50074 7.53752C4.24762 7.79065 4.27574 8.1844 4.50074 8.43752L8.55074 12.3469Z"
                      fill=""
                    />
                  </svg>
                  Send SMS
                </NavLink>
              </li>

              {/* <!-- Project Analytics --> */}
              <li>
                <NavLink
                  to={`/project/${projectId}/analytics`}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium ${
                      isActive
                        ? 'bg-white text-black dark:bg-meta-4 dark:text-white'
                        : 'text-bodydark1 hover:bg-white hover:text-black dark:hover:bg-meta-4'
                    } duration-300 ease-in-out`
                  }
                >
                  <svg
                    className="fill-current"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15.7499 0.975098H2.2499C1.29365 0.975098 0.478027 1.7626 0.478027 2.7188V15.2813C0.478027 16.2375 1.26553 17.025 2.2499 17.025H15.7499C16.7062 17.025 17.5218 16.2375 17.5218 15.2813V2.69068C17.5218 1.7626 16.7062 0.975098 15.7499 0.975098ZM16.2281 15.2532C16.2281 15.5063 16.0312 15.7032 15.7781 15.7032H2.2499C1.99678 15.7032 1.79990 15.5063 1.79990 15.2532V8.40005H16.2563V15.2532H16.2281ZM16.2281 7.11255H1.79990V2.69068C1.79990 2.43755 1.99678 2.24068 2.2499 2.24068H15.7499C16.0031 2.24068 16.1999 2.43755 16.1999 2.69068V7.11255H16.2281Z"
                      fill=""
                    />
                    <path
                      d="M6.97491 10.9219H4.97491C4.63741 10.9219 4.35616 11.2031 4.35616 11.5406V13.5406C4.35616 13.8781 4.63741 14.1594 4.97491 14.1594H6.97491C7.31241 14.1594 7.59366 13.8781 7.59366 13.5406V11.5406C7.59366 11.2031 7.31241 10.9219 6.97491 10.9219Z"
                      fill=""
                    />
                    <path
                      d="M11.0312 9.84375H9.03125C8.69375 9.84375 8.4125 10.125 8.4125 10.4625V13.5406C8.4125 13.8781 8.69375 14.1594 9.03125 14.1594H11.0312C11.3687 14.1594 11.65 13.8781 11.65 13.5406V10.4625C11.65 10.125 11.3687 9.84375 11.0312 9.84375Z"
                      fill=""
                    />
                    <path
                      d="M15.0875 8.76562H13.0875C12.75 8.76562 12.4688 9.04687 12.4688 9.38437V13.5406C12.4688 13.8781 12.75 14.1594 13.0875 14.1594H15.0875C15.425 14.1594 15.7063 13.8781 15.7063 13.5406V9.38437C15.7063 9.04687 15.425 8.76562 15.0875 8.76562Z"
                      fill=""
                    />
                  </svg>
                  Analytics
                </NavLink>
              </li>

              {/* <!-- Project Settings --> */}
              <li>
                <NavLink
                  to={`/project/${projectId}/settings`}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium ${
                      isActive
                        ? 'bg-white text-black dark:bg-meta-4 dark:text-white'
                        : 'text-bodydark1 hover:bg-white hover:text-black dark:hover:bg-meta-4'
                    } duration-300 ease-in-out`
                  }
                >
                  <svg
                    className="fill-current"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9.0002 7.79065C8.09394 7.79065 7.35644 8.528 7.35644 9.43425C7.35644 10.3405 8.09394 11.078 9.0002 11.078C9.90645 11.078 10.644 10.3405 10.644 9.43425C10.644 8.528 9.90645 7.79065 9.0002 7.79065Z"
                      fill=""
                    />
                    <path
                      d="M10.8283 14.2969C10.39 14.2969 10.0017 14.6852 10.0017 15.1235V16.8516C10.0017 17.2899 9.61342 17.6782 9.17513 17.6782H8.82513C8.38684 17.6782 7.99857 17.2899 7.99857 16.8516V15.1235C7.99857 14.6852 7.61029 14.2969 7.172 14.2969C6.73371 14.2969 6.34544 14.6852 6.34544 15.1235V16.8516C6.34544 18.2016 7.47513 19.3313 8.82513 19.3313H9.17513C10.5251 19.3313 11.6548 18.2016 11.6548 16.8516V15.1235C11.6548 14.6852 11.2665 14.2969 10.8283 14.2969Z"
                      fill=""
                    />
                    <path
                      d="M16.3595 7.7624L15.6533 7.24678C15.5408 7.16553 15.4845 7.02803 15.5127 6.89053L15.7377 5.9624C15.8502 5.52803 15.6252 5.09365 15.2089 4.9249L14.3377 4.5999C14.2252 4.5624 14.1408 4.4624 14.1127 4.34365L13.8877 3.41553C13.7752 2.98115 13.3408 2.7374 12.9064 2.8499L11.9783 3.07490C11.8408 3.10303 11.7033 3.04678 11.6220 2.93428L11.1064 2.22803C10.8252 1.8399 10.2845 1.8399 10.0033 2.22803L9.48768 2.93428C9.40643 3.04678 9.26893 3.10303 9.13143 3.07490L8.20330 2.8499C7.76893 2.7374 7.33455 2.98115 7.22205 3.41553L6.99705 4.34365C6.95955 4.4624 6.87830 4.5624 6.76580 4.5999L5.89455 4.9249C5.47830 5.09365 5.25330 5.52803 5.36580 5.9624L5.59080 6.89053C5.61893 7.02803 5.56268 7.16553 5.45018 7.24678L4.74393 7.7624C4.35580 8.04365 4.35580 8.58428 4.74393 8.86553L5.45018 9.38115C5.56268 9.4624 5.61893 9.5999 5.59080 9.7374L5.36580 10.6655C5.25330 11.0999 5.47830 11.5343 5.89455 11.7030L6.76580 12.0280C6.87830 12.0655 6.95955 12.1655 6.99705 12.2843L7.22205 13.2124C7.33455 13.6468 7.76893 13.8905 8.20330 13.7780L9.13143 13.5530C9.26893 13.5249 9.40643 13.5811 9.48768 13.6936L10.0033 14.3999C10.2845 14.7880 10.8252 14.7880 11.1064 14.3999L11.6220 13.6936C11.7033 13.5811 11.8408 13.5249 11.9783 13.5530L12.9064 13.7780C13.3408 13.8905 13.7752 13.6468 13.8877 13.2124L14.1127 12.2843C14.1502 12.1655 14.2314 12.0655 14.3439 12.0280L15.2152 11.7030C15.6314 11.5343 15.8564 11.0999 15.7439 10.6655L15.5189 9.7374C15.4908 9.5999 15.5470 9.4624 15.6595 9.38115L16.3658 8.86553C16.7539 8.58428 16.7539 8.04365 16.3595 7.7624ZM9.0002 12.7312C7.3127 12.7312 5.9377 11.3562 5.9377 9.66865C5.9377 7.98115 7.3127 6.60615 9.0002 6.60615C10.6877 6.60615 12.0627 7.98115 12.0627 9.66865C12.0627 11.3562 10.6877 12.7312 9.0002 12.7312Z"
                      fill=""
                    />
                  </svg>
                  Settings
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default ProjectSidebar;
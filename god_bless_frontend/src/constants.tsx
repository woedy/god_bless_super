export const baseUrl = "http://localhost:6161/";
export const baseUrlMedia = "http://localhost:6161";
export const baseWsUrl = "ws://localhost:6161/";

//export const baseUrl = "http://92.112.194.239:6161/";
//export const baseUrlMedia = "http://92.112.194.239:6161";
//export const baseWsUrl = "ws://92.112.194.239:6161/";

//export const baseUrl = "http://localhost:5050/";
//export const baseWsUrl = "ws://localhost:5050/";

// Safe localStorage access functions to prevent SSR issues
export const getUserToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const getUserID = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('user_id');
  }
  return null;
};

export const getUserEmail = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('email');
  }
  return null;
};

export const getUsername = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('username');
  }
  return null;
};

export const getUserPhoto = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('photo');
  }
  return null;
};

export const getProjectID = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('projectID');
  }
  return null;
};

export const getProjectName = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('project_name');
  }
  return null;
};

// Legacy exports for backward compatibility - these will be null during SSR
export const userToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
export const userID = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
export const userEmail = typeof window !== 'undefined' ? localStorage.getItem('email') : null;
export const username = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
export const userPhoto = typeof window !== 'undefined' ? localStorage.getItem('photo') : null;
export const projectID = typeof window !== 'undefined' ? localStorage.getItem('projectID') : null;
export const project_name = typeof window !== 'undefined' ? localStorage.getItem('project_name') : null;


export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };
  
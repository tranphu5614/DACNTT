export type Role = 'ADMIN' | 'HR_MANAGER' | 'IT_MANAGER' | 'EMPLOYEE' | string;

export interface User {
  _id: string;
  email: string;
  name: string;
  roles: Role[];
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface ApiError {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

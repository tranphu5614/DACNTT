export type Role = 'ADMIN' | 'HR_MANAGER' | 'IT_MANAGER' | 'EMPLOYEE' | string;

export interface User {
  _id: string;
  email: string;
  name: string;
  roles: Role[];
  // createdAt/updatedAt có thể tồn tại từ backend timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

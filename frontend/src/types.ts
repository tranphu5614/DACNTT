export type Role = 'ADMIN' | 'HR_MANAGER' | 'IT_MANAGER' | 'EMPLOYEE' | string;

export interface User {
  _id: string;
  email: string;
  name: string;
  roles: Role[];
  department?: string;
  phoneNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  avatar?: string;

  // [MỚI] Bổ sung các trường này để sửa lỗi build TypeScript
  isVerified?: boolean; // Trạng thái xác thực (khớp với Backend)
  isActive?: boolean;   // Trạng thái hoạt động (dùng cho UI nếu cần)
  jobTitle?: string;    // Chức danh công việc
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
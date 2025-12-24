// frontend/src/api/users.ts
import { request } from './request';

// 1. Định nghĩa Interface UserItem
export interface UserItem {
  _id: string;
  name: string;
  email: string;
  department?: string;
  phoneNumber?: string; // [MỚI] Thêm số điện thoại
  roles: string[]; // Bắt buộc
}

// Định nghĩa Payload tạo user
export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  department?: string;
  phoneNumber?: string; // [MỚI] Thêm số điện thoại
  roles?: string[];
};

// [MỚI] Định nghĩa Payload cập nhật user (Dùng cho trang chi tiết)
export type UpdateUserPayload = {
  name?: string;
  department?: string;
  phoneNumber?: string;
  isManager?: boolean; // Checkbox quản lý
};

// =============================================================================
// A. CÁC API CƠ BẢN (CRUD)
// =============================================================================

// Tạo User mới
export function apiCreateUser(token: string, payload: CreateUserPayload) {
  return request<UserItem>('/users/register', { 
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

// Lấy thông tin bản thân (Profile)
export function apiGetProfile(token: string) { 
  return request<UserItem>('/users/me', { method: 'GET' }, token);
}
// Alias để hỗ trợ code cũ
export const apiMe = apiGetProfile; 

// Lấy danh sách Users (có phân trang & lọc)
export function apiListUsers(
  token: string,
  params: { page?: number; limit?: number; search?: string; role?: string } = {}
) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.role) query.set('role', params.role);

  const qs = query.toString();
  const path = `/users${qs ? `?${qs}` : ''}`;
  
  interface PageResult<T> {
      items: T[];
      total: number;
      page: number;
      limit: number;
  }

  return request<PageResult<UserItem>>(path, { method: 'GET' }, token);
}

// [MỚI] Cập nhật User (Thông tin + Quyền quản lý)
// Gọi vào API PATCH /users/:id ở Backend
export function apiUpdateUser(token: string, id: string, payload: UpdateUserPayload) {
  return request<UserItem>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
}

// Xóa User
export function apiDeleteUser(token: string, id: string) {
  return request<{ deleted: boolean }>(`/users/${id}`, { method: 'DELETE' }, token);
}

// =============================================================================
// B. CÁC API TIỆN ÍCH & QUẢN LÝ
// =============================================================================

// Lấy danh sách nhân viên theo phòng ban
export function apiGetStaffsByDept(token: string, department: string) {
  if (!token) throw new Error('Missing token');
  
  const deptParam = department.toUpperCase(); 
  
  return request<UserItem[]>(`/users/department/${deptParam}`, { method: 'GET' }, token);
}

// Helper lấy TOÀN BỘ user (Fallback)
export async function apiGetAllUsers(token: string) {
  if (!token) return [];
  try {
    const res = await apiListUsers(token, { page: 1, limit: 1000 });
    return res.items; 
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}
// frontend/src/api/users.ts
import { request } from './request';
import { PageResult, User } from '../types';

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  roles?: string[];
  department?: string; // [NEW] Thêm trường phòng ban
};

// Tạo User mới
export function apiCreateUser(token: string, payload: CreateUserPayload) {
  return request<User & { _id: string }>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

// Lấy thông tin bản thân (Profile)
export function apiMe(token: string) {
  return request<User>('/users/me', { method: 'GET' }, token);
}

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
  return request<PageResult<User>>(path, { method: 'GET' }, token);
}

// Xóa User
export function apiDeleteUser(token: string, id: string) {
  return request<{ deleted: boolean }>(`/users/${id}`, { method: 'DELETE' }, token);
}

// [NEW] Helper lấy TOÀN BỘ user (cho dropdown Assign)
// Hàm này gọi apiListUsers với limit lớn để lấy hết danh sách
export async function apiGetAllUsers(token: string) {
  if (!token) return [];
  try {
    // Lấy tối đa 1000 user (đủ cho dropdown)
    const res = await apiListUsers(token, { page: 1, limit: 1000 });
    return res.items; 
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

// [Alias] Đổi tên để khớp với code trong RequestDetail.tsx (nếu bạn dùng code cũ)
export const getUsers = apiGetAllUsers;
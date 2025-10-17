import { request } from './request';
import { PageResult, User } from '../types';

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  roles?: string[];
};

export function apiCreateUser(token: string, payload: CreateUserPayload) {
  return request<User & { _id: string }>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export function apiMe(token: string) {
  return request<User>('/users/me', { method: 'GET' }, token);
}

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

export function apiDeleteUser(token: string, id: string) {
  return request<{ deleted: boolean }>(`/users/${id}`, { method: 'DELETE' }, token);
}

import { request } from './request';
import { User } from '../types';

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

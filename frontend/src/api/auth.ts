import { LoginResponse, User } from '../types';
import { request } from './request';

export function apiLogin(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function apiMe(token: string) {
  return request<User>('/users/me', { method: 'GET' }, token);
}

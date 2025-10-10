import { LoginResponse } from '../types';
import { request } from './client';

export function apiLogin(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export function apiRegister(name: string, email: string, password: string) {
  return request<{ _id: string; email: string; name: string; roles: string[] }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify({ name, email, password }) }
  );
}

import { User } from '../types';
import { request } from './client';

export function apiMe(token: string) {
  return request<User>('/users/me', { method: 'GET' }, token);
}

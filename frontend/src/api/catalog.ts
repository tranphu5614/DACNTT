// frontend/src/api/catalog.ts
import { request } from './request';

export type CatalogField =
  | { key: string; label: string; type: 'text' | 'textarea' | 'date' | 'number'; required?: boolean }
  | { key: string; label: string; type: 'select'; required?: boolean; options: { value: string; label: string }[] };

export type CatalogItem = {
  category: 'HR' | 'IT';
  typeKey: string;
  title: string;
  fields: CatalogField[];
};

export function apiGetCatalog(token: string, category?: 'HR' | 'IT') {
  if (!token) throw new Error('Missing token');
  const q = new URLSearchParams();
  if (category) q.set('category', category);
  const path = `/catalog${q.toString() ? `?${q.toString()}` : ''}`;
  return request<CatalogItem[]>(path, { method: 'GET' }, token);
}

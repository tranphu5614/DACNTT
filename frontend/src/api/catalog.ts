import { request } from './request';

// [UPDATED] Thêm isBusy
export type StaticSelectOption = { value: string; label: string; isBusy?: boolean };

type CommonFieldProps = {
  key: string;
  label: string;
  required?: boolean;
};

export type BaseInputField = CommonFieldProps & {
  type: 'text' | 'textarea' | 'date' | 'number' | 'datetime' | 'time';
};

export type StaticSelectField = CommonFieldProps & {
  type: 'select';
  options: StaticSelectOption[];
  optionsUrlTemplate?: never;
};

export type DynamicSelectField = CommonFieldProps & {
  type: 'select';
  optionsUrlTemplate: string;
  options?: never;
};

// [UPDATED] Định nghĩa field mới
export type RoomSelectorField = CommonFieldProps & {
  type: 'room_selector';
  optionsUrlTemplate: string;
};

// [UPDATED] Thêm RoomSelectorField vào Union
export type CatalogField = BaseInputField | StaticSelectField | DynamicSelectField | RoomSelectorField;

export interface CatalogItem {
  category: 'HR' | 'IT';
  typeKey: string;
  title: string;
  fields: CatalogField[];
  approvalFlow?: Array<{ level: number; role: string }>;
}

export function apiGetCatalog(token: string, category?: 'HR' | 'IT') {
  if (!token) throw new Error('Missing token');
  const q = new URLSearchParams();
  if (category) q.set('category', category);
  const path = `/catalog${q.toString() ? `?${q.toString()}` : ''}`;
  return request<CatalogItem[]>(path, { method: 'GET' }, token);
}
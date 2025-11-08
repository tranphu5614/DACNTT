// frontend/src/api/requests.ts
import { request } from './request';

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type RequestCategory = 'HR' | 'IT';

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface MyRequestItem {
  _id: string;
  title: string;
  category: RequestCategory;
  status: string;
  priority?: RequestPriority;
  createdAt: string;
  updatedAt: string;

  // --- quy trình duyệt ---
  approvalStatus?: 'NONE' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  currentApprovalLevel?: number;
  approvals?: Array<{
    level: number;
    role: string;
    decision?: 'APPROVED' | 'REJECTED';
    comment?: string;
    approvedAt?: string;
  }>;
}

export function apiCreateRequest(
  token: string,
  payload: {
    category: RequestCategory;
    typeKey: string;
    title: string;
    description: string;
    priority: RequestPriority | ''; // [UPDATED] Cho phép chuỗi rỗng
    custom: Record<string, any>;
    files?: File[];
  }
) {
  if (!token) throw new Error('Missing token');

  const fd = new FormData();
  fd.append('category', payload.category);
  fd.append('typeKey', payload.typeKey);
  fd.append('title', payload.title);
  fd.append('description', payload.description);

  // [UPDATED] Chỉ gửi priority nếu người dùng đã chọn (không phải chuỗi rỗng)
  if (payload.priority) {
    fd.append('priority', payload.priority);
  }

  fd.append('custom', JSON.stringify(payload.custom || {}));
  (payload.files || []).forEach((f) => fd.append('files', f));

  // BE tự lấy requester từ JWT
  return request<any>('/requests', { method: 'POST', body: fd }, token);
}

export function apiMyRequests(
  token: string,
  params: { page?: number; limit?: number } = {}
) {
  if (!token) throw new Error('Missing token');

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(200, Math.max(1, Math.floor(params.limit ?? 20)));

  const q = new URLSearchParams();
  q.set('page', String(page));
  q.set('limit', String(limit));

  return request<ListResponse<MyRequestItem>>(
    `/requests/mine?${q.toString()}`,
    { method: 'GET' },
    token
  );
}

export function apiQueueRequests(
  token: string,
  params: {
    category: RequestCategory;
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    q?: string;
  }
) {
  if (!token) throw new Error('Missing token');

  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(200, Math.max(1, Math.floor(params.limit ?? 20)));

  const q = new URLSearchParams();
  q.set('category', params.category);
  q.set('page', String(page));
  q.set('limit', String(limit));
  if (params.status) q.set('status', params.status);
  if (params.priority) q.set('priority', params.priority);
  if (params.q) q.set('q', params.q);

  return request<ListResponse<MyRequestItem>>(
    `/requests/queue?${q.toString()}`,
    { method: 'GET' },
    token
  );
}
// frontend/src/api/requests.ts
import { request } from './request';

// [UPDATED] Category là string để hỗ trợ mở rộng (Sales, Logistics, Admin...)
export type RequestCategory = string; 
export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UserShort {
  _id: string;
  name: string;
  email: string;
}

export interface CommentItem {
  _id: string;
  content: string;
  author: UserShort;
  createdAt: string;
  isInternal: boolean;
}

export interface MyRequestItem {
  _id: string;
  title: string;
  
  // [FIX] Bổ sung 2 trường thiếu gây lỗi build
  description?: string; 
  typeKey: string;      

  category: RequestCategory;
  status: string;
  priority?: RequestPriority;
  createdAt: string;
  updatedAt: string;

  // [NEW] Người tạo
  requester?: UserShort;

  // [NEW] Người được giao việc
  assignedTo?: UserShort;

  // [NEW] Danh sách bình luận
  comments?: CommentItem[];

  // [NEW] File đính kèm
  attachments?: Array<{
    filename: string;
    path: string;
    mimetype: string;
  }>;

  // --- Quy trình duyệt ---
  approvalStatus?: 'NONE' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  currentApprovalLevel?: number;
  approvals?: Array<{
    level: number;
    role: string;
    decision?: 'APPROVED' | 'REJECTED';
    comment?: string;
    approvedAt?: string;
    approver?: UserShort;
  }>;

  // --- Booking Info ---
  bookingRoomKey?: string;
  bookingStart?: string;
  bookingEnd?: string;
  
  // Custom fields
  custom?: Record<string, any>;
}

// =============================================================================
// 1. CÁC API TẠO & DANH SÁCH
// =============================================================================

export function apiCreateRequest(
  token: string,
  payload: {
    category: RequestCategory;
    typeKey: string;
    title: string;
    description: string;
    priority: RequestPriority | ''; 
    custom: Record<string, any>;
    bookingStart?: string;
    bookingEnd?: string;
    bookingRoomKey?: string;
    files?: File[];
  }
) {
  if (!token) throw new Error('Missing token');

  const fd = new FormData();
  fd.append('category', payload.category);
  fd.append('typeKey', payload.typeKey);
  fd.append('title', payload.title);
  fd.append('description', payload.description);

  if (payload.priority) {
    fd.append('priority', payload.priority);
  }

  if (payload.bookingStart) fd.append('bookingStart', payload.bookingStart);
  if (payload.bookingEnd) fd.append('bookingEnd', payload.bookingEnd);
  if (payload.bookingRoomKey) fd.append('bookingRoomKey', payload.bookingRoomKey);

  fd.append('custom', JSON.stringify(payload.custom || {}));
  (payload.files || []).forEach((f) => fd.append('files', f));

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

// =============================================================================
// 2. CÁC API CHI TIẾT & TƯƠNG TÁC
// =============================================================================

export function apiGetRequestDetail(token: string, id: string) {
  if (!token) throw new Error('Missing token');
  return request<MyRequestItem>(`/requests/${id}`, { method: 'GET' }, token);
}

export function apiAddComment(
  token: string, 
  requestId: string, 
  content: string, 
  isInternal: boolean = false
) {
  if (!token) throw new Error('Missing token');
  return request<MyRequestItem>(
    `/requests/${requestId}/comments`, 
    { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, isInternal }) 
    }, 
    token
  );
}

export function apiAssignRequest(token: string, requestId: string, assigneeId: string) {
  if (!token) throw new Error('Missing token');
  return request<MyRequestItem>(
    `/requests/${requestId}/assign`, 
    { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigneeId }) 
    }, 
    token
  );
}

export function apiApproveRequest(token: string, id: string, comment?: string) {
  if (!token) throw new Error('Missing token');
  return request(
    `/requests/${id}/approve`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    },
    token
  );
}

export function apiRejectRequest(token: string, id: string, comment?: string) {
  if (!token) throw new Error('Missing token');
  return request(
    `/requests/${id}/reject`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    },
    token
  );
}

export function apiPendingApproval(token: string) {
  if (!token) throw new Error('Missing token');
  return request<MyRequestItem[]>(
    '/requests/pending-approval',
    { method: 'GET' },
    token
  );
}

// =============================================================================
// 3. CÁC API TIỆN ÍCH (DASHBOARD, ROOMS, EXCEL)
// =============================================================================

export function apiGetDashboardStats(token: string, category?: string) {
  if (!token) throw new Error('Missing token');
  
  const q = new URLSearchParams();
  if (category && category !== 'ALL') q.set('category', category);
  
  return request<any>(`/requests/dashboard/stats?${q.toString()}`, { method: 'GET' }, token);
}

export async function apiExportRequests(token: string) {
  // Lấy URL gốc từ biến môi trường hoặc mặc định localhost
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  // SỬA: Xóa "/api" ở đầu đường dẫn
  const url = `${baseURL}/requests/export/excel`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    // Đọc lỗi từ backend để debug dễ hơn
    const errText = await res.text();
    console.error("Export Error:", res.status, errText);
    throw new Error(`Export failed: ${res.status}`);
  }
  return res.blob();
}

export function apiGetAvailableRooms(
  token: string, 
  date: string, 
  from: string, 
  to: string, 
  size: number
) {
  if (!token) throw new Error('Missing token');
  const q = new URLSearchParams();
  q.set('date', date);
  q.set('from', from);
  q.set('to', to);
  q.set('size', String(size));

  return request<Array<{
    key: string; 
    name: string; 
    size: number; 
    isBusy: boolean; 
    value: string; 
    label: string 
  }>>(
    `/requests/available-rooms?${q.toString()}`,
    { method: 'GET' },
    token
  );
}
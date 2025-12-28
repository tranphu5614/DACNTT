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
  description?: string; 
  typeKey: string;      

  category: RequestCategory;
  status: string;
  priority?: RequestPriority;
  createdAt: string;
  updatedAt: string;
  dueDate?: string; // [New] SLA
  department?: string;
  
  // Người tạo & Người xử lý
  requester?: UserShort;
  assignedTo?: UserShort;

  // Dữ liệu mở rộng
  comments?: CommentItem[];
  attachments?: Array<{
    filename: string;
    path: string;
    mimetype: string;
  }>;
  custom?: Record<string, any>;

  // [FIX] Thêm trường history để tránh lỗi TypeScript ở Frontend
  history?: Array<{
    action: string;
    timestamp: string;
    user?: UserShort;
    note?: string;
  }>;

  // Quy trình duyệt
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

  // Booking Info
  bookingRoomKey?: string;
  bookingStart?: string;
  bookingEnd?: string;
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

  if (payload.priority) fd.append('priority', payload.priority);
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
  const q = new URLSearchParams({
    page: String(params.page || 1),
    limit: String(params.limit || 20)
  });
  return request<ListResponse<MyRequestItem>>(`/requests/mine?${q.toString()}`, { method: 'GET' }, token);
}

// [MỚI] API Lấy danh sách việc được giao (Assigned Tasks)
export function apiGetAssignedRequests(
  token: string,
  params: { page?: number; limit?: number } = {}
) {
  if (!token) throw new Error('Missing token');
  const q = new URLSearchParams({
    page: String(params.page || 1),
    limit: String(params.limit || 20)
  });
  return request<ListResponse<MyRequestItem>>(`/requests/assigned?${q.toString()}`, { method: 'GET' }, token);
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
  const q = new URLSearchParams();
  q.set('category', params.category);
  q.set('page', String(params.page || 1));
  q.set('limit', String(params.limit || 20));
  if (params.status) q.set('status', params.status);
  if (params.priority) q.set('priority', params.priority);
  if (params.q) q.set('q', params.q);

  return request<ListResponse<MyRequestItem>>(`/requests/queue?${q.toString()}`, { method: 'GET' }, token);
}

// =============================================================================
// 2. CÁC API CHI TIẾT & TƯƠNG TÁC
// =============================================================================

export function apiGetRequestDetail(token: string, id: string) {
  if (!token) throw new Error('Missing token');
  return request<MyRequestItem>(`/requests/${id}`, { method: 'GET' }, token);
}

export function apiAddComment(token: string, requestId: string, content: string, isInternal: boolean = false) {
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

// [QUAN TRỌNG] Cập nhật trạng thái (Hoàn thành / Hủy)
export function apiUpdateStatus(token: string, id: string, status: string) {
  if (!token) throw new Error('Missing token');
  return request(
    `/requests/${id}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
    token
  );
}

export function apiApproveRequest(token: string, id: string, comment?: string) {
  if (!token) throw new Error('Missing token');
  return request(`/requests/${id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    }, token);
}

export function apiRejectRequest(token: string, id: string, comment?: string) {
  if (!token) throw new Error('Missing token');
  return request(`/requests/${id}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    }, token);
}

export function apiPendingApproval(token: string) {
  if (!token) throw new Error('Missing token');
  return request<MyRequestItem[]>('/requests/pending-approval', { method: 'GET' }, token);
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
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const url = `${baseURL}/requests/export/excel`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Export Error:", res.status, errText);
    throw new Error(`Export failed: ${res.status}`);
  }
  return res.blob();
}

export function apiGetAvailableRooms(token: string, date: string, from: string, to: string, size: number) {
  if (!token) throw new Error('Missing token');
  const q = new URLSearchParams({ date, from, to, size: String(size) });
  return request<Array<{
    key: string; name: string; size: number; isBusy: boolean; value: string; label: string 
  }>>(`/requests/available-rooms?${q.toString()}`, { method: 'GET' }, token);
}
import { request } from './request';
import { UserItem } from './users';

// 1. Định nghĩa kiểu dữ liệu cơ bản cho Deal (Dùng cho danh sách)
export interface CrmDeal {
  _id: string;
  customer: {
    fullName: string;
    email: string;
    phoneNumber: string;
    companyName?: string;
  };
  requirement: string;
  status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WIN' | 'LOSE';
  assignedTo?: UserItem;
  note?: string;
  createdAt: string;
}

// 2. Định nghĩa kiểu chi tiết (Bao gồm Comment & History)
export interface CrmDetail extends CrmDeal {
  comments: {
    _id: string;
    content: string;
    author: { _id: string; name: string; avatar?: string };
    createdAt: string;
  }[];
  history: {
    action: string;
    user: { _id: string; name: string };
    timestamp: string;
    note?: string;
  }[];
}

// =============================================================================
// API CALLS
// =============================================================================

// Lấy danh sách CRM
export function getCrmDeals(token: string) {
  return request<CrmDeal[]>('/crm', { method: 'GET' }, token);
}

// Lấy chi tiết 1 Deal (bao gồm comments, history)
export function getCrmDetail(token: string, id: string) {
  return request<CrmDetail>(`/crm/${id}`, { method: 'GET' }, token);
}

// [MỚI] API Tạo Deal nội bộ (Dành cho Sale/Admin tự tạo)
export function createCrmDeal(token: string, data: {
  fullName: string;
  email: string;
  phoneNumber: string;
  companyName?: string;
  requirement: string;
  note?: string;
}) {
  return request<any>('/crm', {
    method: 'POST',
    body: JSON.stringify(data)
  }, token);
}

// Thêm Comment vào Deal
export function addCrmComment(token: string, id: string, content: string) {
  return request<any>(`/crm/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content })
  }, token);
}

// Phân công (Assign) cho nhân viên Sale
export function assignDeal(token: string, dealId: string, userId: string) {
  return request<any>(`/crm/${dealId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ userId }),
  }, token);
}

// Cập nhật trạng thái (Win/Lose/In Progress...)
export function updateDealStatus(token: string, dealId: string, status: string, note?: string) {
  return request<any>(`/crm/${dealId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  }, token);
}

// API Public (Dành cho khách hàng gửi Form - Không cần token)
export function submitPublicRequest(data: any) {
  return request<any>('/public/crm/submit', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
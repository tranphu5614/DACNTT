import { request } from './request';

export interface WorkflowItem {
  _id?: string;
  typeKey: string;
  name: string;
  category: string;
  steps: { level: number; role: string }[];
  isActive?: boolean;
}

export function apiGetWorkflows(token: string) {
  return request<WorkflowItem[]>('/workflows', { method: 'GET' }, token);
}

export function apiSaveWorkflow(token: string, data: WorkflowItem) {
  return request<WorkflowItem>('/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }, token);
}

export function apiDeleteWorkflow(token: string, id: string) {
  return request(`/workflows/${id}`, { method: 'DELETE' }, token);
}
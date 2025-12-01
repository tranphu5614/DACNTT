import { request } from './request';

export type KnowledgeSuggestion = {
  id: string;
  title: string;
  suggestion: string;
  score: number;
};

export function apiSuggestKnowledge(token: string, query: string) {
  return request<KnowledgeSuggestion[]>(`/ai/knowledge?q=${encodeURIComponent(query)}`, { method: 'GET' }, token);
}

// Gọi API Chat
export function apiChat(token: string, history: any[], message: string) {
  return request<{ reply: string }>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ history, message }),
  }, token);
}
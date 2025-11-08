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

// Đã xóa apiCompleteText
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

export function apiCompleteText(token: string, text: string) {
  return request<{ completed: string }>(`/ai/complete?text=${encodeURIComponent(text)}`, { method: 'GET' }, token);
}
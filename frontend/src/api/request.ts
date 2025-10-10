const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  // Dùng Headers để thao tác an toàn
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      res.statusText ||
      'Request error';
    throw new Error(Array.isArray(message) ? message.join(', ') : String(message));
  }
  return data as T;
}

function safeJson(text: string) {
  try { return JSON.parse(text); } catch { return text; }
}

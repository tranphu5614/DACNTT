const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

export async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers);

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  const text = await res.text().catch(() => '');
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (data && ((data as any).message || (data as any).error)) ||
      res.statusText ||
      'Request error';
    const msg = Array.isArray(message) ? message.join(', ') : String(message || '');
    throw new Error(`[${res.status}] ${msg}`.trim());
  }

  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

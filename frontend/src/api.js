const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'Erro inesperado');
    error.status = res.status;
    error.code = data.code;
    error.details = data.details;
    throw error;
  }
  return data;
}
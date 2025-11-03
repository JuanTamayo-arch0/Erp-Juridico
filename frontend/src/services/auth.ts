export type Tokens = {
  access: string;
  refresh?: string;
};

const API_BASE = process.env.REACT_APP_API_BASE || '/api';

export async function login(email: string, password: string): Promise<Tokens> {
  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Login failed');
  }

  const data = await res.json();
  const tokens: Tokens = { access: data.access, refresh: data.refresh };
  localStorage.setItem('erp_access', tokens.access);
  if (tokens.refresh) localStorage.setItem('erp_refresh', tokens.refresh);
  return tokens;
}

export function logout(): void {
  localStorage.removeItem('erp_access');
  localStorage.removeItem('erp_refresh');
}

export function getAccessToken(): string | null {
  return localStorage.getItem('erp_access');
}

export async function refreshToken(): Promise<string | null> {
  const refresh = localStorage.getItem('erp_refresh');
  if (!refresh) return null;
  const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  localStorage.setItem('erp_access', data.access);
  return data.access;
}

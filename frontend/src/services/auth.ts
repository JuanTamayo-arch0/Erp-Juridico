export type Tokens = {
  access: string;
  refresh?: string;
};

// In Vite, use import.meta.env for environment variables in the browser.
const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || '/api';

import client from './httpClient';

export async function login(email: string, password: string): Promise<Tokens> {
  // Use HttpClient.post which wraps apiFetch and returns parsed JSON
  const payload = { username: email, email, password };
  const data = await client.post('/auth/login/', payload);
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

// Simple JWT expiry check: returns true if token is expired (or invalid)
export function isAccessTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload || typeof payload.exp !== 'number') return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  } catch (e) {
    return true;
  }
}

export async function refreshToken(): Promise<string | null> {
  const refresh = localStorage.getItem('erp_refresh');
  if (!refresh) return null;
  try {
    const client = (await import('./httpClient')).default;
    const data = await client.post('/auth/token/refresh/', { refresh });
    localStorage.setItem('erp_access', data.access);
    return data.access;
  } catch (e) {
    return null;
  }
}

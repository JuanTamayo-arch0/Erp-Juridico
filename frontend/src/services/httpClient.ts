import apiFetch from './api';

type Json = Record<string, any> | any[];

// Resolve API base depending on environment.
// - In dev (http:// with Vite), we keep '/api' so the Vite proxy works.
// - In packaged Electron (file://), there is no proxy; point to backend URL.
//   You can override with VITE_API_BASE at build time.
export const API_BASE = (import.meta as any).env?.VITE_API_BASE
  || (typeof window !== 'undefined' && window.location.protocol === 'file:'
      ? 'http://127.0.0.1:8000/api'
      : '/api');
export const API_HOST = API_BASE.replace(/\/?api\/?$/, '');

class HttpClient {
  base = API_BASE;

  private async request(path: string, init: RequestInit = {}) {
    // Build URL so callers may pass '/auth/me/' or 'auth/me' and both resolve to '/api/auth/me/'
    let url: string;
    if (path.startsWith('/api')) {
      url = path; // full API path already
    } else if (path.startsWith('/')) {
      // relative path like '/auth/me/' -> prefix with base
      url = `${this.base}${path}`;
    } else {
      url = `${this.base}/${path}`;
    }
    const res = await apiFetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error('Request failed'), { status: res.status, data });
      return data as Json;
    }
    if (!res.ok) throw new Error('Request failed');
    return null;
  }

  get<T = any>(path: string) {
    return this.request(path, { method: 'GET' }) as Promise<T>;
  }

  post<T = any>(path: string, body?: any) {
    return this.request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }) as Promise<T>;
  }

  put<T = any>(path: string, body?: any) {
    return this.request(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }) as Promise<T>;
  }

  delete<T = any>(path: string) {
    return this.request(path, { method: 'DELETE' }) as Promise<T>;
  }
}

const client = new HttpClient();
export default client;

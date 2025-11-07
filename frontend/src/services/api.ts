import { getAccessToken, refreshToken, logout as logoutService } from './auth';

let refreshingPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  if (!refreshingPromise) {
    refreshingPromise = (async () => {
      try {
        const t = await refreshToken();
        return t;
      } finally {
        // clear the promise so future refreshes can start a new one
        refreshingPromise = null;
      }
    })();
  }
  return refreshingPromise;
}

export async function apiFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const access = getAccessToken();
  const headers = new Headers(init.headers || {});
  if (access) headers.set('Authorization', `Bearer ${access}`);
  // prefer JSON
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  // Debug: log outgoing request for troubleshooting (temporary)
  try {
    console.debug('[apiFetch] request ->', typeof input === 'string' ? input : input, init);
  } catch (e) {
    // ignore logging errors
  }

  const res = await fetch(input, { ...init, headers });
  // Debug: log response status
  try { console.debug('[apiFetch] response', res.status, typeof input === 'string' ? input : input); } catch (e) {}
  if (res.status !== 401) return res;

  // status 401 -> attempt refresh
  const newAccess = await doRefresh();
  if (!newAccess) {
    // refresh failed -> force logout
    try {
      logoutService();
    } catch (e) {
      // ignore
    }
    return res;
  }

  // retry original request with new token
  const retryHeaders = new Headers(init.headers || {});
  retryHeaders.set('Authorization', `Bearer ${newAccess}`);
  if (!retryHeaders.has('Content-Type')) retryHeaders.set('Content-Type', 'application/json');

  // Reconstruct body if present (assumes body is string or undefined)
  const retryInit: RequestInit = { ...init, headers: retryHeaders };
  return fetch(input, retryInit);
}

export default apiFetch;

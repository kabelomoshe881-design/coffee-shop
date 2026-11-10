const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.details = payload?.error?.details;
  }
}

async function request(path, { method = 'GET', body, token, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(
      `Cannot reach the API at ${BASE_URL}. Is the server running?`,
      0,
      null
    );
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message || `Request failed with status ${response.status}`,
      response.status,
      payload
    );
  }

  return payload?.data ?? payload;
}

export const api = {
  baseUrl: BASE_URL,

  menu: {
    list: (params = {}, signal) => {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
      ).toString();
      return request(`/api/menu${query ? `?${query}` : ''}`, { signal });
    },
    create: (item, token) => request('/api/menu', { method: 'POST', body: item, token }),
    update: (id, patch, token) =>
      request(`/api/menu/${id}`, { method: 'PUT', body: patch, token }),
    remove: (id, token) => request(`/api/menu/${id}`, { method: 'DELETE', token }),
  },

  orders: {
    create: (order) => request('/api/orders', { method: 'POST', body: order }),
    get: (id, signal) => request(`/api/orders/${id}`, { signal }),
    list: (params, token, signal) => {
      const query = new URLSearchParams(
        Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '')
      ).toString();
      return request(`/api/orders${query ? `?${query}` : ''}`, { token, signal });
    },
    summary: (token, signal) => request('/api/orders/summary/today', { token, signal }),
    setStatus: (id, status, token) =>
      request(`/api/orders/${id}/status`, { method: 'PATCH', body: { status }, token }),
  },

  auth: {
    login: (username, password) =>
      request('/api/auth/login', { method: 'POST', body: { username, password } }),
  },

  health: () => request('/api/health'),
};

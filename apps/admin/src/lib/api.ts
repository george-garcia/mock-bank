import axios, { AxiosResponse } from 'axios';

// @ts-ignore - vite env
const API_BASE_URL = import.meta.env?.VITE_ADMIN_API_URL || 'http://localhost:4001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  // Staff auth is carried by httpOnly cookies (access + refresh) — send them every request.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// On a 401, try a one-time silent refresh (rotates the staff session) and replay. Auth
// endpoints are excluded so their 401s surface to the caller.
let refreshing: Promise<unknown> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const isAuthCall = typeof original.url === 'string' && original.url.includes('/auth/');

    if (error.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh');
        await refreshing;
        refreshing = null;
        return api(original);
      } catch (refreshError) {
        refreshing = null;
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

// Every endpoint wraps its result in { success, data }. Unwrap so callers see only the payload.
async function unwrap<T = any>(request: Promise<AxiosResponse<{ data: T }>>): Promise<T> {
  const response = await request;
  return response.data.data;
}

// Staff auth
export const authApi = {
  login: (data: { email: string; password: string }) => unwrap(api.post('/auth/login', data)),
  demoLogin: () => unwrap(api.post('/auth/demo-login')),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  me: () => unwrap(api.get('/auth/me')),
};

// Customers (bank users) — view + edit profile data
export const customersApi = {
  list: () => unwrap(api.get('/customers')),
  get: (id: number) => unwrap(api.get(`/customers/${id}`)),
  update: (id: number, data: { email?: string; firstName?: string; lastName?: string }) =>
    unwrap(api.patch(`/customers/${id}`, data)),
};

// Accounts — view (with balances + owner), transaction history, lifecycle actions
export const accountsApi = {
  list: () => unwrap(api.get('/accounts')),
  get: (id: number) => unwrap(api.get(`/accounts/${id}`)),
  transactions: (id: number) => unwrap(api.get(`/accounts/${id}/transactions`)),
  freeze: (id: number) => unwrap(api.patch(`/accounts/${id}/freeze`)),
  unfreeze: (id: number) => unwrap(api.patch(`/accounts/${id}/unfreeze`)),
  close: (id: number) => unwrap(api.patch(`/accounts/${id}/close`)),
};

// Audit trail
export const auditApi = {
  list: (limit = 100) => unwrap(api.get('/audit-logs', { params: { limit } })),
};

// Staff management (admin only)
export const staffApi = {
  list: () => unwrap(api.get('/staff')),
  create: (data: { email: string; password: string; firstName: string; lastName: string; role: 'admin' | 'auditor' }) =>
    unwrap(api.post('/staff', data)),
};

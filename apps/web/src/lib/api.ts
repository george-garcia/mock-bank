import axios, { AxiosResponse } from 'axios';

// @ts-ignore
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Every endpoint wraps its result in { success, data }. Unwrap it here so callers
// (hooks/components) only ever deal with the payload, never the transport envelope.
async function unwrap<T = any>(request: Promise<AxiosResponse<{ data: T }>>): Promise<T> {
  const response = await request;
  return response.data.data;
}

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    unwrap(api.post('/auth/register', data)),
  login: (data: { email: string; password: string }) =>
    unwrap(api.post('/auth/login', data)),
  profile: () => unwrap(api.get('/users/profile')),
};

// Two-Factor Auth API
export const twoFactorApi = {
  status: () => unwrap(api.get('/auth/2fa/status')),
  totpSetup: () => unwrap(api.post('/auth/2fa/totp/setup')),
  totpEnable: (code: string) => unwrap(api.post('/auth/2fa/totp/enable', { code })),
  emailSetup: () => unwrap(api.post('/auth/2fa/email/setup')),
  emailEnable: (code: string) => unwrap(api.post('/auth/2fa/email/enable', { code })),
  disable: (code: string) => unwrap(api.post('/auth/2fa/disable', { code })),
  verifyLogin: (data: { challengeToken: string; code: string }) =>
    unwrap(api.post('/auth/2fa/verify-login', data)),
};

// Accounts API
export const accountsApi = {
  list: () => unwrap(api.get('/accounts')),
  create: (data: { type: 'checking' | 'savings'; label?: string }) =>
    unwrap(api.post('/accounts', data)),
  get: (id: number) => unwrap(api.get(`/accounts/${id}`)),
};

// Transactions API
export const transactionsApi = {
  list: (accountId: number) => unwrap(api.get(`/transactions/account/${accountId}`)),
  create: (data: { accountId: number; type: string; amount: string; description?: string }) =>
    unwrap(api.post('/transactions', data)),
};

// Cards API
export const cardsApi = {
  list: () => unwrap(api.get('/cards')),
  create: (data: { accountId: number; spendLimit?: string; spendLimitPeriod?: string; memo?: string }) =>
    unwrap(api.post('/cards', data)),
  freeze: (id: number) => unwrap(api.patch(`/cards/${id}/freeze`)),
  unfreeze: (id: number) => unwrap(api.patch(`/cards/${id}/unfreeze`)),
  cancel: (id: number) => unwrap(api.patch(`/cards/${id}/cancel`)),
  transactions: (id: number) => unwrap(api.get(`/cards/${id}/transactions`)),
};

// Deposits API
export const depositsApi = {
  simulate: (data: { accountId: number; amount: string; description?: string; instant?: boolean }) =>
    unwrap(api.post('/deposits/simulate', data)),
};

// Withdrawals API
export const withdrawalsApi = {
  create: (data: { accountId: number; amount: string; description?: string }) =>
    unwrap(api.post('/withdrawals', data)),
};

// Transfers API
export const transfersApi = {
  create: (data: { fromAccountId: number; toAccountId: number; amount: string; description?: string }) =>
    unwrap(api.post('/transfers', data)),
};

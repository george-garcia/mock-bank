import axios from 'axios';

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

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  profile: () => api.get('/users/profile'),
};

// Accounts API
export const accountsApi = {
  list: () => api.get('/accounts'),
  create: (data: { type: 'checking' | 'savings'; label?: string }) =>
    api.post('/accounts', data),
  get: (id: number) => api.get(`/accounts/${id}`),
};

// Transactions API
export const transactionsApi = {
  list: (accountId: number) => api.get(`/transactions/account/${accountId}`),
  create: (data: { accountId: number; type: string; amount: string; description?: string }) =>
    api.post('/transactions', data),
};

// Cards API
export const cardsApi = {
  list: () => api.get('/cards'),
  create: (data: { accountId: number; spendLimit?: string; spendLimitPeriod?: string; memo?: string }) =>
    api.post('/cards', data),
  freeze: (id: number) => api.patch(`/cards/${id}/freeze`),
  unfreeze: (id: number) => api.patch(`/cards/${id}/unfreeze`),
  cancel: (id: number) => api.patch(`/cards/${id}/cancel`),
  transactions: (id: number) => api.get(`/cards/${id}/transactions`),
};

// Deposits API
export const depositsApi = {
  simulate: (data: { accountId: number; amount: string; description?: string; instant?: boolean }) =>
    api.post('/deposits/simulate', data),
};

// Withdrawals API
export const withdrawalsApi = {
  create: (data: { accountId: number; amount: string; description?: string }) =>
    api.post('/withdrawals', data),
};

// Transfers API
export const transfersApi = {
  create: (data: { fromAccountId: number; toAccountId: number; amount: string; description?: string }) =>
    api.post('/transfers', data),
};

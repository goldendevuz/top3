import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Intercept requests to attach the token if available
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses to handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  googleLogin: async (credential: string) => {
    const res = await api.post('/auth/google', { credential });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const domainsApi = {
  getDomains: async () => {
    const res = await api.get('/domains');
    return res.data;
  },
  addDomain: async (data: { name: string; price: number; description?: string }) => {
    const res = await api.post('/domains', data);
    return res.data;
  },
  clickDomain: async (id: number) => {
    const res = await api.post(`/domains/${id}/click`);
    return res.data;
  }
};

export const paymentsApi = {
  initPayment: async (domainId: number) => {
    const res = await api.post('/payments/init', { domain_id: domainId });
    return res.data;
  },
  checkStatus: async (domainId: number) => {
    const res = await api.get(`/payments/status/${domainId}`);
    return res.data;
  }
};

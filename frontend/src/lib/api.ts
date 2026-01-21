import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
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

export default api;

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Scripts API
export const scriptsAPI = {
  getAll: () => api.get('/scripts'),
  getOne: (id: string) => api.get(`/scripts/${id}`),
  create: (data: any) => api.post('/scripts', data),
  update: (id: string, data: any) => api.put(`/scripts/${id}`, data),
  delete: (id: string) => api.delete(`/scripts/${id}`),
};

// Voices API
export const voicesAPI = {
  getAll: () => api.get('/voices'),
  getOne: (id: string) => api.get(`/voices/${id}`),
  create: (data: any) => api.post('/voices', data),
  update: (id: string, data: any) => api.put(`/voices/${id}`, data),
  delete: (id: string) => api.delete(`/voices/${id}`),
};

// Agents API
export const agentsAPI = {
  getAll: () => api.get('/agents'),
  create: (data: any) => api.post('/agents', data),
  update: (id: string, data: any) => api.put(`/agents/${id}`, data),
  delete: (id: string) => api.delete(`/agents/${id}`),
};

// Calls API
export const callsAPI = {
  getAll: (params?: any) => api.get('/calls', { params }),
  getOne: (id: string) => api.get(`/calls/${id}`),
  getTranscript: (id: string) => api.get(`/calls/${id}/transcript`),
  single: (data: any) => api.post('/calls/single', data),
  bulk: (formData: FormData) => api.post('/calls/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getCampaigns: () => api.get('/calls/campaigns/list'),
  getStats: () => api.get('/calls/stats/overview'),
  sync: () => api.post('/calls/sync'),
};

// Queue API
export const queueAPI = {
  getQueue: () => api.get('/queue'),
  getStats: () => api.get('/queue/stats'),
  acceptCall: (queueId: string) => api.post(`/queue/accept/${queueId}`),
  completeCall: (queueId: string, notes?: string) => api.post(`/queue/complete/${queueId}`, { notes }),
  getToken: () => api.get('/queue/token'),
  connectCall: (callSid: string) => api.post(`/queue/connect/${callSid}`),
};


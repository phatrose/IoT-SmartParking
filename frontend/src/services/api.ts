/**
 * src/services/api.ts
 * Axios client – tự đính kèm JWT token và xử lý lỗi
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 10000,
});

// Request: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('spms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response: 401 → clear token + redirect login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('spms_token');
      localStorage.removeItem('spms_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── API endpoints ───
export const authApi = {
  login: (hcmutId: string, password: string) =>
    api.post('/api/auth/login', { hcmutId, password }),
  me: () => api.get('/api/auth/me'),
};

export const parkingApi = {
  checkIn: (rfid: string, gateId: string, slotId?: number) =>
    api.post('/api/parking/checkin', { rfid_card: rfid, gate_id: gateId, slot_id: slotId?.toString() }),
  checkOut: (rfid: string, gateId: string) =>
    api.post('/api/parking/checkout', { rfid_card: rfid, gate_id: gateId }),
  myHistory: () => api.get('/api/parking/me/history'),
  myActiveSession: () => api.get('/api/parking/me/active'),
};

export const visitorApi = {
  issue: (data: any) => api.post('/api/visitor/ticket', data),
  checkout: (ticket_code: string) => api.post('/api/visitor/checkout', { ticket_code }),
  list: (active = true) => api.get('/api/visitor/tickets', { params: { active } }),
};

export const iotApi = {
  getAllSlots: (zone?: string) => api.get('/api/iot/slots', { params: zone ? { zone } : {} }),
  getLed: (zone: string) => api.get(`/api/iot/led/${zone}`),
  markFault: (sensorId: string) => api.post(`/api/iot/sensor/${sensorId}/fault`),
  sensorEvent: (data: any) => api.post('/api/iot/sensor', data, { headers: { 'x-iot-key': 'iot_spms_dev_key' } }),
};

export const billingApi = {
  myBilling: (period?: string) => api.get('/api/billing/me', { params: period ? { period } : {} }),
  payNow: (id: number) => api.post(`/api/billing/pay/${id}`),
  triggerCycle: (period: string) => api.post('/api/billing/cycle', { billing_period: period }),
  getAllPayments: (filters?: any) => api.get('/api/billing/payments', { params: filters }),
};

export const adminApi = {
  dashboard: () => api.get('/api/admin/dashboard'),
  getPricing: () => api.get('/api/admin/pricing'),
  upsertPricing: (data: any) => api.put('/api/admin/pricing', data),
  getLogs: (params?: any) => api.get('/api/admin/logs', { params }),
  getUsers: (params?: any) => api.get('/api/admin/users', { params }),
  createUser: (data: any) => api.post('/api/admin/users', data),
  updateUser: (id: number, data: any) => api.put(`/api/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/api/admin/users/${id}`),
  resetPassword: (id: number, newPassword: string) => api.post(`/api/admin/users/${id}/reset-password`, { newPassword }),
  syncDatacore: () => api.post('/api/admin/sync-datacore'),
  getReport: (period: string) => api.get('/api/admin/report', { params: { period } }),
};

export default api;

import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = useAuthStore.getState().refreshToken
      if (refresh) {
        try {
          const { data } = await axios.post(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/auth/refresh`, { refresh_token: refresh })
          useAuthStore.getState().setAuth(useAuthStore.getState().user!, data.access_token, data.refresh_token)
          error.config.headers.Authorization = `Bearer ${data.access_token}`
          return api(error.config)
        } catch {
          useAuthStore.getState().logout()
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  signup: (data: any) => api.post('/auth/signup', data),
  profile: (accessToken?: string) => api.get('/auth/profile', accessToken
    ? { headers: { Authorization: `Bearer ${accessToken}` } }
    : undefined
  ),
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const productService = {
  list: (params?: Record<string, any>) => api.get('/products', { params }),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
}

// ─── Inventory ────────────────────────────────────────────────────────────────
export const inventoryService = {
  transactions: (params?: Record<string, any>) => api.get('/inventory/transactions', { params }),
  createTransaction: (data: any) => api.post('/inventory/transactions', data),
  storeInventory: (params?: Record<string, any>) => api.get('/inventory/store-inventory', { params }),
  assignStoreInventory: (data: any) => api.post('/inventory/store-inventory', data),
  addWarehouseStock: (productId: string, quantity: number) => api.post(`/inventory/warehouse-stock/${productId}`, { quantity }),
  dashboard: () => api.get('/inventory/dashboard'),
  adminStats: () => api.get('/inventory/admin-stats'),
}

// ─── Tenants ──────────────────────────────────────────────────────────────────
export const tenantService = {
  list: () => api.get('/tenants'),
  overview: () => api.get('/tenants/overview'),
  get: (id: string) => api.get(`/tenants/${id}`),
  details: (id: string) => api.get(`/tenants/${id}/details`),
  create: (data: any) => api.post('/tenants', data),
  update: (id: string, data: any) => api.put(`/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/tenants/${id}`),
}

// ─── Stores ─────────────────────────────────────────────────────────────────
export const storeService = {
  list: (params?: Record<string, any>) => api.get('/stores', { params }),
  details: (id: string) => api.get(`/stores/${id}/details`),
  create: (data: any) => api.post('/stores', data),
  update: (id: string, data: any) => api.put(`/stores/${id}`, data),
}

// ─── Alerts ──────────────────────────────────────────────────────────────────
export const alertService = {
  list: (params?: Record<string, any>) => api.get('/alerts', { params }),
  create: (data: any) => api.post('/alerts', data),
  update: (id: string, data: any) => api.put(`/alerts/${id}`, data),
}

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationService = {
  list: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  clearAll: () => api.delete('/notifications/clear-all'),
}

// ─── Complaints ──────────────────────────────────────────────────────────────
export const complaintService = {
  list: () => api.get('/complaints'),
  create: (data: any) => api.post('/complaints', data),
  update: (id: string, data: any) => api.put(`/complaints/${id}`, data),
}

// ─── Assistant ───────────────────────────────────────────────────────────────
export const assistantService = {
  chat: (message: string) => api.post('/assistant/chat', { message }),
}

// ─── RAG / Gemini ───────────────────────────────────────────────────────────
export const ragService = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/rag/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  ask: (data: { question: string; document_id?: string | null; session_id?: string | null }) => {
    const payload: Record<string, any> = { question: data.question }
    if (data.document_id) payload.document_id = data.document_id
    if (data.session_id) payload.session_id = data.session_id
    return api.post('/ask', payload)
  },
  documents: () => api.get('/documents'),
}

// ─── Users ────────────────────────────────────────────────────────────────────
export const userService = {
  list: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  resetPassword: (id: string, password: string) => api.post(`/users/${id}/reset-password`, { password }),
  delete: (id: string) => api.delete(`/users/${id}`),
}

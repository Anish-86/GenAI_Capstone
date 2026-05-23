import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
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
          const { data } = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/refresh`, { refresh_token: refresh })
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
  dashboard: () => api.get('/inventory/dashboard'),
  adminStats: () => api.get('/inventory/admin-stats'),
}

// ─── Tenants ──────────────────────────────────────────────────────────────────
export const tenantService = {
  list: () => api.get('/tenants'),
  create: (data: any) => api.post('/tenants', data),
  update: (id: string, data: any) => api.put(`/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/tenants/${id}`),
}

// ─── Users ────────────────────────────────────────────────────────────────────
export const userService = {
  list: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  resetPassword: (id: string, password: string) => api.post(`/users/${id}/reset-password`, { password }),
  delete: (id: string) => api.delete(`/users/${id}`),
}

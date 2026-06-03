import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import AppLayout from './layouts/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import InventoryPage from './pages/InventoryPage'
import UsersPage from './pages/UsersPage'
import TenantsPage from './pages/TenantsPage'
import AlertsPage from './pages/AlertsPage'
import TenantDetailsPage from './pages/TenantDetailsPage'
import StoresPage from './pages/StoresPage'
import RagChat from './pages/RagChat'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore()
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />
}

function AssistantRoute() {
  const { user } = useAuthStore()
  if (user?.role === 'super_admin') {
    return <Navigate to="/app/dashboard" replace />
  }
  return <RagChat />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ className: 'toast-custom' }} />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected app shell — all app routes nested here */}
        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tenants/:id" element={<TenantDetailsPage />} />
          <Route path="rag" element={<AssistantRoute />} />
        </Route>

        {/* Legacy redirects — old paths still work */}
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/products" element={<Navigate to="/app/products" replace />} />
        <Route path="/inventory" element={<Navigate to="/app/inventory" replace />} />
        <Route path="/alerts" element={<Navigate to="/app/alerts" replace />} />
        <Route path="/users" element={<Navigate to="/app/users" replace />} />
        <Route path="/stores" element={<Navigate to="/app/stores" replace />} />
        <Route path="/tenants" element={<Navigate to="/app/tenants" replace />} />
        <Route path="/rag" element={<Navigate to="/app/rag" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

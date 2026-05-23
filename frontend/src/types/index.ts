export type UserRole = 'super_admin' | 'retailer_admin' | 'inventory_manager'
export type TenantStatus = 'active' | 'inactive' | 'suspended'
export type TransactionType = 'stock_in' | 'stock_out' | 'adjustment'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  tenant_id: string | null
  is_active: boolean
  created_at: string
}

export interface Tenant {
  id: string
  company_name: string
  contact_email: string
  status: TenantStatus
  created_at: string
}

export interface Product {
  id: string
  tenant_id: string
  product_name: string
  sku: string
  category: string | null
  brand: string | null
  quantity: number
  price: number
  supplier: string | null
  warehouse_location: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedProducts {
  items: Product[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface InventoryTransaction {
  id: string
  tenant_id: string
  product_id: string
  transaction_type: TransactionType
  quantity: number
  notes: string | null
  timestamp: string
  product?: Product
  updated_by_user?: User
}

export interface DashboardStats {
  total_products: number
  low_stock_count: number
  total_transactions: number
  total_value: number
  recent_transactions: InventoryTransaction[]
}

export interface AdminStats {
  total_tenants: number
  total_products: number
  active_users: number
  total_transactions: number
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

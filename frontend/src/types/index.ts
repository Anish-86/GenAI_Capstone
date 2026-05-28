export type UserRole = 'super_admin' | 'retailer_admin' | 'inventory_manager'
export type TenantStatus = 'active' | 'inactive' | 'suspended'
export type TransactionType = 'stock_in' | 'stock_out' | 'adjustment'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  tenant_id: string | null
  store_id?: string | null
  phone?: string | null
  is_active: boolean
  last_login?: string | null
  created_at: string
}

export interface Tenant {
  id: string
  company_name: string
  contact_email: string
  status: TenantStatus
  created_at: string
}

export interface TenantOverview extends Tenant {
  stores?: number
  inventory_managers?: number
  retailer_admins?: number
  products?: number
  low_stock?: number
}

export interface LowStockAlert {
  id: string
  tenant_id: string
  product_id: string
  store_id?: string | null
  raised_by: string
  remaining_quantity: number | null
  message: string | null
  status: 'open' | 'resolved' | string
  created_at: string
  resolved_at: string | null
  product?: Product
  store?: Store
  raised_by_user?: User
}

export interface Notification {
  id: string
  tenant_id: string | null
  recipient_id: string | null
  actor_id: string | null
  title: string
  message: string
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
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

export interface Store {
  id: string
  tenant_id: string
  name: string
  location: string
  status: string
  created_at: string
}

export interface StoreInventory {
  id: string
  tenant_id: string
  store_id: string
  product_id: string
  quantity: number
  low_stock_threshold: number
  updated_at: string
  product?: Product
  store?: Store
}

export interface Complaint {
  id: string
  tenant_id: string
  store_id: string
  product_id: string | null
  raised_by: string
  complaint_type: string
  priority: string
  description: string
  status: string
  created_at: string
  resolved_at: string | null
  product?: Product
  store?: Store
  raised_by_user?: User
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
  store_id?: string | null
  transaction_type: TransactionType
  quantity: number
  notes: string | null
  timestamp: string
  product?: Product
  updated_by_user?: User
  store?: Store
}

export interface DashboardStats {
  total_products: number
  total_stores: number
  low_stock_count: number
  total_transactions: number
  total_value: number
  recent_transactions: InventoryTransaction[]
}

export interface AdminStats {
  total_tenants: number
  total_stores: number
  total_products: number
  active_users: number
  total_transactions: number
  total_tenant_admins: number
  total_inventory_managers: number
  total_low_stock_alerts: number
  active_tenants: number
  inactive_tenants: number
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

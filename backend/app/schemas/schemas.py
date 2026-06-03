from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.models import UserRole, TenantStatus, TransactionType


# ─── Auth ────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.INVENTORY_MANAGER
    tenant_id: Optional[UUID] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ─── Tenant ───────────────────────────────────────────────────────────────────

class TenantCreate(BaseModel):
    company_name: str
    contact_email: EmailStr
    initial_user_name: Optional[str] = None
    initial_user_email: Optional[EmailStr] = None
    initial_user_password: Optional[str] = None
    initial_user_role: Optional[UserRole] = UserRole.RETAILER_ADMIN


class TenantUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    status: Optional[TenantStatus] = None


class TenantResponse(BaseModel):
    id: UUID
    company_name: str
    contact_email: str
    status: TenantStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ─── User ─────────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: UserRole
    tenant_id: Optional[UUID]
    store_id: Optional[UUID]
    phone: Optional[str]
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    store_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.INVENTORY_MANAGER
    tenant_id: Optional[UUID] = None
    store_id: Optional[UUID] = None
    store_location: Optional[str] = None
    phone: Optional[str] = None


class PasswordReset(BaseModel):
    password: str


# ─── Product ─────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    product_name: str
    sku: str
    category: Optional[str] = None
    brand: Optional[str] = None
    quantity: int = 0
    price: float
    supplier: Optional[str] = None
    warehouse_location: Optional[str] = None
    description: Optional[str] = None


class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    supplier: Optional[str] = None
    warehouse_location: Optional[str] = None
    description: Optional[str] = None


class ProductResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    product_name: str
    sku: str
    category: Optional[str]
    brand: Optional[str]
    quantity: int
    price: float
    supplier: Optional[str]
    warehouse_location: Optional[str]
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedProducts(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ─── Stores ─────────────────────────────────────────────────────────────────

class StoreCreate(BaseModel):
    name: str
    location: str
    tenant_id: Optional[UUID] = None


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None


class StoreResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    location: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class StoreInventoryAssign(BaseModel):
    product_id: UUID
    store_id: UUID
    quantity: int  # quantity to ADD (additive, not replacement)
    low_stock_threshold: Optional[int] = None  # only used on first assignment; ignored if record exists


class AddWarehouseStock(BaseModel):
    quantity: int  # quantity to ADD to warehouse (product.quantity)


class StoreInventoryResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    store_id: UUID
    product_id: UUID
    quantity: int
    low_stock_threshold: int
    updated_at: datetime
    product: Optional[ProductResponse] = None
    store: Optional[StoreResponse] = None

    class Config:
        from_attributes = True


# ─── Inventory ───────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    product_id: UUID
    store_id: Optional[UUID] = None
    transaction_type: TransactionType
    quantity: int
    notes: Optional[str] = None


class TransactionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    product_id: UUID
    store_id: Optional[UUID]
    transaction_type: TransactionType
    quantity: int
    notes: Optional[str]
    timestamp: datetime
    product: Optional[ProductResponse] = None
    updated_by_user: Optional[UserResponse] = None
    store: Optional[StoreResponse] = None

    class Config:
        from_attributes = True


# ─── Alerts and Notifications ────────────────────────────────────────────────

class LowStockAlertCreate(BaseModel):
    product_id: UUID
    store_id: Optional[UUID] = None
    message: Optional[str] = None


class LowStockAlertUpdate(BaseModel):
    status: str
    resolve_message: Optional[str] = None


class LowStockAlertResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    product_id: UUID
    store_id: Optional[UUID]
    raised_by: UUID
    remaining_quantity: Optional[int]
    message: Optional[str]
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]
    product: Optional[ProductResponse] = None
    store: Optional[StoreResponse] = None
    raised_by_user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: UUID
    tenant_id: Optional[UUID]
    recipient_id: Optional[UUID]
    actor_id: Optional[UUID]
    title: str
    message: str
    entity_type: Optional[str]
    entity_id: Optional[UUID]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    answer: str
    facts: dict = {}


class RAGUploadResponse(BaseModel):
    document_id: UUID
    status: str


class RAGChatRequest(BaseModel):
    document_id: UUID
    question: str
    session_id: Optional[UUID] = None


class RAGSource(BaseModel):
    chunk_id: UUID
    chunk_index: int
    score: float
    page_number: Optional[int] = None
    excerpt: str


class RAGChatResponse(BaseModel):
    answer: str
    sources: List[RAGSource]
    session_id: Optional[UUID] = None


class AskRequest(BaseModel):
    question: str
    document_id: Optional[UUID] = None
    session_id: Optional[UUID] = None


class AskSource(BaseModel):
    chunk_id: UUID
    score: float
    excerpt: str
    page_number: Optional[int] = None
    chunk_index: int


class AskResponse(BaseModel):
    answer: str
    sources: List[AskSource]
    document_id: Optional[UUID] = None
    session_id: Optional[UUID] = None


class ComplaintCreate(BaseModel):
    product_id: Optional[UUID] = None
    complaint_type: str
    description: str
    priority: str = "medium"


class ComplaintUpdate(BaseModel):
    status: str


class ComplaintResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    store_id: UUID
    product_id: Optional[UUID]
    raised_by: UUID
    complaint_type: str
    priority: str
    description: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]
    product: Optional[ProductResponse] = None
    store: Optional[StoreResponse] = None
    raised_by_user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_products: int
    total_stores: int
    low_stock_count: int
    total_transactions: int
    total_value: float
    recent_transactions: List[TransactionResponse]


class AdminStats(BaseModel):
    total_tenants: int
    total_stores: int = 0
    total_products: int
    active_users: int
    total_transactions: int
    total_tenant_admins: int = 0
    total_inventory_managers: int = 0
    total_low_stock_alerts: int = 0
    active_tenants: int = 0
    inactive_tenants: int = 0

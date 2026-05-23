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
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.INVENTORY_MANAGER
    tenant_id: Optional[UUID] = None


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


# ─── Inventory ───────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    product_id: UUID
    transaction_type: TransactionType
    quantity: int
    notes: Optional[str] = None


class TransactionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    product_id: UUID
    transaction_type: TransactionType
    quantity: int
    notes: Optional[str]
    timestamp: datetime
    product: Optional[ProductResponse] = None
    updated_by_user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# ─── Dashboard ───────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_products: int
    low_stock_count: int
    total_transactions: int
    total_value: float
    recent_transactions: List[TransactionResponse]


class AdminStats(BaseModel):
    total_tenants: int
    total_products: int
    active_users: int
    total_transactions: int

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Enum, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database.session import Base
import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    RETAILER_ADMIN = "retailer_admin"
    INVENTORY_MANAGER = "inventory_manager"


class TenantStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class TransactionType(str, enum.Enum):
    STOCK_IN = "stock_in"
    STOCK_OUT = "stock_out"
    ADJUSTMENT = "adjustment"


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String(255), nullable=False)
    contact_email = Column(String(255), nullable=False, unique=True)
    status = Column(Enum(TenantStatus), default=TenantStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="tenant")
    products = relationship("Product", back_populates="tenant")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="users")
    transactions = relationship("InventoryTransaction", back_populates="updated_by_user")


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    product_name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=False)
    category = Column(String(100))
    brand = Column(String(100))
    quantity = Column(Integer, default=0)
    price = Column(Float, nullable=False)
    supplier = Column(String(255))
    warehouse_location = Column(String(255))
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="products")
    transactions = relationship("InventoryTransaction", back_populates="product")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    quantity = Column(Integer, nullable=False)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notes = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="transactions")
    updated_by_user = relationship("User", back_populates="transactions")

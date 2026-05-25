from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from app.database.session import get_db
from app.schemas.schemas import (
    TenantCreate, TenantUpdate, TenantResponse, UserResponse,
    StoreResponse, ProductResponse, StoreInventoryResponse,
    LowStockAlertResponse, TransactionResponse, ComplaintResponse
)
from app.models.models import Complaint, InventoryTransaction, LowStockAlert, Notification, Product, Store, StoreInventory, Tenant, User, UserRole
from app.dependencies.auth import require_super_admin
from app.core.security import get_password_hash

router = APIRouter()


@router.post("", response_model=TenantResponse, status_code=201)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    if db.query(Tenant).filter(Tenant.contact_email == payload.contact_email).first():
        raise HTTPException(status_code=400, detail="Contact email already exists")
    if payload.initial_user_role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Initial tenant user cannot be a super admin")
    if payload.initial_user_email and db.query(User).filter(User.email == payload.initial_user_email).first():
        raise HTTPException(status_code=400, detail="Initial user email already registered")

    tenant = Tenant(company_name=payload.company_name, contact_email=payload.contact_email)
    db.add(tenant)
    db.flush()

    if payload.initial_user_name and payload.initial_user_email and payload.initial_user_password:
        user = User(
            name=payload.initial_user_name,
            email=payload.initial_user_email,
            password=get_password_hash(payload.initial_user_password),
            role=payload.initial_user_role or UserRole.RETAILER_ADMIN,
            tenant_id=tenant.id,
        )
        db.add(user)

    db.commit()
    db.refresh(tenant)
    return tenant


@router.get("", response_model=List[TenantResponse])
def list_tenants(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    return db.query(Tenant).all()


@router.get("/overview")
def tenants_overview(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    tenants = db.query(Tenant).all()
    return [
        {
            "id": str(tenant.id),
            "company_name": tenant.company_name,
            "contact_email": tenant.contact_email,
            "status": tenant.status.value if hasattr(tenant.status, 'value') else tenant.status,
            "created_at": tenant.created_at.isoformat(),
            "stores": db.query(Store).filter(Store.tenant_id == tenant.id).count(),
            "inventory_managers": db.query(User).filter(User.tenant_id == tenant.id, User.role == UserRole.INVENTORY_MANAGER).count(),
            "retailer_admins": db.query(User).filter(User.tenant_id == tenant.id, User.role == UserRole.RETAILER_ADMIN).count(),
            "products": db.query(Product).filter(Product.tenant_id == tenant.id).count(),
            "low_stock": db.query(LowStockAlert).filter(LowStockAlert.tenant_id == tenant.id, LowStockAlert.status == "open").count(),
        }
        for tenant in tenants
    ]


@router.get("/{tenant_id}/details")
def tenant_details(tenant_id: UUID, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    alerts = db.query(LowStockAlert).options(
        joinedload(LowStockAlert.product),
        joinedload(LowStockAlert.store),
        joinedload(LowStockAlert.raised_by_user),
    ).filter(LowStockAlert.tenant_id == tenant_id).all()

    complaints = db.query(Complaint).options(
        joinedload(Complaint.product),
        joinedload(Complaint.store),
        joinedload(Complaint.raised_by_user),
    ).filter(Complaint.tenant_id == tenant_id).order_by(Complaint.created_at.desc()).limit(50).all()

    transactions = db.query(InventoryTransaction).options(
        joinedload(InventoryTransaction.product),
        joinedload(InventoryTransaction.updated_by_user),
        joinedload(InventoryTransaction.store),
    ).filter(InventoryTransaction.tenant_id == tenant_id).order_by(InventoryTransaction.timestamp.desc()).limit(50).all()

    inventory = db.query(StoreInventory).options(
        joinedload(StoreInventory.product),
        joinedload(StoreInventory.store),
    ).filter(StoreInventory.tenant_id == tenant_id).all()

    return {
        "tenant": TenantResponse.model_validate(tenant),
        "retailer_admins": [UserResponse.model_validate(u) for u in db.query(User).filter(User.tenant_id == tenant_id, User.role == UserRole.RETAILER_ADMIN).all()],
        "inventory_managers": [UserResponse.model_validate(u) for u in db.query(User).filter(User.tenant_id == tenant_id, User.role == UserRole.INVENTORY_MANAGER).all()],
        "stores": [StoreResponse.model_validate(s) for s in db.query(Store).filter(Store.tenant_id == tenant_id).all()],
        "products": [ProductResponse.model_validate(p) for p in db.query(Product).filter(Product.tenant_id == tenant_id).all()],
        "inventory": [StoreInventoryResponse.model_validate(i) for i in inventory],
        "alerts": [LowStockAlertResponse.model_validate(a) for a in alerts],
        "transactions": [TransactionResponse.model_validate(t) for t in transactions],
        "complaints": [ComplaintResponse.model_validate(c) for c in complaints],
    }


@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(tenant_id: UUID, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.put("/{tenant_id}", response_model=TenantResponse)
def update_tenant(tenant_id: UUID, payload: TenantUpdate, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    for k, v in payload.dict(exclude_none=True).items():
        setattr(tenant, k, v)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.delete("/{tenant_id}", status_code=204)
def delete_tenant(tenant_id: UUID, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    db.query(Notification).filter(Notification.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(Complaint).filter(Complaint.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(LowStockAlert).filter(LowStockAlert.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(InventoryTransaction).filter(InventoryTransaction.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(StoreInventory).filter(StoreInventory.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(Product).filter(Product.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(User).filter(User.tenant_id == tenant_id).delete(synchronize_session=False)
    db.query(Store).filter(Store.tenant_id == tenant_id).delete(synchronize_session=False)
    db.delete(tenant)
    db.commit()

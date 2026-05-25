from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database.session import get_db
from app.schemas.schemas import UserCreate, UserResponse, UserUpdate, PasswordReset
from app.models.models import InventoryTransaction, LowStockAlert, Notification, Store, Tenant, User, UserRole
from app.core.security import get_password_hash
from app.dependencies.auth import get_current_user, require_retailer_admin, get_tenant_filter

router = APIRouter()


def ensure_user_scope(payload_role: UserRole, payload_tenant_id: UUID | None, current_user: User) -> UUID | None:
    if current_user.role == UserRole.SUPER_ADMIN:
        if payload_role != UserRole.SUPER_ADMIN and payload_tenant_id is None:
            raise HTTPException(status_code=400, detail="Tenant is required for retailer users")
        if payload_role == UserRole.SUPER_ADMIN and payload_tenant_id is not None:
            raise HTTPException(status_code=400, detail="Super admin cannot belong to a tenant")
        return payload_tenant_id

    if payload_role != UserRole.INVENTORY_MANAGER:
        raise HTTPException(status_code=403, detail="Retailer admins can create only inventory managers")
    return current_user.tenant_id


@router.get("", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    q = db.query(User)
    f = get_tenant_filter(current_user)
    if f:
        q = q.filter(User.tenant_id == f["tenant_id"])
    return q.all()


@router.post("", response_model=UserResponse, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    tenant_id = ensure_user_scope(payload.role, payload.tenant_id, current_user)
    if tenant_id and not db.query(Tenant).filter(Tenant.id == tenant_id).first():
        raise HTTPException(status_code=404, detail="Tenant not found")
    store_id = payload.store_id
    if payload.role == UserRole.INVENTORY_MANAGER:
        if not store_id and payload.store_location:
            store = Store(
                tenant_id=tenant_id,
                name=payload.store_location,
                location=payload.store_location,
            )
            db.add(store)
            db.flush()
            store_id = store.id
        if not store_id:
            raise HTTPException(status_code=400, detail="Store location is required for inventory managers")
        store = db.query(Store).filter(Store.id == store_id, Store.tenant_id == tenant_id).first()
        if not store:
            raise HTTPException(status_code=404, detail="Store not found for tenant")
    elif store_id:
        raise HTTPException(status_code=400, detail="Only inventory managers can be assigned to a store")

    user = User(
        name=payload.name,
        email=payload.email,
        password=get_password_hash(payload.password),
        role=payload.role,
        tenant_id=tenant_id,
        store_id=store_id,
        phone=payload.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    f = get_tenant_filter(current_user)
    if f and user.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: UUID, payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    f = get_tenant_filter(current_user)
    if f and user.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    updates = payload.dict(exclude_none=True)
    if current_user.role != UserRole.SUPER_ADMIN and updates.get("role") and updates["role"] != UserRole.INVENTORY_MANAGER:
        raise HTTPException(status_code=403, detail="Retailer admins can assign only inventory manager role")
    for k, v in updates.items():
        if k == "store_id" and v and user.role != UserRole.INVENTORY_MANAGER:
            raise HTTPException(status_code=400, detail="Only inventory managers can be assigned to a store")
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password", response_model=UserResponse)
def reset_password(user_id: UUID, payload: PasswordReset, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    f = get_tenant_filter(current_user)
    if f and user.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role != UserRole.SUPER_ADMIN and user.role != UserRole.INVENTORY_MANAGER:
        raise HTTPException(status_code=403, detail="Retailer admins can reset only inventory manager passwords")
    user.password = get_password_hash(payload.password)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    f = get_tenant_filter(current_user)
    if f and user.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    alert_ids = db.query(LowStockAlert.id).filter(LowStockAlert.raised_by == user_id)
    db.query(Notification).filter(Notification.entity_type == "low_stock_alert").filter(
        Notification.entity_id.in_(alert_ids)
    ).delete(synchronize_session=False)
    db.query(Notification).filter(
        (Notification.recipient_id == user_id) | (Notification.actor_id == user_id)
    ).delete(synchronize_session=False)
    db.query(LowStockAlert).filter(LowStockAlert.raised_by == user_id).delete(synchronize_session=False)
    db.query(InventoryTransaction).filter(InventoryTransaction.updated_by == user_id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()

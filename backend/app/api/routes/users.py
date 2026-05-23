from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database.session import get_db
from app.schemas.schemas import UserCreate, UserResponse, UserUpdate, PasswordReset
from app.models.models import Tenant, User, UserRole
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


@router.get("/", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    q = db.query(User)
    f = get_tenant_filter(current_user)
    if f:
        q = q.filter(User.tenant_id == f["tenant_id"])
    return q.all()


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    tenant_id = ensure_user_scope(payload.role, payload.tenant_id, current_user)
    if tenant_id and not db.query(Tenant).filter(Tenant.id == tenant_id).first():
        raise HTTPException(status_code=404, detail="Tenant not found")

    user = User(
        name=payload.name,
        email=payload.email,
        password=get_password_hash(payload.password),
        role=payload.role,
        tenant_id=tenant_id,
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
    db.delete(user)
    db.commit()

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from app.database.session import get_db
from app.schemas.schemas import StoreCreate, StoreResponse, StoreUpdate, StoreInventoryResponse, TransactionResponse, UserResponse
from app.models.models import InventoryTransaction, Product, Store, StoreInventory, User, UserRole
from app.dependencies.auth import get_current_user, require_retailer_admin

router = APIRouter()


def scoped_tenant_id(payload_tenant_id: UUID | None, current_user: User):
    if current_user.role == UserRole.SUPER_ADMIN:
        if not payload_tenant_id:
            raise HTTPException(status_code=400, detail="tenant_id is required")
        return payload_tenant_id
    return current_user.tenant_id


@router.get("", response_model=List[StoreResponse])
def list_stores(
    tenant_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Store)
    if current_user.role == UserRole.SUPER_ADMIN:
        if tenant_id:
            q = q.filter(Store.tenant_id == tenant_id)
    elif current_user.role == UserRole.INVENTORY_MANAGER:
        q = q.filter(Store.id == current_user.store_id)
    else:
        q = q.filter(Store.tenant_id == current_user.tenant_id)
    return q.order_by(Store.created_at.desc()).all()


@router.post("", response_model=StoreResponse, status_code=201)
def create_store(payload: StoreCreate, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    tenant_id = scoped_tenant_id(payload.tenant_id, current_user)
    store = Store(tenant_id=tenant_id, name=payload.name, location=payload.location)
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


@router.get("/{store_id}/details")
def store_details(store_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    if current_user.role != UserRole.SUPER_ADMIN and store.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    managers = db.query(User).filter(User.store_id == store_id).all()
    inventory = db.query(StoreInventory).options(
        joinedload(StoreInventory.product),
        joinedload(StoreInventory.store),
    ).filter(StoreInventory.store_id == store_id).all()
    transactions = db.query(InventoryTransaction).options(
        joinedload(InventoryTransaction.product),
        joinedload(InventoryTransaction.updated_by_user),
        joinedload(InventoryTransaction.store),
    ).filter(InventoryTransaction.store_id == store_id).order_by(
        InventoryTransaction.timestamp.desc()
    ).limit(100).all()

    return {
        "store": StoreResponse.model_validate(store),
        "managers": [UserResponse.model_validate(m) for m in managers],
        "inventory": [StoreInventoryResponse.model_validate(i) for i in inventory],
        "transactions": [TransactionResponse.model_validate(t) for t in transactions],
    }


@router.put("/{store_id}", response_model=StoreResponse)
def update_store(store_id: UUID, payload: StoreUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    if current_user.role != UserRole.SUPER_ADMIN and store.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    for k, v in payload.dict(exclude_none=True).items():
        setattr(store, k, v)
    db.commit()
    db.refresh(store)
    return store

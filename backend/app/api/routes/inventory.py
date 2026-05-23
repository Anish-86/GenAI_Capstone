from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from uuid import UUID
from app.database.session import get_db
from app.schemas.schemas import TransactionCreate, TransactionResponse, DashboardStats, AdminStats
from app.models.models import InventoryTransaction, Product, User, UserRole, TransactionType, Tenant
from app.dependencies.auth import get_current_user, get_tenant_filter

router = APIRouter()


@router.post("/transactions", response_model=TransactionResponse, status_code=201)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    f = get_tenant_filter(current_user)
    if f and product.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    if payload.transaction_type == TransactionType.STOCK_OUT and product.quantity < payload.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    if payload.transaction_type == TransactionType.STOCK_IN:
        product.quantity += payload.quantity
    elif payload.transaction_type == TransactionType.STOCK_OUT:
        product.quantity -= payload.quantity
    else:
        product.quantity = payload.quantity

    txn = InventoryTransaction(
        tenant_id=product.tenant_id,
        product_id=product.id,
        transaction_type=payload.transaction_type,
        quantity=payload.quantity,
        updated_by=current_user.id,
        notes=payload.notes,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return db.query(InventoryTransaction).options(
        joinedload(InventoryTransaction.product),
        joinedload(InventoryTransaction.updated_by_user)
    ).filter(InventoryTransaction.id == txn.id).first()


@router.get("/transactions", response_model=List[TransactionResponse])
def list_transactions(
    product_id: Optional[UUID] = None,
    transaction_type: Optional[TransactionType] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(InventoryTransaction).options(
        joinedload(InventoryTransaction.product),
        joinedload(InventoryTransaction.updated_by_user)
    )
    f = get_tenant_filter(current_user)
    if f:
        q = q.filter(InventoryTransaction.tenant_id == f["tenant_id"])
    if product_id:
        q = q.filter(InventoryTransaction.product_id == product_id)
    if transaction_type:
        q = q.filter(InventoryTransaction.transaction_type == transaction_type)
    return q.order_by(InventoryTransaction.timestamp.desc()).limit(limit).all()


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = get_tenant_filter(current_user)
    pq = db.query(Product)
    tq = db.query(InventoryTransaction)
    if f:
        pq = pq.filter(Product.tenant_id == f["tenant_id"])
        tq = tq.filter(InventoryTransaction.tenant_id == f["tenant_id"])

    products = pq.all()
    total_value = sum(p.price * p.quantity for p in products)
    low_stock = sum(1 for p in products if p.quantity <= 10)
    recent = tq.options(joinedload(InventoryTransaction.product), joinedload(InventoryTransaction.updated_by_user)).order_by(InventoryTransaction.timestamp.desc()).limit(10).all()

    return DashboardStats(
        total_products=len(products),
        low_stock_count=low_stock,
        total_transactions=tq.count(),
        total_value=total_value,
        recent_transactions=recent,
    )


@router.get("/admin-stats", response_model=AdminStats)
def get_admin_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin only")
    return AdminStats(
        total_tenants=db.query(Tenant).count(),
        total_products=db.query(Product).count(),
        active_users=db.query(User).filter(User.is_active == True).count(),
        total_transactions=db.query(InventoryTransaction).count(),
    )

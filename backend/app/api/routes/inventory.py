from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.database.session import get_db
from app.schemas.schemas import AddWarehouseStock, StoreInventoryAssign, StoreInventoryResponse, TransactionCreate, TransactionResponse, DashboardStats, AdminStats
from app.models.models import InventoryTransaction, LowStockAlert, Notification, Product, Store, StoreInventory, User, UserRole, TransactionType, Tenant, TenantStatus
from app.dependencies.auth import get_current_user, get_tenant_filter

router = APIRouter()


def resolve_low_stock_if_replenished(db: Session, store_stock: StoreInventory):
    if store_stock.quantity <= store_stock.low_stock_threshold:
        return
    open_alerts = db.query(LowStockAlert).filter(
        LowStockAlert.product_id == store_stock.product_id,
        LowStockAlert.store_id == store_stock.store_id,
        LowStockAlert.status == "open",
    ).all()
    for alert in open_alerts:
        alert.status = "resolved"
        alert.remaining_quantity = store_stock.quantity
        alert.resolved_at = datetime.utcnow()


@router.post("/transactions", response_model=TransactionResponse, status_code=201)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    f = get_tenant_filter(current_user)
    if f and product.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    store_id = current_user.store_id if current_user.role == UserRole.INVENTORY_MANAGER else payload.store_id
    if not store_id:
        raise HTTPException(status_code=400, detail="Store is required for inventory movement")
    store_stock = db.query(StoreInventory).filter(
        StoreInventory.product_id == product.id,
        StoreInventory.store_id == store_id,
        StoreInventory.tenant_id == product.tenant_id,
    ).first()
    if not store_stock:
        store_stock = StoreInventory(tenant_id=product.tenant_id, product_id=product.id, store_id=store_id, quantity=0)
        db.add(store_stock)
        db.flush()

    if payload.transaction_type == TransactionType.STOCK_OUT and store_stock.quantity < payload.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    if payload.transaction_type == TransactionType.STOCK_IN:
        store_stock.quantity += payload.quantity
    elif payload.transaction_type == TransactionType.STOCK_OUT:
        store_stock.quantity -= payload.quantity
    else:
        store_stock.quantity = payload.quantity
    # DO NOT touch product.quantity here — it tracks warehouse stock only

    txn = InventoryTransaction(
        tenant_id=product.tenant_id,
        product_id=product.id,
        store_id=store_id,
        transaction_type=payload.transaction_type,
        quantity=payload.quantity,
        updated_by=current_user.id,
        notes=payload.notes,
    )
    db.add(txn)
    if store_stock.quantity <= store_stock.low_stock_threshold:
        existing = db.query(LowStockAlert).filter(
            LowStockAlert.product_id == product.id,
            LowStockAlert.store_id == store_id,
            LowStockAlert.status == "open",
        ).first()
        if not existing:
            alert = LowStockAlert(
                tenant_id=product.tenant_id,
                product_id=product.id,
                store_id=store_id,
                raised_by=current_user.id,
                remaining_quantity=store_stock.quantity,
                message=f"{store_stock.store.location} is low on {product.product_name}. Remaining quantity: {store_stock.quantity}",
            )
            db.add(alert)
            db.flush()
            admins = db.query(User).filter(User.tenant_id == product.tenant_id, User.role == UserRole.RETAILER_ADMIN).all()
            for admin in admins:
                db.add(Notification(
                    tenant_id=product.tenant_id,
                    recipient_id=admin.id,
                    actor_id=current_user.id,
                    title="Store low stock",
                    message=alert.message,
                    entity_type="low_stock_alert",
                    entity_id=alert.id,
                ))
    else:
        resolve_low_stock_if_replenished(db, store_stock)
    db.commit()
    db.refresh(txn)
    return db.query(InventoryTransaction).options(
        joinedload(InventoryTransaction.product),
        joinedload(InventoryTransaction.updated_by_user),
        joinedload(InventoryTransaction.store),
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
        joinedload(InventoryTransaction.updated_by_user),
        joinedload(InventoryTransaction.store),
    )
    f = get_tenant_filter(current_user)
    if f:
        q = q.filter(InventoryTransaction.tenant_id == f["tenant_id"])
    if product_id:
        q = q.filter(InventoryTransaction.product_id == product_id)
    if current_user.role == UserRole.INVENTORY_MANAGER:
        q = q.filter(InventoryTransaction.store_id == current_user.store_id)
    if transaction_type:
        q = q.filter(InventoryTransaction.transaction_type == transaction_type)
    return q.order_by(InventoryTransaction.timestamp.desc()).limit(limit).all()


@router.get("/store-inventory", response_model=List[StoreInventoryResponse])
def list_store_inventory(
    store_id: Optional[UUID] = None,
    tenant_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(StoreInventory).options(joinedload(StoreInventory.product), joinedload(StoreInventory.store))
    if current_user.role == UserRole.SUPER_ADMIN:
        if tenant_id:
            q = q.filter(StoreInventory.tenant_id == tenant_id)
    elif current_user.role == UserRole.INVENTORY_MANAGER:
        q = q.filter(StoreInventory.store_id == current_user.store_id)
    else:
        q = q.filter(StoreInventory.tenant_id == current_user.tenant_id)
    if store_id:
        q = q.filter(StoreInventory.store_id == store_id)
    return q.order_by(StoreInventory.updated_at.desc()).all()


@router.post("/store-inventory", response_model=StoreInventoryResponse, status_code=201)
def assign_store_inventory(
    payload: StoreInventoryAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.RETAILER_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only tenant admins can distribute stock")
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    store = db.query(Store).filter(Store.id == payload.store_id).first()
    if not product or not store or product.tenant_id != store.tenant_id:
        raise HTTPException(status_code=404, detail="Product or store not found")
    if current_user.role != UserRole.SUPER_ADMIN and product.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    if product.quantity < payload.quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient warehouse stock. Available: {product.quantity}")

    # Find or create the store inventory record
    item = db.query(StoreInventory).filter(
        StoreInventory.product_id == payload.product_id,
        StoreInventory.store_id == payload.store_id,
    ).first()

    if not item:
        # First time assigning this product to this store
        item = StoreInventory(
            tenant_id=product.tenant_id,
            product_id=product.id,
            store_id=store.id,
            quantity=0,
            low_stock_threshold=payload.low_stock_threshold if payload.low_stock_threshold is not None else 10,
        )
        db.add(item)
        db.flush()
    # If record exists: ADD to existing quantity, preserve existing threshold
    item.quantity += payload.quantity
    # Only update threshold if explicitly provided AND this is first assignment
    # (threshold is preserved on repeat transfers)

    product.quantity -= payload.quantity  # deduct from warehouse

    db.add(InventoryTransaction(
        tenant_id=product.tenant_id,
        product_id=product.id,
        store_id=store.id,
        transaction_type=TransactionType.STOCK_IN,
        quantity=payload.quantity,
        updated_by=current_user.id,
        notes=f"Warehouse → {store.name} ({store.location}): +{payload.quantity} units",
    ))
    resolve_low_stock_if_replenished(db, item)
    db.commit()
    db.refresh(item)
    return db.query(StoreInventory).options(
        joinedload(StoreInventory.product),
        joinedload(StoreInventory.store),
    ).filter(StoreInventory.id == item.id).first()


@router.post("/warehouse-stock/{product_id}", response_model=dict)
def add_warehouse_stock(
    product_id: UUID,
    payload: AddWarehouseStock,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add stock directly to warehouse (product.quantity)."""
    if current_user.role not in [UserRole.RETAILER_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can add warehouse stock")
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if current_user.role != UserRole.SUPER_ADMIN and product.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    product.quantity += payload.quantity
    db.add(InventoryTransaction(
        tenant_id=product.tenant_id,
        product_id=product.id,
        store_id=None,
        transaction_type=TransactionType.STOCK_IN,
        quantity=payload.quantity,
        updated_by=current_user.id,
        notes=f"Warehouse stock replenished: +{payload.quantity} units",
    ))
    db.commit()
    db.refresh(product)
    return {"product_id": str(product.id), "new_warehouse_quantity": product.quantity}


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = get_tenant_filter(current_user)
    pq = db.query(Product)
    tq = db.query(InventoryTransaction)
    if f:
        pq = pq.filter(Product.tenant_id == f["tenant_id"])
        tq = tq.filter(InventoryTransaction.tenant_id == f["tenant_id"])

    if current_user.role == UserRole.INVENTORY_MANAGER:
        pq = pq.join(StoreInventory, StoreInventory.product_id == Product.id).filter(StoreInventory.store_id == current_user.store_id)
        tq = tq.filter(InventoryTransaction.store_id == current_user.store_id)
    products = pq.all()
    stock_q = db.query(StoreInventory)
    if f:
        stock_q = stock_q.filter(StoreInventory.tenant_id == f["tenant_id"])
    if current_user.role == UserRole.INVENTORY_MANAGER:
        stock_q = stock_q.filter(StoreInventory.store_id == current_user.store_id)
    stock_items = stock_q.all()
    total_value = sum(item.product.price * item.quantity for item in stock_items)
    alert_q = db.query(LowStockAlert).filter(LowStockAlert.status == "open")
    if f:
        alert_q = alert_q.filter(LowStockAlert.tenant_id == f["tenant_id"])
    if current_user.role == UserRole.INVENTORY_MANAGER:
        alert_q = alert_q.filter(LowStockAlert.store_id == current_user.store_id)
    low_stock = alert_q.count()
    store_q = db.query(Store)
    if current_user.role == UserRole.SUPER_ADMIN:
        pass
    elif current_user.role == UserRole.INVENTORY_MANAGER:
        store_q = store_q.filter(Store.id == current_user.store_id)
    else:
        store_q = store_q.filter(Store.tenant_id == current_user.tenant_id)
    recent = tq.options(joinedload(InventoryTransaction.product), joinedload(InventoryTransaction.updated_by_user)).order_by(InventoryTransaction.timestamp.desc()).limit(10).all()

    return DashboardStats(
        total_products=len(products),
        total_stores=store_q.count(),
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
        total_stores=db.query(Store).count(),
        total_products=db.query(Product).count(),
        active_users=db.query(User).filter(User.is_active == True).count(),
        total_transactions=db.query(InventoryTransaction).count(),
        total_tenant_admins=db.query(User).filter(User.role == UserRole.RETAILER_ADMIN).count(),
        total_inventory_managers=db.query(User).filter(User.role == UserRole.INVENTORY_MANAGER).count(),
        total_low_stock_alerts=db.query(LowStockAlert).filter(LowStockAlert.status == "open").count(),
        active_tenants=db.query(Tenant).filter(Tenant.status == TenantStatus.ACTIVE).count(),
        inactive_tenants=db.query(Tenant).filter(Tenant.status != TenantStatus.ACTIVE).count(),
    )

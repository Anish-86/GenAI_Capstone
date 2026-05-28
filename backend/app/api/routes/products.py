from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from uuid import UUID
import math
from datetime import datetime
from app.database.session import get_db
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductResponse, PaginatedProducts
from app.models.models import Complaint, InventoryTransaction, LowStockAlert, Notification, Product, StoreInventory, TransactionType, User, UserRole
from app.dependencies.auth import get_current_user, require_retailer_admin, get_tenant_filter

router = APIRouter()


def resolve_low_stock_if_replenished(db: Session, stock: StoreInventory):
    if stock.quantity <= stock.low_stock_threshold:
        return
    open_alerts = db.query(LowStockAlert).filter(
        LowStockAlert.product_id == stock.product_id,
        LowStockAlert.store_id == stock.store_id,
        LowStockAlert.status == "open",
    ).all()
    for alert in open_alerts:
        alert.status = "resolved"
        alert.remaining_quantity = stock.quantity
        alert.resolved_at = datetime.utcnow()


@router.get("", response_model=PaginatedProducts)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    search: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    low_stock: Optional[bool] = None,
    sort_by: str = Query("created_at", pattern="^(product_name|price|quantity|created_at)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Product)
    f = get_tenant_filter(current_user)
    if f:
        q = q.filter(Product.tenant_id == f["tenant_id"])
    if current_user.role == UserRole.INVENTORY_MANAGER:
        q = q.join(StoreInventory, StoreInventory.product_id == Product.id).filter(StoreInventory.store_id == current_user.store_id)
    if search:
        q = q.filter(or_(Product.product_name.ilike(f"%{search}%"), Product.sku.op("LIKE")(f"%{search}%")))
    if category:
        q = q.filter(Product.category == category)
    if brand:
        q = q.filter(Product.brand == brand)
    if min_price is not None:
        q = q.filter(Product.price >= min_price)
    if max_price is not None:
        q = q.filter(Product.price <= max_price)
    if low_stock:
        q = q.filter(Product.quantity <= 10)

    total = q.count()
    col = getattr(Product, sort_by)
    q = q.order_by(col.desc() if sort_dir == "desc" else col.asc())
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    if current_user.role == UserRole.INVENTORY_MANAGER:
        quantities = {
            item.product_id: item
            for item in db.query(StoreInventory).filter(StoreInventory.store_id == current_user.store_id).all()
        }
        for product in items:
            stock = quantities.get(product.id)
            if stock:
                product.quantity = stock.quantity
                product.warehouse_location = stock.store.location
    return PaginatedProducts(items=items, total=total, page=page, page_size=page_size, total_pages=math.ceil(total / page_size))


@router.post("", response_model=ProductResponse, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    if current_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admins cannot create tenant products directly")
    product = Product(**payload.dict(), tenant_id=current_user.tenant_id)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    f = get_tenant_filter(current_user)
    if f and product.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: UUID, payload: ProductUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    f = get_tenant_filter(current_user)
    if f and product.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    updates = payload.dict(exclude_none=True)
    if current_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admins cannot edit tenant products directly")
    if current_user.role == UserRole.INVENTORY_MANAGER:
        disallowed = set(updates.keys()) - {"quantity", "warehouse_location"}
        if disallowed:
            raise HTTPException(status_code=403, detail="Inventory managers can update only quantity and warehouse location")
        stock = db.query(StoreInventory).filter(
            StoreInventory.product_id == product.id,
            StoreInventory.store_id == current_user.store_id,
        ).first()
        if not stock:
            stock = StoreInventory(tenant_id=product.tenant_id, product_id=product.id, store_id=current_user.store_id, quantity=0)
            db.add(stock)
        if "quantity" in updates:
            stock.quantity = updates["quantity"]
            db.add(InventoryTransaction(
                tenant_id=product.tenant_id,
                product_id=product.id,
                store_id=current_user.store_id,
                transaction_type=TransactionType.ADJUSTMENT,
                quantity=updates["quantity"],
                updated_by=current_user.id,
                notes="Store quantity updated",
            ))
        db.flush()
        # DO NOT touch product.quantity — it tracks warehouse stock only
        if stock.quantity <= stock.low_stock_threshold:
            existing = db.query(LowStockAlert).filter(
                LowStockAlert.product_id == product.id,
                LowStockAlert.store_id == current_user.store_id,
                LowStockAlert.status == "open",
            ).first()
            if not existing:
                alert = LowStockAlert(
                    tenant_id=product.tenant_id,
                    product_id=product.id,
                    store_id=current_user.store_id,
                    raised_by=current_user.id,
                    remaining_quantity=stock.quantity,
                    message=f"{current_user.store.location if current_user.store else 'Store'} is low on {product.product_name}. Remaining quantity: {stock.quantity}",
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
            resolve_low_stock_if_replenished(db, stock)
        db.commit()
        db.refresh(product)
        return product
    previous_quantity = product.quantity
    for k, v in updates.items():
        setattr(product, k, v)
    if "quantity" in updates and updates["quantity"] is not None and updates["quantity"] != previous_quantity:
        quantity_delta = updates["quantity"] - previous_quantity
        transaction_type = TransactionType.STOCK_IN if quantity_delta > 0 else TransactionType.STOCK_OUT
        db.add(InventoryTransaction(
            tenant_id=product.tenant_id,
            product_id=product.id,
            store_id=None,
            transaction_type=transaction_type,
            quantity=abs(quantity_delta),
            updated_by=current_user.id,
            notes=f"Warehouse quantity updated from {previous_quantity} to {updates['quantity']}",
        ))
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    if current_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admins cannot delete tenant products directly")
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    f = get_tenant_filter(current_user)
    if f and product.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    db.query(Notification).filter(Notification.entity_type == "low_stock_alert").filter(
        Notification.entity_id.in_(
            db.query(LowStockAlert.id).filter(LowStockAlert.product_id == product_id)
        )
    ).delete(synchronize_session=False)
    db.query(LowStockAlert).filter(LowStockAlert.product_id == product_id).delete(synchronize_session=False)
    db.query(Complaint).filter(Complaint.product_id == product_id).update({Complaint.product_id: None}, synchronize_session=False)
    db.query(InventoryTransaction).filter(InventoryTransaction.product_id == product_id).delete(synchronize_session=False)
    db.query(StoreInventory).filter(StoreInventory.product_id == product_id).delete(synchronize_session=False)
    db.delete(product)
    db.commit()

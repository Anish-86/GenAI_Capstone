from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from app.database.session import get_db
from app.schemas.schemas import LowStockAlertCreate, LowStockAlertResponse, LowStockAlertUpdate
from app.models.models import LowStockAlert, Notification, Product, StoreInventory, User, UserRole
from app.dependencies.auth import get_current_user, get_tenant_filter

router = APIRouter()


def notify_retailer_admins(db: Session, alert: LowStockAlert, actor: User, product: Product):
    admins = db.query(User).filter(
        User.tenant_id == alert.tenant_id,
        User.role == UserRole.RETAILER_ADMIN,
        User.is_active == True,
    ).all()
    for admin in admins:
        db.add(Notification(
            tenant_id=alert.tenant_id,
            recipient_id=admin.id,
            actor_id=actor.id,
            title="Low stock alert",
            message=f"{actor.name} raised a low stock alert for {product.product_name}.",
            entity_type="low_stock_alert",
            entity_id=alert.id,
        ))


@router.get("", response_model=List[LowStockAlertResponse])
def list_alerts(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(LowStockAlert).options(
        joinedload(LowStockAlert.product),
        joinedload(LowStockAlert.store),
        joinedload(LowStockAlert.raised_by_user),
    )
    f = get_tenant_filter(current_user)
    if f:
        q = q.filter(LowStockAlert.tenant_id == f["tenant_id"])
    if status:
        q = q.filter(LowStockAlert.status == status)
    return q.order_by(LowStockAlert.created_at.desc()).all()


@router.post("", response_model=LowStockAlertResponse, status_code=201)
def create_alert(
    payload: LowStockAlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    f = get_tenant_filter(current_user)
    if f and product.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admins cannot raise store alerts")
    store_id = current_user.store_id if current_user.role == UserRole.INVENTORY_MANAGER else payload.store_id
    if not store_id:
        raise HTTPException(status_code=400, detail="Store is required")
    stock = db.query(StoreInventory).filter(StoreInventory.product_id == product.id, StoreInventory.store_id == store_id).first()
    existing_open_alert = db.query(LowStockAlert).options(
        joinedload(LowStockAlert.product),
        joinedload(LowStockAlert.store),
        joinedload(LowStockAlert.raised_by_user),
    ).filter(
        LowStockAlert.product_id == product.id,
        LowStockAlert.store_id == store_id,
        LowStockAlert.status == "open",
    ).first()
    if existing_open_alert:
        return existing_open_alert

    alert = LowStockAlert(
        tenant_id=product.tenant_id,
        product_id=product.id,
        store_id=store_id,
        raised_by=current_user.id,
        remaining_quantity=stock.quantity if stock else product.quantity,
        message=payload.message,
    )
    db.add(alert)
    db.flush()
    notify_retailer_admins(db, alert, current_user, product)
    db.commit()
    db.refresh(alert)
    return db.query(LowStockAlert).options(
        joinedload(LowStockAlert.product),
        joinedload(LowStockAlert.store),
        joinedload(LowStockAlert.raised_by_user),
    ).filter(LowStockAlert.id == alert.id).first()


@router.put("/{alert_id}", response_model=LowStockAlertResponse)
def update_alert(
    alert_id: UUID,
    payload: LowStockAlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = db.query(LowStockAlert).filter(LowStockAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    f = get_tenant_filter(current_user)
    if f and alert.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == UserRole.INVENTORY_MANAGER and alert.raised_by != current_user.id:
        raise HTTPException(status_code=403, detail="Inventory managers can update only their own alerts")

    alert.status = payload.status
    alert.resolved_at = datetime.utcnow() if payload.status == "resolved" else None

    # Notify the inventory manager who raised the alert
    if payload.status == "resolved" and payload.resolve_message:
        product = db.query(Product).filter(Product.id == alert.product_id).first()
        db.add(Notification(
            tenant_id=alert.tenant_id,
            recipient_id=alert.raised_by,
            actor_id=current_user.id,
            title="Alert resolved",
            message=payload.resolve_message,
            entity_type="low_stock_alert",
            entity_id=alert.id,
        ))

    db.commit()
    db.refresh(alert)
    return db.query(LowStockAlert).options(
        joinedload(LowStockAlert.product),
        joinedload(LowStockAlert.store),
        joinedload(LowStockAlert.raised_by_user),
    ).filter(LowStockAlert.id == alert.id).first()

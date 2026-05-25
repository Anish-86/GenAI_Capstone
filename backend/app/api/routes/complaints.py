from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from app.database.session import get_db
from app.schemas.schemas import ComplaintCreate, ComplaintResponse, ComplaintUpdate
from app.models.models import Complaint, Notification, Product, User, UserRole
from app.dependencies.auth import get_current_user, get_tenant_filter

router = APIRouter()


@router.get("", response_model=List[ComplaintResponse])
def list_complaints(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Complaint).options(
        joinedload(Complaint.product),
        joinedload(Complaint.store),
        joinedload(Complaint.raised_by_user),
    )
    f = get_tenant_filter(current_user)
    if f:
        q = q.filter(Complaint.tenant_id == f["tenant_id"])
    if current_user.role == UserRole.INVENTORY_MANAGER:
        q = q.filter(Complaint.store_id == current_user.store_id)
    return q.order_by(Complaint.created_at.desc()).all()


@router.post("", response_model=ComplaintResponse, status_code=201)
def create_complaint(payload: ComplaintCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.INVENTORY_MANAGER:
        raise HTTPException(status_code=403, detail="Only inventory managers can raise store complaints")
    if not current_user.store_id:
        raise HTTPException(status_code=400, detail="Inventory manager is not assigned to a store")
    if payload.product_id:
        product = db.query(Product).filter(Product.id == payload.product_id, Product.tenant_id == current_user.tenant_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
    complaint = Complaint(
        tenant_id=current_user.tenant_id,
        store_id=current_user.store_id,
        product_id=payload.product_id,
        raised_by=current_user.id,
        complaint_type=payload.complaint_type,
        priority=payload.priority,
        description=payload.description,
    )
    db.add(complaint)
    db.flush()
    admins = db.query(User).filter(User.tenant_id == current_user.tenant_id, User.role == UserRole.RETAILER_ADMIN).all()
    for admin in admins:
        db.add(Notification(
            tenant_id=current_user.tenant_id,
            recipient_id=admin.id,
            actor_id=current_user.id,
            title="Store complaint raised",
            message=f"{current_user.name} raised a {payload.priority} priority {payload.complaint_type} complaint.",
            entity_type="complaint",
            entity_id=complaint.id,
        ))
    db.commit()
    db.refresh(complaint)
    return db.query(Complaint).options(
        joinedload(Complaint.product),
        joinedload(Complaint.store),
        joinedload(Complaint.raised_by_user),
    ).filter(Complaint.id == complaint.id).first()


@router.put("/{complaint_id}", response_model=ComplaintResponse)
def update_complaint(complaint_id: UUID, payload: ComplaintUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.RETAILER_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can manage complaints")
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if current_user.role != UserRole.SUPER_ADMIN and complaint.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    complaint.status = payload.status
    complaint.resolved_at = datetime.utcnow() if payload.status == "resolved" else None
    db.commit()
    db.refresh(complaint)
    return db.query(Complaint).options(
        joinedload(Complaint.product),
        joinedload(Complaint.store),
        joinedload(Complaint.raised_by_user),
    ).filter(Complaint.id == complaint.id).first()

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database.session import get_db
from app.schemas.schemas import TenantCreate, TenantUpdate, TenantResponse
from app.models.models import Tenant
from app.dependencies.auth import require_super_admin

router = APIRouter()


@router.post("/", response_model=TenantResponse, status_code=201)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db), _=Depends(require_super_admin)):
    if db.query(Tenant).filter(Tenant.contact_email == payload.contact_email).first():
        raise HTTPException(status_code=400, detail="Contact email already exists")
    tenant = Tenant(**payload.dict())
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.get("/", response_model=List[TenantResponse])
def list_tenants(db: Session = Depends(get_db), _=Depends(require_super_admin)):
    return db.query(Tenant).all()


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
    db.delete(tenant)
    db.commit()

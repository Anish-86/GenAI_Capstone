from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from uuid import UUID
import math
from app.database.session import get_db
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductResponse, PaginatedProducts
from app.models.models import Product, User
from app.dependencies.auth import get_current_user, require_retailer_admin, get_tenant_filter

router = APIRouter()


@router.get("/", response_model=PaginatedProducts)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    low_stock: Optional[bool] = None,
    sort_by: str = Query("created_at", regex="^(product_name|price|quantity|created_at)$"),
    sort_dir: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Product)
    f = get_tenant_filter(current_user)
    if f:
        q = q.filter(Product.tenant_id == f["tenant_id"])
    if search:
        q = q.filter(or_(Product.product_name.ilike(f"%{search}%"), Product.sku.ilike(f"%{search}%")))
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
    return PaginatedProducts(items=items, total=total, page=page, page_size=page_size, total_pages=math.ceil(total / page_size))


@router.post("/", response_model=ProductResponse, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
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
def update_product(product_id: UUID, payload: ProductUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    f = get_tenant_filter(current_user)
    if f and product.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    for k, v in payload.dict(exclude_none=True).items():
        setattr(product, k, v)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_retailer_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    f = get_tenant_filter(current_user)
    if f and product.tenant_id != f["tenant_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(product)
    db.commit()

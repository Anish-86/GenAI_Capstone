from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.schemas import SignupRequest, LoginRequest, TokenResponse, RefreshRequest, UserResponse
from app.models.models import User
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.dependencies.auth import get_current_user

router = APIRouter()


@router.post("/signup", response_model=UserResponse, status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=payload.name,
        email=payload.email,
        password=get_password_hash(payload.password),
        role=payload.role,
        tenant_id=payload.tenant_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    data = {"sub": str(user.id), "role": user.role, "tenant_id": str(user.tenant_id) if user.tenant_id else None}
    return TokenResponse(
        access_token=create_access_token(data),
        refresh_token=create_refresh_token(data),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshRequest):
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    data = {"sub": decoded["sub"], "role": decoded["role"], "tenant_id": decoded.get("tenant_id")}
    return TokenResponse(
        access_token=create_access_token(data),
        refresh_token=create_refresh_token(data),
    )


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

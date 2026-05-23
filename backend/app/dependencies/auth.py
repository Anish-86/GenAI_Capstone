from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import decode_token
from app.models.models import User, UserRole, TenantStatus

bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    if user.role != UserRole.SUPER_ADMIN and user.tenant and user.tenant.status != TenantStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant is not active")
    return user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return current_user


def require_retailer_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.RETAILER_ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Retailer admin access required")
    return current_user


def get_tenant_filter(current_user: User) -> dict:
    """Return tenant filter — super admin sees all, others see only their tenant."""
    if current_user.role == UserRole.SUPER_ADMIN:
        return {}
    return {"tenant_id": current_user.tenant_id}

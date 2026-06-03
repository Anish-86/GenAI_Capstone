import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.api.routes import rag as rag_routes
from app.api.routes import gemini as gemini_routes
from app.database.session import Base
from app.dependencies.auth import get_current_user
from app.database.session import get_db
from app.models.models import Tenant, TenantStatus, User, UserRole
from app.services import rag as rag_service


@pytest.fixture()
def db_session(tmp_path, monkeypatch):
    monkeypatch.setattr(rag_service, "BASE_STORAGE_DIR", tmp_path / "rag-storage", raising=False)

    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = SessionLocal()

    tenant = Tenant(company_name="Test Tenant", contact_email="tenant@example.com", status=TenantStatus.ACTIVE)
    session.add(tenant)
    session.flush()

    user = User(
        name="Retailer Admin",
        email="admin@example.com",
        password="hashed-password",
        role=UserRole.RETAILER_ADMIN,
        tenant_id=tenant.id,
    )
    session.add(user)
    session.commit()

    yield session, tenant, user, SessionLocal, engine

    session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def test_app(db_session):
    session, tenant, user, SessionLocal, engine = db_session

    app = FastAPI()
    app.include_router(rag_routes.router, prefix="/rag")
    app.include_router(gemini_routes.router)

    def override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def override_get_current_user():
        refreshed_session = SessionLocal()
        try:
            return refreshed_session.query(User).filter(User.id == user.id).first()
        finally:
            refreshed_session.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    return app


@pytest.fixture()
def client(test_app):
    with TestClient(test_app) as test_client:
        yield test_client

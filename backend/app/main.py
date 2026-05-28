import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routes import alerts, assistant, auth, complaints, tenants, products, inventory, notifications, stores, users
from app.database.session import engine
from app.models import base
from app.core.config import settings
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger("inventiq")

base.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InventIQ — Multi-Tenant Inventory API",
    description="Production-grade inventory management system with full tenant isolation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    ms = (time.perf_counter() - start) * 1000
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({ms:.1f}ms)")
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(tenants.router, prefix="/tenants", tags=["Tenants"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(stores.router, prefix="/stores", tags=["Stores"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(complaints.router, prefix="/complaints", tags=["Complaints"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(assistant.router, prefix="/assistant", tags=["Assistant"])


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

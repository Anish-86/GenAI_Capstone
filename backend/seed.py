"""
Seed script — creates demo data for development/testing.
Run: python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database.session import SessionLocal
from app.models.models import Tenant, User, Product, InventoryTransaction, UserRole, TenantStatus, TransactionType
from app.core.security import get_password_hash
import uuid
from datetime import datetime, timedelta
import random

db = SessionLocal()

print("🌱 Seeding database...")

# ── Tenants ──────────────────────────────────────────────────────────────────
t1 = Tenant(company_name="Acme Retail Co.", contact_email="admin@acme.com", status=TenantStatus.ACTIVE)
t2 = Tenant(company_name="Metro Supply Ltd.", contact_email="admin@metro.com", status=TenantStatus.ACTIVE)
db.add_all([t1, t2])
db.flush()

# ── Users ─────────────────────────────────────────────────────────────────────
superadmin = User(name="Super Admin", email="admin@inventiq.com", password=get_password_hash("admin123"), role=UserRole.SUPER_ADMIN)
ra1 = User(name="Alice Manager", email="alice@acme.com", password=get_password_hash("password123"), role=UserRole.RETAILER_ADMIN, tenant_id=t1.id)
im1 = User(name="Bob Tracker", email="bob@acme.com", password=get_password_hash("password123"), role=UserRole.INVENTORY_MANAGER, tenant_id=t1.id)
ra2 = User(name="Carol Director", email="carol@metro.com", password=get_password_hash("password123"), role=UserRole.RETAILER_ADMIN, tenant_id=t2.id)
db.add_all([superadmin, ra1, im1, ra2])
db.flush()

# ── Products ─────────────────────────────────────────────────────────────────
products_data = [
    ("Wireless Headphones Pro", "WHP-001", "Electronics", "SoundMax", 45, 149.99, "TechSource Inc", "A-12"),
    ("USB-C Hub 7-Port", "UCH-007", "Electronics", "ConnectAll", 120, 49.99, "DigiParts", "B-3"),
    ("Mechanical Keyboard", "MKB-100", "Electronics", "TypeMaster", 8, 89.99, "KeyCo", "A-15"),
    ("Ergonomic Mouse", "EMO-200", "Electronics", "ComfortTech", 200, 39.99, "PeriphHub", "B-8"),
    ("Monitor Stand Adjustable", "MSA-300", "Furniture", "DeskPro", 35, 79.99, "OfficeMax", "C-2"),
    ("Laptop Backpack 15in", "LBP-450", "Bags", "TravelGear", 0, 59.99, "BagWorld", "D-6"),
    ("Webcam 4K", "WCM-4K1", "Electronics", "VisionTech", 5, 129.99, "TechSource Inc", "A-14"),
    ("Desk Lamp LED", "DLM-800", "Furniture", "BrightLife", 90, 34.99, "LightCo", "C-5"),
    ("Cable Management Kit", "CMK-010", "Accessories", "NeatDesk", 300, 19.99, "DigiParts", "B-12"),
    ("Portable SSD 1TB", "SSD-1T2", "Storage", "FastDrive", 15, 89.99, "StoragePro", "A-9"),
]

products = []
for name, sku, cat, brand, qty, price, supplier, location in products_data:
    p = Product(tenant_id=t1.id, product_name=name, sku=sku, category=cat, brand=brand,
                quantity=qty, price=price, supplier=supplier, warehouse_location=location)
    db.add(p)
    products.append(p)

db.flush()

# ── Transactions ──────────────────────────────────────────────────────────────
txn_types = [TransactionType.STOCK_IN, TransactionType.STOCK_OUT, TransactionType.ADJUSTMENT]
for i, product in enumerate(products):
    for j in range(random.randint(2, 5)):
        txn = InventoryTransaction(
            tenant_id=t1.id,
            product_id=product.id,
            transaction_type=random.choice(txn_types),
            quantity=random.randint(5, 50),
            updated_by=ra1.id if j % 2 == 0 else im1.id,
            timestamp=datetime.utcnow() - timedelta(days=random.randint(1, 60)),
            notes=random.choice(["Scheduled restock", "Customer order", "Quarterly adjustment", None, None])
        )
        db.add(txn)

db.commit()
print("✅ Seed complete!")
print()
print("Demo credentials:")
print("  Super Admin  : admin@inventiq.com / admin123")
print("  Retailer Admin: alice@acme.com / password123")
print("  Inv. Manager : bob@acme.com / password123")
db.close()

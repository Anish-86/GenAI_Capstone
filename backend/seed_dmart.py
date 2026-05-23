from app.core.security import get_password_hash
from app.database.session import SessionLocal
from app.models.models import InventoryTransaction, Product, Tenant, TransactionType, User, UserRole


TENANT_NAME = "D-Mart"
TENANT_EMAIL = "ops@dmart.in"

RETAILER_ADMIN = {
    "name": "D-Mart Admin",
    "email": "admin@dmart.in",
    "password": "DmartAdmin@123",
    "role": UserRole.RETAILER_ADMIN,
}

INVENTORY_MANAGER = {
    "name": "D-Mart Inventory Manager",
    "email": "inventory@dmart.in",
    "password": "DmartInventory@123",
    "role": UserRole.INVENTORY_MANAGER,
}

PRODUCTS = [
    {
        "product_name": "D-Mart Premium Wheat Flour 10kg",
        "sku": "DM-GRC-001",
        "category": "Grocery",
        "brand": "D-Mart Staples",
        "quantity": 180,
        "price": 12.5,
        "warehouse_location": "Rack A-01",
    },
    {
        "product_name": "D-Mart Dishwash Liquid 1L",
        "sku": "DM-HHC-014",
        "category": "Household",
        "brand": "D-Mart Clean",
        "quantity": 36,
        "price": 4.75,
        "warehouse_location": "Rack C-08",
    },
    {
        "product_name": "D-Mart Almonds 500g",
        "sku": "DM-GRC-022",
        "category": "Grocery",
        "brand": "NutriChoice",
        "quantity": 9,
        "price": 8.4,
        "warehouse_location": "Rack B-03",
    },
]


def upsert_user(db, tenant_id, payload):
    user = db.query(User).filter(User.email == payload["email"]).first()
    if not user:
        user = User(email=payload["email"])
    user.name = payload["name"]
    user.password = get_password_hash(payload["password"])
    user.role = payload["role"]
    user.tenant_id = tenant_id
    user.is_active = True
    db.add(user)
    return user


def upsert_product(db, tenant_id, payload):
    product = db.query(Product).filter(Product.sku == payload["sku"]).first()
    if not product:
        product = Product(sku=payload["sku"], tenant_id=tenant_id)
    product.tenant_id = tenant_id
    product.product_name = payload["product_name"]
    product.category = payload["category"]
    product.brand = payload["brand"]
    product.quantity = payload["quantity"]
    product.price = payload["price"]
    product.supplier = "D-Mart Central Supply"
    product.warehouse_location = payload["warehouse_location"]
    product.description = f"Demo D-Mart inventory item for {payload['category'].lower()} operations."
    db.add(product)
    return product


def main():
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter(Tenant.company_name == TENANT_NAME).first()
        if not tenant:
            tenant = Tenant(company_name=TENANT_NAME, contact_email=TENANT_EMAIL)
        tenant.company_name = TENANT_NAME
        tenant.contact_email = TENANT_EMAIL
        db.add(tenant)
        db.flush()

        admin = upsert_user(db, tenant.id, RETAILER_ADMIN)
        manager = upsert_user(db, tenant.id, INVENTORY_MANAGER)

        products = [upsert_product(db, tenant.id, payload) for payload in PRODUCTS]
        db.flush()

        existing_transactions = (
            db.query(InventoryTransaction)
            .join(Product)
            .filter(Product.tenant_id == tenant.id)
            .count()
        )
        if existing_transactions == 0:
            transactions = [
                (products[0], TransactionType.STOCK_IN, 50, "Opening stock delivery"),
                (products[1], TransactionType.STOCK_OUT, 12, "Store floor replenishment"),
                (products[2], TransactionType.ADJUSTMENT, 9, "Cycle count adjustment"),
            ]
            for product, transaction_type, quantity, notes in transactions:
                db.add(
                    InventoryTransaction(
                        tenant_id=tenant.id,
                        product_id=product.id,
                        transaction_type=transaction_type,
                        quantity=quantity,
                        updated_by=manager.id,
                        notes=notes,
                    )
                )

        db.commit()
        print(f"D-Mart tenant: {tenant.id}")
        print(f"Retailer Admin: {admin.email} / {RETAILER_ADMIN['password']}")
        print(f"Inventory Manager: {manager.email} / {INVENTORY_MANAGER['password']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()

from sqlalchemy import delete
from app.database.session import SessionLocal
from app.models.models import User, UserRole, Tenant, Product, InventoryTransaction


def clear_database_except_super_admin():
    db = SessionLocal()
    try:
        super_admin = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).first()

        if not super_admin:
            print("No super admin found — aborting.")
            return

        preserve_user_id = super_admin.id
        preserve_tenant_id = super_admin.tenant_id

        print(f"Preserving super admin: {super_admin.email} (id={preserve_user_id})")

        # 1) Delete inventory transactions (depends on products and users)
        tx_deleted = db.query(InventoryTransaction).delete(synchronize_session=False)
        print(f"Deleted {tx_deleted} inventory transactions")

        # 2) Delete products (keep those belonging to super admin's tenant if any)
        if preserve_tenant_id:
            prod_deleted = db.query(Product).filter(Product.tenant_id != preserve_tenant_id).delete(synchronize_session=False)
        else:
            prod_deleted = db.query(Product).delete(synchronize_session=False)
        print(f"Deleted {prod_deleted} products")

        # 3) Delete users except super admin
        users_deleted = db.query(User).filter(User.id != preserve_user_id).delete(synchronize_session=False)
        print(f"Deleted {users_deleted} users")

        # 4) Delete tenants except preserved tenant (if present)
        if preserve_tenant_id:
            tenants_deleted = db.query(Tenant).filter(Tenant.id != preserve_tenant_id).delete(synchronize_session=False)
        else:
            tenants_deleted = db.query(Tenant).delete(synchronize_session=False)
        print(f"Deleted {tenants_deleted} tenants")

        db.commit()
        print("Database cleared. Super admin preserved.")

    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
    finally:
        db.close()


if __name__ == '__main__':
    clear_database_except_super_admin()

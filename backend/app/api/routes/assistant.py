import json
import urllib.request
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.config import settings
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.models import InventoryTransaction, LowStockAlert, Product, Store, StoreInventory, Tenant, TenantStatus, User, UserRole
from app.schemas.schemas import ChatRequest, ChatResponse

router = APIRouter()


def role_label(role: UserRole) -> str:
    return role.value.replace("_", " ")


def scoped_facts(db: Session, user: User) -> dict:
    if user.role == UserRole.SUPER_ADMIN:
        tenants = db.query(Tenant).all()
        tenant_rows = []
        for tenant in tenants:
            tenant_rows.append({
                "name": tenant.company_name,
                "status": tenant.status.value if hasattr(tenant.status, "value") else tenant.status,
                "stores": db.query(Store).filter(Store.tenant_id == tenant.id).count(),
                "retailer_admins": db.query(User).filter(User.tenant_id == tenant.id, User.role == UserRole.RETAILER_ADMIN).count(),
                "inventory_managers": db.query(User).filter(User.tenant_id == tenant.id, User.role == UserRole.INVENTORY_MANAGER).count(),
                "products": db.query(Product).filter(Product.tenant_id == tenant.id).count(),
                "open_low_stock_alerts": db.query(LowStockAlert).filter(LowStockAlert.tenant_id == tenant.id, LowStockAlert.status == "open").count(),
            })
        return {
            "scope": "platform",
            "total_tenants": len(tenants),
            "active_tenants": db.query(Tenant).filter(Tenant.status == TenantStatus.ACTIVE).count(),
            "inactive_tenants": db.query(Tenant).filter(Tenant.status != TenantStatus.ACTIVE).count(),
            "total_stores": db.query(Store).count(),
            "total_products": db.query(Product).count(),
            "total_retailer_admins": db.query(User).filter(User.role == UserRole.RETAILER_ADMIN).count(),
            "total_inventory_managers": db.query(User).filter(User.role == UserRole.INVENTORY_MANAGER).count(),
            "open_low_stock_alerts": db.query(LowStockAlert).filter(LowStockAlert.status == "open").count(),
            "total_transactions": db.query(InventoryTransaction).count(),
            "tenants": tenant_rows,
        }

    if user.role == UserRole.RETAILER_ADMIN:
        tenant_id = user.tenant_id
        stock_items = db.query(StoreInventory).filter(StoreInventory.tenant_id == tenant_id).all()
        return {
            "scope": "tenant",
            "tenant_id": str(tenant_id),
            "stores": db.query(Store).filter(Store.tenant_id == tenant_id).count(),
            "products": db.query(Product).filter(Product.tenant_id == tenant_id).count(),
            "retailer_admins": db.query(User).filter(User.tenant_id == tenant_id, User.role == UserRole.RETAILER_ADMIN).count(),
            "inventory_managers": db.query(User).filter(User.tenant_id == tenant_id, User.role == UserRole.INVENTORY_MANAGER).count(),
            "open_low_stock_alerts": db.query(LowStockAlert).filter(LowStockAlert.tenant_id == tenant_id, LowStockAlert.status == "open").count(),
            "resolved_low_stock_alerts": db.query(LowStockAlert).filter(LowStockAlert.tenant_id == tenant_id, LowStockAlert.status == "resolved").count(),
            "total_store_units": sum(item.quantity for item in stock_items),
            "warehouse_units": db.query(func.coalesce(func.sum(Product.quantity), 0)).filter(Product.tenant_id == tenant_id).scalar() or 0,
            "recent_transactions": db.query(InventoryTransaction).filter(InventoryTransaction.tenant_id == tenant_id).count(),
        }

    stock_items = db.query(StoreInventory).filter(StoreInventory.store_id == user.store_id).all()
    low_items = [item for item in stock_items if item.quantity <= item.low_stock_threshold]
    return {
        "scope": "store",
        "store_id": str(user.store_id) if user.store_id else None,
        "store_name": user.store.name if user.store else None,
        "store_location": user.store.location if user.store else None,
        "assigned_products": len(stock_items),
        "total_store_units": sum(item.quantity for item in stock_items),
        "low_stock_items": len(low_items),
        "open_low_stock_alerts": db.query(LowStockAlert).filter(LowStockAlert.store_id == user.store_id, LowStockAlert.status == "open").count(),
        "transactions": db.query(InventoryTransaction).filter(InventoryTransaction.store_id == user.store_id).count(),
        "low_stock_products": [
            {
                "product": item.product.product_name if item.product else "Product",
                "sku": item.product.sku if item.product else None,
                "quantity": item.quantity,
                "threshold": item.low_stock_threshold,
            }
            for item in low_items[:10]
        ],
    }


def local_answer(message: str, facts: dict, user: User) -> str:
    text = message.lower()
    is_how_to = any(phrase in text for phrase in ["how can i", "how do i", "how to", "how can we", "how do we"])
    if is_how_to:
        if "tenant" in text and any(word in text for word in ["create", "add", "new"]):
            if user.role == UserRole.SUPER_ADMIN:
                return "Go to Tenants, click New Tenant, fill company/contact details, add the initial user details, then click Create Tenant."
            return "I can't answer this, sorry."
        if "transaction" in text or "transiction" in text:
            if user.role in [UserRole.RETAILER_ADMIN, UserRole.INVENTORY_MANAGER]:
                return "Go to Inventory, click New Transaction or Record Transaction, choose the product, transaction type, quantity, add an optional note, then submit."
            return "I can't answer this, sorry."
        if "product" in text and any(word in text for word in ["create", "add", "new"]):
            if user.role == UserRole.RETAILER_ADMIN:
                return "Go to Products, click Add Product, enter product details including SKU, category, price, and quantity, then create it."
            return "I can't answer this, sorry."
        if "stock" in text and any(word in text for word in ["send", "assign", "transfer"]):
            if user.role == UserRole.RETAILER_ADMIN:
                return "Go to Products or Stores, choose the product and store, enter the quantity and threshold if needed, then click Assign or Send to Store."
            return "I can't answer this, sorry."
        if "alert" in text:
            if user.role == UserRole.INVENTORY_MANAGER:
                return "Go to Inventory, find a low-stock product in your store stock list, then click the alert button. Only one open alert is kept for the same product and store."
            if user.role == UserRole.RETAILER_ADMIN:
                return "Go to Low Stock, review the open alert, click Resolve, add your message, then submit."
            return "I can't answer this, sorry."
        if "manager" in text and any(word in text for word in ["create", "add", "new"]):
            if user.role in [UserRole.SUPER_ADMIN, UserRole.RETAILER_ADMIN]:
                return "Go to Team or the tenant detail page, click Create Manager, enter the manager details, assign a store, then create the user."
            return "I can't answer this, sorry."
        if "store" in text and any(word in text for word in ["create", "add", "new"]):
            if user.role in [UserRole.SUPER_ADMIN, UserRole.RETAILER_ADMIN]:
                return "Go to Stores or the tenant detail page, click Create Store, enter the store name and location, then submit."
            return "I can't answer this, sorry."

    if any(phrase in text for phrase in ["name all tenants", "list all tenants", "show all tenants", "all tenants"]):
        if "tenants" in facts:
            names = [tenant["name"] for tenant in facts["tenants"]]
            return "Tenants: " + (", ".join(names) if names else "none yet.")
        return "I can't answer this, sorry."

    tenant_match = None
    for tenant in facts.get("tenants", []):
        if tenant["name"].lower() in text:
            tenant_match = tenant
            break
    if tenant_match:
        if any(word in text for word in ["manager", "managers"]):
            return f"{tenant_match['name']} has {tenant_match['inventory_managers']} inventory managers."
        if "admin" in text:
            return f"{tenant_match['name']} has {tenant_match['retailer_admins']} retailer admins."
        if "store" in text:
            return f"{tenant_match['name']} has {tenant_match['stores']} stores."
        if "product" in text:
            return f"{tenant_match['name']} has {tenant_match['products']} products."
        if "alert" in text or "low" in text:
            return f"{tenant_match['name']} has {tenant_match['open_low_stock_alerts']} open low stock alerts."
        return (
            f"{tenant_match['name']} is {tenant_match['status']} with {tenant_match['stores']} stores, "
            f"{tenant_match['inventory_managers']} inventory managers, {tenant_match['retailer_admins']} retailer admins, "
            f"{tenant_match['products']} products, and {tenant_match['open_low_stock_alerts']} open low stock alerts."
        )
    if any(word in text for word in ["tenant", "tenants"]):
        if "total_tenants" in facts:
            return f"You have {facts['total_tenants']} tenants: {facts['active_tenants']} active and {facts['inactive_tenants']} inactive or suspended."
        return "Tenant counts are only available to the super admin. I can answer questions about your assigned workspace."
    if any(word in text for word in ["manager", "managers"]):
        key = "total_inventory_managers" if "total_inventory_managers" in facts else "inventory_managers"
        if key in facts:
            return f"There are {facts[key]} inventory managers in your allowed scope."
    if "store" in text or "stores" in text:
        if "stores" in facts:
            return f"There are {facts['stores']} stores in your tenant workspace."
        return f"Your assigned store is {facts.get('store_name') or 'your store'}{(' at ' + facts['store_location']) if facts.get('store_location') else ''}."
    if "product" in text or "sku" in text:
        key = "total_products" if "total_products" in facts else "products"
        if key in facts:
            return f"There are {facts[key]} products in your allowed scope."
        return f"Your store has {facts.get('assigned_products', 0)} assigned products."
    if "low" in text or "alert" in text:
        return f"There are {facts.get('open_low_stock_alerts', 0)} open low stock alerts in your allowed scope."
    if "transaction" in text or "activity" in text:
        return f"There are {facts.get('total_transactions') or facts.get('recent_transactions') or facts.get('transactions') or 0} transactions in your allowed scope."
    return "I can't answer this, sorry."


def openai_answer(message: str, facts: dict, user: User) -> str | None:
    if not settings.OPENAI_API_KEY:
        return None
    instructions = (
        "You are InventIQ's role-scoped assistant. Answer only from the supplied JSON facts. "
        "Do not infer hidden data. If asked for data outside the user's role, refuse briefly. "
        "Never reveal raw JSON, scope internals, IDs, or hidden system data. "
        "You may answer brief how-to questions about using visible InventIQ pages and buttons. "
        "If you do not understand or cannot answer, reply exactly: I can't answer this, sorry. "
        "Reply in the same language as the user's message."
    )
    payload = {
        "model": settings.OPENAI_MODEL,
        "instructions": instructions,
        "input": f"User role: {role_label(user.role)}\nAllowed facts JSON: {json.dumps(facts, ensure_ascii=False)}\nQuestion: {message}",
        "max_output_tokens": 350,
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
        if data.get("output_text"):
            return data["output_text"]
        parts = []
        for item in data.get("output", []):
            for content in item.get("content", []):
                if content.get("text"):
                    parts.append(content["text"])
        return "\n".join(parts) if parts else None
    except Exception:
        return None


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    facts = scoped_facts(db, current_user)
    answer = openai_answer(payload.message, facts, current_user) or local_answer(payload.message, facts, current_user)
    return ChatResponse(answer=answer, facts={})

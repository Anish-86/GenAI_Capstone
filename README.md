# InventIQ — Multi-Tenant Inventory Management System

A production-ready full-stack inventory management platform with multi-tenancy, role-based access control, and a modern dark UI.

---

## Tech Stack

**Frontend** — React 18 + TypeScript + Tailwind CSS + Zustand + React Hook Form + Recharts  
**Backend** — FastAPI + SQLAlchemy + PostgreSQL + JWT Auth  
**Infrastructure** — Docker + Docker Compose + Nginx

---

## Features

- **Multi-tenant isolation** — each retailer's data is completely scoped to their tenant
- **3-tier RBAC** — Super Admin / Retailer Admin / Inventory Manager
- **JWT auth** — access + refresh token flow with bcrypt password hashing
- **Full product CRUD** — with search, filter, pagination, and sorting
- **Inventory transactions** — Stock In / Stock Out / Adjustment with full audit trail
- **Real-time dashboard** — stats, charts, recent activity feed
- **Responsive UI** — works on mobile and desktop

---

## Project Structure

```
inventiq/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # auth, tenants, products, inventory, users
│   │   ├── core/              # config, security
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── dependencies/      # auth DI, tenant filters
│   │   ├── database/          # session, engine
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/             # Dashboard, Products, Inventory, Users, Tenants
│   │   ├── layouts/           # AppLayout (sidebar + topbar)
│   │   ├── components/        # shared components
│   │   ├── services/          # axios API abstraction
│   │   ├── store/             # Zustand auth store
│   │   └── types/             # TypeScript interfaces
│   └── Dockerfile
└── docker-compose.yml
```

---

## Quick Start

### 1. Clone and configure

```bash
git clone <repo>
cd inventiq
cp backend/.env.example backend/.env
# Edit backend/.env — change SECRET_KEY!
```

### 2. Run with Docker Compose

```bash
docker-compose up --build
```

Services start on:
- Frontend: http://localhost:80
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432

### 3. Create your first Super Admin

```bash
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "email": "admin@inventiq.com",
    "password": "securepass123",
    "role": "super_admin"
  }'
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Set DATABASE_URL in .env to your local postgres
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

---

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/signup` | Create account | — |
| POST | `/auth/login` | Login → tokens | — |
| POST | `/auth/refresh` | Refresh access token | — |
| GET | `/auth/profile` | Get current user | ✓ |
| GET | `/tenants` | List all tenants | Super Admin |
| POST | `/tenants` | Create tenant | Super Admin |
| GET | `/products` | List products (paginated) | ✓ |
| POST | `/products` | Create product | Retailer Admin |
| PUT | `/products/:id` | Update product | Retailer Admin |
| DELETE | `/products/:id` | Delete product | Retailer Admin |
| GET | `/inventory/transactions` | List transactions | ✓ |
| POST | `/inventory/transactions` | Create transaction | ✓ |
| GET | `/inventory/dashboard` | Dashboard stats | ✓ |
| GET | `/inventory/admin-stats` | System-wide stats | Super Admin |
| GET | `/users` | List users | Retailer Admin |
| PUT | `/users/:id` | Update user | Retailer Admin |
| DELETE | `/users/:id` | Delete user | Retailer Admin |

---

## User Roles

| Role | Access |
|------|--------|
| `super_admin` | Everything — all tenants, users, system stats |
| `retailer_admin` | Own tenant — products, inventory, users |
| `inventory_manager` | Own tenant — view + create transactions |

---

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:password@db:5432/inventiq
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=["http://localhost:3000"]
```

---

## Database Schema

```
tenants ──< users
tenants ──< products
products ──< inventory_transactions
users ──< inventory_transactions (updated_by)
```

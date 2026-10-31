<<<<<<< HEAD
# Brightloop Subscription Management System

Enterprise SaaS Subscription Lifecycle, Invoicing, and Billing Management Platform.

---

## Technical Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend API** | Python 3.11+, FastAPI, Pydantic v2 |
| **Database & ORM** | PostgreSQL, SQLAlchemy 2.0, Alembic |
| **Security & Auth** | JWT (OAuth2 Bearer, python-jose, bcrypt) |
| **Testing** | Pytest, HTTPX, FastAPI TestClient |

---

## Team Ownership & Modular Structure

| Role | Developer | Owned Directories & Files |
| :--- | :--- | :--- |
| **Member 1** | Frontend Architect | `frontend/src/pages/*`, `frontend/src/components/*`, Tailwind styles, UX |
| **Member 2** | Auth & Catalog | `backend/app/models/auth.py`, `catalog.py`<br>`backend/app/schemas/auth.py`, `catalog.py`<br>`backend/app/api/v1/endpoints/auth.py`, `catalog.py` |
| **Member 3** | Subscriptions & Billing | `backend/app/models/subscription.py`, `billing.py`<br>`backend/app/schemas/subscription.py`, `billing.py`<br>`backend/app/api/v1/endpoints/subscriptions.py`, `billing.py` |
| **Member 4** | Payments & Reports | `backend/app/models/payment.py`<br>`backend/app/schemas/payment.py`, `report.py`<br>`backend/app/api/v1/endpoints/payments.py`, `reports.py`<br>`backend/app/tests/*` |

---

## Shared Governance & Protected Files

To prevent merge conflicts and schema drift during simultaneous feature delivery, the following files are **protected** and require consensus or architectural sign-off before modification:

- **Core Infrastructure**: `backend/app/core/config.py`, `database.py`, `security.py`, `dependencies.py`
- **Database Base & Exports**: `backend/app/models/base.py`, `backend/app/models/__init__.py`
- **Shared Schemas**: `backend/app/schemas/common.py`, `backend/app/schemas/__init__.py`
- **Routing Hub**: `backend/app/main.py`, `backend/app/api/v1/router.py`
- **Database Migrations**: `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/versions/*`
- **Shared Client Contracts**: `frontend/src/api/client.ts`, `frontend/src/api/types.ts`
- **Dependencies & Configs**: Root `.gitignore`, `backend/requirements.txt`, `backend/pyproject.toml`, `frontend/package.json`

---

## Getting Started

### Prerequisites

- **Python**: 3.11 or later
- **Node.js**: 18.x or 20.x+ (with npm 9+)
- **PostgreSQL**: 14+ (or local Docker container)

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - On Windows (PowerShell):
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - On Linux / macOS:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Update `DATABASE_URL` in `.env` if your PostgreSQL username/password/host differs from the default (`postgresql://postgres:postgres@localhost:5432/subscription_db`).

5. **Run database migrations**:
   - To inspect generated SQL without a live database (offline mode):
     ```bash
     alembic upgrade head --sql
     ```
   - With an active PostgreSQL server:
     ```bash
     alembic upgrade head
     ```

6. **Start the FastAPI backend server**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

7. **Verify backend endpoints**:
   - Root Healthcheck: [http://localhost:8000/health](http://localhost:8000/health)
   - API v1 Healthcheck: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
   - Interactive Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc Documentation: [http://localhost:8000/redoc](http://localhost:8000/redoc)

8. **Execute backend test suite**:
   ```bash
   pytest app/tests
   ```

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser. The dashboard will automatically poll `/health` from the backend and display live connectivity.

5. **Type check and build for production**:
   ```bash
   npm run build
   ```

---

## Database Architecture Overview

The system models the following interconnected domain entities:

```
[User] (Customer / Sales / Finance / Admin)
  | 1..*
  +---> [Subscription] <---+ [SubscriptionPlan]
  |       | 1..*
  |       +---> [SubscriptionItem] ---> [ProductVariant] ---> [Product]
  |
  +---> [Invoice] <---+ (Optional link to Subscription)
  |       | 1..*
  |       +---> [InvoiceLineItem] ---> [TaxRate]
  |       |
  |       +---> [Payment]
  |
  +---> [QuotationTemplate]
```

### Core Entities:
- **`users`**: Roles (`admin`, `sales`, `finance`, `customer`), credentials, profile.
- **`products`** & **`product_variants`**: Base catalog, SKUs, pricing metrics.
- **`quotation_templates`**: Sales quotation terms, validity periods.
- **`subscription_plans`**: Billing frequency (`monthly`, `quarterly`, `annual`), trial periods.
- **`subscriptions`** & **`subscription_items`**: State machine (`draft`, `active`, `paused`, `cancelled`, `expired`).
- **`invoices`** & **`invoice_line_items`**: Automated billing ledger, itemized lines (`draft`, `posted`, `paid`, `void`).
- **`tax_rates`**: Regional tax rules (VAT/GST percentages).
- **`discounts`**: Promotional coupon codes (fixed amount or percentage).
- **`payments`**: Payment ledger, transaction references, refunds (`pending`, `succeeded`, `failed`, `refunded`).

=======
# subscription-Management-system
>>>>>>> 39da671f860fbd86d44f969b4359fe3c46ccff00

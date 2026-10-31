# Developer Contribution Guide & Architecture Contracts

Welcome to the Brightloop Subscription Management System codebase. This repository is structured to allow four engineers to develop features in parallel during the hackathon without merge collisions or contractual drift.

---

## 1. Domain Ownership Matrix

Each developer owns a distinct vertical slice of the platform. Stick to your designated directories.

### Member 1: Frontend Architect
- **Focus**: User interface, routing, forms, client state, Tailwind styling, API client wiring.
- **Owned Scope**:
  - `frontend/src/pages/*`
  - `frontend/src/components/*`
  - `frontend/src/styles/*`
  - `frontend/src/App.tsx`
- **Dependencies**: Consumes `frontend/src/api/client.ts` and `frontend/src/api/types.ts`. Requests contract changes through Member 2, 3, or 4.

### Member 2: Authentication & Catalog Backend
- **Focus**: User registration/login, JWT token minting/verification, RBAC policies, product hierarchy, variants, and quotation templates.
- **Owned Scope**:
  - Models: `backend/app/models/auth.py`, `backend/app/models/catalog.py`
  - Schemas: `backend/app/schemas/auth.py`, `backend/app/schemas/catalog.py`
  - Endpoints: `backend/app/api/v1/endpoints/auth.py`, `backend/app/api/v1/endpoints/catalog.py`

### Member 3: Subscriptions & Billing Backend
- **Focus**: Plan management, subscription state machine (start, pause, resume, cancel), recurring invoice generation engine, tax calculation, discount coupon validation.
- **Owned Scope**:
  - Models: `backend/app/models/subscription.py`, `backend/app/models/billing.py`
  - Schemas: `backend/app/schemas/subscription.py`, `backend/app/schemas/billing.py`
  - Endpoints: `backend/app/api/v1/endpoints/subscriptions.py`, `backend/app/api/v1/endpoints/billing.py`

### Member 4: Payments, Financial Reports & Backend Tests
- **Focus**: Payment processing, transaction ledger, refund processing, MRR/ARR aggregations, churn calculations, pytest fixtures, and integration test coverage.
- **Owned Scope**:
  - Models: `backend/app/models/payment.py`
  - Schemas: `backend/app/schemas/payment.py`, `backend/app/schemas/report.py`
  - Endpoints: `backend/app/api/v1/endpoints/payments.py`, `backend/app/api/v1/endpoints/reports.py`
  - Test Suite: `backend/app/tests/*`

---

## 2. Shared Files (Approval Required Before Modification)

Modifying any of the following files affects the entire team and requires prior discussion and approval:

1. **`backend/app/core/*`**:
   - `config.py` (Environment variables and system constants)
   - `database.py` (Session lifecycle and engine settings)
   - `security.py` (Hashing algorithms and JWT encoding standards)
   - `dependencies.py` (Authentication tokens and RBAC checks)
2. **`backend/app/models/base.py` & `backend/app/models/__init__.py`**:
   - Changes to Base or table imports risk breaking Alembic migrations.
3. **`backend/app/schemas/common.py` & `backend/app/schemas/__init__.py`**:
   - Healthcheck, pagination, and shared response wrappers.
4. **`backend/app/api/v1/router.py` & `backend/app/main.py`**:
   - Router registration, middleware configuration, CORS origins.
5. **`backend/alembic.ini` & `backend/alembic/*`**:
   - Schema revisions must be reviewed by backend owners to prevent revision fork conflicts.
6. **`frontend/src/api/types.ts` & `frontend/src/api/client.ts`**:
   - Represents the shared data contract between frontend and backend.
7. **Package Manifests**:
   - `backend/requirements.txt`, `backend/pyproject.toml`, `frontend/package.json`.

---

## 3. Git Branching & Workflow Rules

- **Default Branch**: `main`
- **Branch Naming**:
  - Member 1: `feat/frontend-<feature-name>`
  - Member 2: `feat/auth-catalog-<feature-name>`
  - Member 3: `feat/subscriptions-billing-<feature-name>`
  - Member 4: `feat/payments-reports-<feature-name>`
- **Pull Request Protocol**:
  1. Ensure all tests pass (`pytest app/tests` in `backend/`).
  2. Ensure frontend builds cleanly (`npm run build` in `frontend/`).
  3. Tag the team lead / peer on any changes touching shared contract files.
  4. Never commit directly to `main`.
  5. Never commit credentials, `.env` files, or secrets.

---

## 4. Verification Checklist Before Submitting Code

- [ ] Backend tests run without errors: `pytest app/tests`
- [ ] No unhandled migrations: `alembic check`
- [ ] Frontend compiles with zero TypeScript errors: `npm run build`
- [ ] Healthcheck endpoints remain untouched: `GET /health` and `GET /api/v1/health`
- [ ] Endpoints implement schemas faithfully to the contracts in `backend/app/schemas/`.


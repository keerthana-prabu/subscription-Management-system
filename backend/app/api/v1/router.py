"""Aggregated API v1 router combining all domain-specific sub-routers."""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    catalog,
    subscriptions,
    billing,
    payments,
    reports,
)

api_router = APIRouter()

# Health verification endpoint
api_router.include_router(health.router, tags=["Health"])

# Member 2: Authentication and Catalog
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["Catalog"])

# Member 3: Subscriptions and Billing
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["Subscriptions"])
api_router.include_router(billing.router, prefix="/billing", tags=["Billing & Invoices"])

# Member 4: Payments and Reporting
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(reports.router, prefix="/reports", tags=["Financial Reports"])


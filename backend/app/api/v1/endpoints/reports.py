"""Financial metrics, executive dashboard, and subscription reporting endpoints.

Owner: Member 4 (Payments, Reports & Backend Tests)
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.billing import Invoice
from app.models.payment import Payment
from app.models.subscription import SubscriptionStatus
from app.schemas.report import (
    MRRReportResponse,
    RevenueReportResponse,
    SubscriptionReportResponse,
    DashboardReportResponse,
)
from app.api.v1.endpoints.billing import _serialize_invoice
from app.schemas.payment import PaymentResponse
from app.services.reporting_service import (
    calculate_mrr_metrics,
    calculate_revenue_report,
    calculate_subscription_analytics,
)

router = APIRouter()


@router.get(
    "/mrr",
    response_model=MRRReportResponse,
    summary="Get current MRR, ARR, and subscription metrics",
    dependencies=[Depends(require_roles(["admin", "finance", "sales"]))],
)
def get_mrr_metrics(
    db: Session = Depends(get_db),
) -> MRRReportResponse:
    """Calculate and return normalized MRR/ARR metrics based on contracted items."""
    metrics = calculate_mrr_metrics(db)
    return MRRReportResponse(**metrics)


@router.get(
    "/revenue",
    response_model=RevenueReportResponse,
    summary="Get revenue report with tax, discounts, and payments breakdown",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def get_revenue_report(
    start_date: Optional[date] = Query(None, description="Start date for revenue aggregation"),
    end_date: Optional[date] = Query(None, description="End date for revenue aggregation"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    plan_id: Optional[int] = Query(None, description="Filter by plan ID"),
    db: Session = Depends(get_db),
) -> RevenueReportResponse:
    """Calculate authoritative revenue ledger and monthly time-series breakdown."""
    report = calculate_revenue_report(
        db=db,
        start_date=start_date,
        end_date=end_date,
        customer_id=customer_id,
        plan_id=plan_id,
    )
    return RevenueReportResponse(**report)


@router.get(
    "/subscriptions",
    response_model=SubscriptionReportResponse,
    summary="Get subscription status breakdown and plan distributions",
    dependencies=[Depends(require_roles(["admin", "finance", "sales"]))],
)
def get_subscription_report(
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    plan_id: Optional[int] = Query(None, description="Filter by plan ID"),
    status_filter: Optional[SubscriptionStatus] = Query(None, alias="status", description="Filter by status"),
    db: Session = Depends(get_db),
) -> SubscriptionReportResponse:
    """Calculate subscription lifecycle counts and plan-level MRR distribution."""
    report = calculate_subscription_analytics(
        db=db,
        start_date=start_date,
        end_date=end_date,
        plan_id=plan_id,
        status_filter=status_filter,
    )
    return SubscriptionReportResponse(**report)


@router.get(
    "/dashboard",
    response_model=DashboardReportResponse,
    summary="Get consolidated executive dashboard overview",
    dependencies=[Depends(require_roles(["admin", "finance", "sales"]))],
)
def get_executive_dashboard(
    db: Session = Depends(get_db),
) -> DashboardReportResponse:
    """Consolidated dashboard metrics combining MRR, cash collection, and recent activity."""
    mrr_data = calculate_mrr_metrics(db)
    rev_data = calculate_revenue_report(db)
    sub_data = calculate_subscription_analytics(db)

    # Fetch 5 recent invoices
    recent_invoices = (
        db.query(Invoice)
        .order_by(Invoice.id.desc())
        .limit(5)
        .all()
    )
    serialized_invoices = [_serialize_invoice(inv) for inv in recent_invoices]

    # Fetch 5 recent payments
    recent_payments = (
        db.query(Payment)
        .order_by(Payment.id.desc())
        .limit(5)
        .all()
    )
    serialized_payments = [PaymentResponse.model_validate(p) for p in recent_payments]

    # Count overdue invoices
    now_invoices = (
        db.query(Invoice)
        .filter(Invoice.status.notin_(["cancelled", "void"]))
        .all()
    )
    overdue_count = sum((1 for inv in now_invoices if inv.is_overdue))

    return DashboardReportResponse(
        active_subscriptions=mrr_data["active_subscriptions"],
        mrr=mrr_data["total_mrr"],
        arr=mrr_data["arr"],
        total_invoiced=rev_data["total_net_revenue"],
        total_collected=rev_data["total_payments_collected"],
        total_outstanding=rev_data["outstanding_balance"],
        total_overdue=rev_data["overdue_balance"],
        overdue_count=overdue_count,
        upcoming_renewals_30d=sub_data["upcoming_renewals_30d"],
        recent_invoices=serialized_invoices,
        recent_payments=serialized_payments,
    )

"""Financial metrics and subscription reporting endpoints.

Owner: Member 4 (Payments, Reports & Backend Tests)
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.schemas.report import (
    MRRReportResponse,
    RevenueReportResponse,
    SubscriptionReportResponse,
)
from app.core.dependencies import require_roles

router = APIRouter()


@router.get(
    "/mrr",
    response_model=MRRReportResponse,
    summary="Get current MRR, ARR, and churn metrics",
    dependencies=[Depends(require_roles(["admin", "finance", "sales"]))],
)
def get_mrr_metrics() -> MRRReportResponse:
    """Calculate and return MRR/ARR metrics. Contract defined for Member 4 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="MRR reporting contract defined; implementation pending Member 4.",
    )


@router.get(
    "/revenue",
    response_model=RevenueReportResponse,
    summary="Get revenue report with tax and discount breakdown",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def get_revenue_report(
    start_date: Optional[date] = Query(None, description="Start date for revenue aggregation"),
    end_date: Optional[date] = Query(None, description="End date for revenue aggregation"),
) -> RevenueReportResponse:
    """Calculate revenue ledger report. Contract defined for Member 4 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Revenue report contract defined; implementation pending Member 4.",
    )


@router.get(
    "/subscriptions",
    response_model=SubscriptionReportResponse,
    summary="Get subscription status breakdown and plan distributions",
    dependencies=[Depends(require_roles(["admin", "finance", "sales"]))],
)
def get_subscription_report() -> SubscriptionReportResponse:
    """Calculate subscription lifecycle report. Contract defined for Member 4 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Subscription report contract defined; implementation pending Member 4.",
    )


"""Financial and subscription metrics reporting schemas.

Owner: Member 4 (Payments, Reports & Backend Tests)
"""

from datetime import date
from decimal import Decimal
from typing import List, Dict
from pydantic import BaseModel, Field


class MRRReportResponse(BaseModel):
    """Monthly Recurring Revenue (MRR) and Annual Run Rate breakdown."""
    total_mrr: Decimal = Field(..., examples=[125000.00])
    arr: Decimal = Field(..., examples=[1500000.00])
    currency: str = Field(default="USD")
    active_subscriptions: int = Field(..., examples=[420])
    churn_rate_percentage: Decimal = Field(..., examples=[1.85])


class RevenueTimeSeriesPoint(BaseModel):
    period: str = Field(..., examples=["2026-10"])
    gross_revenue: Decimal
    net_revenue: Decimal
    tax_collected: Decimal
    discounts_given: Decimal
    currency: str = "USD"


class RevenueReportResponse(BaseModel):
    """Aggregated financial revenue report."""
    start_date: date
    end_date: date
    currency: str
    total_gross_revenue: Decimal
    total_net_revenue: Decimal
    total_tax_collected: Decimal
    total_refunds: Decimal
    breakdown_by_period: List[RevenueTimeSeriesPoint] = []


class SubscriptionStatusCount(BaseModel):
    status: str
    count: int


class SubscriptionReportResponse(BaseModel):
    """Subscription counts and distribution by plan and lifecycle status."""
    total_count: int
    by_status: List[SubscriptionStatusCount] = []
    by_plan: Dict[str, int] = {}

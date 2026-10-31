"""Financial and subscription metrics reporting schemas.

Owner: Member 4 (Payments, Reports & Backend Tests)
"""

from datetime import date
from decimal import Decimal
from typing import List, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.billing import InvoiceResponse
from app.schemas.payment import PaymentResponse


class MRRReportResponse(BaseModel):
    """Monthly Recurring Revenue (MRR) and Annual Run Rate breakdown."""
    total_mrr: Decimal = Field(..., examples=[125000.00])
    arr: Decimal = Field(..., examples=[1500000.00])
    currency: str = Field(default="USD")
    active_subscriptions: int = Field(..., examples=[420])
    new_subscriptions: int = Field(default=0, examples=[25])
    cancelled_subscriptions: int = Field(default=0, examples=[5])
    churn_rate_percentage: Decimal = Field(..., examples=[1.85])
    reporting_period: Optional[str] = Field(default=None, examples=["2026-10"])

    model_config = ConfigDict(from_attributes=True)


class RevenueTimeSeriesPoint(BaseModel):
    period: str = Field(..., examples=["2026-10"])
    gross_revenue: Decimal
    net_revenue: Decimal
    tax_collected: Decimal
    discounts_given: Decimal
    payments_collected: Decimal = Decimal("0.00")
    currency: str = "USD"

    model_config = ConfigDict(from_attributes=True)


class RevenueReportResponse(BaseModel):
    """Aggregated financial revenue report."""
    start_date: date
    end_date: date
    currency: str
    total_gross_revenue: Decimal
    total_discounts: Decimal = Decimal("0.00")
    total_net_revenue: Decimal
    total_tax_collected: Decimal
    total_payments_collected: Decimal = Decimal("0.00")
    total_refunds: Decimal
    outstanding_balance: Decimal = Decimal("0.00")
    overdue_balance: Decimal = Decimal("0.00")
    breakdown_by_period: List[RevenueTimeSeriesPoint] = []

    model_config = ConfigDict(from_attributes=True)


class SubscriptionStatusCount(BaseModel):
    status: str
    count: int

    model_config = ConfigDict(from_attributes=True)


class PlanMRRBreakdown(BaseModel):
    plan_id: int
    plan_name: str
    active_subscribers: int
    billing_cycle: str
    mrr_contribution: Decimal
    percentage_of_total_mrr: Decimal

    model_config = ConfigDict(from_attributes=True)


class SubscriptionReportResponse(BaseModel):
    """Subscription counts and distribution by plan and lifecycle status."""
    total_count: int
    by_status: List[SubscriptionStatusCount] = []
    by_plan: Dict[str, int] = {}
    status_distribution: Dict[str, int] = {}
    cadence_distribution: Dict[str, int] = {}
    plan_breakdown: List[PlanMRRBreakdown] = []
    upcoming_renewals_30d: int = 0
    new_subscriptions_period: int = 0

    model_config = ConfigDict(from_attributes=True)


class DashboardReportResponse(BaseModel):
    """Executive consolidated overview matching Dashboard.tsx."""
    active_subscriptions: int
    mrr: Decimal
    arr: Decimal
    total_invoiced: Decimal
    total_collected: Decimal
    total_outstanding: Decimal
    total_overdue: Decimal
    overdue_count: int
    upcoming_renewals_30d: int
    recent_invoices: List[InvoiceResponse] = []
    recent_payments: List[PaymentResponse] = []

    model_config = ConfigDict(from_attributes=True)

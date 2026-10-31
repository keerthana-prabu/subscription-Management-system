"""Invoicing, line items, tax rate, and discount schemas.

Owner: Member 3 (Subscriptions & Billing Backend)
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.billing import InvoiceStatus, DiscountType


# =========================================================================
# Tax Rate Schemas
# =========================================================================

class TaxRateBase(BaseModel):
    name: str = Field(..., examples=["Standard VAT 20%"])
    rate_percentage: Decimal = Field(..., ge=0, le=100, examples=[20.00])
    country: Optional[str] = Field(None, max_length=2, examples=["US"])
    is_active: bool = True


class TaxRateCreateRequest(TaxRateBase):
    pass


class TaxRateUpdateRequest(BaseModel):
    name: Optional[str] = None
    rate_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    country: Optional[str] = Field(None, max_length=2)
    is_active: Optional[bool] = None


class TaxRateResponse(TaxRateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# Discount Schemas
# =========================================================================

class DiscountBase(BaseModel):
    code: str = Field(..., examples=["SUMMER2026"])
    discount_type: DiscountType = Field(default=DiscountType.PERCENTAGE)
    amount: Decimal = Field(..., gt=0, examples=[15.00])
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True


class DiscountCreateRequest(DiscountBase):
    pass


class DiscountResponse(DiscountBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# Customer Summary Schema (For Invoices)
# =========================================================================

class CustomerSummaryResponse(BaseModel):
    id: int
    full_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# Invoice Line Item Schemas
# =========================================================================

class InvoiceLineItemBase(BaseModel):
    description: str = Field(..., examples=["Growth Plan - Monthly Subscription"])
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(..., ge=0, examples=[199.00])
    product_variant_id: Optional[int] = None
    tax_rate_id: Optional[int] = None


class InvoiceLineItemResponse(InvoiceLineItemBase):
    id: int
    invoice_id: int
    product_variant_id: Optional[int] = None
    tax_rate_percentage: Decimal
    tax_amount: Decimal
    subtotal: Decimal
    total_amount: Decimal

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# Invoice Management Schemas
# =========================================================================

class InvoiceCreateRequest(BaseModel):
    """Payload for manual invoice creation."""
    customer_id: int
    subscription_id: Optional[int] = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    payment_terms: str = Field(default="Net 30", max_length=64)
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    items: List[InvoiceLineItemBase]
    discount_code: Optional[str] = None
    discount_amount: Optional[Decimal] = Field(default=Decimal("0.00"), ge=0)


class InvoiceResponse(BaseModel):
    """Full invoice ledger representation."""
    id: int
    invoice_number: str
    customer_id: int
    customer: Optional[CustomerSummaryResponse] = None
    subscription_id: Optional[int] = None
    status: InvoiceStatus
    currency: str
    payment_terms: str
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    outstanding_balance: Decimal
    is_overdue: bool
    issue_date: Optional[datetime] = None
    due_date: datetime
    paid_at: Optional[datetime] = None
    billing_period_start: Optional[datetime] = None
    billing_period_end: Optional[datetime] = None
    items: List[InvoiceLineItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================================
# Recurring Billing Execution & Schedule Schemas
# =========================================================================

class BillingRunRequest(BaseModel):
    target_date: Optional[datetime] = None
    subscription_ids: Optional[List[int]] = None
    auto_confirm: bool = False


class BillingRunResponse(BaseModel):
    processed: int
    created: int
    skipped: int
    failed: int
    invoices: List[InvoiceResponse] = []
    errors: List[str] = []


class BillingScheduleItemResponse(BaseModel):
    subscription_id: int
    customer_id: int
    customer_name: str
    customer_email: str
    plan_id: int
    plan_name: str
    billing_cycle: str
    status: str
    next_billing_date: datetime
    expected_amount: Decimal
    currency: str
    is_eligible: bool

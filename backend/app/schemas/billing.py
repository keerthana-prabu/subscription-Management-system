"""Invoicing, line items, tax rate, and discount schemas.

Owner: Member 3 (Subscriptions & Billing Backend)
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.billing import InvoiceStatus, DiscountType


class TaxRateBase(BaseModel):
    name: str = Field(..., examples=["Standard VAT"])
    rate_percentage: Decimal = Field(..., ge=0, le=100, examples=[20.00])
    country: str = Field(..., min_length=2, max_length=2, examples=["US"])
    is_active: bool = True


class TaxRateCreateRequest(TaxRateBase):
    pass


class TaxRateResponse(TaxRateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


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


class InvoiceLineItemBase(BaseModel):
    description: str = Field(..., examples=["Growth Plan - Monthly Subscription"])
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(..., ge=0, examples=[199.00])
    tax_rate_id: Optional[int] = None


class InvoiceLineItemResponse(InvoiceLineItemBase):
    id: int
    invoice_id: int
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class InvoiceCreateRequest(BaseModel):
    """Payload for manual or automated recurring invoice generation."""
    customer_id: int
    subscription_id: Optional[int] = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    due_date: datetime
    items: List[InvoiceLineItemBase]
    discount_code: Optional[str] = None


class InvoiceResponse(BaseModel):
    """Full invoice ledger representation."""
    id: int
    invoice_number: str
    customer_id: int
    subscription_id: Optional[int] = None
    status: InvoiceStatus
    currency: str
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total_amount: Decimal
    due_date: datetime
    paid_at: Optional[datetime] = None
    items: List[InvoiceLineItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

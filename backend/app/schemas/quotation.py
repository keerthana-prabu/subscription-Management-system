"""Quotation request and response Pydantic schemas for Phase 7.

Owner: Brightloop Backend Team (Odoo Make-A-Ton 9.0)
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.quotation import QuotationStatus


class QuotationLineItemInput(BaseModel):
    """Payload to add or update an itemized quotation line."""
    product_id: int = Field(..., examples=[1])
    product_name: Optional[str] = None
    variant_id: Optional[int] = Field(None, examples=[1])
    variant_name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: Optional[Decimal] = None
    tax_percentage: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)
    discount_percentage: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)


class QuotationLineItemResponse(BaseModel):
    """Itemized quotation line item output."""
    id: int
    quotation_id: Optional[int] = None
    product_id: int
    product_name: str
    variant_id: Optional[int] = None
    variant_name: Optional[str] = None
    sku: str
    description: Optional[str] = None
    quantity: int
    unit_price: Decimal
    tax_percentage: Decimal
    discount_percentage: Decimal
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class QuotationCreateRequest(BaseModel):
    """Payload to create a sales quotation."""
    customer_id: int = Field(..., examples=[1])
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    plan_id: Optional[int] = Field(None, examples=[1])
    template_id: Optional[int] = Field(None, examples=[1])
    template_name: Optional[str] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    payment_terms: Optional[str] = "immediate"
    items: List[QuotationLineItemInput] = Field(..., min_length=1)


class QuotationUpdateRequest(BaseModel):
    """Payload to modify an existing draft quotation."""
    plan_id: Optional[int] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    payment_terms: Optional[str] = None
    currency: Optional[str] = None
    items: Optional[List[QuotationLineItemInput]] = None
    status: Optional[QuotationStatus] = None


class QuotationResponse(BaseModel):
    """Detailed sales quotation lifecycle schema."""
    id: int
    quotation_number: str
    customer_id: int
    customer_name: str
    customer_email: str
    plan_id: Optional[int] = None
    plan_name: Optional[str] = None
    template_id: Optional[int] = None
    template_name: Optional[str] = None
    status: QuotationStatus
    valid_until: datetime
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    payment_terms: Optional[str] = None
    currency: str
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total_amount: Decimal
    items: List[QuotationLineItemResponse] = []
    converted_subscription_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


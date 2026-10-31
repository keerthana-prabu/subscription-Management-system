"""Payment transaction and financial summary schemas.

Owner: Member 4 (Payments, Reports & Backend Tests)
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.payment import PaymentStatus, PaymentMethod


class PaymentCreateRequest(BaseModel):
    """Payload to record or trigger a payment against an invoice."""
    invoice_id: int = Field(..., examples=[1])
    amount: Decimal = Field(..., gt=0, examples=[199.00])
    currency: str = Field(default="USD", min_length=3, max_length=3, examples=["USD"])
    payment_method: PaymentMethod = Field(default=PaymentMethod.MANUAL)
    transaction_reference: Optional[str] = Field(None, examples=["TXN-stripe-ch-88493"])
    notes: Optional[str] = Field(None, examples=["Check #1042 or manual wire confirmation"])


class PaymentRefundRequest(BaseModel):
    """Payload to refund a settled payment."""
    reason: str = Field(..., min_length=1, examples=["Customer cancellation within 14-day window"])
    amount: Optional[Decimal] = Field(None, gt=0, examples=[100.00])


class PaymentResponse(BaseModel):
    """Payment record response."""
    id: int
    invoice_id: int
    amount: Decimal
    currency: str
    status: PaymentStatus
    payment_method: PaymentMethod
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    failure_reason: Optional[str] = None
    paid_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
    refund_amount: Decimal = Decimal("0.00")
    refund_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FinancialSummaryResponse(BaseModel):
    """Authoritative server-calculated financial metrics."""
    total_invoiced: Decimal
    total_paid: Decimal
    total_outstanding: Decimal
    total_overdue: Decimal
    partially_paid_count: int
    fully_paid_count: int
    unpaid_count: int
    overdue_count: int

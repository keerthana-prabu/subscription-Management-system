"""Payment and transaction ledger database models.

Owner: Member 4 (Payments, Reports & Backend Tests)
"""

import enum
from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Numeric, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.billing import Invoice


class PaymentStatus(str, enum.Enum):
    """Payment transaction states."""
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    """Channel or method used to remit payment."""
    CREDIT_CARD = "credit_card"
    BANK_TRANSFER = "bank_transfer"
    MANUAL = "manual"


class Payment(Base, TimestampMixin):
    """Payment execution against an invoice."""
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(
            PaymentStatus,
            name="payment_status_enum",
            native_enum=False,
            values_callable=lambda x: [item.value for item in x],
        ),
        default=PaymentStatus.PENDING,
        nullable=False,
        index=True,
    )
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(
            PaymentMethod,
            name="payment_method_enum",
            native_enum=False,
            values_callable=lambda x: [item.value for item in x],
        ),
        default=PaymentMethod.MANUAL,
        nullable=False,
    )
    transaction_reference: Mapped[Optional[str]] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    refunded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    refund_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    refund_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment id={self.id} invoice_id={self.invoice_id} amount={self.amount} status={self.status}>"

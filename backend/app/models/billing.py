"""Invoicing, line items, taxes, and discounts database models.

Owner: Member 3 (Subscriptions & Billing Backend)
"""

import enum
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Numeric, Integer, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.auth import User
    from app.models.subscription import Subscription
    from app.models.payment import Payment


class InvoiceStatus(str, enum.Enum):
    """Lifecycle status of a generated invoice."""
    DRAFT = "draft"
    POSTED = "posted"
    PAID = "paid"
    VOID = "void"
    UNCOLLECTIBLE = "uncollectible"


class DiscountType(str, enum.Enum):
    """Discount calculation model."""
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"


class TaxRate(Base, TimestampMixin):
    """Regional tax rate configuration (VAT, GST, Sales Tax)."""
    __tablename__ = "tax_rates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    rate_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    country: Mapped[str] = mapped_column(String(2), nullable=False)  # ISO 3166-1 alpha-2
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<TaxRate id={self.id} name={self.name} rate={self.rate_percentage}%>"


class Discount(Base, TimestampMixin):
    """Promotional or contractual coupon/discount configuration."""
    __tablename__ = "discounts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    discount_type: Mapped[DiscountType] = mapped_column(
        Enum(DiscountType, name="discount_type_enum", native_enum=False),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    valid_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<Discount id={self.id} code={self.code}>"


class Invoice(Base, TimestampMixin):
    """Invoice entity representing billing ledger items."""
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subscription_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status_enum", native_enum=False),
        default=InvoiceStatus.DRAFT,
        nullable=False,
        index=True,
    )
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    discount_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    tax_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    customer: Mapped["User"] = relationship("User", back_populates="invoices")
    subscription: Mapped[Optional["Subscription"]] = relationship("Subscription", back_populates="invoices")
    items: Mapped[List["InvoiceLineItem"]] = relationship(
        "InvoiceLineItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
    )
    payments: Mapped[List["Payment"]] = relationship(
        "Payment",
        back_populates="invoice",
    )

    def __repr__(self) -> str:
        return f"<Invoice id={self.id} number={self.invoice_number} status={self.status}>"


class InvoiceLineItem(Base, TimestampMixin):
    """Detailed itemized line item inside an invoice."""
    __tablename__ = "invoice_line_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tax_rates.id", ondelete="SET NULL"),
        nullable=True,
    )
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Relationships
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")
    tax_rate: Mapped[Optional["TaxRate"]] = relationship("TaxRate")

    def __repr__(self) -> str:
        return f"<InvoiceLineItem id={self.id} invoice_id={self.invoice_id}>"


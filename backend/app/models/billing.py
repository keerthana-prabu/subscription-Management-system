"""Invoicing, line items, taxes, and discounts database models.

Owner: Member 3 (Subscriptions & Billing Backend)
"""

import enum
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Numeric, Integer, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.auth import User
    from app.models.subscription import Subscription
    from app.models.payment import Payment
    from app.models.catalog import ProductVariant


class InvoiceStatus(str, enum.Enum):
    """Lifecycle status of a generated invoice."""
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    POSTED = "posted"  # Legacy equivalent for confirmed
    PAID = "paid"
    CANCELLED = "cancelled"
    VOID = "void"  # Legacy alias for cancelled
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
    country: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)  # ISO 3166-1 alpha-2, optional
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<TaxRate id={self.id} name={self.name} rate={self.rate_percentage}%>"


class Discount(Base, TimestampMixin):
    """Promotional or contractual coupon/discount configuration."""
    __tablename__ = "discounts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    discount_type: Mapped[DiscountType] = mapped_column(
        Enum(
            DiscountType,
            name="discount_type_enum",
            native_enum=False,
            values_callable=lambda x: [item.value for item in x],
        ),
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
        Enum(
            InvoiceStatus,
            name="invoice_status_enum",
            native_enum=False,
            values_callable=lambda x: [item.value for item in x],
        ),
        default=InvoiceStatus.DRAFT,
        nullable=False,
        index=True,
    )
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    payment_terms: Mapped[str] = mapped_column(String(64), default="Net 30", nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    discount_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    tax_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    issue_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    billing_period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    billing_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

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

    @property
    def outstanding_balance(self) -> Decimal:
        """Remaining balance on invoice."""
        balance = self.total_amount - self.amount_paid
        return max(Decimal("0.00"), balance)

    @property
    def is_overdue(self) -> bool:
        """Determines if the invoice has passed due date with an outstanding balance."""
        if self.status in (InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.VOID):
            return False
        if self.due_date:
            now_utc = datetime.now(timezone.utc)
            due = self.due_date if self.due_date.tzinfo else self.due_date.replace(tzinfo=timezone.utc)
            return now_utc > due and self.outstanding_balance > Decimal("0.00")
        return False

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
    product_variant_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("product_variants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tax_rates.id", ondelete="SET NULL"),
        nullable=True,
    )
    tax_rate_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Relationships
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")
    tax_rate: Mapped[Optional["TaxRate"]] = relationship("TaxRate")
    product_variant: Mapped[Optional["ProductVariant"]] = relationship("ProductVariant")

    def __repr__(self) -> str:
        return f"<InvoiceLineItem id={self.id} invoice_id={self.invoice_id}>"

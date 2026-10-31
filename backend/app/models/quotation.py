"""Quotation and quotation line item models for Phase 7.

Owner: Brightloop Backend Team (Odoo Make-A-Ton 9.0)
"""

import enum
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Numeric, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.auth import User
    from app.models.catalog import Product, ProductVariant, QuotationTemplate
    from app.models.subscription import SubscriptionPlan, Subscription


class QuotationStatus(str, enum.Enum):
    """Lifecycle statuses of a sales quotation."""
    DRAFT = "draft"
    SENT = "sent"
    CONFIRMED = "confirmed"
    CONVERTED = "converted"
    EXPIRED = "expired"


class Quotation(Base, TimestampMixin):
    """Sales quotation model for prospective customer subscriptions."""
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quotation_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    plan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subscription_plans.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    template_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("quotation_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[QuotationStatus] = mapped_column(
        Enum(
            QuotationStatus,
            name="quotation_status_enum",
            native_enum=False,
            values_callable=lambda x: [item.value for item in x],
        ),
        default=QuotationStatus.DRAFT,
        nullable=False,
        index=True,
    )
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    payment_terms: Mapped[Optional[str]] = mapped_column(String(64), default="immediate", nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    terms_and_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    discount_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    tax_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    converted_subscription_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
        index=True,
    )

    # Relationships
    customer: Mapped["User"] = relationship("User")
    plan: Mapped[Optional["SubscriptionPlan"]] = relationship("SubscriptionPlan")
    template: Mapped[Optional["QuotationTemplate"]] = relationship("QuotationTemplate")
    converted_subscription: Mapped[Optional["Subscription"]] = relationship(
        "Subscription",
        foreign_keys=[converted_subscription_id],
    )
    items: Mapped[List["QuotationLineItem"]] = relationship(
        "QuotationLineItem",
        back_populates="quotation",
        cascade="all, delete-orphan",
        order_by="QuotationLineItem.id",
    )

    def __repr__(self) -> str:
        return f"<Quotation id={self.id} number={self.quotation_number} status={self.status}>"


class QuotationLineItem(Base, TimestampMixin):
    """Itemized contracted product line within a quotation."""
    __tablename__ = "quotation_line_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quotation_id: Mapped[int] = mapped_column(
        ForeignKey("quotations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    variant_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    tax_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    discount_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Relationships
    quotation: Mapped["Quotation"] = relationship("Quotation", back_populates="items")
    product: Mapped["Product"] = relationship("Product")
    variant: Mapped[Optional["ProductVariant"]] = relationship("ProductVariant")

    def __repr__(self) -> str:
        return f"<QuotationLineItem id={self.id} quotation_id={self.quotation_id} product_id={self.product_id}>"


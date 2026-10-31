"""Subscription plans, lifecycle entities, and recurring line items.

Owner: Member 3 (Subscriptions & Billing Backend)
"""

import enum
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, Numeric, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.auth import User
    from app.models.catalog import ProductVariant
    from app.models.billing import Invoice


class BillingCycle(str, enum.Enum):
    """Supported recurring billing frequencies."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"


class SubscriptionStatus(str, enum.Enum):
    """Lifecycle statuses of a customer subscription."""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class SubscriptionPlan(Base, TimestampMixin):
    """Pre-defined plan packaging billing cadence and baseline pricing."""
    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    billing_cycle: Mapped[BillingCycle] = mapped_column(
        Enum(BillingCycle, name="billing_cycle_enum", native_enum=False),
        default=BillingCycle.MONTHLY,
        nullable=False,
    )
    billing_interval_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    base_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    trial_period_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    subscriptions: Mapped[List["Subscription"]] = relationship(
        "Subscription",
        back_populates="plan",
    )

    def __repr__(self) -> str:
        return f"<SubscriptionPlan id={self.id} code={self.code}>"


class Subscription(Base, TimestampMixin):
    """Customer subscription lifecycle contract."""
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("subscription_plans.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status_enum", native_enum=False),
        default=SubscriptionStatus.DRAFT,
        nullable=False,
        index=True,
    )
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    trial_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    paused_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    customer: Mapped["User"] = relationship("User", back_populates="subscriptions")
    plan: Mapped["SubscriptionPlan"] = relationship("SubscriptionPlan", back_populates="subscriptions")
    items: Mapped[List["SubscriptionItem"]] = relationship(
        "SubscriptionItem",
        back_populates="subscription",
        cascade="all, delete-orphan",
    )
    invoices: Mapped[List["Invoice"]] = relationship(
        "Invoice",
        back_populates="subscription",
    )

    def __repr__(self) -> str:
        return f"<Subscription id={self.id} customer_id={self.customer_id} status={self.status}>"


class SubscriptionItem(Base, TimestampMixin):
    """Specific variant line item attached to a subscription."""
    __tablename__ = "subscription_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    subscription_id: Mapped[int] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant_id: Mapped[int] = mapped_column(
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Relationships
    subscription: Mapped["Subscription"] = relationship("Subscription", back_populates="items")
    variant: Mapped["ProductVariant"] = relationship("ProductVariant", back_populates="subscription_items")

    def __repr__(self) -> str:
        return f"<SubscriptionItem id={self.id} subscription_id={self.subscription_id} variant_id={self.variant_id}>"


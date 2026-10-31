"""Product catalog, variants, and quotation templates database models.

Owner: Member 2 (Authentication & Catalog Backend)
"""

from decimal import Decimal
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, Numeric, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.auth import User
    from app.models.subscription import SubscriptionItem, SubscriptionPlan


class Product(Base, TimestampMixin):
    """Core product entity (e.g., Brightloop Analytics Suite, Cloud Storage)."""
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    product_type: Mapped[str] = mapped_column(String(64), default="software", nullable=False)
    sales_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    cost_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    variants: Mapped[List["ProductVariant"]] = relationship(
        "ProductVariant",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductVariant.id",
    )

    def __repr__(self) -> str:
        return f"<Product id={self.id} code={self.code} name={self.name}>"


class ProductVariant(Base, TimestampMixin):
    """Specific variant or SKU of a product (e.g. Standard Seat, Pro License, Storage Tier, Odoo Brand)."""
    __tablename__ = "product_variants"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    billing_metric: Mapped[str] = mapped_column(String(64), default="seat", nullable=False)
    base_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    price_adjustment: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="variants")
    subscription_items: Mapped[List["SubscriptionItem"]] = relationship(
        "SubscriptionItem",
        back_populates="variant",
    )
    template_items: Mapped[List["QuotationTemplateItem"]] = relationship(
        "QuotationTemplateItem",
        back_populates="variant",
    )

    @property
    def final_price(self) -> Decimal:
        """Calculated selling price = base product sales price + variant price adjustment surcharge."""
        base = self.product.sales_price if self.product and self.product.sales_price is not None else self.base_price
        adjustment = self.price_adjustment if self.price_adjustment is not None else Decimal("0.00")
        return (base or Decimal("0.00")) + adjustment

    def __repr__(self) -> str:
        return f"<ProductVariant id={self.id} sku={self.sku} final_price={self.final_price}>"


class QuotationTemplate(Base, TimestampMixin):
    """Reusable quotation and proposal template for enterprise customer deals."""
    __tablename__ = "quotation_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    terms_and_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    default_validity_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    plan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("subscription_plans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    created_by: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="created_quotation_templates",
    )
    plan: Mapped[Optional["SubscriptionPlan"]] = relationship(
        "SubscriptionPlan",
        back_populates="quotation_templates",
    )
    items: Mapped[List["QuotationTemplateItem"]] = relationship(
        "QuotationTemplateItem",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="QuotationTemplateItem.id",
    )

    def __repr__(self) -> str:
        return f"<QuotationTemplate id={self.id} name={self.name}>"


class QuotationTemplateItem(Base, TimestampMixin):
    """Line items configured within a reusable quotation template."""
    __tablename__ = "quotation_template_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    template_id: Mapped[int] = mapped_column(
        ForeignKey("quotation_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    variant_id: Mapped[int] = mapped_column(
        ForeignKey("product_variants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Relationships
    template: Mapped["QuotationTemplate"] = relationship("QuotationTemplate", back_populates="items")
    variant: Mapped["ProductVariant"] = relationship("ProductVariant", back_populates="template_items")

    def __repr__(self) -> str:
        return f"<QuotationTemplateItem id={self.id} template_id={self.template_id} variant_id={self.variant_id}>"

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
    from app.models.subscription import SubscriptionItem


class Product(Base, TimestampMixin):
    """Core product line (e.g., Brightloop Analytics Suite, Cloud Storage)."""
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    variants: Mapped[List["ProductVariant"]] = relationship(
        "ProductVariant",
        back_populates="product",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Product id={self.id} code={self.code}>"


class ProductVariant(Base, TimestampMixin):
    """Specific variant or SKU of a product (e.g. Standard Seat, Pro License, Storage Tier)."""
    __tablename__ = "product_variants"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    billing_metric: Mapped[str] = mapped_column(String(64), default="seat", nullable=False)
    base_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="variants")
    subscription_items: Mapped[List["SubscriptionItem"]] = relationship(
        "SubscriptionItem",
        back_populates="variant",
    )

    def __repr__(self) -> str:
        return f"<ProductVariant id={self.id} sku={self.sku}>"


class QuotationTemplate(Base, TimestampMixin):
    """Reusable quotation and proposal template for enterprise customer deals."""
    __tablename__ = "quotation_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    terms_and_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    default_validity_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    created_by: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="created_quotation_templates",
    )

    def __repr__(self) -> str:
        return f"<QuotationTemplate id={self.id} name={self.name}>"


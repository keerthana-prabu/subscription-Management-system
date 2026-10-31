"""Authentication and User database models.

Owner: Member 2 (Authentication & Catalog Backend)
"""

import enum
from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Boolean, Enum, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.subscription import Subscription
    from app.models.billing import Invoice
    from app.models.catalog import QuotationTemplate


class UserRole(str, enum.Enum):
    """User role enumeration for RBAC enforcement."""
    ADMIN = "admin"
    SALES = "sales"
    FINANCE = "finance"
    CUSTOMER = "customer"


class User(Base, TimestampMixin):
    """User entity representing authenticated system actors and customers."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role_enum", native_enum=False),
        default=UserRole.CUSTOMER,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships across domains
    subscriptions: Mapped[List["Subscription"]] = relationship(
        "Subscription",
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    invoices: Mapped[List["Invoice"]] = relationship(
        "Invoice",
        back_populates="customer",
    )
    created_quotation_templates: Mapped[List["QuotationTemplate"]] = relationship(
        "QuotationTemplate",
        back_populates="created_by",
    )
    reset_tokens: Mapped[List["PasswordResetToken"]] = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"


class PasswordResetToken(Base):
    """Password reset token entity with hashed token storage and single-use tracking."""
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="reset_tokens")

    def __repr__(self) -> str:
        return f"<PasswordResetToken id={self.id} user_id={self.user_id} used={self.used_at is not None}>"

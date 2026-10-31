"""Authentication and user account request/response schemas.

Owner: Member 2 (Authentication & Catalog Backend)
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator
from app.models.auth import UserRole
from app.core.security import validate_password_complexity


class UserRegisterRequest(BaseModel):
    """Payload to register a new customer account."""
    email: EmailStr = Field(..., examples=["developer@brightloop.io"])
    password: str = Field(..., examples=["StrongP@ssw0rd123"])
    full_name: str = Field(..., min_length=2, examples=["Alex Morgan"])
    role: Optional[UserRole] = Field(default=UserRole.CUSTOMER, examples=[UserRole.CUSTOMER])

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        validate_password_complexity(v)
        return v

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Full name must be at least 2 characters long.")
        return cleaned


class UserLoginRequest(BaseModel):
    """Payload to authenticate a user."""
    email: EmailStr = Field(..., examples=["developer@brightloop.io"])
    password: str = Field(..., examples=["StrongP@ssw0rd123"])

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class TokenResponse(BaseModel):
    """Bearer access token payload."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., examples=[86400])


class UserProfileResponse(BaseModel):
    """Public profile representation of a user."""
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StaffCreateRequest(BaseModel):
    """Payload for administrators to create staff accounts (sales or finance)."""
    email: EmailStr = Field(..., examples=["staff@brightloop.io"])
    password: str = Field(..., examples=["StaffP@ssw0rd123"])
    full_name: str = Field(..., min_length=2, examples=["Jordan Lee"])
    role: UserRole = Field(..., examples=[UserRole.SALES, UserRole.FINANCE])

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        validate_password_complexity(v)
        return v

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Full name must be at least 2 characters long.")
        return cleaned

    @field_validator("role")
    @classmethod
    def validate_staff_role(cls, v: UserRole) -> UserRole:
        if v not in (UserRole.SALES, UserRole.FINANCE):
            raise ValueError("Staff role must be either 'sales' or 'finance'.")
        return v


class ForgotPasswordRequest(BaseModel):
    """Payload to initiate a password reset."""
    email: EmailStr = Field(..., examples=["developer@brightloop.io"])

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ForgotPasswordResponse(BaseModel):
    """Response returned upon password reset request."""
    message: str = "If the email is registered, a password reset link has been sent."
    email_delivery: str = Field(
        default="pending",
        description="Delivery status: sent, smtp_unconfigured, or failed",
    )


class ResetPasswordRequest(BaseModel):
    """Payload to set a new password using a reset token."""
    token: str = Field(..., min_length=1, examples=["secure-reset-token"])
    new_password: str = Field(..., examples=["NewStrongP@ssw0rd123"])

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        validate_password_complexity(v)
        return v


class MessageResponse(BaseModel):
    """Generic message response schema."""
    message: str


class UserUpdateRequest(BaseModel):
    """Payload for updating user details."""
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None

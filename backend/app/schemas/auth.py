"""Authentication and user account request/response schemas.

Owner: Member 2 (Authentication & Catalog Backend)
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from app.models.auth import UserRole


class UserRegisterRequest(BaseModel):
    """Payload to register a new user account."""
    email: EmailStr = Field(..., examples=["developer@brightloop.io"])
    password: str = Field(..., min_length=8, examples=["StrongPassword123!"])
    full_name: str = Field(..., min_length=2, examples=["Alex Morgan"])
    role: UserRole = Field(default=UserRole.CUSTOMER, examples=[UserRole.CUSTOMER])


class UserLoginRequest(BaseModel):
    """Payload to authenticate a user."""
    email: EmailStr = Field(..., examples=["developer@brightloop.io"])
    password: str = Field(..., examples=["StrongPassword123!"])


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


class UserUpdateRequest(BaseModel):
    """Payload for updating user details."""
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None

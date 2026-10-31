"""Shared FastAPI dependencies for request authentication and role authorization."""

from typing import List, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.auth import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/token",
    auto_error=False,
)


def get_current_token_payload(token: str = Depends(oauth2_scheme)) -> dict:
    """Validate bearer token from Authorization header and return claims."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def get_current_user(
    payload: dict = Depends(get_current_token_payload),
    db: Session = Depends(get_db),
) -> User:
    """Retrieve authenticated user record matching the JWT subject claim."""
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return user


def require_roles(allowed_roles: List[Union[str, UserRole]]):
    """Role-based access control (RBAC) dependency factory.
    
    Rules:
    - Admin can manage all resources (admin role is always granted access).
    - If user's role matches any in allowed_roles, access is granted.
    - Otherwise, HTTP 403 Forbidden is raised.
    """
    allowed_strs = [r.value if isinstance(r, UserRole) else str(r) for r in allowed_roles]

    def role_checker(
        payload: dict = Depends(get_current_token_payload),
        current_user: User = Depends(get_current_user),
    ) -> User:
        user_role = current_user.role.value if isinstance(current_user.role, UserRole) else str(current_user.role)
        # Admin can manage all resources
        if user_role == UserRole.ADMIN.value or user_role in allowed_strs:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Operation not permitted. Required roles: {allowed_strs}",
        )

    return role_checker


# Role-specific reusable dependencies
require_admin = require_roles([UserRole.ADMIN])
require_sales = require_roles([UserRole.SALES])
require_finance = require_roles([UserRole.FINANCE])
require_customer = require_roles([UserRole.CUSTOMER])


def get_current_admin(user: User = Depends(require_admin)) -> User:
    """Dependency that returns the authenticated Admin user."""
    return user


def get_current_sales(user: User = Depends(require_sales)) -> User:
    """Dependency that returns the authenticated Sales or Admin user."""
    return user


def get_current_finance(user: User = Depends(require_finance)) -> User:
    """Dependency that returns the authenticated Finance or Admin user."""
    return user


def get_current_customer(user: User = Depends(require_customer)) -> User:
    """Dependency that returns the authenticated Customer or Admin user."""
    return user


def check_resource_access(current_user: User, resource_owner_id: int) -> None:
    """Ensure a customer can only access their own records, while staff/admin can access as allowed."""
    if current_user.role == UserRole.ADMIN:
        return
    if current_user.role in (UserRole.SALES, UserRole.FINANCE):
        return
    if current_user.id != resource_owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You may only access your own records.",
        )

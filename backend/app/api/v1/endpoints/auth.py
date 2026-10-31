"""Authentication, registration, and user profile endpoints.

Owner: Member 2 (Authentication & Catalog Backend)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfileResponse,
)
from app.core.dependencies import get_current_user

router = APIRouter()


@router.post(
    "/register",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user account",
)
def register_user(payload: UserRegisterRequest) -> UserProfileResponse:
    """Register a new user account. Contract defined for Member 2 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Register contract defined; implementation pending Member 2.",
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and return JWT bearer token",
)
def login_user(payload: UserLoginRequest) -> TokenResponse:
    """Authenticate credentials and generate token. Contract defined for Member 2 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Login contract defined; implementation pending Member 2.",
    )


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get authenticated user profile",
)
def get_current_user_profile(user=Depends(get_current_user)) -> UserProfileResponse:
    """Retrieve profile of authenticated user."""
    return user


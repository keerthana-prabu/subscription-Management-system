"""Authentication, registration, role-based staff provisioning, and password reset endpoints.

Owner: Member 2 (Authentication & Catalog Backend)
"""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.core.email import send_password_reset_email
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    generate_reset_token,
    hash_reset_token,
)
from app.models.auth import User, UserRole, PasswordResetToken
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfileResponse,
    StaffCreateRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    MessageResponse,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new customer account",
    description="Registers a new customer account. Public registration always assigns customer role.",
)
def register_user(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> UserProfileResponse:
    """Register a new customer account."""
    normalized_email = payload.email.strip().lower()

    # Case-insensitive duplicate email check
    existing_user = (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email)
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Public registration strictly creates a customer account
    new_user = User(
        email=normalized_email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and return JWT bearer token",
    description="Authenticates credentials against PostgreSQL and returns an expiring JWT access token.",
)
def login_user(
    payload: UserLoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate credentials and generate token."""
    normalized_email = payload.email.strip().lower()

    user = (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email)
        .first()
    )
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support.",
        )

    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_claims = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "name": user.full_name,
    }
    access_token = create_access_token(data=token_claims, expires_delta=expires_delta)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get authenticated user profile",
    description="Retrieves the profile of the authenticated user via Bearer token.",
)
def get_current_user_profile(
    user: User = Depends(get_current_user),
) -> UserProfileResponse:
    """Retrieve profile of authenticated user."""
    return user


@router.post(
    "/staff",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create staff account (Admin only)",
    description="Allows administrators to provision Sales or Finance staff accounts.",
)
def create_staff_user(
    payload: StaffCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> UserProfileResponse:
    """Admin-only endpoint to provision sales or finance staff accounts."""
    normalized_email = payload.email.strip().lower()

    existing_user = (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email)
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    staff_user = User(
        email=normalized_email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        role=payload.role,
        is_active=True,
    )
    db.add(staff_user)
    db.commit()
    db.refresh(staff_user)
    return staff_user


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    summary="Request password reset link",
    description="Generates an expiring cryptographically secure token and sends a reset link if email exists.",
)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    """Request a password reset link without leaking email existence."""
    normalized_email = payload.email.strip().lower()

    user = (
        db.query(User)
        .filter(func.lower(User.email) == normalized_email)
        .first()
    )

    delivery_status = "not_sent"

    if user and user.is_active:
        # Invalidate any previously active tokens for this user
        now_utc = datetime.now(timezone.utc)
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        ).update({"used_at": now_utc})

        # Generate cryptographically secure random token and store its hash
        raw_token = generate_reset_token()
        token_hash = hash_reset_token(raw_token)
        expires_at = now_utc + timedelta(minutes=settings.RESET_PASSWORD_EXPIRE_MINUTES)

        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db.add(reset_record)
        db.commit()

        # Send email if SMTP is configured
        _, delivery_status = send_password_reset_email(user.email, raw_token)

    # Always return identical message regardless of whether email was found
    return ForgotPasswordResponse(
        message="If the email is registered, a password reset link has been sent.",
        email_delivery=delivery_status,
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password using valid reset token",
    description="Updates the user's password if the reset token is valid, unused, and unexpired.",
)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Reset password with single-use replay protection and expiration check."""
    token_hash = hash_reset_token(payload.token)

    reset_record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )

    if not reset_record or reset_record.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used password reset token.",
        )

    # Check expiration
    now_utc = datetime.now(timezone.utc)
    if reset_record.expires_at < now_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired.",
        )

    user = db.query(User).filter(User.id == reset_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Associated user account not found.",
        )

    # Update password and mark token as used (single use enforcement)
    user.hashed_password = get_password_hash(payload.new_password)
    reset_record.used_at = now_utc
    db.commit()

    return MessageResponse(message="Password has been successfully reset.")

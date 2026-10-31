"""Subscription plans and subscription lifecycle endpoints.

Owner: Member 3 (Subscriptions & Billing Backend)
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.subscription import (
    SubscriptionPlanCreateRequest,
    SubscriptionPlanResponse,
    SubscriptionCreateRequest,
    SubscriptionResponse,
    SubscriptionStatusChangeRequest,
)
from app.core.dependencies import require_roles

router = APIRouter()


@router.get(
    "/plans",
    response_model=List[SubscriptionPlanResponse],
    summary="List available subscription plans",
)
def list_subscription_plans() -> List[SubscriptionPlanResponse]:
    """Retrieve public subscription plans. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Subscription plans contract defined; implementation pending Member 3.",
    )


@router.post(
    "/plans",
    response_model=SubscriptionPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create subscription plan (Admin only)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def create_subscription_plan(payload: SubscriptionPlanCreateRequest) -> SubscriptionPlanResponse:
    """Create subscription plan. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Plan creation contract defined; implementation pending Member 3.",
    )


@router.get(
    "/subscriptions",
    response_model=List[SubscriptionResponse],
    summary="List customer subscriptions",
)
def list_subscriptions() -> List[SubscriptionResponse]:
    """Retrieve subscriptions. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Subscription listing contract defined; implementation pending Member 3.",
    )


@router.post(
    "/subscriptions",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create subscription contract",
)
def create_subscription(payload: SubscriptionCreateRequest) -> SubscriptionResponse:
    """Provision new subscription. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Subscription creation contract defined; implementation pending Member 3.",
    )


@router.post(
    "/subscriptions/{subscription_id}/pause",
    response_model=SubscriptionResponse,
    summary="Pause active subscription",
)
def pause_subscription(subscription_id: int, payload: SubscriptionStatusChangeRequest) -> SubscriptionResponse:
    """Pause subscription. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Pause subscription contract defined; implementation pending Member 3.",
    )


@router.post(
    "/subscriptions/{subscription_id}/resume",
    response_model=SubscriptionResponse,
    summary="Resume paused subscription",
)
def resume_subscription(subscription_id: int) -> SubscriptionResponse:
    """Resume subscription. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Resume subscription contract defined; implementation pending Member 3.",
    )


@router.post(
    "/subscriptions/{subscription_id}/cancel",
    response_model=SubscriptionResponse,
    summary="Cancel subscription contract",
)
def cancel_subscription(subscription_id: int, payload: SubscriptionStatusChangeRequest) -> SubscriptionResponse:
    """Cancel subscription. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Cancel subscription contract defined; implementation pending Member 3.",
    )


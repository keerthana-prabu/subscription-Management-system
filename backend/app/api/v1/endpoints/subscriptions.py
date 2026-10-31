"""Subscription plans and subscription lifecycle endpoints.

Owner: Member 3 (Subscriptions & Billing Backend)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.subscription import BillingCycle, SubscriptionPlan
from app.schemas.subscription import (
    SubscriptionPlanCreateRequest,
    SubscriptionPlanUpdateRequest,
    SubscriptionPlanResponse,
    SubscriptionCreateRequest,
    SubscriptionResponse,
    SubscriptionStatusChangeRequest,
)

router = APIRouter()


# =========================================================================
# 1. SUBSCRIPTION PLAN MANAGEMENT (PHASE 2)
# =========================================================================

@router.get(
    "/plans",
    response_model=List[SubscriptionPlanResponse],
    summary="List available subscription plans",
    description="Retrieve subscription plans with optional filtering by active status and billing cadence.",
)
def list_subscription_plans(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    billing_cycle: Optional[BillingCycle] = Query(None, description="Filter by billing cycle"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> List[SubscriptionPlanResponse]:
    """Retrieve subscription plans from PostgreSQL."""
    query = db.query(SubscriptionPlan)

    if is_active is not None:
        query = query.filter(SubscriptionPlan.is_active == is_active)

    if billing_cycle is not None:
        query = query.filter(SubscriptionPlan.billing_cycle == billing_cycle)

    plans = query.order_by(SubscriptionPlan.id.asc()).offset(skip).limit(limit).all()
    return plans


@router.get(
    "/plans/{plan_id}",
    response_model=SubscriptionPlanResponse,
    summary="Get subscription plan by ID",
)
def get_subscription_plan(
    plan_id: int,
    db: Session = Depends(get_db),
) -> SubscriptionPlanResponse:
    """Retrieve single subscription plan details."""
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription plan with ID {plan_id} not found.",
        )
    return plan


@router.post(
    "/plans",
    response_model=SubscriptionPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create subscription plan (Admin only)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def create_subscription_plan(
    payload: SubscriptionPlanCreateRequest,
    db: Session = Depends(get_db),
) -> SubscriptionPlanResponse:
    """Create a new subscription plan with validation."""
    code_upper = payload.code.strip().upper()
    existing = db.query(SubscriptionPlan).filter(func.upper(SubscriptionPlan.code) == code_upper).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subscription plan with code '{code_upper}' already exists.",
        )

    if payload.base_price < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan base price cannot be negative.",
        )

    if payload.minimum_quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum quantity must be strictly greater than zero.",
        )

    if payload.start_date and payload.end_date:
        if payload.start_date >= payload.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plan start_date must be strictly before end_date.",
            )

    plan = SubscriptionPlan(
        name=payload.name.strip(),
        code=code_upper,
        description=payload.description,
        billing_cycle=payload.billing_cycle,
        billing_interval_count=payload.billing_interval_count,
        base_price=payload.base_price,
        currency=payload.currency,
        trial_period_days=payload.trial_period_days,
        minimum_quantity=payload.minimum_quantity,
        start_date=payload.start_date,
        end_date=payload.end_date,
        auto_close=payload.auto_close,
        allow_early_close=payload.allow_early_close,
        allow_pause=payload.allow_pause,
        allow_renewal=payload.allow_renewal,
        is_active=payload.is_active,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.patch(
    "/plans/{plan_id}",
    response_model=SubscriptionPlanResponse,
    summary="Update subscription plan (Admin only)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def update_subscription_plan(
    plan_id: int,
    payload: SubscriptionPlanUpdateRequest,
    db: Session = Depends(get_db),
) -> SubscriptionPlanResponse:
    """Modify subscription plan parameters safely."""
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription plan with ID {plan_id} not found.",
        )

    if payload.code is not None:
        code_upper = payload.code.strip().upper()
        if code_upper != plan.code:
            existing = (
                db.query(SubscriptionPlan)
                .filter(func.upper(SubscriptionPlan.code) == code_upper, SubscriptionPlan.id != plan_id)
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Subscription plan with code '{code_upper}' already exists.",
                )
            plan.code = code_upper

    if payload.name is not None:
        name_clean = payload.name.strip()
        if not name_clean:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plan name cannot be empty.")
        plan.name = name_clean

    if payload.description is not None:
        plan.description = payload.description

    if payload.billing_cycle is not None:
        plan.billing_cycle = payload.billing_cycle

    if payload.billing_interval_count is not None:
        plan.billing_interval_count = payload.billing_interval_count

    if payload.base_price is not None:
        if payload.base_price < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plan base price cannot be negative.")
        plan.base_price = payload.base_price

    if payload.currency is not None:
        plan.currency = payload.currency

    if payload.trial_period_days is not None:
        plan.trial_period_days = payload.trial_period_days

    if payload.minimum_quantity is not None:
        if payload.minimum_quantity <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Minimum quantity must be greater than zero.")
        plan.minimum_quantity = payload.minimum_quantity

    effective_start = payload.start_date if payload.start_date is not None else plan.start_date
    effective_end = payload.end_date if payload.end_date is not None else plan.end_date
    if effective_start and effective_end and effective_start >= effective_end:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plan start_date must be strictly before end_date.")

    if payload.start_date is not None:
        plan.start_date = payload.start_date
    if payload.end_date is not None:
        plan.end_date = payload.end_date

    if payload.auto_close is not None:
        plan.auto_close = payload.auto_close
    if payload.allow_early_close is not None:
        plan.allow_early_close = payload.allow_early_close
    if payload.allow_pause is not None:
        plan.allow_pause = payload.allow_pause
    if payload.allow_renewal is not None:
        plan.allow_renewal = payload.allow_renewal
    if payload.is_active is not None:
        plan.is_active = payload.is_active

    db.commit()
    db.refresh(plan)
    return plan


# =========================================================================
# 2. SUBSCRIPTION LIFECYCLE (DEFERRED TO PHASE 3)
# =========================================================================

@router.get(
    "/subscriptions",
    response_model=List[SubscriptionResponse],
    summary="List customer subscriptions",
)
def list_subscriptions() -> List[SubscriptionResponse]:
    """Retrieve subscriptions. Contract defined for Phase 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Subscription lifecycle listing contract defined; implementation pending Phase 3.",
    )


@router.post(
    "/subscriptions",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create subscription contract",
)
def create_subscription(payload: SubscriptionCreateRequest) -> SubscriptionResponse:
    """Provision new subscription. Contract defined for Phase 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Subscription provisioning contract defined; implementation pending Phase 3.",
    )


@router.post(
    "/subscriptions/{subscription_id}/pause",
    response_model=SubscriptionResponse,
    summary="Pause active subscription",
)
def pause_subscription(subscription_id: int, payload: SubscriptionStatusChangeRequest) -> SubscriptionResponse:
    """Pause subscription. Contract defined for Phase 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Pause subscription contract defined; implementation pending Phase 3.",
    )


@router.post(
    "/subscriptions/{subscription_id}/resume",
    response_model=SubscriptionResponse,
    summary="Resume paused subscription",
)
def resume_subscription(subscription_id: int) -> SubscriptionResponse:
    """Resume subscription. Contract defined for Phase 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Resume subscription contract defined; implementation pending Phase 3.",
    )


@router.post(
    "/subscriptions/{subscription_id}/cancel",
    response_model=SubscriptionResponse,
    summary="Cancel subscription contract",
)
def cancel_subscription(subscription_id: int, payload: SubscriptionStatusChangeRequest) -> SubscriptionResponse:
    """Cancel subscription. Contract defined for Phase 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Cancel subscription contract defined; implementation pending Phase 3.",
    )

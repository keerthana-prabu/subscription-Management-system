"""Subscription plans and subscription lifecycle endpoints.

Owner: Member 3 (Subscriptions & Billing Backend)
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.auth import User, UserRole
from app.models.subscription import BillingCycle, SubscriptionPlan, Subscription, SubscriptionItem, SubscriptionStatus
from app.models.catalog import ProductVariant
from app.core.billing_engine import advance_billing_period, quantize_money
from app.schemas.subscription import (
    SubscriptionPlanCreateRequest,
    SubscriptionPlanUpdateRequest,
    SubscriptionPlanResponse,
    SubscriptionCreateRequest,
    SubscriptionResponse,
    SubscriptionStatusChangeRequest,
    SubscriptionItemResponse,
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
# 2. SUBSCRIPTION LIFECYCLE
# =========================================================================

@router.get(
    "",
    response_model=List[SubscriptionResponse],
    summary="List customer subscriptions",
)
@router.get(
    "/",
    response_model=List[SubscriptionResponse],
    include_in_schema=False,
)
@router.get(
    "/subscriptions",
    response_model=List[SubscriptionResponse],
    include_in_schema=False,
)
def list_subscriptions(
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    status_filter: Optional[SubscriptionStatus] = Query(None, alias="status", description="Filter by status"),
    plan_id: Optional[int] = Query(None, description="Filter by plan ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[SubscriptionResponse]:
    """Retrieve subscriptions from PostgreSQL with RBAC filtering."""
    query = db.query(Subscription)

    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Subscription.customer_id == current_user.id)
    elif customer_id is not None:
        query = query.filter(Subscription.customer_id == customer_id)

    if status_filter is not None:
        query = query.filter(Subscription.status == status_filter)

    if plan_id is not None:
        query = query.filter(Subscription.plan_id == plan_id)

    return query.order_by(Subscription.id.desc()).offset(skip).limit(limit).all()


@router.get(
    "/{subscription_id}",
    response_model=SubscriptionResponse,
    summary="Get subscription by ID",
)
def get_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubscriptionResponse:
    """Retrieve details for a single subscription contract."""
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with ID {subscription_id} not found.",
        )

    if current_user.role == UserRole.CUSTOMER and sub.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You may only view your own subscriptions.",
        )

    return sub


@router.post(
    "",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create subscription contract",
)
@router.post(
    "/",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/subscriptions",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_subscription(
    payload: SubscriptionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubscriptionResponse:
    """Provision a new subscription contract in PostgreSQL."""
    # Ensure customer can only create for themselves
    if current_user.role == UserRole.CUSTOMER and payload.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customers cannot provision subscriptions for other accounts.",
        )

    customer = db.query(User).filter(User.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {payload.customer_id} not found.",
        )

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == payload.plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription plan with ID {payload.plan_id} not found.",
        )
    if not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subscription plan '{plan.name}' is inactive.",
        )

    now_utc = datetime.now(timezone.utc)
    start_dt = payload.start_date or now_utc
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)

    # Initial period
    sub = Subscription(
        customer_id=payload.customer_id,
        plan_id=payload.plan_id,
        status=SubscriptionStatus.ACTIVE,
        start_date=start_dt,
        current_period_start=start_dt,
        current_period_end=start_dt,  # temporary placeholder for advancement
        auto_renew=payload.auto_renew,
    )
    # Calculate initial period end using plan cycle
    sub.current_period_end = advance_billing_period(sub, start_dt)

    db.add(sub)
    db.flush()

    if payload.items:
        for it in payload.items:
            variant = db.query(ProductVariant).filter(ProductVariant.id == it.variant_id).first()
            if not variant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product variant with ID {it.variant_id} not found.",
                )
            price = it.unit_price if it.unit_price is not None else variant.final_price
            sub_item = SubscriptionItem(
                subscription_id=sub.id,
                variant_id=it.variant_id,
                quantity=it.quantity,
                unit_price=quantize_money(price),
            )
            db.add(sub_item)

    db.commit()
    db.refresh(sub)
    return sub


@router.post(
    "/{subscription_id}/pause",
    response_model=SubscriptionResponse,
    summary="Pause active subscription",
    dependencies=[Depends(require_roles(["admin", "sales", "finance"]))],
)
@router.post(
    "/subscriptions/{subscription_id}/pause",
    response_model=SubscriptionResponse,
    include_in_schema=False,
    dependencies=[Depends(require_roles(["admin", "sales", "finance"]))],
)
def pause_subscription(
    subscription_id: int,
    payload: Optional[SubscriptionStatusChangeRequest] = None,
    db: Session = Depends(get_db),
) -> SubscriptionResponse:
    """Pause an active subscription."""
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with ID {subscription_id} not found.",
        )

    if sub.status != SubscriptionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot pause subscription with status '{sub.status.value}'.",
        )

    sub.status = SubscriptionStatus.PAUSED
    sub.paused_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sub)
    return sub


@router.post(
    "/{subscription_id}/resume",
    response_model=SubscriptionResponse,
    summary="Resume paused subscription",
    dependencies=[Depends(require_roles(["admin", "sales", "finance"]))],
)
@router.post(
    "/subscriptions/{subscription_id}/resume",
    response_model=SubscriptionResponse,
    include_in_schema=False,
    dependencies=[Depends(require_roles(["admin", "sales", "finance"]))],
)
def resume_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
) -> SubscriptionResponse:
    """Resume a paused subscription."""
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with ID {subscription_id} not found.",
        )

    if sub.status != SubscriptionStatus.PAUSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resume subscription that is not paused (status: '{sub.status.value}').",
        )

    sub.status = SubscriptionStatus.ACTIVE
    sub.paused_at = None
    db.commit()
    db.refresh(sub)
    return sub


@router.post(
    "/{subscription_id}/cancel",
    response_model=SubscriptionResponse,
    summary="Cancel subscription contract",
    dependencies=[Depends(require_roles(["admin", "sales", "finance"]))],
)
@router.post(
    "/subscriptions/{subscription_id}/cancel",
    response_model=SubscriptionResponse,
    include_in_schema=False,
    dependencies=[Depends(require_roles(["admin", "sales", "finance"]))],
)
def cancel_subscription(
    subscription_id: int,
    payload: Optional[SubscriptionStatusChangeRequest] = None,
    db: Session = Depends(get_db),
) -> SubscriptionResponse:
    """Cancel a subscription contract."""
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with ID {subscription_id} not found.",
        )

    if sub.status == SubscriptionStatus.CANCELLED:
        return sub

    sub.status = SubscriptionStatus.CANCELLED
    sub.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sub)
    return sub

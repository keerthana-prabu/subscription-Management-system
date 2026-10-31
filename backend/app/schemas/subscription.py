"""Subscription plans, lifecycle, and recurring line item schemas.

Owner: Member 3 (Subscriptions & Billing Backend)
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.models.subscription import BillingCycle, SubscriptionStatus


class SubscriptionPlanBase(BaseModel):
    name: str = Field(..., examples=["Growth Plan"])
    code: str = Field(..., examples=["PLAN-GROWTH-M"])
    description: Optional[str] = None
    billing_cycle: BillingCycle = Field(default=BillingCycle.MONTHLY, examples=[BillingCycle.MONTHLY])
    billing_interval_count: int = Field(default=1, ge=1)
    base_price: Decimal = Field(..., ge=0, examples=[199.00])
    currency: str = Field(default="USD", min_length=3, max_length=3)
    trial_period_days: int = Field(default=0, ge=0)
    minimum_quantity: int = Field(default=1, ge=1, description="Minimum subscription seat/quantity required")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    auto_close: bool = False
    allow_early_close: bool = True
    allow_pause: bool = True
    allow_renewal: bool = True
    is_active: bool = True


class SubscriptionPlanCreateRequest(SubscriptionPlanBase):
    """Payload to create a subscription plan."""
    @model_validator(mode="after")
    def validate_plan_dates(self) -> "SubscriptionPlanCreateRequest":
        if self.start_date and self.end_date:
            if self.start_date >= self.end_date:
                raise ValueError("Plan start_date must be strictly before end_date.")
        if self.minimum_quantity <= 0:
            raise ValueError("Minimum quantity must be greater than zero.")
        return self


class SubscriptionPlanUpdateRequest(BaseModel):
    """Payload to modify an existing subscription plan."""
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    billing_cycle: Optional[BillingCycle] = None
    billing_interval_count: Optional[int] = Field(None, ge=1)
    base_price: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    trial_period_days: Optional[int] = Field(None, ge=0)
    minimum_quantity: Optional[int] = Field(None, ge=1)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    auto_close: Optional[bool] = None
    allow_early_close: Optional[bool] = None
    allow_pause: Optional[bool] = None
    allow_renewal: Optional[bool] = None
    is_active: Optional[bool] = None

    @model_validator(mode="after")
    def validate_update_dates(self) -> "SubscriptionPlanUpdateRequest":
        if self.start_date and self.end_date:
            if self.start_date >= self.end_date:
                raise ValueError("Plan start_date must be strictly before end_date.")
        if self.minimum_quantity is not None and self.minimum_quantity <= 0:
            raise ValueError("Minimum quantity must be greater than zero.")
        return self


class SubscriptionPlanResponse(SubscriptionPlanBase):
    """Subscription plan output schema."""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubscriptionItemInput(BaseModel):
    variant_id: int = Field(..., examples=[1])
    quantity: int = Field(default=1, ge=1)
    unit_price: Optional[Decimal] = None  # Inherited from variant if omitted


class SubscriptionItemResponse(BaseModel):
    id: int
    subscription_id: int
    variant_id: int
    quantity: int
    unit_price: Decimal

    model_config = ConfigDict(from_attributes=True)


class SubscriptionCreateRequest(BaseModel):
    """Payload to create a new subscription."""
    customer_id: int = Field(..., examples=[1])
    plan_id: int = Field(..., examples=[1])
    start_date: Optional[datetime] = None  # Defaults to now
    items: Optional[List[SubscriptionItemInput]] = None
    auto_renew: bool = True


class SubscriptionStatusChangeRequest(BaseModel):
    """Payload to transition subscription state (pause, resume, cancel)."""
    reason: Optional[str] = Field(None, examples=["Customer request"])


class SubscriptionResponse(BaseModel):
    """Detailed subscription lifecycle schema."""
    id: int
    customer_id: int
    plan_id: int
    status: SubscriptionStatus
    start_date: datetime
    current_period_start: datetime
    current_period_end: datetime
    trial_end: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    auto_renew: bool
    items: List[SubscriptionItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

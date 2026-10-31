"""Quotation management and subscription conversion endpoints for Phase 7.

Owner: Brightloop Backend Team (Odoo Make-A-Ton 9.0)
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.billing_engine import quantize_money, advance_billing_period
from app.models.auth import User, UserRole
from app.models.catalog import Product, ProductVariant, QuotationTemplate
from app.models.subscription import SubscriptionPlan, Subscription, SubscriptionItem, SubscriptionStatus
from app.models.quotation import Quotation, QuotationLineItem, QuotationStatus
from app.schemas.quotation import (
    QuotationCreateRequest,
    QuotationUpdateRequest,
    QuotationResponse,
    QuotationLineItemResponse,
)
from app.schemas.subscription import SubscriptionResponse, SubscriptionItemResponse

router = APIRouter()


def _build_quotation_response(quotation: Quotation) -> QuotationResponse:
    """Helper to transform ORM Quotation into rich QuotationResponse."""
    items_out = []
    for it in quotation.items:
        prod_name = it.product.name if it.product else "Product"
        var_name = it.variant.name if it.variant else None
        sku = it.variant.sku if it.variant else (it.product.code if it.product else "SKU-UNKNOWN")
        items_out.append(
            QuotationLineItemResponse(
                id=it.id,
                quotation_id=it.quotation_id,
                product_id=it.product_id,
                product_name=prod_name,
                variant_id=it.variant_id,
                variant_name=var_name,
                sku=sku,
                description=it.description,
                quantity=it.quantity,
                unit_price=it.unit_price,
                tax_percentage=it.tax_percentage,
                discount_percentage=it.discount_percentage,
                subtotal=it.subtotal,
                tax_amount=it.tax_amount,
                total_amount=it.total_amount,
            )
        )

    return QuotationResponse(
        id=quotation.id,
        quotation_number=quotation.quotation_number,
        customer_id=quotation.customer_id,
        customer_name=quotation.customer.full_name if quotation.customer else "",
        customer_email=quotation.customer.email if quotation.customer else "",
        plan_id=quotation.plan_id,
        plan_name=quotation.plan.name if quotation.plan else None,
        template_id=quotation.template_id,
        template_name=quotation.template.name if quotation.template else None,
        status=quotation.status,
        valid_until=quotation.valid_until,
        notes=quotation.notes,
        terms_and_conditions=quotation.terms_and_conditions,
        payment_terms=quotation.payment_terms,
        currency=quotation.currency,
        subtotal=quotation.subtotal,
        discount_total=quotation.discount_total,
        tax_total=quotation.tax_total,
        total_amount=quotation.total_amount,
        items=items_out,
        converted_subscription_id=quotation.converted_subscription_id,
        created_at=quotation.created_at,
        updated_at=quotation.updated_at,
    )


def _build_subscription_response(sub: Subscription) -> SubscriptionResponse:
    """Helper to build complete SubscriptionResponse with joined customer and item details."""
    sub_items = []
    items_subtotal = Decimal("0.00")
    for it in sub.items:
        var_sku = it.variant.sku if it.variant else "SKU-UNKNOWN"
        var_name = it.variant.name if it.variant else None
        prod_name = it.variant.product.name if it.variant and it.variant.product else None
        item_sub = quantize_money(Decimal(str(it.quantity)) * it.unit_price)
        items_subtotal += item_sub
        sub_items.append(
            SubscriptionItemResponse(
                id=it.id,
                subscription_id=it.subscription_id,
                variant_id=it.variant_id,
                quantity=it.quantity,
                unit_price=it.unit_price,
                product_name=prod_name,
                variant_name=var_name,
                sku=var_sku,
                subtotal=item_sub,
            )
        )

    base_subtotal = quantize_money(sub.plan.base_price) if sub.plan else Decimal("0.00")
    total_val = base_subtotal + items_subtotal

    return SubscriptionResponse(
        id=sub.id,
        subscription_number=f"SUB-{sub.id:05d}",
        customer_id=sub.customer_id,
        customer_name=sub.customer.full_name if sub.customer else None,
        customer_email=sub.customer.email if sub.customer else None,
        plan_id=sub.plan_id,
        plan_name=sub.plan.name if sub.plan else None,
        plan_code=sub.plan.code if sub.plan else None,
        billing_cycle=sub.plan.billing_cycle if sub.plan else None,
        status=sub.status,
        start_date=sub.start_date,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        next_billing_date=sub.current_period_end,
        trial_end=sub.trial_end,
        paused_at=sub.paused_at,
        cancelled_at=sub.cancelled_at,
        auto_renew=sub.auto_renew,
        currency=sub.plan.currency if sub.plan else "USD",
        subtotal=total_val,
        tax_total=Decimal("0.00"),
        total_amount=total_val,
        related_quotation_id=sub.quotation_id,
        items=sub_items,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )


# =========================================================================
# 1. LIST QUOTATIONS
# =========================================================================

@router.get(
    "",
    response_model=List[QuotationResponse],
    summary="List sales quotations",
    dependencies=[Depends(require_roles(["admin", "sales", "finance", "customer"]))],
)
@router.get(
    "/",
    response_model=List[QuotationResponse],
    include_in_schema=False,
    dependencies=[Depends(require_roles(["admin", "sales", "finance", "customer"]))],
)
def list_quotations(
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    status_filter: Optional[QuotationStatus] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search quotation number"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[QuotationResponse]:
    """Retrieve quotations from PostgreSQL with customer scoping."""
    query = (
        db.query(Quotation)
        .options(
            joinedload(Quotation.customer),
            joinedload(Quotation.plan),
            joinedload(Quotation.template),
            joinedload(Quotation.items).joinedload(QuotationLineItem.product),
            joinedload(Quotation.items).joinedload(QuotationLineItem.variant),
        )
    )

    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Quotation.customer_id == current_user.id)
    elif customer_id is not None:
        query = query.filter(Quotation.customer_id == customer_id)

    if status_filter is not None:
        query = query.filter(Quotation.status == status_filter)

    if search:
        query = query.filter(Quotation.quotation_number.ilike(f"%{search.strip()}%"))

    quotations = query.order_by(Quotation.id.desc()).offset(skip).limit(limit).all()
    return [_build_quotation_response(q) for q in quotations]


# =========================================================================
# 2. GET SINGLE QUOTATION
# =========================================================================

@router.get(
    "/{quotation_id}",
    response_model=QuotationResponse,
    summary="Get quotation by ID",
    dependencies=[Depends(require_roles(["admin", "sales", "finance", "customer"]))],
)
def get_quotation(
    quotation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuotationResponse:
    """Retrieve detailed quotation with items."""
    quotation = (
        db.query(Quotation)
        .options(
            joinedload(Quotation.customer),
            joinedload(Quotation.plan),
            joinedload(Quotation.template),
            joinedload(Quotation.items).joinedload(QuotationLineItem.product),
            joinedload(Quotation.items).joinedload(QuotationLineItem.variant),
        )
        .filter(Quotation.id == quotation_id)
        .first()
    )
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found.",
        )

    if current_user.role == UserRole.CUSTOMER and quotation.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You may only view your own quotations.",
        )

    return _build_quotation_response(quotation)


# =========================================================================
# 3. CREATE QUOTATION (Admin & Sales)
# =========================================================================

@router.post(
    "",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create sales quotation (Admin/Sales)",
    dependencies=[Depends(require_roles(["admin", "sales"]))],
)
@router.post(
    "/",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
    dependencies=[Depends(require_roles(["admin", "sales"]))],
)
def create_quotation(
    payload: QuotationCreateRequest,
    db: Session = Depends(get_db),
) -> QuotationResponse:
    """Create a new database-backed quotation with financial verification."""
    # 1. Validate customer
    customer = db.query(User).filter(User.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {payload.customer_id} not found.",
        )

    # 2. Validate plan if provided
    plan = None
    if payload.plan_id is not None:
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

    # 3. Validate template if provided
    template = None
    if payload.template_id is not None:
        template = db.query(QuotationTemplate).filter(QuotationTemplate.id == payload.template_id).first()

    # 4. Determine validity date
    now_utc = datetime.now(timezone.utc)
    if payload.valid_until:
        valid_until = payload.valid_until
        if valid_until.tzinfo is None:
            valid_until = valid_until.replace(tzinfo=timezone.utc)
    else:
        validity_days = template.default_validity_days if template else 30
        valid_until = now_utc + timedelta(days=validity_days)

    # 5. Check minimum quantity against plan requirements
    total_qty = sum(item.quantity for item in payload.items)
    if plan and plan.minimum_quantity and total_qty < plan.minimum_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total items quantity ({total_qty}) does not meet the plan's minimum quantity of {plan.minimum_quantity}.",
        )

    # 6. Generate unique quotation number
    quotation_number = f"QT-{now_utc.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    # 7. Construct quotation entity
    quotation = Quotation(
        quotation_number=quotation_number,
        customer_id=payload.customer_id,
        plan_id=payload.plan_id,
        template_id=payload.template_id,
        status=QuotationStatus.DRAFT,
        valid_until=valid_until,
        currency=payload.currency.upper(),
        payment_terms=payload.payment_terms or "immediate",
        notes=payload.notes,
        terms_and_conditions=payload.terms_and_conditions or (template.terms_and_conditions if template else None),
        subtotal=Decimal("0.00"),
        discount_total=Decimal("0.00"),
        tax_total=Decimal("0.00"),
        total_amount=Decimal("0.00"),
    )
    db.add(quotation)
    db.flush()

    # 8. Process line items with Decimal precision
    subtotal_sum = Decimal("0.00")
    discount_sum = Decimal("0.00")
    tax_sum = Decimal("0.00")
    total_sum = Decimal("0.00")

    for it in payload.items:
        if it.quantity <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Line item quantity must be at least 1.")

        product = db.query(Product).filter(Product.id == it.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {it.product_id} not found.",
            )

        variant = None
        if it.variant_id is not None:
            variant = db.query(ProductVariant).filter(
                ProductVariant.id == it.variant_id,
                ProductVariant.product_id == product.id,
            ).first()
            if not variant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product variant with ID {it.variant_id} does not belong to product {product.id}.",
                )

        # Determine price
        if it.unit_price is not None:
            unit_price = quantize_money(it.unit_price)
        elif variant is not None:
            unit_price = quantize_money(variant.final_price)
        else:
            unit_price = Decimal("0.00")

        # Decimal line calculations
        qty_dec = Decimal(str(it.quantity))
        line_base = quantize_money(qty_dec * unit_price)

        disc_pct = quantize_money(it.discount_percentage)
        disc_amt = quantize_money(line_base * (disc_pct / Decimal("100.00")))
        line_net = quantize_money(line_base - disc_amt)

        tax_pct = quantize_money(it.tax_percentage)
        tax_amt = quantize_money(line_net * (tax_pct / Decimal("100.00")))
        line_total = quantize_money(line_net + tax_amt)

        line_item = QuotationLineItem(
            quotation_id=quotation.id,
            product_id=product.id,
            variant_id=variant.id if variant else None,
            description=it.description or (variant.name if variant else product.name),
            quantity=it.quantity,
            unit_price=unit_price,
            tax_percentage=tax_pct,
            discount_percentage=disc_pct,
            subtotal=line_net,
            tax_amount=tax_amt,
            total_amount=line_total,
        )
        db.add(line_item)

        subtotal_sum += line_net
        discount_sum += disc_amt
        tax_sum += tax_amt
        total_sum += line_total

    quotation.subtotal = subtotal_sum
    quotation.discount_total = discount_sum
    quotation.tax_total = tax_sum
    quotation.total_amount = total_sum

    db.commit()

    fresh_quotation = (
        db.query(Quotation)
        .options(
            joinedload(Quotation.customer),
            joinedload(Quotation.plan),
            joinedload(Quotation.template),
            joinedload(Quotation.items).joinedload(QuotationLineItem.product),
            joinedload(Quotation.items).joinedload(QuotationLineItem.variant),
        )
        .filter(Quotation.id == quotation.id)
        .first()
    )
    return _build_quotation_response(fresh_quotation)


# =========================================================================
# 4. UPDATE QUOTATION (Admin & Sales)
# =========================================================================

@router.patch(
    "/{quotation_id}",
    response_model=QuotationResponse,
    summary="Update quotation (Admin/Sales)",
    dependencies=[Depends(require_roles(["admin", "sales"]))],
)
def update_quotation(
    quotation_id: int,
    payload: QuotationUpdateRequest,
    db: Session = Depends(get_db),
) -> QuotationResponse:
    """Modify quotation details while in DRAFT status."""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found.",
        )

    if quotation.status in (QuotationStatus.CONFIRMED, QuotationStatus.CONVERTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit quotation in '{quotation.status.value}' status.",
        )

    if payload.plan_id is not None:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == payload.plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription plan with ID {payload.plan_id} not found.",
            )
        quotation.plan_id = payload.plan_id

    if payload.valid_until is not None:
        valid_dt = payload.valid_until
        if valid_dt.tzinfo is None:
            valid_dt = valid_dt.replace(tzinfo=timezone.utc)
        quotation.valid_until = valid_dt

    if payload.notes is not None:
        quotation.notes = payload.notes
    if payload.terms_and_conditions is not None:
        quotation.terms_and_conditions = payload.terms_and_conditions
    if payload.payment_terms is not None:
        quotation.payment_terms = payload.payment_terms
    if payload.currency is not None:
        quotation.currency = payload.currency.upper()
    if payload.status is not None:
        quotation.status = payload.status

    # If items provided, re-generate items
    if payload.items is not None:
        db.query(QuotationLineItem).filter(QuotationLineItem.quotation_id == quotation.id).delete()
        subtotal_sum = Decimal("0.00")
        discount_sum = Decimal("0.00")
        tax_sum = Decimal("0.00")
        total_sum = Decimal("0.00")

        for it in payload.items:
            product = db.query(Product).filter(Product.id == it.product_id).first()
            if not product:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with ID {it.product_id} not found.")

            variant = None
            if it.variant_id is not None:
                variant = db.query(ProductVariant).filter(ProductVariant.id == it.variant_id, ProductVariant.product_id == product.id).first()

            if it.unit_price is not None:
                unit_price = quantize_money(it.unit_price)
            elif variant is not None:
                unit_price = quantize_money(variant.final_price)
            else:
                unit_price = Decimal("0.00")

            qty_dec = Decimal(str(it.quantity))
            line_base = quantize_money(qty_dec * unit_price)
            disc_pct = quantize_money(it.discount_percentage)
            disc_amt = quantize_money(line_base * (disc_pct / Decimal("100.00")))
            line_net = quantize_money(line_base - disc_amt)

            tax_pct = quantize_money(it.tax_percentage)
            tax_amt = quantize_money(line_net * (tax_pct / Decimal("100.00")))
            line_total = quantize_money(line_net + tax_amt)

            line_item = QuotationLineItem(
                quotation_id=quotation.id,
                product_id=product.id,
                variant_id=variant.id if variant else None,
                description=it.description or (variant.name if variant else product.name),
                quantity=it.quantity,
                unit_price=unit_price,
                tax_percentage=tax_pct,
                discount_percentage=disc_pct,
                subtotal=line_net,
                tax_amount=tax_amt,
                total_amount=line_total,
            )
            db.add(line_item)
            subtotal_sum += line_net
            discount_sum += disc_amt
            tax_sum += tax_amt
            total_sum += line_total

        quotation.subtotal = subtotal_sum
        quotation.discount_total = discount_sum
        quotation.tax_total = tax_sum
        quotation.total_amount = total_sum

    db.commit()

    fresh_quotation = (
        db.query(Quotation)
        .options(
            joinedload(Quotation.customer),
            joinedload(Quotation.plan),
            joinedload(Quotation.template),
            joinedload(Quotation.items).joinedload(QuotationLineItem.product),
            joinedload(Quotation.items).joinedload(QuotationLineItem.variant),
        )
        .filter(Quotation.id == quotation.id)
        .first()
    )
    return _build_quotation_response(fresh_quotation)


# =========================================================================
# 5. CONFIRM QUOTATION (Admin & Sales)
# =========================================================================

@router.post(
    "/{quotation_id}/confirm",
    response_model=QuotationResponse,
    summary="Confirm quotation (Admin/Sales)",
    dependencies=[Depends(require_roles(["admin", "sales"]))],
)
def confirm_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
) -> QuotationResponse:
    """Transition quotation to CONFIRMED status after validating expiry."""
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found.",
        )

    if quotation.status == QuotationStatus.CONVERTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quotation has already been converted to a subscription.",
        )

    now_utc = datetime.now(timezone.utc)
    if quotation.valid_until < now_utc:
        quotation.status = QuotationStatus.EXPIRED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quotation {quotation.quotation_number} has expired on {quotation.valid_until.isoformat()} and cannot be confirmed.",
        )

    quotation.status = QuotationStatus.CONFIRMED
    db.commit()

    fresh_quotation = (
        db.query(Quotation)
        .options(
            joinedload(Quotation.customer),
            joinedload(Quotation.plan),
            joinedload(Quotation.template),
            joinedload(Quotation.items).joinedload(QuotationLineItem.product),
            joinedload(Quotation.items).joinedload(QuotationLineItem.variant),
        )
        .filter(Quotation.id == quotation.id)
        .first()
    )
    return _build_quotation_response(fresh_quotation)


# =========================================================================
# 6. ATOMIC CONVERSION TO SUBSCRIPTION (Admin & Sales)
# =========================================================================

@router.post(
    "/{quotation_id}/convert",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Convert confirmed quotation into subscription (Admin/Sales)",
    dependencies=[Depends(require_roles(["admin", "sales"]))],
)
def convert_quotation_to_subscription(
    quotation_id: int,
    db: Session = Depends(get_db),
) -> SubscriptionResponse:
    """Convert a confirmed quotation into an active subscription atomically.
    
    Prevents duplicate conversion via database-level uniqueness and transaction locks.
    """
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id)
        .with_for_update()
        .first()
    )
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {quotation_id} not found.",
        )

    # Validate conversion readiness
    if quotation.converted_subscription_id is not None or quotation.status == QuotationStatus.CONVERTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quotation {quotation.quotation_number} has already been converted to subscription ID {quotation.converted_subscription_id}.",
        )

    if quotation.status != QuotationStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only CONFIRMED quotations can be converted (current status: '{quotation.status.value}').",
        )

    now_utc = datetime.now(timezone.utc)
    if quotation.valid_until < now_utc:
        quotation.status = QuotationStatus.EXPIRED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quotation has expired and cannot be converted.",
        )

    if not quotation.plan_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quotation does not have an associated subscription plan.",
        )

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == quotation.plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription plan with ID {quotation.plan_id} not found.",
        )

    try:
        # Create Subscription in PostgreSQL
        sub = Subscription(
            customer_id=quotation.customer_id,
            plan_id=quotation.plan_id,
            status=SubscriptionStatus.ACTIVE,
            start_date=now_utc,
            current_period_start=now_utc,
            current_period_end=now_utc,
            auto_renew=True,
            quotation_id=quotation.id,
        )
        sub.current_period_end = advance_billing_period(sub, now_utc)
        db.add(sub)
        db.flush()

        # Copy line items into SubscriptionItems, preserving agreed contracted prices
        for item in quotation.items:
            # If variant is missing, pick the first active variant of the product
            variant_id = item.variant_id
            if variant_id is None:
                first_variant = (
                    db.query(ProductVariant)
                    .filter(ProductVariant.product_id == item.product_id, ProductVariant.is_active == True)
                    .first()
                )
                if first_variant:
                    variant_id = first_variant.id
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Product ID {item.product_id} has no active variant for subscription assignment.",
                    )

            sub_item = SubscriptionItem(
                subscription_id=sub.id,
                variant_id=variant_id,
                quantity=item.quantity,
                unit_price=quantize_money(item.unit_price),
            )
            db.add(sub_item)

        # Update quotation status and link
        quotation.status = QuotationStatus.CONVERTED
        quotation.converted_subscription_id = sub.id

        db.commit()

        # Fetch eagerly loaded subscription to build response
        created_sub = (
            db.query(Subscription)
            .options(
                joinedload(Subscription.customer),
                joinedload(Subscription.plan),
                joinedload(Subscription.items).joinedload(SubscriptionItem.variant).joinedload(ProductVariant.product),
            )
            .filter(Subscription.id == sub.id)
            .first()
        )
        return _build_subscription_response(created_sub)

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to convert quotation to subscription: {str(e)}",
        )

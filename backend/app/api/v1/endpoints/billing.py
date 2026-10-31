"""Invoices, automated recurring billing, taxes, and discount endpoints.

Owner: Member 3 (Subscriptions & Billing Backend)
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.auth import User, UserRole
from app.models.billing import Invoice, InvoiceLineItem, InvoiceStatus, TaxRate, Discount
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.catalog import ProductVariant
from app.schemas.billing import (
    InvoiceCreateRequest,
    InvoiceResponse,
    InvoiceLineItemResponse,
    CustomerSummaryResponse,
    TaxRateCreateRequest,
    TaxRateUpdateRequest,
    TaxRateResponse,
    DiscountCreateRequest,
    DiscountResponse,
    BillingRunRequest,
    BillingRunResponse,
    BillingScheduleItemResponse,
)
from app.core.billing_engine import (
    quantize_money,
    LineItemComputation,
    calculate_invoice_financials,
    generate_invoice_number,
    run_recurring_billing,
    get_billing_schedule_items,
)

router = APIRouter()


# =========================================================================
# 1. TAX RATE MANAGEMENT
# =========================================================================

@router.get(
    "/taxes",
    response_model=List[TaxRateResponse],
    summary="List tax rates",
    description="Retrieve configured tax rules. Staff can view all; customers can view active taxes.",
)
def list_tax_rates(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    country: Optional[str] = Query(None, description="Filter by country code"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[TaxRateResponse]:
    """Retrieve tax rates from PostgreSQL."""
    query = db.query(TaxRate)

    # Customers may only see active taxes
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(TaxRate.is_active == True)  # noqa: E712
    elif is_active is not None:
        query = query.filter(TaxRate.is_active == is_active)

    if country is not None:
        query = query.filter(func.upper(TaxRate.country) == country.strip().upper())

    return query.order_by(TaxRate.id.asc()).offset(skip).limit(limit).all()


@router.get(
    "/taxes/{tax_id}",
    response_model=TaxRateResponse,
    summary="Get tax rate by ID",
)
def get_tax_rate(
    tax_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaxRateResponse:
    """Retrieve details for a single tax rate."""
    tax = db.query(TaxRate).filter(TaxRate.id == tax_id).first()
    if not tax:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tax rate with ID {tax_id} not found.",
        )
    return tax


@router.post(
    "/taxes",
    response_model=TaxRateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create tax rate rule (Admin only)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def create_tax_rate(
    payload: TaxRateCreateRequest,
    db: Session = Depends(get_db),
) -> TaxRateResponse:
    """Create a new tax rate rule with validation."""
    name_clean = payload.name.strip()
    if not name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tax rate name cannot be empty.",
        )

    if payload.rate_percentage < Decimal("0.00") or payload.rate_percentage > Decimal("100.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tax rate percentage must be between 0.00 and 100.00.",
        )

    country_clean = payload.country.strip().upper() if payload.country else None

    tax = TaxRate(
        name=name_clean,
        rate_percentage=quantize_money(payload.rate_percentage),
        country=country_clean,
        is_active=payload.is_active,
    )
    db.add(tax)
    db.commit()
    db.refresh(tax)
    return tax


@router.patch(
    "/taxes/{tax_id}",
    response_model=TaxRateResponse,
    summary="Update tax rate rule (Admin only)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def update_tax_rate(
    tax_id: int,
    payload: TaxRateUpdateRequest,
    db: Session = Depends(get_db),
) -> TaxRateResponse:
    """Modify tax rate parameters safely."""
    tax = db.query(TaxRate).filter(TaxRate.id == tax_id).first()
    if not tax:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tax rate with ID {tax_id} not found.",
        )

    if payload.name is not None:
        name_clean = payload.name.strip()
        if not name_clean:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tax rate name cannot be empty.")
        tax.name = name_clean

    if payload.rate_percentage is not None:
        if payload.rate_percentage < Decimal("0.00") or payload.rate_percentage > Decimal("100.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tax rate percentage must be between 0.00 and 100.00.",
            )
        tax.rate_percentage = quantize_money(payload.rate_percentage)

    if payload.country is not None:
        tax.country = payload.country.strip().upper() if payload.country else None

    if payload.is_active is not None:
        tax.is_active = payload.is_active

    db.commit()
    db.refresh(tax)
    return tax


# =========================================================================
# 2. INVOICE MANAGEMENT
# =========================================================================

def _serialize_invoice(inv: Invoice) -> InvoiceResponse:
    """Helper to convert Invoice ORM to InvoiceResponse including computed properties."""
    customer_summary = None
    if inv.customer:
        customer_summary = CustomerSummaryResponse(
            id=inv.customer.id,
            full_name=inv.customer.full_name,
            email=inv.customer.email,
        )

    line_items = [
        InvoiceLineItemResponse(
            id=item.id,
            invoice_id=item.invoice_id,
            product_variant_id=item.product_variant_id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            tax_rate_id=item.tax_rate_id,
            tax_rate_percentage=item.tax_rate_percentage,
            tax_amount=item.tax_amount,
            subtotal=item.subtotal,
            total_amount=item.total_amount,
        )
        for item in inv.items
    ]

    # Map legacy status strings if needed
    status_val = inv.status
    if status_val == InvoiceStatus.POSTED:
        status_val = InvoiceStatus.CONFIRMED
    elif status_val == InvoiceStatus.VOID:
        status_val = InvoiceStatus.CANCELLED

    return InvoiceResponse(
        id=inv.id,
        invoice_number=inv.invoice_number,
        customer_id=inv.customer_id,
        customer=customer_summary,
        subscription_id=inv.subscription_id,
        status=status_val,
        currency=inv.currency,
        payment_terms=inv.payment_terms,
        subtotal=inv.subtotal,
        discount_total=inv.discount_total,
        tax_total=inv.tax_total,
        total_amount=inv.total_amount,
        amount_paid=inv.amount_paid,
        outstanding_balance=inv.outstanding_balance,
        is_overdue=inv.is_overdue,
        issue_date=inv.issue_date,
        due_date=inv.due_date,
        paid_at=inv.paid_at,
        billing_period_start=inv.billing_period_start,
        billing_period_end=inv.billing_period_end,
        items=line_items,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
    )


@router.get(
    "/invoices",
    response_model=List[InvoiceResponse],
    summary="List invoices",
    description="Retrieve invoices with pagination, status filters, and customer ownership enforcement.",
)
def list_invoices(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    subscription_id: Optional[int] = Query(None, description="Filter by subscription ID"),
    search: Optional[str] = Query(None, description="Search by invoice number"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[InvoiceResponse]:
    """Retrieve invoices from PostgreSQL with RBAC filtering."""
    query = db.query(Invoice)

    # Customers may only see their own invoices
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Invoice.customer_id == current_user.id)
    elif customer_id is not None:
        query = query.filter(Invoice.customer_id == customer_id)

    if subscription_id is not None:
        query = query.filter(Invoice.subscription_id == subscription_id)

    if status_filter:
        norm_status = status_filter.strip().lower()
        if norm_status == "confirmed":
            query = query.filter(or_(Invoice.status == InvoiceStatus.CONFIRMED, Invoice.status == InvoiceStatus.POSTED))
        elif norm_status == "cancelled":
            query = query.filter(or_(Invoice.status == InvoiceStatus.CANCELLED, Invoice.status == InvoiceStatus.VOID))
        else:
            query = query.filter(Invoice.status == norm_status)

    if search:
        search_clean = f"%{search.strip().upper()}%"
        query = query.filter(func.upper(Invoice.invoice_number).like(search_clean))

    invoices = query.order_by(Invoice.id.desc()).offset(skip).limit(limit).all()
    return [_serialize_invoice(inv) for inv in invoices]


@router.get(
    "/invoices/{invoice_id}",
    response_model=InvoiceResponse,
    summary="Get invoice by ID",
)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    """Retrieve a single invoice with ownership verification."""
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID {invoice_id} not found.",
        )

    # Check customer ownership
    if current_user.role == UserRole.CUSTOMER and inv.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You may only access your own invoices.",
        )

    return _serialize_invoice(inv)


@router.post(
    "/invoices",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate manual invoice (Admin/Finance)",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def create_invoice(
    payload: InvoiceCreateRequest,
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    """Create manual invoice with financial calculation and line items."""
    # 1. Validate customer exists
    customer = db.query(User).filter(User.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {payload.customer_id} not found.",
        )

    # 2. Validate subscription if provided
    if payload.subscription_id:
        sub = db.query(Subscription).filter(Subscription.id == payload.subscription_id).first()
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription with ID {payload.subscription_id} not found.",
            )

    # 3. Validate items
    if not payload.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice must contain at least one line item.",
        )

    line_computations: List[LineItemComputation] = []
    for item in payload.items:
        if item.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item quantity must be strictly greater than zero.",
            )
        if item.unit_price < Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item unit price cannot be negative.",
            )

        tax_rate_pct = Decimal("0.00")
        if item.tax_rate_id:
            tax_rate = db.query(TaxRate).filter(TaxRate.id == item.tax_rate_id).first()
            if not tax_rate:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tax rate with ID {item.tax_rate_id} not found.",
                )
            if not tax_rate.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tax rate '{tax_rate.name}' is inactive and cannot be applied.",
                )
            tax_rate_pct = tax_rate.rate_percentage

        line_computations.append(
            LineItemComputation(
                description=item.description.strip(),
                quantity=item.quantity,
                unit_price=item.unit_price,
                product_variant_id=item.product_variant_id,
                tax_rate_id=item.tax_rate_id,
                tax_rate_percentage=tax_rate_pct,
            )
        )

    # 4. Calculate financials using centralized discount-before-tax policy
    subtotal, discount_tot, tax_tot, grand_total = calculate_invoice_financials(
        line_computations,
        overall_discount=payload.discount_amount or Decimal("0.00"),
    )

    now_utc = datetime.now(timezone.utc)
    issue_dt = payload.issue_date or now_utc
    due_dt = payload.due_date or (issue_dt + timedelta(days=30))

    inv_number = generate_invoice_number()
    while db.query(Invoice).filter(Invoice.invoice_number == inv_number).first():
        inv_number = generate_invoice_number()

    invoice = Invoice(
        invoice_number=inv_number,
        customer_id=payload.customer_id,
        subscription_id=payload.subscription_id,
        status=InvoiceStatus.DRAFT,
        currency=payload.currency.upper(),
        payment_terms=payload.payment_terms,
        subtotal=subtotal,
        discount_total=discount_tot,
        tax_total=tax_tot,
        total_amount=grand_total,
        amount_paid=Decimal("0.00"),
        issue_date=issue_dt,
        due_date=due_dt,
    )
    db.add(invoice)
    db.flush()

    for comp in line_computations:
        db_item = InvoiceLineItem(
            invoice_id=invoice.id,
            product_variant_id=comp.product_variant_id,
            description=comp.description,
            quantity=comp.quantity,
            unit_price=comp.unit_price,
            tax_rate_id=comp.tax_rate_id,
            tax_rate_percentage=comp.tax_rate_percentage,
            tax_amount=comp.tax_amount,
            subtotal=comp.subtotal,
            total_amount=comp.total_amount,
        )
        db.add(db_item)

    db.commit()
    db.refresh(invoice)
    return _serialize_invoice(invoice)


@router.post(
    "/invoices/{invoice_id}/confirm",
    response_model=InvoiceResponse,
    summary="Confirm draft invoice (Admin/Finance)",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def confirm_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    """Transition invoice from draft to confirmed."""
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID {invoice_id} not found.",
        )

    if inv.status in (InvoiceStatus.CANCELLED, InvoiceStatus.VOID):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot confirm a cancelled invoice.",
        )

    if inv.status == InvoiceStatus.PAID:
        return _serialize_invoice(inv)

    inv.status = InvoiceStatus.CONFIRMED
    db.commit()
    db.refresh(inv)
    return _serialize_invoice(inv)


@router.post(
    "/invoices/{invoice_id}/cancel",
    response_model=InvoiceResponse,
    summary="Cancel eligible invoice (Admin/Finance)",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def cancel_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    """Transition eligible invoice to cancelled."""
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID {invoice_id} not found.",
        )

    # Do not allow cancellation of paid invoices
    if inv.status == InvoiceStatus.PAID or inv.amount_paid > Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel an invoice with paid balance without a formal refund workflow.",
        )

    inv.status = InvoiceStatus.CANCELLED
    db.commit()
    db.refresh(inv)
    return _serialize_invoice(inv)


@router.post(
    "/invoices/{invoice_id}/void",
    response_model=InvoiceResponse,
    summary="Void/Cancel invoice (Frontend compatibility alias)",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def void_invoice_alias(
    invoice_id: int,
    db: Session = Depends(get_db),
) -> InvoiceResponse:
    """Alias for /cancel ensuring complete frontend compatibility."""
    return cancel_invoice(invoice_id=invoice_id, db=db)


# =========================================================================
# 3. RECURRING BILLING EXECUTION & SCHEDULE
# =========================================================================

@router.post(
    "/run",
    response_model=BillingRunResponse,
    summary="Execute automated recurring billing run (Admin/Finance)",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def trigger_billing_run(
    payload: Optional[BillingRunRequest] = None,
    db: Session = Depends(get_db),
) -> BillingRunResponse:
    """Trigger recurring billing process for due active subscriptions."""
    target_dt = payload.target_date if payload else None
    sub_ids = payload.subscription_ids if payload else None
    auto_conf = payload.auto_confirm if payload else False

    result = run_recurring_billing(
        db=db,
        target_date=target_dt,
        subscription_ids=sub_ids,
        auto_confirm=auto_conf,
    )

    serialized_invoices = [_serialize_invoice(inv) for inv in result["invoices"]]

    return BillingRunResponse(
        processed=result["processed"],
        created=result["created"],
        skipped=result["skipped"],
        failed=result["failed"],
        invoices=serialized_invoices,
        errors=result["errors"],
    )


@router.get(
    "/schedule",
    response_model=List[BillingScheduleItemResponse],
    summary="Get upcoming recurring billing schedule (Admin/Finance/Sales)",
    dependencies=[Depends(require_roles(["admin", "finance", "sales"]))],
)
def get_billing_schedule(
    status_filter: Optional[SubscriptionStatus] = Query(None, alias="status", description="Filter by status"),
    target_date: Optional[datetime] = Query(None, description="Filter subscriptions due on or before date"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> List[BillingScheduleItemResponse]:
    """Retrieve list of scheduled billing intervals for subscriptions."""
    items = get_billing_schedule_items(
        db=db,
        skip=skip,
        limit=limit,
        status=status_filter,
        target_date=target_date,
    )
    return [BillingScheduleItemResponse(**item) for item in items]


# =========================================================================
# 4. DISCOUNTS (PHASE 5 PLACEHOLDER INTEGRATION)
# =========================================================================

@router.get(
    "/discounts",
    response_model=List[DiscountResponse],
    summary="List promotional discount codes",
)
def list_discounts(
    db: Session = Depends(get_db),
) -> List[DiscountResponse]:
    """Retrieve discounts from PostgreSQL."""
    return db.query(Discount).all()


@router.post(
    "/discounts",
    response_model=DiscountResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create discount coupon (Finance/Admin)",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def create_discount(
    payload: DiscountCreateRequest,
    db: Session = Depends(get_db),
) -> DiscountResponse:
    """Create discount rule placeholder."""
    code_upper = payload.code.strip().upper()
    existing = db.query(Discount).filter(Discount.code == code_upper).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Discount code '{code_upper}' already exists.",
        )

    discount = Discount(
        code=code_upper,
        discount_type=payload.discount_type,
        amount=quantize_money(payload.amount),
        valid_from=payload.valid_from,
        valid_until=payload.valid_until,
        is_active=payload.is_active,
    )
    db.add(discount)
    db.commit()
    db.refresh(discount)
    return discount

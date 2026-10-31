"""Payment execution, settlement, and refund endpoints.

Owner: Member 4 (Payments, Reports & Backend Tests)
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.auth import User, UserRole
from app.models.billing import Invoice, InvoiceStatus
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.schemas.payment import (
    PaymentCreateRequest,
    PaymentRefundRequest,
    PaymentResponse,
    FinancialSummaryResponse,
)
from app.core.billing_engine import quantize_money

router = APIRouter()


# =========================================================================
# 1. FINANCIAL RECONCILIATION & OVERDUE SUMMARY (TASK 6)
# =========================================================================

@router.get(
    "/summary",
    response_model=FinancialSummaryResponse,
    summary="Financial outstanding & overdue summary (Finance/Admin/Sales)",
    dependencies=[Depends(require_roles(["admin", "finance", "sales"]))],
)
def get_financial_summary(
    db: Session = Depends(get_db),
) -> FinancialSummaryResponse:
    """Calculate authoritative financial metrics across invoices in PostgreSQL."""
    # Exclude cancelled / void invoices
    active_invoices = (
        db.query(Invoice)
        .filter(Invoice.status.notin_([InvoiceStatus.CANCELLED, InvoiceStatus.VOID]))
        .all()
    )

    total_invoiced = Decimal("0.00")
    total_paid = Decimal("0.00")
    total_outstanding = Decimal("0.00")
    total_overdue = Decimal("0.00")

    partially_paid_count = 0
    fully_paid_count = 0
    unpaid_count = 0
    overdue_count = 0

    for inv in active_invoices:
        total_invoiced += inv.total_amount
        total_paid += inv.amount_paid
        bal = inv.outstanding_balance
        total_outstanding += bal

        if inv.amount_paid >= inv.total_amount or inv.status == InvoiceStatus.PAID:
            fully_paid_count += 1
        elif inv.amount_paid > Decimal("0.00"):
            partially_paid_count += 1
        else:
            unpaid_count += 1

        if inv.is_overdue:
            total_overdue += bal
            overdue_count += 1

    return FinancialSummaryResponse(
        total_invoiced=quantize_money(total_invoiced),
        total_paid=quantize_money(total_paid),
        total_outstanding=quantize_money(total_outstanding),
        total_overdue=quantize_money(total_overdue),
        partially_paid_count=partially_paid_count,
        fully_paid_count=fully_paid_count,
        unpaid_count=unpaid_count,
        overdue_count=overdue_count,
    )


# =========================================================================
# 2. PAYMENT RECORDING & LEDGER
# =========================================================================

@router.get(
    "/payments",
    response_model=List[PaymentResponse],
    summary="List payments",
    description="Retrieve payment transactions with customer ownership and role-based filtering.",
)
@router.get(
    "",
    response_model=List[PaymentResponse],
    include_in_schema=False,
)
def list_payments(
    invoice_id: Optional[int] = Query(None, description="Filter by invoice ID"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    status_filter: Optional[PaymentStatus] = Query(None, alias="status", description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[PaymentResponse]:
    """Retrieve payments ledger from PostgreSQL."""
    query = db.query(Payment).join(Invoice, Payment.invoice_id == Invoice.id)

    # Customer role can only view their own payments
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Invoice.customer_id == current_user.id)
    elif customer_id is not None:
        query = query.filter(Invoice.customer_id == customer_id)

    if invoice_id is not None:
        query = query.filter(Payment.invoice_id == invoice_id)

    if status_filter is not None:
        query = query.filter(Payment.status == status_filter)

    return query.order_by(Payment.id.desc()).offset(skip).limit(limit).all()


@router.get(
    "/payments/{payment_id}",
    response_model=PaymentResponse,
    summary="Get payment details",
)
@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
    include_in_schema=False,
)
def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentResponse:
    """Retrieve single payment by ID with customer ownership check."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with ID {payment_id} not found.",
        )

    # Ownership check
    if current_user.role == UserRole.CUSTOMER and payment.invoice.customer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You may only view payments for your own invoices.",
        )

    return payment


@router.post(
    "/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record payment for invoice (Finance/Admin)",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
@router.post(
    "",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def create_payment(
    payload: PaymentCreateRequest,
    db: Session = Depends(get_db),
) -> PaymentResponse:
    """Record payment transaction against an invoice with atomic reconciliation."""
    if payload.amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be strictly greater than zero.",
        )

    # 1. Lock invoice row for update to prevent concurrent race conditions
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == payload.invoice_id)
        .with_for_update()
        .first()
    )
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID {payload.invoice_id} not found.",
        )

    # 2. Reject payment against cancelled or void invoices
    if invoice.status in (InvoiceStatus.CANCELLED, InvoiceStatus.VOID):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot record payment against a cancelled or void invoice.",
        )

    # 3. Currency validation
    if payload.currency.strip().upper() != invoice.currency.strip().upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Currency mismatch: Invoice is in {invoice.currency}, but payment was submitted in {payload.currency}.",
        )

    # 4. Check for duplicate transaction reference
    if payload.transaction_reference:
        ref_clean = payload.transaction_reference.strip()
        existing_txn = (
            db.query(Payment)
            .filter(Payment.transaction_reference == ref_clean)
            .first()
        )
        if existing_txn:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment with transaction reference '{ref_clean}' already exists.",
            )
    else:
        ref_clean = f"TXN-MANUAL-{uuid.uuid4().hex[:8].upper()}"

    # 5. Overpayment prevention
    amount_to_pay = quantize_money(payload.amount)
    current_outstanding = invoice.outstanding_balance
    if amount_to_pay > current_outstanding:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount ({amount_to_pay}) exceeds outstanding invoice balance ({current_outstanding}). Overpayment is not permitted.",
        )

    # 6. Record payment
    now_utc = datetime.now(timezone.utc)
    payment = Payment(
        invoice_id=invoice.id,
        amount=amount_to_pay,
        currency=invoice.currency,
        status=PaymentStatus.SUCCEEDED,
        payment_method=payload.payment_method,
        transaction_reference=ref_clean,
        notes=payload.notes,
        paid_at=now_utc,
    )
    db.add(payment)

    # 7. Atomically reconcile invoice balance & status
    invoice.amount_paid = quantize_money(invoice.amount_paid + amount_to_pay)
    if invoice.amount_paid >= invoice.total_amount:
        invoice.status = InvoiceStatus.PAID
        invoice.paid_at = now_utc
    elif invoice.status == InvoiceStatus.DRAFT:
        # Partial settlement confirms draft invoice
        invoice.status = InvoiceStatus.CONFIRMED

    db.commit()
    db.refresh(payment)
    return payment


@router.post(
    "/payments/{payment_id}/refund",
    response_model=PaymentResponse,
    summary="Issue refund for settled payment (Finance/Admin)",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
@router.post(
    "/{payment_id}/refund",
    response_model=PaymentResponse,
    include_in_schema=False,
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def refund_payment(
    payment_id: int,
    payload: PaymentRefundRequest,
    db: Session = Depends(get_db),
) -> PaymentResponse:
    """Refund a previously settled payment and reopen invoice if necessary."""
    # 1. Lock payment row
    payment = (
        db.query(Payment)
        .filter(Payment.id == payment_id)
        .with_for_update()
        .first()
    )
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with ID {payment_id} not found.",
        )

    # 2. Check payment status
    if payment.status != PaymentStatus.SUCCEEDED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot refund payment with status '{payment.status.value}'. Only succeeded payments can be refunded.",
        )

    # 3. Lock invoice row
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == payment.invoice_id)
        .with_for_update()
        .first()
    )

    refund_amt = quantize_money(payload.amount if payload.amount is not None else payment.amount)
    if refund_amt <= Decimal("0.00") or refund_amt > payment.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Refund amount must be strictly between 0.01 and the settled payment amount ({payment.amount}).",
        )

    now_utc = datetime.now(timezone.utc)
    payment.status = PaymentStatus.REFUNDED
    payment.refunded_at = now_utc
    payment.refund_amount = refund_amt
    payment.refund_reason = payload.reason.strip()

    # 4. Reconcile invoice: reduce paid amount and reopen if it was marked paid
    invoice.amount_paid = max(Decimal("0.00"), quantize_money(invoice.amount_paid - refund_amt))
    if invoice.status == InvoiceStatus.PAID:
        invoice.status = InvoiceStatus.CONFIRMED
        invoice.paid_at = None

    db.commit()
    db.refresh(payment)
    return payment

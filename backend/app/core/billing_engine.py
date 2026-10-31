"""Automated Recurring Billing and Financial Calculation Engine.

Implements centralized monetary arithmetic, tax calculation, discount-before-tax policy,
billing period advancement (month-end, leap year, anniversary date handling),
and idempotent concurrency-safe recurring billing runs.

Owner: Member 3 (Subscriptions & Billing Backend)
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Tuple, Dict, Any
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.models.billing import Invoice, InvoiceLineItem, InvoiceStatus, TaxRate
from app.models.subscription import Subscription, SubscriptionStatus, BillingCycle


TWO_PLACES = Decimal("0.01")


def quantize_money(amount: Decimal | float | int | str) -> Decimal:
    """Quantize any numeric amount to two decimal places with standard financial ROUND_HALF_UP."""
    if amount is None:
        return Decimal("0.00")
    if not isinstance(amount, Decimal):
        amount = Decimal(str(amount))
    return amount.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


class LineItemComputation:
    """Represents a computed line item before persisting."""
    def __init__(
        self,
        description: str,
        quantity: int,
        unit_price: Decimal,
        product_variant_id: Optional[int] = None,
        tax_rate_id: Optional[int] = None,
        tax_rate_percentage: Decimal = Decimal("0.00"),
    ):
        self.description = description
        self.quantity = quantity
        self.unit_price = quantize_money(unit_price)
        self.product_variant_id = product_variant_id
        self.tax_rate_id = tax_rate_id
        self.tax_rate_percentage = quantize_money(tax_rate_percentage)
        self.subtotal = quantize_money(self.quantity * self.unit_price)
        self.discount_amount = Decimal("0.00")
        self.taxable_amount = Decimal("0.00")
        self.tax_amount = Decimal("0.00")
        self.total_amount = Decimal("0.00")


def calculate_invoice_financials(
    line_computations: List[LineItemComputation],
    overall_discount: Decimal = Decimal("0.00"),
) -> Tuple[Decimal, Decimal, Decimal, Decimal]:
    """Calculate subtotal, discount total, tax total, and grand total using discount-before-tax policy.

    Policy:
    1. Line Subtotal = Quantity × Unit Price (2-decimal rounded)
    2. Invoice Subtotal = Sum of Line Subtotals
    3. Discount is allocated proportionally across lines:
       Line Discount = (Line Subtotal / Invoice Subtotal) × Total Discount
       Taxable Line Amount = max(0, Line Subtotal - Line Discount)
    4. Line Tax Amount = Taxable Line Amount × (Tax Rate % / 100) (2-decimal rounded)
    5. Grand Total = Subtotal - Discount + Tax
    """
    overall_discount = quantize_money(overall_discount)
    subtotal_sum = sum((item.subtotal for item in line_computations), Decimal("0.00"))
    subtotal_sum = quantize_money(subtotal_sum)

    # Cap discount so it cannot exceed subtotal
    effective_discount = min(subtotal_sum, max(Decimal("0.00"), overall_discount))

    allocated_discount_sum = Decimal("0.00")
    num_items = len(line_computations)

    for i, item in enumerate(line_computations):
        if subtotal_sum > Decimal("0.00") and effective_discount > Decimal("0.00"):
            if i == num_items - 1:
                # Assign remainder to avoid 1-cent rounding drift
                item.discount_amount = quantize_money(effective_discount - allocated_discount_sum)
            else:
                proportion = item.subtotal / subtotal_sum
                item.discount_amount = quantize_money(effective_discount * proportion)
                allocated_discount_sum += item.discount_amount
        else:
            item.discount_amount = Decimal("0.00")

        # Taxable amount after discount
        item.taxable_amount = max(Decimal("0.00"), item.subtotal - item.discount_amount)

        # Tax calculation
        if item.tax_rate_percentage > Decimal("0.00"):
            tax_raw = item.taxable_amount * (item.tax_rate_percentage / Decimal("100.00"))
            item.tax_amount = quantize_money(tax_raw)
        else:
            item.tax_amount = Decimal("0.00")

        item.total_amount = quantize_money(item.taxable_amount + item.tax_amount)

    tax_sum = sum((item.tax_amount for item in line_computations), Decimal("0.00"))
    tax_sum = quantize_money(tax_sum)

    grand_total = max(Decimal("0.00"), quantize_money(subtotal_sum - effective_discount + tax_sum))

    return subtotal_sum, effective_discount, tax_sum, grand_total


def generate_invoice_number() -> str:
    """Generate a unique human-readable invoice reference."""
    now = datetime.now(timezone.utc)
    rand_suffix = uuid.uuid4().hex[:6].upper()
    return f"INV-{now.strftime('%Y%m')}-{rand_suffix}"


def advance_billing_period(
    subscription: Subscription,
    from_date: datetime,
) -> datetime:
    """Advance billing period date considering cycle frequency, interval count, month-ends, and leap years.

    Preserves original subscription start_date day-of-month anchor where applicable.
    """
    plan = subscription.plan
    interval = plan.billing_interval_count if plan and plan.billing_interval_count >= 1 else 1
    cycle = plan.billing_cycle if plan else BillingCycle.MONTHLY

    # Base date
    dt = from_date

    if cycle == BillingCycle.DAILY:
        return dt + relativedelta(days=interval)
    elif cycle == BillingCycle.WEEKLY:
        return dt + relativedelta(weeks=interval)
    elif cycle == BillingCycle.MONTHLY:
        # Check if original subscription start_date had an anchor day (e.g. 31st)
        anchor_day = subscription.start_date.day if subscription.start_date else dt.day
        # Advance by interval months
        next_dt = dt + relativedelta(months=interval)
        # Try to restore anchor day if next_dt's month allows it
        try:
            return next_dt.replace(day=anchor_day)
        except ValueError:
            # Clamps to last valid day of that month (relativedelta already does this)
            return next_dt
    elif cycle in (BillingCycle.YEARLY, BillingCycle.ANNUAL):
        anchor_day = subscription.start_date.day if subscription.start_date else dt.day
        anchor_month = subscription.start_date.month if subscription.start_date else dt.month
        next_dt = dt + relativedelta(years=interval)
        try:
            return next_dt.replace(month=anchor_month, day=anchor_day)
        except ValueError:
            # Handles Feb 29 on non-leap years
            return next_dt
    elif cycle == BillingCycle.QUARTERLY:
        return dt + relativedelta(months=3 * interval)
    else:
        # Default monthly
        return dt + relativedelta(months=interval)


def run_recurring_billing(
    db: Session,
    target_date: Optional[datetime] = None,
    subscription_ids: Optional[List[int]] = None,
    auto_confirm: bool = False,
) -> Dict[str, Any]:
    """Execute automated recurring billing run across eligible due subscriptions.

    - Identifies active due subscriptions.
    - Excludes paused, cancelled, expired, or closed subscriptions.
    - Checks plan expiration bounds.
    - Prevents duplicate invoice creation with database uniqueness safety.
    - Returns execution summary with counts.
    """
    if target_date is None:
        target_date = datetime.now(timezone.utc)
    elif target_date.tzinfo is None:
        target_date = target_date.replace(tzinfo=timezone.utc)

    # Query active subscriptions due on or before target_date
    query = (
        db.query(Subscription)
        .filter(
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.current_period_end <= target_date,
        )
    )

    if subscription_ids:
        query = query.filter(Subscription.id.in_(subscription_ids))

    candidate_subscriptions = query.order_by(Subscription.id.asc()).all()

    processed_count = 0
    created_count = 0
    skipped_count = 0
    failed_count = 0
    created_invoices: List[Invoice] = []
    errors: List[str] = []

    # Cache active tax rates
    active_taxes = db.query(TaxRate).filter(TaxRate.is_active == True).all()  # noqa: E712
    default_tax = active_taxes[0] if active_taxes else None

    for sub in candidate_subscriptions:
        processed_count += 1

        # Check subscription or plan expiry date
        if sub.plan and sub.plan.end_date:
            plan_end = sub.plan.end_date if sub.plan.end_date.tzinfo else sub.plan.end_date.replace(tzinfo=timezone.utc)
            if target_date >= plan_end:
                if sub.plan.auto_close:
                    sub.status = SubscriptionStatus.EXPIRED
                    db.commit()
                skipped_count += 1
                continue

        # Check duplicate billing for exact period
        existing_invoice = (
            db.query(Invoice)
            .filter(
                Invoice.subscription_id == sub.id,
                Invoice.billing_period_start == sub.current_period_start,
                Invoice.billing_period_end == sub.current_period_end,
            )
            .first()
        )
        if existing_invoice:
            # Already billed for this period; advance subscription date if not advanced
            sub.current_period_start = sub.current_period_end
            sub.current_period_end = advance_billing_period(sub, sub.current_period_start)
            db.commit()
            skipped_count += 1
            continue

        # Prepare line computations
        line_computations: List[LineItemComputation] = []

        # 1. Base plan price line item if applicable
        if sub.plan and sub.plan.base_price > Decimal("0.00"):
            line_computations.append(
                LineItemComputation(
                    description=f"{sub.plan.name} - Recurring Subscription",
                    quantity=sub.plan.minimum_quantity if sub.plan.minimum_quantity > 1 else 1,
                    unit_price=sub.plan.base_price,
                    product_variant_id=None,
                    tax_rate_id=default_tax.id if default_tax else None,
                    tax_rate_percentage=default_tax.rate_percentage if default_tax else Decimal("0.00"),
                )
            )

        # 2. Subscription variant line items
        for item in sub.items:
            variant_desc = f"Variant #{item.variant_id}"
            if item.variant:
                variant_desc = item.variant.name or f"SKU: {item.variant.sku}"
            line_computations.append(
                LineItemComputation(
                    description=variant_desc,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    product_variant_id=item.variant_id,
                    tax_rate_id=default_tax.id if default_tax else None,
                    tax_rate_percentage=default_tax.rate_percentage if default_tax else Decimal("0.00"),
                )
            )

        # If no items or base price, add standard subscription line item
        if not line_computations:
            line_computations.append(
                LineItemComputation(
                    description=f"Subscription #{sub.id} Service",
                    quantity=1,
                    unit_price=sub.plan.base_price if sub.plan else Decimal("0.00"),
                    product_variant_id=None,
                    tax_rate_id=default_tax.id if default_tax else None,
                    tax_rate_percentage=default_tax.rate_percentage if default_tax else Decimal("0.00"),
                )
            )

        # Calculate totals
        subtotal, discount_tot, tax_tot, grand_total = calculate_invoice_financials(line_computations)

        # Create Invoice within isolated savepoint
        savepoint = db.begin_nested()
        try:
            inv_number = generate_invoice_number()
            # Ensure number is unique
            while db.query(Invoice).filter(Invoice.invoice_number == inv_number).first():
                inv_number = generate_invoice_number()

            invoice = Invoice(
                invoice_number=inv_number,
                customer_id=sub.customer_id,
                subscription_id=sub.id,
                status=InvoiceStatus.CONFIRMED if auto_confirm else InvoiceStatus.DRAFT,
                currency=sub.plan.currency if sub.plan else "USD",
                payment_terms="Net 30",
                subtotal=subtotal,
                discount_total=discount_tot,
                tax_total=tax_tot,
                total_amount=grand_total,
                amount_paid=Decimal("0.00"),
                issue_date=target_date,
                due_date=target_date + relativedelta(days=30),
                billing_period_start=sub.current_period_start,
                billing_period_end=sub.current_period_end,
            )
            db.add(invoice)
            db.flush()

            # Create line items
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

            # Advance subscription next billing cycle
            new_period_start = sub.current_period_end
            new_period_end = advance_billing_period(sub, new_period_start)
            sub.current_period_start = new_period_start
            sub.current_period_end = new_period_end

            savepoint.commit()
            db.commit()
            db.refresh(invoice)

            created_count += 1
            created_invoices.append(invoice)
        except Exception as e:
            savepoint.rollback()
            db.rollback()
            failed_count += 1
            errors.append(f"Subscription {sub.id}: {type(e).__name__} - {str(e)}")

    return {
        "processed": processed_count,
        "created": created_count,
        "skipped": skipped_count,
        "failed": failed_count,
        "invoices": created_invoices,
        "errors": errors,
    }


def get_billing_schedule_items(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: Optional[SubscriptionStatus] = None,
    target_date: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """Retrieve upcoming scheduled billing entries for subscriptions."""
    query = db.query(Subscription)

    if status:
        query = query.filter(Subscription.status == status)

    if target_date:
        if target_date.tzinfo is None:
            target_date = target_date.replace(tzinfo=timezone.utc)
        query = query.filter(Subscription.current_period_end <= target_date)

    subscriptions = (
        query.order_by(Subscription.current_period_end.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    results = []
    for sub in subscriptions:
        # Calculate expected recurring amount
        expected_items_total = sum((item.unit_price * item.quantity for item in sub.items), Decimal("0.00"))
        plan_base = sub.plan.base_price if sub.plan else Decimal("0.00")
        expected_total = quantize_money(expected_items_total + plan_base)

        is_eligible = (
            sub.status == SubscriptionStatus.ACTIVE
            and sub.paused_at is None
            and sub.cancelled_at is None
        )

        customer_name = sub.customer.full_name if sub.customer else "Unknown"
        customer_email = sub.customer.email if sub.customer else ""

        results.append({
            "subscription_id": sub.id,
            "customer_id": sub.customer_id,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "plan_id": sub.plan_id,
            "plan_name": sub.plan.name if sub.plan else "N/A",
            "billing_cycle": sub.plan.billing_cycle.value if sub.plan else "monthly",
            "status": sub.status.value if hasattr(sub.status, "value") else str(sub.status),
            "next_billing_date": sub.current_period_end,
            "expected_amount": expected_total,
            "currency": sub.plan.currency if sub.plan else "USD",
            "is_eligible": is_eligible,
        })

    return results


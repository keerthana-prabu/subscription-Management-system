"""Financial analytics and subscription reporting calculation service.

Owner: Member 4 (Payments, Reports & Backend Tests)
"""

from datetime import datetime, date, timezone, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Any
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.models.billing import Invoice, InvoiceStatus, InvoiceLineItem
from app.models.payment import Payment, PaymentStatus
from app.models.subscription import Subscription, SubscriptionStatus, SubscriptionPlan, BillingCycle
from app.core.billing_engine import quantize_money, TWO_PLACES


def normalize_subscription_mrr(subscription: Subscription) -> Decimal:
    """Calculate normalized Monthly Recurring Revenue for a single active subscription.

    Uses actual contracted subscription line items + base plan price:
    - Daily:   Amount × 365 / 12
    - Weekly:  Amount × 52 / 12
    - Monthly: Amount
    - Quarterly: Amount / 3
    - Yearly:  Amount / 12
    """
    if subscription.status != SubscriptionStatus.ACTIVE:
        return Decimal("0.00")

    plan = subscription.plan
    cycle = plan.billing_cycle if plan else BillingCycle.MONTHLY

    # Contracted recurring amount
    contracted_amt = Decimal("0.00")
    if plan and plan.base_price > Decimal("0.00"):
        qty = plan.minimum_quantity if (plan.minimum_quantity is not None and plan.minimum_quantity > 0) else 1
        contracted_amt += plan.base_price * qty

    for item in subscription.items:
        contracted_amt += item.unit_price * item.quantity

    if contracted_amt <= Decimal("0.00"):
        return Decimal("0.00")

    # Normalization math
    if cycle == BillingCycle.DAILY:
        normalized = contracted_amt * Decimal(365) / Decimal(12)
    elif cycle == BillingCycle.WEEKLY:
        normalized = contracted_amt * Decimal(52) / Decimal(12)
    elif cycle == BillingCycle.MONTHLY:
        normalized = contracted_amt
    elif cycle == BillingCycle.QUARTERLY:
        normalized = contracted_amt / Decimal(3)
    elif cycle in (BillingCycle.YEARLY, BillingCycle.ANNUAL):
        normalized = contracted_amt / Decimal(12)
    else:
        normalized = contracted_amt

    return quantize_money(normalized)


def calculate_mrr_metrics(db: Session) -> Dict[str, Any]:
    """Calculate overall MRR, ARR, active counts, and churn rate."""
    now_utc = datetime.now(timezone.utc)
    thirty_days_ago = now_utc - timedelta(days=30)

    # Active subscriptions only for MRR
    active_subs = (
        db.query(Subscription)
        .filter(Subscription.status == SubscriptionStatus.ACTIVE)
        .all()
    )

    total_mrr = sum((normalize_subscription_mrr(sub) for sub in active_subs), Decimal("0.00"))
    total_mrr = quantize_money(total_mrr)
    arr = quantize_money(total_mrr * Decimal(12))

    active_count = len(active_subs)

    # New subscriptions in last 30 days
    new_subs_count = (
        db.query(func.count(Subscription.id))
        .filter(Subscription.created_at >= thirty_days_ago)
        .scalar()
        or 0
    )

    # Cancelled subscriptions
    cancelled_count = (
        db.query(func.count(Subscription.id))
        .filter(Subscription.status == SubscriptionStatus.CANCELLED)
        .scalar()
        or 0
    )

    # Churn rate: cancelled / (active + cancelled) * 100
    total_population = active_count + cancelled_count
    if total_population > 0:
        churn_rate = quantize_money((Decimal(cancelled_count) / Decimal(total_population)) * Decimal(100))
    else:
        churn_rate = Decimal("0.00")

    reporting_period = now_utc.strftime("%Y-%m")

    return {
        "total_mrr": total_mrr,
        "arr": arr,
        "currency": "USD",
        "active_subscriptions": active_count,
        "new_subscriptions": new_subs_count,
        "cancelled_subscriptions": cancelled_count,
        "churn_rate_percentage": churn_rate,
        "reporting_period": reporting_period,
    }


def calculate_revenue_report(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    customer_id: Optional[int] = None,
    plan_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Calculate authoritative revenue, discounts, taxes, and cash collection ledger."""
    now_utc = datetime.now(timezone.utc)
    if not end_date:
        end_date = now_utc.date()
    if not start_date:
        # Default start to 6 months ago
        start_date = (now_utc - relativedelta(months=6)).date()

    start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
    end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)

    # Query invoices excluding cancelled/void
    inv_query = (
        db.query(Invoice)
        .filter(
            Invoice.status.notin_([InvoiceStatus.CANCELLED, InvoiceStatus.VOID]),
            Invoice.created_at >= start_dt,
            Invoice.created_at <= end_dt,
        )
    )

    if customer_id is not None:
        inv_query = inv_query.filter(Invoice.customer_id == customer_id)

    if plan_id is not None:
        inv_query = inv_query.join(Subscription, Invoice.subscription_id == Subscription.id).filter(
            Subscription.plan_id == plan_id
        )

    invoices = inv_query.all()

    total_gross = Decimal("0.00")
    total_discounts = Decimal("0.00")
    total_net = Decimal("0.00")
    total_tax = Decimal("0.00")
    total_outstanding = Decimal("0.00")
    total_overdue = Decimal("0.00")

    # Time series map: "YYYY-MM" -> dict
    monthly_data: Dict[str, Dict[str, Decimal]] = {}

    for inv in invoices:
        total_gross += inv.subtotal
        total_discounts += inv.discount_total
        total_net += inv.total_amount
        total_tax += inv.tax_total

        bal = inv.outstanding_balance
        total_outstanding += bal
        if inv.is_overdue:
            total_overdue += bal

        month_key = (inv.issue_date or inv.created_at).strftime("%Y-%m")
        if month_key not in monthly_data:
            monthly_data[month_key] = {
                "gross_revenue": Decimal("0.00"),
                "net_revenue": Decimal("0.00"),
                "tax_collected": Decimal("0.00"),
                "discounts_given": Decimal("0.00"),
                "payments_collected": Decimal("0.00"),
            }
        monthly_data[month_key]["gross_revenue"] += inv.subtotal
        monthly_data[month_key]["net_revenue"] += inv.total_amount
        monthly_data[month_key]["tax_collected"] += inv.tax_total
        monthly_data[month_key]["discounts_given"] += inv.discount_total

    # Query payments in window
    pay_query = (
        db.query(Payment)
        .filter(
            Payment.created_at >= start_dt,
            Payment.created_at <= end_dt,
        )
    )
    if customer_id is not None:
        pay_query = pay_query.join(Invoice, Payment.invoice_id == Invoice.id).filter(
            Invoice.customer_id == customer_id
        )

    payments = pay_query.all()

    total_payments = Decimal("0.00")
    total_refunds = Decimal("0.00")

    for pay in payments:
        if pay.status == PaymentStatus.SUCCEEDED:
            total_payments += pay.amount
            p_month = (pay.paid_at or pay.created_at).strftime("%Y-%m")
            if p_month not in monthly_data:
                monthly_data[p_month] = {
                    "gross_revenue": Decimal("0.00"),
                    "net_revenue": Decimal("0.00"),
                    "tax_collected": Decimal("0.00"),
                    "discounts_given": Decimal("0.00"),
                    "payments_collected": Decimal("0.00"),
                }
            monthly_data[p_month]["payments_collected"] += pay.amount
        elif pay.status == PaymentStatus.REFUNDED:
            total_refunds += pay.refund_amount

    # Build chronological breakdown points
    time_series = []
    for period_key in sorted(monthly_data.keys()):
        pt = monthly_data[period_key]
        time_series.append({
            "period": period_key,
            "gross_revenue": quantize_money(pt["gross_revenue"]),
            "net_revenue": quantize_money(pt["net_revenue"]),
            "tax_collected": quantize_money(pt["tax_collected"]),
            "discounts_given": quantize_money(pt["discounts_given"]),
            "payments_collected": quantize_money(pt["payments_collected"]),
            "currency": "USD",
        })

    return {
        "start_date": start_date,
        "end_date": end_date,
        "currency": "USD",
        "total_gross_revenue": quantize_money(total_gross),
        "total_discounts": quantize_money(total_discounts),
        "total_net_revenue": quantize_money(total_net),
        "total_tax_collected": quantize_money(total_tax),
        "total_payments_collected": quantize_money(total_payments),
        "total_refunds": quantize_money(total_refunds),
        "outstanding_balance": quantize_money(total_outstanding),
        "overdue_balance": quantize_money(total_overdue),
        "breakdown_by_period": time_series,
    }


def calculate_subscription_analytics(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    plan_id: Optional[int] = None,
    status_filter: Optional[SubscriptionStatus] = None,
) -> Dict[str, Any]:
    """Calculate subscription lifecycle counts, cadence, and plan MRR distributions."""
    now_utc = datetime.now(timezone.utc)
    in_30_days = now_utc + timedelta(days=30)

    query = db.query(Subscription)

    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
        query = query.filter(Subscription.created_at >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)
        query = query.filter(Subscription.created_at <= end_dt)
    if plan_id is not None:
        query = query.filter(Subscription.plan_id == plan_id)
    if status_filter is not None:
        query = query.filter(Subscription.status == status_filter)

    subscriptions = query.all()
    total_count = len(subscriptions)

    status_dist: Dict[str, int] = {}
    cadence_dist: Dict[str, int] = {}
    plan_sub_counts: Dict[str, int] = {}

    upcoming_renewals = 0
    new_in_period = 0

    # Overall active MRR
    total_active_mrr = Decimal("0.00")
    plan_mrr_map: Dict[int, Decimal] = {}
    plan_active_count: Dict[int, int] = {}

    all_plans = {p.id: p for p in db.query(SubscriptionPlan).all()}

    for sub in subscriptions:
        s_val = sub.status.value if hasattr(sub.status, "value") else str(sub.status)
        status_dist[s_val] = status_dist.get(s_val, 0) + 1

        p_name = sub.plan.name if sub.plan else "Custom Plan"
        plan_sub_counts[p_name] = plan_sub_counts.get(p_name, 0) + 1

        cycle_val = sub.plan.billing_cycle.value if sub.plan else "monthly"
        cadence_dist[cycle_val] = cadence_dist.get(cycle_val, 0) + 1

        if sub.status == SubscriptionStatus.ACTIVE:
            sub_mrr = normalize_subscription_mrr(sub)
            total_active_mrr += sub_mrr
            plan_mrr_map[sub.plan_id] = plan_mrr_map.get(sub.plan_id, Decimal("0.00")) + sub_mrr
            plan_active_count[sub.plan_id] = plan_active_count.get(sub.plan_id, 0) + 1

            if sub.current_period_end <= in_30_days:
                upcoming_renewals += 1

        if start_date:
            new_in_period += 1
        elif sub.created_at >= (now_utc - timedelta(days=30)):
            new_in_period += 1

    by_status_list = [{"status": k, "count": v} for k, v in status_dist.items()]

    # Plan-level MRR breakdown
    plan_breakdown = []
    for pid, plan in all_plans.items():
        act_cnt = plan_active_count.get(pid, 0)
        p_mrr = quantize_money(plan_mrr_map.get(pid, Decimal("0.00")))
        pct = Decimal("0.00")
        if total_active_mrr > Decimal("0.00"):
            pct = quantize_money((p_mrr / total_active_mrr) * Decimal(100))

        plan_breakdown.append({
            "plan_id": plan.id,
            "plan_name": plan.name,
            "active_subscribers": act_cnt,
            "billing_cycle": plan.billing_cycle.value,
            "mrr_contribution": p_mrr,
            "percentage_of_total_mrr": pct,
        })

    return {
        "total_count": total_count,
        "by_status": by_status_list,
        "by_plan": plan_sub_counts,
        "status_distribution": status_dist,
        "cadence_distribution": cadence_dist,
        "plan_breakdown": plan_breakdown,
        "upcoming_renewals_30d": upcoming_renewals,
        "new_subscriptions_period": new_in_period,
    }


"""Automated tests for Phase 6:
- MRR and ARR Reporting (normalization for daily, weekly, monthly, yearly cycles)
- Inactive Subscription Exclusions (draft, paused, cancelled, expired)
- Revenue Reporting (gross, net, taxes, discounts, cash collected, refunds, overdue)
- Monthly Revenue Time-Series Grouping
- Subscription Analytics & Plan MRR Distribution
- Consolidated Executive Dashboard (/dashboard)
- Customer Portal APIs & RBAC Scoping
- Customer Subscription Self-Service (pause, resume, cancel with ownership & plan policy checks)
"""

from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auth import User, UserRole
from app.models.catalog import Product, ProductVariant
from app.models.subscription import SubscriptionPlan, Subscription, SubscriptionItem, BillingCycle, SubscriptionStatus
from app.models.billing import Invoice, InvoiceLineItem, InvoiceStatus, TaxRate
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.services.reporting_service import normalize_subscription_mrr


# =========================================================================
# 1. MRR / ARR NORMALIZATION & EXCLUSIONS
# =========================================================================

def test_mrr_normalization_across_all_cadences():
    """1. Test mathematical MRR normalization for daily, weekly, monthly, and yearly cadences."""
    now_utc = datetime.now(timezone.utc)

    # 1. Monthly: $100/mo -> MRR = $100.00
    plan_m = SubscriptionPlan(name="Monthly Plan", code="P-M", base_price=Decimal("100.00"), billing_cycle=BillingCycle.MONTHLY)
    sub_m = Subscription(customer_id=1, plan_id=1, status=SubscriptionStatus.ACTIVE, start_date=now_utc, current_period_start=now_utc, current_period_end=now_utc)
    sub_m.plan = plan_m
    assert normalize_subscription_mrr(sub_m) == Decimal("100.00")

    # 2. Daily: $10/day -> MRR = 10 * 365 / 12 = 304.17
    plan_d = SubscriptionPlan(name="Daily Plan", code="P-D", base_price=Decimal("10.00"), billing_cycle=BillingCycle.DAILY)
    sub_d = Subscription(customer_id=1, plan_id=2, status=SubscriptionStatus.ACTIVE, start_date=now_utc, current_period_start=now_utc, current_period_end=now_utc)
    sub_d.plan = plan_d
    assert normalize_subscription_mrr(sub_d) == Decimal("304.17")

    # 3. Weekly: $50/week -> MRR = 50 * 52 / 12 = 216.67
    plan_w = SubscriptionPlan(name="Weekly Plan", code="P-W", base_price=Decimal("50.00"), billing_cycle=BillingCycle.WEEKLY)
    sub_w = Subscription(customer_id=1, plan_id=3, status=SubscriptionStatus.ACTIVE, start_date=now_utc, current_period_start=now_utc, current_period_end=now_utc)
    sub_w.plan = plan_w
    assert normalize_subscription_mrr(sub_w) == Decimal("216.67")

    # 4. Yearly: $1200/yr -> MRR = 1200 / 12 = 100.00
    plan_y = SubscriptionPlan(name="Yearly Plan", code="P-Y", base_price=Decimal("1200.00"), billing_cycle=BillingCycle.YEARLY)
    sub_y = Subscription(customer_id=1, plan_id=4, status=SubscriptionStatus.ACTIVE, start_date=now_utc, current_period_start=now_utc, current_period_end=now_utc)
    sub_y.plan = plan_y
    assert normalize_subscription_mrr(sub_y) == Decimal("100.00")


def test_inactive_subscriptions_excluded_from_mrr():
    """2. Test paused, cancelled, draft, and expired subscriptions contribute $0.00 to MRR."""
    now_utc = datetime.now(timezone.utc)
    plan = SubscriptionPlan(name="Test Plan", code="P-TEST", base_price=Decimal("500.00"), billing_cycle=BillingCycle.MONTHLY)

    for st in [SubscriptionStatus.PAUSED, SubscriptionStatus.CANCELLED, SubscriptionStatus.DRAFT, SubscriptionStatus.EXPIRED]:
        sub = Subscription(customer_id=1, plan_id=1, status=st, start_date=now_utc, current_period_start=now_utc, current_period_end=now_utc)
        sub.plan = plan
        assert normalize_subscription_mrr(sub) == Decimal("0.00")


def test_mrr_and_arr_endpoint(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """3. Test GET /api/v1/reports/mrr API returning active subscriptions, MRR, ARR, and churn."""
    admin = create_user_helper(email="mrr_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    # Seed an active monthly subscription ($250.00)
    customer = create_user_helper(email="mrr_cust@brightloop.io", role=UserRole.CUSTOMER)
    plan = SubscriptionPlan(name=f"Plan-MRR-{uuid.uuid4().hex[:4]}", code=f"P-MRR-{uuid.uuid4().hex[:4]}", base_price=Decimal("250.00"), billing_cycle=BillingCycle.MONTHLY)
    db_session.add(plan)
    db_session.commit()
    db_session.refresh(plan)

    now_utc = datetime.now(timezone.utc)
    sub = Subscription(
        customer_id=customer.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        start_date=now_utc,
        current_period_start=now_utc,
        current_period_end=now_utc + timedelta(days=30),
    )
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(sub)

    res = client.get("/api/v1/reports/mrr", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert Decimal(str(data["total_mrr"])) >= Decimal("250.00")
    assert Decimal(str(data["arr"])) == Decimal(str(data["total_mrr"])) * Decimal("12")
    assert data["active_subscriptions"] >= 1
    assert "churn_rate_percentage" in data

    # Cleanup
    db_session.query(Subscription).filter(Subscription.id == sub.id).delete()
    db_session.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan.id).delete()
    db_session.commit()


# =========================================================================
# 2. REVENUE REPORTING & TIME-SERIES BREAKDOWN
# =========================================================================

def test_revenue_report_and_cash_reconciliation(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """4. Test GET /api/v1/reports/revenue with gross, net, taxes, discounts, cash collected, and refunds."""
    admin = create_user_helper(email="rev_admin@brightloop.io", role=UserRole.ADMIN)
    customer = create_user_helper(email="rev_cust@brightloop.io", role=UserRole.CUSTOMER)
    headers = auth_headers_helper(admin)

    now_utc = datetime.now(timezone.utc)

    # Create an invoice with subtotal $500, discount $50, tax $45 -> total $495
    inv = Invoice(
        invoice_number=f"INV-REV-{uuid.uuid4().hex[:6].upper()}",
        customer_id=customer.id,
        status=InvoiceStatus.CONFIRMED,
        currency="USD",
        subtotal=Decimal("500.00"),
        discount_total=Decimal("50.00"),
        tax_total=Decimal("45.00"),
        total_amount=Decimal("495.00"),
        amount_paid=Decimal("495.00"),
        due_date=now_utc + timedelta(days=15),
        created_at=now_utc,
    )
    db_session.add(inv)
    db_session.commit()
    db_session.refresh(inv)

    # Payment $495 succeeded
    pay = Payment(
        invoice_id=inv.id,
        amount=Decimal("495.00"),
        currency="USD",
        status=PaymentStatus.SUCCEEDED,
        payment_method=PaymentMethod.BANK_TRANSFER,
        paid_at=now_utc,
        created_at=now_utc,
    )
    db_session.add(pay)
    db_session.commit()
    db_session.refresh(pay)

    # Refund $95
    pay_refund = Payment(
        invoice_id=inv.id,
        amount=Decimal("95.00"),
        currency="USD",
        status=PaymentStatus.REFUNDED,
        payment_method=PaymentMethod.BANK_TRANSFER,
        refund_amount=Decimal("95.00"),
        refund_reason="SLA Adjustment",
        refunded_at=now_utc,
        created_at=now_utc,
    )
    db_session.add(pay_refund)
    db_session.commit()
    db_session.refresh(pay_refund)

    res = client.get("/api/v1/reports/revenue", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert Decimal(str(data["total_gross_revenue"])) >= Decimal("500.00")
    assert Decimal(str(data["total_discounts"])) >= Decimal("50.00")
    assert Decimal(str(data["total_net_revenue"])) >= Decimal("495.00")
    assert Decimal(str(data["total_tax_collected"])) >= Decimal("45.00")
    assert Decimal(str(data["total_payments_collected"])) >= Decimal("495.00")
    assert Decimal(str(data["total_refunds"])) >= Decimal("95.00")
    assert isinstance(data["breakdown_by_period"], list)
    assert len(data["breakdown_by_period"]) > 0

    # Cleanup
    db_session.query(Payment).filter(Payment.invoice_id == inv.id).delete()
    db_session.query(Invoice).filter(Invoice.id == inv.id).delete()
    db_session.commit()


# =========================================================================
# 3. SUBSCRIPTION ANALYTICS & EXECUTIVE DASHBOARD
# =========================================================================

def test_subscription_analytics_report(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """5. Test GET /api/v1/reports/subscriptions returning status, cadence, and plan-level MRR distribution."""
    admin = create_user_helper(email="sub_rep_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    res = client.get("/api/v1/reports/subscriptions", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_count" in data
    assert "by_status" in data
    assert "by_plan" in data
    assert "cadence_distribution" in data
    assert "plan_breakdown" in data
    assert "upcoming_renewals_30d" in data


def test_executive_dashboard_endpoint(client: TestClient, create_user_helper, auth_headers_helper):
    """6. Test GET /api/v1/reports/dashboard consolidated metrics for Dashboard.tsx."""
    admin = create_user_helper(email="dash_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    res = client.get("/api/v1/reports/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "active_subscriptions" in data
    assert "mrr" in data
    assert "arr" in data
    assert "total_invoiced" in data
    assert "total_collected" in data
    assert "total_outstanding" in data
    assert "total_overdue" in data
    assert "recent_invoices" in data
    assert "recent_payments" in data
    assert len(data["recent_invoices"]) <= 5
    assert len(data["recent_payments"]) <= 5


# =========================================================================
# 4. CUSTOMER PORTAL APIS & RBAC RESTRICTIONS
# =========================================================================

def test_customer_portal_isolation_and_ownership(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """7. Test customer portal APIs: customer sees only own data and cannot call manual settlement."""
    customer_a = create_user_helper(email="portal_a@brightloop.io", role=UserRole.CUSTOMER)
    customer_b = create_user_helper(email="portal_b@brightloop.io", role=UserRole.CUSTOMER)
    admin = create_user_helper(email="portal_admin@brightloop.io", role=UserRole.ADMIN)

    headers_a = auth_headers_helper(customer_a)
    headers_b = auth_headers_helper(customer_b)
    headers_admin = auth_headers_helper(admin)

    # 1. GET /api/v1/auth/me returns current user
    me_a = client.get("/api/v1/auth/me", headers=headers_a)
    assert me_a.status_code == 200
    assert me_a.json()["email"] == "portal_a@brightloop.io"
    assert me_a.json()["role"] == "customer"

    # 2. Customer cannot view reporting endpoints (403 Forbidden)
    assert client.get("/api/v1/reports/mrr", headers=headers_a).status_code == 403
    assert client.get("/api/v1/reports/revenue", headers=headers_a).status_code == 403
    assert client.get("/api/v1/reports/dashboard", headers=headers_a).status_code == 403

    # 3. Customer cannot record manual payment settlements (403 Forbidden)
    assert client.post("/api/v1/payments/payments", json={"invoice_id": 1, "amount": 10.00}, headers=headers_a).status_code == 403

    # 4. Invoice ownership scoping
    inv_a = Invoice(
        invoice_number=f"INV-PORT-A-{uuid.uuid4().hex[:6].upper()}",
        customer_id=customer_a.id,
        status=InvoiceStatus.CONFIRMED,
        currency="USD",
        subtotal=Decimal("100.00"),
        total_amount=Decimal("100.00"),
        amount_paid=Decimal("0.00"),
        due_date=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db_session.add(inv_a)
    db_session.commit()
    db_session.refresh(inv_a)

    # Customer A can view own invoice
    assert client.get(f"/api/v1/billing/invoices/{inv_a.id}", headers=headers_a).status_code == 200
    # Customer B cannot view Customer A's invoice (403 Forbidden)
    assert client.get(f"/api/v1/billing/invoices/{inv_a.id}", headers=headers_b).status_code == 403

    # Cleanup
    db_session.query(Invoice).filter(Invoice.id == inv_a.id).delete()
    db_session.commit()


# =========================================================================
# 5. CUSTOMER SUBSCRIPTION SELF-SERVICE
# =========================================================================

def test_customer_subscription_self_service_lifecycle(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """8. Test customer can pause, resume, and cancel own subscription if plan allows, but cannot touch another's."""
    customer_a = create_user_helper(email="self_a@brightloop.io", role=UserRole.CUSTOMER)
    customer_b = create_user_helper(email="self_b@brightloop.io", role=UserRole.CUSTOMER)
    admin = create_user_helper(email="self_admin@brightloop.io", role=UserRole.ADMIN)

    headers_a = auth_headers_helper(customer_a)
    headers_b = auth_headers_helper(customer_b)
    headers_admin = auth_headers_helper(admin)

    # Create plan that allows pause and early close
    plan = SubscriptionPlan(
        name=f"Self-Plan-{uuid.uuid4().hex[:4]}",
        code=f"P-SELF-{uuid.uuid4().hex[:4]}",
        base_price=Decimal("80.00"),
        billing_cycle=BillingCycle.MONTHLY,
        allow_pause=True,
        allow_early_close=True,
        is_active=True,
    )
    # Create plan that disallows pause
    no_pause_plan = SubscriptionPlan(
        name=f"No-Pause-{uuid.uuid4().hex[:4]}",
        code=f"P-NOPAUSE-{uuid.uuid4().hex[:4]}",
        base_price=Decimal("120.00"),
        billing_cycle=BillingCycle.MONTHLY,
        allow_pause=False,
        is_active=True,
    )
    db_session.add_all([plan, no_pause_plan])
    db_session.commit()
    db_session.refresh(plan)
    db_session.refresh(no_pause_plan)

    now_utc = datetime.now(timezone.utc)
    # Sub A (Customer A)
    sub_a = Subscription(
        customer_id=customer_a.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        start_date=now_utc,
        current_period_start=now_utc,
        current_period_end=now_utc + timedelta(days=30),
    )
    # Sub B (Customer B)
    sub_b = Subscription(
        customer_id=customer_b.id,
        plan_id=no_pause_plan.id,
        status=SubscriptionStatus.ACTIVE,
        start_date=now_utc,
        current_period_start=now_utc,
        current_period_end=now_utc + timedelta(days=30),
    )
    db_session.add_all([sub_a, sub_b])
    db_session.commit()
    db_session.refresh(sub_a)
    db_session.refresh(sub_b)

    # 1. Customer B attempts to pause Customer A's subscription -> 403 Forbidden
    res_hack = client.post(f"/api/v1/subscriptions/{sub_a.id}/pause", headers=headers_b)
    assert res_hack.status_code == 403

    # 2. Customer A pauses own subscription -> 200 OK
    res_pause = client.post(f"/api/v1/subscriptions/{sub_a.id}/pause", headers=headers_a)
    assert res_pause.status_code == 200
    assert res_pause.json()["status"] == "paused"

    # 3. Customer A resumes own subscription -> 200 OK
    res_resume = client.post(f"/api/v1/subscriptions/{sub_a.id}/resume", headers=headers_a)
    assert res_resume.status_code == 200
    assert res_resume.json()["status"] == "active"

    # 4. Customer B tries to pause subscription on no_pause_plan -> 400 Bad Request
    res_no_pause = client.post(f"/api/v1/subscriptions/{sub_b.id}/pause", headers=headers_b)
    assert res_no_pause.status_code == 400
    assert "not allow pausing" in res_no_pause.json()["detail"].lower()

    # 5. Customer A cancels own subscription -> 200 OK
    res_cancel = client.post(f"/api/v1/subscriptions/{sub_a.id}/cancel", headers=headers_a)
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "cancelled"

    # Cleanup
    db_session.query(Subscription).filter(Subscription.id.in_([sub_a.id, sub_b.id])).delete()
    db_session.query(SubscriptionPlan).filter(SubscriptionPlan.id.in_([plan.id, no_pause_plan.id])).delete()
    db_session.commit()


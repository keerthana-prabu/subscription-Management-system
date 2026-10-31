"""Automated tests for Phase 4:
- Tax Management (CRUD, admin-only authorization, rate validation)
- Invoice Management (creation, subtotal, tax calculation, total rounding, status transitions)
- Customer-specific invoice access & RBAC
- Automated Recurring Billing (daily, weekly, monthly, yearly cycles)
- Month-end and leap-year transition logic
- Paused and expired subscription exclusions
- Concurrency and duplicate billing prevention (idempotency)
- Billing execution (/run) and schedule (/schedule) endpoints
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from dateutil.relativedelta import relativedelta

from app.models.auth import User, UserRole
from app.models.catalog import Product, ProductVariant
from app.models.subscription import SubscriptionPlan, Subscription, SubscriptionItem, BillingCycle, SubscriptionStatus
from app.models.billing import Invoice, InvoiceLineItem, InvoiceStatus, TaxRate
from app.core.billing_engine import (
    quantize_money,
    advance_billing_period,
    calculate_invoice_financials,
    LineItemComputation,
    run_recurring_billing,
)


# =========================================================================
# 1. TAX RULE MANAGEMENT TESTS
# =========================================================================

def test_tax_rule_creation_and_admin_auth(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """1. Test tax rule creation and admin-only modification."""
    admin = create_user_helper(email="tax_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    tax_name = f"VAT-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "name": tax_name,
        "rate_percentage": 18.50,
        "country": "US",
        "is_active": True,
    }
    res = client.post("/api/v1/billing/taxes", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == tax_name
    assert Decimal(str(data["rate_percentage"])) == Decimal("18.50")
    tax_id = data["id"]

    # Retrieve tax
    res_get = client.get(f"/api/v1/billing/taxes/{tax_id}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == tax_id

    # Patch tax
    res_patch = client.patch(
        f"/api/v1/billing/taxes/{tax_id}",
        json={"rate_percentage": 20.00, "name": f"{tax_name}-Updated"},
        headers=headers,
    )
    assert res_patch.status_code == 200
    assert Decimal(str(res_patch.json()["rate_percentage"])) == Decimal("20.00")

    # Cleanup
    db_session.query(TaxRate).filter(TaxRate.id == tax_id).delete()
    db_session.commit()


def test_unauthorized_tax_modification_rejection(client: TestClient, create_user_helper, auth_headers_helper):
    """2. Test customer and unauthenticated users cannot modify tax rules."""
    customer = create_user_helper(email="tax_customer@brightloop.io", role=UserRole.CUSTOMER)
    cust_headers = auth_headers_helper(customer)

    payload = {
        "name": "Illegal Tax",
        "rate_percentage": 10.00,
        "country": "US",
    }
    # Unauthenticated
    res_unauth = client.post("/api/v1/billing/taxes", json=payload)
    assert res_unauth.status_code == 401

    # Customer
    res_cust = client.post("/api/v1/billing/taxes", json=payload, headers=cust_headers)
    assert res_cust.status_code == 403

    # Invalid percentage validation (Admin)
    admin = create_user_helper(email="tax_admin_val@brightloop.io", role=UserRole.ADMIN)
    admin_headers = auth_headers_helper(admin)
    res_invalid = client.post("/api/v1/billing/taxes", json={"name": "Bad Tax", "rate_percentage": 150.00}, headers=admin_headers)
    assert res_invalid.status_code in (400, 422)


# =========================================================================
# 2. INVOICE CREATION & FINANCIAL CALCULATIONS
# =========================================================================

def test_invoice_creation_and_financial_calculations(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """3. Test invoice creation with multiple line items, tax calculation, and outstanding balance."""
    admin = create_user_helper(email="inv_calc_admin@brightloop.io", role=UserRole.ADMIN)
    customer = create_user_helper(email="inv_calc_cust@brightloop.io", role=UserRole.CUSTOMER)
    headers = auth_headers_helper(admin)

    # Create active tax rate (10%)
    tax = TaxRate(name=f"Tax-10-{uuid.uuid4().hex[:4]}", rate_percentage=Decimal("10.00"), is_active=True)
    db_session.add(tax)
    db_session.commit()
    db_session.refresh(tax)

    # Line items:
    # Item 1: 2 units @ 100.00 = 200.00, Tax 10% = 20.00 -> Total 220.00
    # Item 2: 1 unit @ 50.55 = 50.55, Tax 10% = 5.06 -> Total 55.61
    # Subtotal = 250.55, Tax Total = 25.06, Grand Total = 275.61
    payload = {
        "customer_id": customer.id,
        "currency": "USD",
        "payment_terms": "Net 30",
        "items": [
            {
                "description": "Enterprise Subscription Seat",
                "quantity": 2,
                "unit_price": 100.00,
                "tax_rate_id": tax.id,
            },
            {
                "description": "Additional Storage 50GB",
                "quantity": 1,
                "unit_price": 50.55,
                "tax_rate_id": tax.id,
            },
        ],
    }

    res = client.post("/api/v1/billing/invoices", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    assert Decimal(str(data["subtotal"])) == Decimal("250.55")
    assert Decimal(str(data["tax_total"])) == Decimal("25.06")
    assert Decimal(str(data["total_amount"])) == Decimal("275.61")
    assert Decimal(str(data["amount_paid"])) == Decimal("0.00")
    assert Decimal(str(data["outstanding_balance"])) == Decimal("275.61")
    assert data["status"] == "draft"
    assert len(data["items"]) == 2

    # Cleanup
    db_session.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == data["id"]).delete()
    db_session.query(Invoice).filter(Invoice.id == data["id"]).delete()
    db_session.query(TaxRate).filter(TaxRate.id == tax.id).delete()
    db_session.commit()


def test_invoice_status_transitions_and_cancellation(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """4. Test invoice confirmation, void/cancel transitions, and rejection of paid invoice cancellation."""
    admin = create_user_helper(email="inv_status_admin@brightloop.io", role=UserRole.ADMIN)
    customer = create_user_helper(email="inv_status_cust@brightloop.io", role=UserRole.CUSTOMER)
    headers = auth_headers_helper(admin)

    # Create draft invoice
    payload = {
        "customer_id": customer.id,
        "items": [{"description": "Monthly Plan", "quantity": 1, "unit_price": 120.00}],
    }
    res = client.post("/api/v1/billing/invoices", json=payload, headers=headers)
    assert res.status_code == 201
    inv_id = res.json()["id"]

    # Confirm invoice
    res_conf = client.post(f"/api/v1/billing/invoices/{inv_id}/confirm", headers=headers)
    assert res_conf.status_code == 200
    assert res_conf.json()["status"] == "confirmed"

    # Cancel invoice
    res_cancel = client.post(f"/api/v1/billing/invoices/{inv_id}/cancel", headers=headers)
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "cancelled"

    # Cannot re-confirm a cancelled invoice
    res_reconf = client.post(f"/api/v1/billing/invoices/{inv_id}/confirm", headers=headers)
    assert res_reconf.status_code == 400

    # Test paid invoice cannot be cancelled
    paid_inv = Invoice(
        invoice_number=f"INV-PAID-{uuid.uuid4().hex[:6].upper()}",
        customer_id=customer.id,
        status=InvoiceStatus.PAID,
        currency="USD",
        subtotal=Decimal("100.00"),
        total_amount=Decimal("100.00"),
        amount_paid=Decimal("100.00"),
        due_date=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db_session.add(paid_inv)
    db_session.commit()
    db_session.refresh(paid_inv)

    res_cancel_paid = client.post(f"/api/v1/billing/invoices/{paid_inv.id}/cancel", headers=headers)
    assert res_cancel_paid.status_code == 400

    # Cleanup
    db_session.query(Invoice).filter(Invoice.id.in_([inv_id, paid_inv.id])).delete()
    db_session.commit()


# =========================================================================
# 3. RBAC & CUSTOMER-SPECIFIC ACCESS
# =========================================================================

def test_customer_invoice_isolation(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """5. Test customer can only view own invoices while finance/admin can view all."""
    admin = create_user_helper(email="cust_iso_admin@brightloop.io", role=UserRole.ADMIN)
    cust_a = create_user_helper(email="cust_a@brightloop.io", role=UserRole.CUSTOMER)
    cust_b = create_user_helper(email="cust_b@brightloop.io", role=UserRole.CUSTOMER)

    headers_admin = auth_headers_helper(admin)
    headers_a = auth_headers_helper(cust_a)
    headers_b = auth_headers_helper(cust_b)

    # Create invoice for Customer A
    res_a = client.post(
        "/api/v1/billing/invoices",
        json={"customer_id": cust_a.id, "items": [{"description": "Cust A Item", "quantity": 1, "unit_price": 50.00}]},
        headers=headers_admin,
    )
    assert res_a.status_code == 201
    inv_a_id = res_a.json()["id"]

    # Customer A can retrieve own invoice
    res_get_a = client.get(f"/api/v1/billing/invoices/{inv_a_id}", headers=headers_a)
    assert res_get_a.status_code == 200
    assert res_get_a.json()["id"] == inv_a_id

    # Customer B cannot retrieve Customer A's invoice (403)
    res_get_b = client.get(f"/api/v1/billing/invoices/{inv_a_id}", headers=headers_b)
    assert res_get_b.status_code == 403

    # Customer B listing invoices should not contain Customer A's invoice
    res_list_b = client.get("/api/v1/billing/invoices", headers=headers_b)
    assert res_list_b.status_code == 200
    invoice_ids_b = [inv["id"] for inv in res_list_b.json()]
    assert inv_a_id not in invoice_ids_b

    # Cleanup
    db_session.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == inv_a_id).delete()
    db_session.query(Invoice).filter(Invoice.id == inv_a_id).delete()
    db_session.commit()


# =========================================================================
# 4. RECURRING BILLING ENGINE: CADENCE & DATE HANDLING
# =========================================================================

def test_recurring_billing_cadence_advancement():
    """6. Test billing period advancement across daily, weekly, monthly, and yearly cycles."""
    base_date = datetime(2026, 1, 15, 12, 0, 0, tzinfo=timezone.utc)

    # Daily
    plan_daily = SubscriptionPlan(name="Daily", code="P-DAILY", base_price=Decimal("5.00"), billing_cycle=BillingCycle.DAILY, billing_interval_count=1)
    sub_daily = Subscription(customer_id=1, plan_id=1, status=SubscriptionStatus.ACTIVE, start_date=base_date, current_period_start=base_date, current_period_end=base_date)
    sub_daily.plan = plan_daily
    next_daily = advance_billing_period(sub_daily, base_date)
    assert next_daily == base_date + timedelta(days=1)

    # Weekly
    plan_weekly = SubscriptionPlan(name="Weekly", code="P-WEEKLY", base_price=Decimal("25.00"), billing_cycle=BillingCycle.WEEKLY, billing_interval_count=1)
    sub_weekly = Subscription(customer_id=1, plan_id=2, status=SubscriptionStatus.ACTIVE, start_date=base_date, current_period_start=base_date, current_period_end=base_date)
    sub_weekly.plan = plan_weekly
    next_weekly = advance_billing_period(sub_weekly, base_date)
    assert next_weekly == base_date + timedelta(days=7)

    # Monthly
    plan_monthly = SubscriptionPlan(name="Monthly", code="P-MONTHLY", base_price=Decimal("99.00"), billing_cycle=BillingCycle.MONTHLY, billing_interval_count=1)
    sub_monthly = Subscription(customer_id=1, plan_id=3, status=SubscriptionStatus.ACTIVE, start_date=base_date, current_period_start=base_date, current_period_end=base_date)
    sub_monthly.plan = plan_monthly
    next_monthly = advance_billing_period(sub_monthly, base_date)
    assert next_monthly == datetime(2026, 2, 15, 12, 0, 0, tzinfo=timezone.utc)

    # Yearly
    plan_yearly = SubscriptionPlan(name="Yearly", code="P-YEARLY", base_price=Decimal("999.00"), billing_cycle=BillingCycle.YEARLY, billing_interval_count=1)
    sub_yearly = Subscription(customer_id=1, plan_id=4, status=SubscriptionStatus.ACTIVE, start_date=base_date, current_period_start=base_date, current_period_end=base_date)
    sub_yearly.plan = plan_yearly
    next_yearly = advance_billing_period(sub_yearly, base_date)
    assert next_yearly == datetime(2027, 1, 15, 12, 0, 0, tzinfo=timezone.utc)


def test_month_end_and_leap_year_transitions():
    """7. Test month-end clamping (Jan 31 -> Feb 28) and leap year transitions."""
    # Month-end: Jan 31 -> Feb 28 (non-leap year)
    start_jan31 = datetime(2025, 1, 31, 10, 0, 0, tzinfo=timezone.utc)
    plan_monthly = SubscriptionPlan(name="Monthly", code="P-M31", base_price=Decimal("50.00"), billing_cycle=BillingCycle.MONTHLY, billing_interval_count=1)
    sub = Subscription(customer_id=1, plan_id=1, status=SubscriptionStatus.ACTIVE, start_date=start_jan31, current_period_start=start_jan31, current_period_end=start_jan31)
    sub.plan = plan_monthly

    feb_date = advance_billing_period(sub, start_jan31)
    assert feb_date.month == 2
    assert feb_date.day == 28

    # Leap year: Jan 31, 2024 -> Feb 29, 2024
    start_jan31_leap = datetime(2024, 1, 31, 10, 0, 0, tzinfo=timezone.utc)
    sub_leap = Subscription(customer_id=1, plan_id=1, status=SubscriptionStatus.ACTIVE, start_date=start_jan31_leap, current_period_start=start_jan31_leap, current_period_end=start_jan31_leap)
    sub_leap.plan = plan_monthly
    feb_leap = advance_billing_period(sub_leap, start_jan31_leap)
    assert feb_leap.month == 2
    assert feb_leap.day == 29


# =========================================================================
# 5. RECURRING BILLING EXECUTION & EXCLUSIONS
# =========================================================================

def test_paused_and_expired_subscriptions_are_excluded(db_session: Session):
    """8. Test paused and expired subscriptions are never billed."""
    # Create customer
    user = User(email=f"sub_excl_{uuid.uuid4().hex[:6]}@brightloop.io", hashed_password="pw", full_name="Excl Cust", role=UserRole.CUSTOMER)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    plan = SubscriptionPlan(name="Plan Excl", code=f"P-EXCL-{uuid.uuid4().hex[:4]}", base_price=Decimal("100.00"), billing_cycle=BillingCycle.MONTHLY)
    db_session.add(plan)
    db_session.commit()
    db_session.refresh(plan)

    now_utc = datetime.now(timezone.utc)
    past_due = now_utc - timedelta(days=2)

    # Paused subscription
    sub_paused = Subscription(
        customer_id=user.id,
        plan_id=plan.id,
        status=SubscriptionStatus.PAUSED,
        start_date=now_utc - timedelta(days=35),
        current_period_start=now_utc - timedelta(days=35),
        current_period_end=past_due,
        paused_at=now_utc - timedelta(days=5),
    )
    # Expired subscription
    sub_expired = Subscription(
        customer_id=user.id,
        plan_id=plan.id,
        status=SubscriptionStatus.EXPIRED,
        start_date=now_utc - timedelta(days=60),
        current_period_start=now_utc - timedelta(days=60),
        current_period_end=past_due,
    )
    db_session.add_all([sub_paused, sub_expired])
    db_session.commit()

    # Run billing
    result = run_recurring_billing(db_session, target_date=now_utc, subscription_ids=[sub_paused.id, sub_expired.id])
    assert result["created"] == 0
    assert result["processed"] == 0

    # Cleanup
    db_session.query(Subscription).filter(Subscription.id.in_([sub_paused.id, sub_expired.id])).delete()
    db_session.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan.id).delete()
    db_session.query(User).filter(User.id == user.id).delete()
    db_session.commit()


# =========================================================================
# 6. DUPLICATE PREVENTION & IDEMPOTENCY
# =========================================================================

def test_duplicate_billing_prevention_and_idempotency(db_session: Session):
    """9. Test repeated billing execution is strictly idempotent and does not create duplicates."""
    user = User(email=f"idem_{uuid.uuid4().hex[:6]}@brightloop.io", hashed_password="pw", full_name="Idem Cust", role=UserRole.CUSTOMER)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    plan = SubscriptionPlan(name="Plan Idem", code=f"P-IDEM-{uuid.uuid4().hex[:4]}", base_price=Decimal("150.00"), billing_cycle=BillingCycle.MONTHLY)
    db_session.add(plan)
    db_session.commit()
    db_session.refresh(plan)

    now_utc = datetime.now(timezone.utc)
    due_date = now_utc - timedelta(days=1)
    period_start = now_utc - timedelta(days=31)

    sub = Subscription(
        customer_id=user.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        start_date=period_start,
        current_period_start=period_start,
        current_period_end=due_date,
    )
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(sub)

    # First run: should create 1 invoice
    run_1 = run_recurring_billing(db_session, target_date=now_utc, subscription_ids=[sub.id])
    assert run_1["created"] == 1
    assert run_1["failed"] == 0

    # Second run immediately: subscription was advanced, so current_period_end is in the future
    run_2 = run_recurring_billing(db_session, target_date=now_utc, subscription_ids=[sub.id])
    assert run_2["created"] == 0

    # Verify exactly 1 invoice exists in DB for this subscription
    invoices = db_session.query(Invoice).filter(Invoice.subscription_id == sub.id).all()
    assert len(invoices) == 1

    # Cleanup
    inv_id = invoices[0].id
    db_session.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == inv_id).delete()
    db_session.query(Invoice).filter(Invoice.id == inv_id).delete()
    db_session.query(Subscription).filter(Subscription.id == sub.id).delete()
    db_session.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan.id).delete()
    db_session.query(User).filter(User.id == user.id).delete()
    db_session.commit()


# =========================================================================
# 7. BILLING EXECUTION & SCHEDULE ENDPOINTS
# =========================================================================

def test_billing_run_and_schedule_endpoints(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """10. Test POST /api/v1/billing/run and GET /api/v1/billing/schedule APIs."""
    admin = create_user_helper(email="sched_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    # Test GET /api/v1/billing/schedule
    res_sched = client.get("/api/v1/billing/schedule", headers=headers)
    assert res_sched.status_code == 200
    assert isinstance(res_sched.json(), list)

    # Test POST /api/v1/billing/run
    res_run = client.post("/api/v1/billing/run", json={"auto_confirm": True}, headers=headers)
    assert res_run.status_code == 200
    data = res_run.json()
    assert "processed" in data
    assert "created" in data
    assert "skipped" in data
    assert "failed" in data
    assert "invoices" in data


# =========================================================================
# 8. CONCURRENT BILLING RACE CONDITION PROTECTION
# =========================================================================

def test_concurrent_billing_race_condition(db_session: Session):
    """11. Test that concurrent simultaneous billing invocations yield exactly one invoice."""
    from app.core.database import SessionLocal

    user = User(email=f"concurr_{uuid.uuid4().hex[:6]}@brightloop.io", hashed_password="pw", full_name="Concurr Cust", role=UserRole.CUSTOMER)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    plan = SubscriptionPlan(name="Plan Concurr", code=f"P-CONCURR-{uuid.uuid4().hex[:4]}", base_price=Decimal("200.00"), billing_cycle=BillingCycle.MONTHLY)
    db_session.add(plan)
    db_session.commit()
    db_session.refresh(plan)

    now_utc = datetime.now(timezone.utc)
    due_date = now_utc - timedelta(days=1)
    period_start = now_utc - timedelta(days=31)

    sub = Subscription(
        customer_id=user.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        start_date=period_start,
        current_period_start=period_start,
        current_period_end=due_date,
    )
    db_session.add(sub)
    db_session.commit()
    db_session.refresh(sub)

    sub_id = sub.id

    def _worker_run():
        session = SessionLocal()
        try:
            return run_recurring_billing(session, target_date=now_utc, subscription_ids=[sub_id])
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(_worker_run)
        f2 = executor.submit(_worker_run)
        res1 = f1.result()
        res2 = f2.result()

    total_created = res1["created"] + res2["created"]
    assert total_created == 1, f"Expected exactly 1 invoice created, got {total_created}"

    # Verify exactly 1 invoice in database
    db_session.expire_all()
    invoices = db_session.query(Invoice).filter(Invoice.subscription_id == sub_id).all()
    assert len(invoices) == 1

    # Cleanup
    inv_id = invoices[0].id
    db_session.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == inv_id).delete()
    db_session.query(Invoice).filter(Invoice.id == inv_id).delete()
    db_session.query(Subscription).filter(Subscription.id == sub_id).delete()
    db_session.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan.id).delete()
    db_session.query(User).filter(User.id == user.id).delete()
    db_session.commit()


# =========================================================================
# 9. SUBSCRIPTION LIFECYCLE & VOID ALIAS TESTS
# =========================================================================

def test_subscription_lifecycle_and_void_alias(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """12. Test subscription provisioning, pause, resume, cancel, and frontend /void invoice alias."""
    admin = create_user_helper(email="life_admin@brightloop.io", role=UserRole.ADMIN)
    cust = create_user_helper(email="life_cust@brightloop.io", role=UserRole.CUSTOMER)
    admin_headers = auth_headers_helper(admin)
    cust_headers = auth_headers_helper(cust)

    # 1. Create plan
    plan_code = f"PLAN-LIFE-{uuid.uuid4().hex[:4].upper()}"
    res_plan = client.post(
        "/api/v1/subscriptions/plans",
        json={"name": "Lifecycle Plan", "code": plan_code, "base_price": 75.00, "billing_cycle": "monthly"},
        headers=admin_headers,
    )
    assert res_plan.status_code == 201
    plan_id = res_plan.json()["id"]

    # 2. Customer creates subscription
    sub_payload = {"customer_id": cust.id, "plan_id": plan_id}
    res_sub = client.post("/api/v1/subscriptions", json=sub_payload, headers=cust_headers)
    assert res_sub.status_code == 201
    sub_data = res_sub.json()
    assert sub_data["status"] == "active"
    sub_id = sub_data["id"]

    # 3. Pause subscription
    res_pause = client.post(f"/api/v1/subscriptions/{sub_id}/pause", headers=admin_headers)
    assert res_pause.status_code == 200
    assert res_pause.json()["status"] == "paused"

    # 4. Resume subscription
    res_resume = client.post(f"/api/v1/subscriptions/{sub_id}/resume", headers=admin_headers)
    assert res_resume.status_code == 200
    assert res_resume.json()["status"] == "active"

    # 5. Cancel subscription
    res_cancel_sub = client.post(f"/api/v1/subscriptions/{sub_id}/cancel", headers=admin_headers)
    assert res_cancel_sub.status_code == 200
    assert res_cancel_sub.json()["status"] == "cancelled"

    # 6. Test frontend compatibility /void endpoint alias for invoices
    inv_res = client.post(
        "/api/v1/billing/invoices",
        json={"customer_id": cust.id, "items": [{"description": "Void Test Item", "quantity": 1, "unit_price": 50.00}]},
        headers=admin_headers,
    )
    assert inv_res.status_code == 201
    inv_id = inv_res.json()["id"]

    # Call /void
    res_void = client.post(f"/api/v1/billing/invoices/{inv_id}/void", headers=admin_headers)
    assert res_void.status_code == 200
    assert res_void.json()["status"] == "cancelled"

    # Cleanup
    db_session.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == inv_id).delete()
    db_session.query(Invoice).filter(Invoice.id == inv_id).delete()
    db_session.query(Subscription).filter(Subscription.id == sub_id).delete()
    db_session.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).delete()
    db_session.commit()



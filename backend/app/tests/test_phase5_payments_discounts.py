"""Automated tests for Phase 5:
- Complete Discount Rule Management (CRUD, validations, max uses, applicability)
- Automatic Discount Application & Discount-Before-Tax Calculation
- Concurrent Discount Redemption Race Condition Protection
- Payment Recording (manual, partial payments, full settlement, overpayment rejection, idempotency)
- Refund Management & Invoice Reopening
- Financial Reconciliation & Overdue Summary
- Customer Payment Isolation & RBAC
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auth import User, UserRole
from app.models.billing import Invoice, InvoiceLineItem, InvoiceStatus, Discount, DiscountType, TaxRate
from app.models.payment import Payment, PaymentStatus, PaymentMethod


# =========================================================================
# 1. DISCOUNT RULE CRUD & AUTHORIZATION
# =========================================================================

def test_admin_discount_creation_and_auth(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """1. Test admin can create and retrieve discount rules with full parameter validations."""
    admin = create_user_helper(email="disc_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    code = f"DISC-PCT-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "code": code,
        "discount_type": "percentage",
        "amount": 25.00,
        "minimum_purchase_amount": 100.00,
        "minimum_quantity": 2,
        "max_uses": 50,
        "applicability": "all",
        "is_active": True,
    }
    res = client.post("/api/v1/billing/discounts", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["code"] == code
    assert Decimal(str(data["amount"])) == Decimal("25.00")
    assert Decimal(str(data["minimum_purchase_amount"])) == Decimal("100.00")
    assert data["minimum_quantity"] == 2
    assert data["max_uses"] == 50
    disc_id = data["id"]

    # Retrieve discount
    res_get = client.get(f"/api/v1/billing/discounts/{disc_id}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == disc_id

    # Update discount via PUT / PATCH
    res_patch = client.patch(f"/api/v1/billing/discounts/{disc_id}", json={"amount": 30.00}, headers=headers)
    assert res_patch.status_code == 200
    assert Decimal(str(res_patch.json()["amount"])) == Decimal("30.00")

    # Cleanup
    db_session.query(Discount).filter(Discount.id == disc_id).delete()
    db_session.commit()


def test_unauthorized_discount_modification_and_bounds(client: TestClient, create_user_helper, auth_headers_helper):
    """2. Test unauthorized discount creation, percentage bounds, and invalid dates."""
    customer = create_user_helper(email="disc_cust@brightloop.io", role=UserRole.CUSTOMER)
    admin = create_user_helper(email="disc_bounds_admin@brightloop.io", role=UserRole.ADMIN)
    cust_headers = auth_headers_helper(customer)
    admin_headers = auth_headers_helper(admin)

    payload = {"code": "HACK-DISC", "discount_type": "percentage", "amount": 10.00}
    # Unauthenticated
    assert client.post("/api/v1/billing/discounts", json=payload).status_code == 401
    # Customer
    assert client.post("/api/v1/billing/discounts", json=payload, headers=cust_headers).status_code == 403

    # Percentage > 100
    res_high = client.post(
        "/api/v1/billing/discounts",
        json={"code": f"ERR-{uuid.uuid4().hex[:4]}", "discount_type": "percentage", "amount": 120.00},
        headers=admin_headers,
    )
    assert res_high.status_code in (400, 422)

    # Inverted dates
    now = datetime.now(timezone.utc)
    res_dates = client.post(
        "/api/v1/billing/discounts",
        json={
            "code": f"DATE-{uuid.uuid4().hex[:4]}",
            "discount_type": "fixed_amount",
            "amount": 15.00,
            "valid_from": (now + timedelta(days=10)).isoformat(),
            "valid_until": (now + timedelta(days=2)).isoformat(),
        },
        headers=admin_headers,
    )
    assert res_dates.status_code == 400


# =========================================================================
# 2. AUTOMATIC DISCOUNT APPLICATION & ELIGIBILITY
# =========================================================================

def test_fixed_and_percentage_discount_application(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """3. Test automatic discount application on invoice creation with discount-before-tax policy."""
    admin = create_user_helper(email="disc_calc_admin@brightloop.io", role=UserRole.ADMIN)
    customer = create_user_helper(email="disc_calc_cust@brightloop.io", role=UserRole.CUSTOMER)
    headers = auth_headers_helper(admin)

    # Tax 10%
    tax = TaxRate(name=f"Tax-Disc-{uuid.uuid4().hex[:4]}", rate_percentage=Decimal("10.00"), is_active=True)
    db_session.add(tax)
    db_session.commit()
    db_session.refresh(tax)

    # 1. Fixed discount $50
    fixed_code = f"FIXED50-{uuid.uuid4().hex[:4].upper()}"
    disc_fixed = Discount(
        code=fixed_code,
        discount_type=DiscountType.FIXED_AMOUNT,
        amount=Decimal("50.00"),
        minimum_purchase_amount=Decimal("100.00"),
        minimum_quantity=1,
        is_active=True,
    )
    db_session.add(disc_fixed)
    db_session.commit()
    db_session.refresh(disc_fixed)

    # Subtotal: 2 units @ 100.00 = 200.00
    # Eligible discount: 50.00
    # Net taxable: 150.00
    # Tax 10%: 15.00
    # Grand Total: 200.00 - 50.00 + 15.00 = 165.00
    inv_payload = {
        "customer_id": customer.id,
        "discount_code": fixed_code,
        "items": [{"description": "Service Subscription", "quantity": 2, "unit_price": 100.00, "tax_rate_id": tax.id}],
    }
    res_inv = client.post("/api/v1/billing/invoices", json=inv_payload, headers=headers)
    assert res_inv.status_code == 201
    data = res_inv.json()
    assert Decimal(str(data["subtotal"])) == Decimal("200.00")
    assert Decimal(str(data["discount_total"])) == Decimal("50.00")
    assert Decimal(str(data["tax_total"])) == Decimal("15.00")
    assert Decimal(str(data["total_amount"])) == Decimal("165.00")
    assert data["discount_code"] == fixed_code
    inv_id = data["id"]

    # Verify discount current_uses incremented
    db_session.expire(disc_fixed)
    assert disc_fixed.current_uses == 1

    # Cleanup
    db_session.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == inv_id).delete()
    db_session.query(Invoice).filter(Invoice.id == inv_id).delete()
    db_session.query(Discount).filter(Discount.id == disc_fixed.id).delete()
    db_session.query(TaxRate).filter(TaxRate.id == tax.id).delete()
    db_session.commit()


def test_expired_and_minimum_spend_discount_rejection(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """4. Test rejection of expired discount and discounts below minimum purchase requirements."""
    admin = create_user_helper(email="disc_exp_admin@brightloop.io", role=UserRole.ADMIN)
    customer = create_user_helper(email="disc_exp_cust@brightloop.io", role=UserRole.CUSTOMER)
    headers = auth_headers_helper(admin)

    now = datetime.now(timezone.utc)
    exp_code = f"EXP-{uuid.uuid4().hex[:4].upper()}"
    disc_expired = Discount(
        code=exp_code,
        discount_type=DiscountType.PERCENTAGE,
        amount=Decimal("20.00"),
        valid_until=now - timedelta(days=1),  # Expired yesterday
        is_active=True,
    )
    # High min spend discount ($500 minimum)
    high_min_code = f"HIGH-{uuid.uuid4().hex[:4].upper()}"
    disc_high_min = Discount(
        code=high_min_code,
        discount_type=DiscountType.PERCENTAGE,
        amount=Decimal("15.00"),
        minimum_purchase_amount=Decimal("500.00"),
        is_active=True,
    )
    db_session.add_all([disc_expired, disc_high_min])
    db_session.commit()

    # Attempt invoice with expired discount -> 400
    res_exp = client.post(
        "/api/v1/billing/invoices",
        json={"customer_id": customer.id, "discount_code": exp_code, "items": [{"description": "Item", "quantity": 1, "unit_price": 50.00}]},
        headers=headers,
    )
    assert res_exp.status_code == 400
    assert "expired" in res_exp.json()["detail"].lower()

    # Attempt invoice with subtotal $100 against $500 minimum -> 400
    res_min = client.post(
        "/api/v1/billing/invoices",
        json={"customer_id": customer.id, "discount_code": high_min_code, "items": [{"description": "Item", "quantity": 1, "unit_price": 100.00}]},
        headers=headers,
    )
    assert res_min.status_code == 400
    assert "minimum purchase" in res_min.json()["detail"].lower()

    # Cleanup
    db_session.query(Discount).filter(Discount.id.in_([disc_expired.id, disc_high_min.id])).delete()
    db_session.commit()


# =========================================================================
# 3. CONCURRENT DISCOUNT REDEMPTION (MAX USES SAFETY)
# =========================================================================

def test_concurrent_discount_max_uses_protection(db_session: Session):
    """5. Test that concurrent discount redemptions cannot exceed max_uses."""
    from app.core.database import SessionLocal
    from app.core.billing_engine import try_redeem_discount

    code = f"CONCURR-DISC-{uuid.uuid4().hex[:4].upper()}"
    disc = Discount(
        code=code,
        discount_type=DiscountType.PERCENTAGE,
        amount=Decimal("10.00"),
        max_uses=1,  # Only 1 redemption allowed
        current_uses=0,
        is_active=True,
    )
    db_session.add(disc)
    db_session.commit()
    db_session.refresh(disc)
    disc_id = disc.id

    def _worker():
        session = SessionLocal()
        try:
            return try_redeem_discount(session, disc_id)
        finally:
            session.close()

    # Run 4 threads concurrently trying to redeem max_uses=1
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(_worker) for _ in range(4)]
        results = [f.result() for f in futures]

    successful_redemptions = sum((1 for r in results if r is True))
    assert successful_redemptions == 1, f"Expected exactly 1 successful redemption, got {successful_redemptions}"

    db_session.expire(disc)
    assert disc.current_uses == 1

    # Cleanup
    db_session.query(Discount).filter(Discount.id == disc_id).delete()
    db_session.commit()


# =========================================================================
# 4. PAYMENT RECORDING, PARTIAL PAYMENTS & RECONCILIATION
# =========================================================================

def test_payment_recording_partial_and_full_settlement(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """6. Test partial payments (1000 = 400 + 300 + 300), balance recalculation, and transition to PAID."""
    admin = create_user_helper(email="pay_admin@brightloop.io", role=UserRole.ADMIN)
    customer = create_user_helper(email="pay_cust@brightloop.io", role=UserRole.CUSTOMER)
    headers = auth_headers_helper(admin)

    # Create invoice for total $1,000.00
    res_inv = client.post(
        "/api/v1/billing/invoices",
        json={"customer_id": customer.id, "items": [{"description": "Consulting Services", "quantity": 10, "unit_price": 100.00}]},
        headers=headers,
    )
    assert res_inv.status_code == 201
    inv_id = res_inv.json()["id"]

    # 1. First partial payment: $400.00
    res_pay1 = client.post(
        "/api/v1/payments/payments",
        json={"invoice_id": inv_id, "amount": 400.00, "currency": "USD", "payment_method": "bank_transfer"},
        headers=headers,
    )
    assert res_pay1.status_code == 201
    pay1_data = res_pay1.json()
    assert Decimal(str(pay1_data["amount"])) == Decimal("400.00")
    assert pay1_data["status"] == "succeeded"

    # Check invoice: amount_paid = 400, outstanding = 600, status = confirmed
    inv_check1 = client.get(f"/api/v1/billing/invoices/{inv_id}", headers=headers).json()
    assert Decimal(str(inv_check1["amount_paid"])) == Decimal("400.00")
    assert Decimal(str(inv_check1["outstanding_balance"])) == Decimal("600.00")
    assert inv_check1["status"] == "confirmed"

    # 2. Second partial payment: $300.00
    res_pay2 = client.post(
        "/api/v1/payments/payments",
        json={"invoice_id": inv_id, "amount": 300.00, "currency": "USD", "payment_method": "credit_card"},
        headers=headers,
    )
    assert res_pay2.status_code == 201

    # Check invoice: amount_paid = 700, outstanding = 300
    inv_check2 = client.get(f"/api/v1/billing/invoices/{inv_id}", headers=headers).json()
    assert Decimal(str(inv_check2["amount_paid"])) == Decimal("700.00")
    assert Decimal(str(inv_check2["outstanding_balance"])) == Decimal("300.00")

    # 3. Third final payment: $300.00
    res_pay3 = client.post(
        "/api/v1/payments/payments",
        json={"invoice_id": inv_id, "amount": 300.00, "currency": "USD", "payment_method": "manual"},
        headers=headers,
    )
    assert res_pay3.status_code == 201

    # Check invoice: fully paid, outstanding = 0, status = paid
    inv_check3 = client.get(f"/api/v1/billing/invoices/{inv_id}", headers=headers).json()
    assert Decimal(str(inv_check3["amount_paid"])) == Decimal("1000.00")
    assert Decimal(str(inv_check3["outstanding_balance"])) == Decimal("0.00")
    assert inv_check3["status"] == "paid"

    # 4. Overpayment rejection: attempting to pay another $50 -> 400
    res_overpay = client.post(
        "/api/v1/payments/payments",
        json={"invoice_id": inv_id, "amount": 50.00, "currency": "USD"},
        headers=headers,
    )
    assert res_overpay.status_code == 400
    assert "exceeds" in res_overpay.json()["detail"].lower()

    # Cleanup
    db_session.query(Payment).filter(Payment.invoice_id == inv_id).delete()
    db_session.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == inv_id).delete()
    db_session.query(Invoice).filter(Invoice.id == inv_id).delete()
    db_session.commit()


def test_duplicate_transaction_reference_prevention(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """7. Test idempotency: duplicate transaction references are rejected."""
    admin = create_user_helper(email="dup_pay_admin@brightloop.io", role=UserRole.ADMIN)
    customer = create_user_helper(email="dup_pay_cust@brightloop.io", role=UserRole.CUSTOMER)
    headers = auth_headers_helper(admin)

    res_inv = client.post(
        "/api/v1/billing/invoices",
        json={"customer_id": customer.id, "items": [{"description": "Item", "quantity": 1, "unit_price": 200.00}]},
        headers=headers,
    )
    inv_id = res_inv.json()["id"]

    ref = f"TXN-STRIPE-{uuid.uuid4().hex[:8].upper()}"
    res_p1 = client.post(
        "/api/v1/payments/payments",
        json={"invoice_id": inv_id, "amount": 100.00, "transaction_reference": ref},
        headers=headers,
    )
    assert res_p1.status_code == 201

    # Repeat with same reference -> 400 Bad Request
    res_p2 = client.post(
        "/api/v1/payments/payments",
        json={"invoice_id": inv_id, "amount": 50.00, "transaction_reference": ref},
        headers=headers,
    )
    assert res_p2.status_code == 400
    assert "already exists" in res_p2.json()["detail"].lower()

    # Cleanup
    db_session.query(Payment).filter(Payment.invoice_id == inv_id).delete()
    db_session.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == inv_id).delete()
    db_session.query(Invoice).filter(Invoice.id == inv_id).delete()
    db_session.commit()


# =========================================================================
# 5. REFUND PROCESSING & INVOICE REOPENING
# =========================================================================

def test_refund_processing_and_invoice_reopening(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """8. Test refunding settled payment, reopening invoice from PAID to CONFIRMED, and preventing duplicate refunds."""
    admin = create_user_helper(email="refund_admin@brightloop.io", role=UserRole.ADMIN)
    customer = create_user_helper(email="refund_cust@brightloop.io", role=UserRole.CUSTOMER)
    headers = auth_headers_helper(admin)

    # 1. Invoice $300
    res_inv = client.post(
        "/api/v1/billing/invoices",
        json={"customer_id": customer.id, "items": [{"description": "Design License", "quantity": 1, "unit_price": 300.00}]},
        headers=headers,
    )
    inv_id = res_inv.json()["id"]

    # 2. Settle full payment $300 -> Invoice is PAID
    res_pay = client.post(
        "/api/v1/payments/payments",
        json={"invoice_id": inv_id, "amount": 300.00, "currency": "USD"},
        headers=headers,
    )
    pay_id = res_pay.json()["id"]
    inv_before_refund = client.get(f"/api/v1/billing/invoices/{inv_id}", headers=headers).json()
    assert inv_before_refund["status"] == "paid"
    assert Decimal(str(inv_before_refund["outstanding_balance"])) == Decimal("0.00")

    # 3. Process refund for $300
    res_refund = client.post(
        f"/api/v1/payments/payments/{pay_id}/refund",
        json={"reason": "Customer cancellation request within SLA", "amount": 300.00},
        headers=headers,
    )
    assert res_refund.status_code == 200
    ref_data = res_refund.json()
    assert ref_data["status"] == "refunded"
    assert Decimal(str(ref_data["refund_amount"])) == Decimal("300.00")
    assert ref_data["refund_reason"] == "Customer cancellation request within SLA"

    # 4. Check invoice: reopened to CONFIRMED, outstanding balance restored to 300.00
    inv_after_refund = client.get(f"/api/v1/billing/invoices/{inv_id}", headers=headers).json()
    assert inv_after_refund["status"] == "confirmed"
    assert Decimal(str(inv_after_refund["amount_paid"])) == Decimal("0.00")
    assert Decimal(str(inv_after_refund["outstanding_balance"])) == Decimal("300.00")

    # 5. Duplicate refund rejection: attempting to refund already refunded payment -> 400
    res_dup_refund = client.post(
        f"/api/v1/payments/payments/{pay_id}/refund",
        json={"reason": "Second refund attempt"},
        headers=headers,
    )
    assert res_dup_refund.status_code == 400

    # Cleanup
    db_session.query(Payment).filter(Payment.invoice_id == inv_id).delete()
    db_session.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == inv_id).delete()
    db_session.query(Invoice).filter(Invoice.id == inv_id).delete()
    db_session.commit()


# =========================================================================
# 6. FINANCIAL RECONCILIATION SUMMARY & RBAC ISOLATION
# =========================================================================

def test_financial_summary_endpoint(client: TestClient, create_user_helper, auth_headers_helper):
    """9. Test GET /api/v1/payments/summary authoritative financial calculation."""
    admin = create_user_helper(email="fin_sum_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    res = client.get("/api/v1/payments/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_invoiced" in data
    assert "total_paid" in data
    assert "total_outstanding" in data
    assert "total_overdue" in data
    assert "partially_paid_count" in data
    assert "fully_paid_count" in data
    assert "unpaid_count" in data
    assert "overdue_count" in data


def test_customer_payment_isolation(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """10. Test customer cannot view other customers' payment transactions."""
    admin = create_user_helper(email="iso_pay_admin@brightloop.io", role=UserRole.ADMIN)
    cust_a = create_user_helper(email="iso_pay_cust_a@brightloop.io", role=UserRole.CUSTOMER)
    cust_b = create_user_helper(email="iso_pay_cust_b@brightloop.io", role=UserRole.CUSTOMER)

    admin_headers = auth_headers_helper(admin)
    cust_a_headers = auth_headers_helper(cust_a)
    cust_b_headers = auth_headers_helper(cust_b)

    # Create invoice and payment for customer A
    res_inv = client.post(
        "/api/v1/billing/invoices",
        json={"customer_id": cust_a.id, "items": [{"description": "Item A", "quantity": 1, "unit_price": 100.00}]},
        headers=admin_headers,
    )
    inv_id = res_inv.json()["id"]
    res_pay = client.post(
        "/api/v1/payments/payments",
        json={"invoice_id": inv_id, "amount": 100.00, "currency": "USD"},
        headers=admin_headers,
    )
    pay_id = res_pay.json()["id"]

    # Customer A can retrieve own payment
    res_get_a = client.get(f"/api/v1/payments/payments/{pay_id}", headers=cust_a_headers)
    assert res_get_a.status_code == 200
    assert res_get_a.json()["id"] == pay_id

    # Customer B cannot retrieve Customer A's payment (403 Forbidden)
    res_get_b = client.get(f"/api/v1/payments/payments/{pay_id}", headers=cust_b_headers)
    assert res_get_b.status_code == 403

    # Customer B list of payments should NOT contain Customer A's payment
    res_list_b = client.get("/api/v1/payments/payments", headers=cust_b_headers)
    assert res_list_b.status_code == 200
    b_pay_ids = [p["id"] for p in res_list_b.json()]
    assert pay_id not in b_pay_ids

    # Cleanup
    db_session.query(Payment).filter(Payment.invoice_id == inv_id).delete()
    db_session.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == inv_id).delete()
    db_session.query(Invoice).filter(Invoice.id == inv_id).delete()
    db_session.commit()


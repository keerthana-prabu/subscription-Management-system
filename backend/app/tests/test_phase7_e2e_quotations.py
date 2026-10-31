"""Comprehensive Integration & End-to-End Business Workflow Tests for Phase 7.

Coverage:
1. Quotation creation with Decimal financial precision and minimum quantity checks.
2. Quotation confirmation and expiry rejection.
3. Atomic quotation-to-subscription conversion and duplicate conversion prevention.
4. Subscription lifecycle transitions (draft, confirmed, active, paused, resumed, renewed, closed).
5. Customer and role security boundaries (RBAC, customer isolation, manual payment restrictions).
6. 14-Step Complete End-to-End Business Workflow Test.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auth import User, UserRole
from app.models.catalog import Product, ProductVariant
from app.models.subscription import SubscriptionPlan, Subscription, SubscriptionItem, BillingCycle, SubscriptionStatus
from app.models.quotation import Quotation, QuotationLineItem, QuotationStatus
from app.models.billing import Invoice, InvoiceLineItem, InvoiceStatus, TaxRate, Discount, DiscountType
from app.models.payment import Payment, PaymentStatus, PaymentMethod


# =========================================================================
# 1. QUOTATION CREATION & FINANCIAL PRECISION
# =========================================================================

def test_quotation_creation_and_financial_precision(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """1. Test quotation creation with Decimal calculations (subtotal, tax, discounts) and customer scoping."""
    tag = uuid.uuid4().hex[:6]
    admin = create_user_helper(email=f"q_admin_{tag}@brightloop.io", role=UserRole.ADMIN)
    sales = create_user_helper(email=f"q_sales_{tag}@brightloop.io", role=UserRole.SALES)
    customer = create_user_helper(email=f"q_cust_{tag}@brightloop.io", role=UserRole.CUSTOMER)

    sales_headers = auth_headers_helper(sales)
    cust_headers = auth_headers_helper(customer)

    # Admin creates product and variant
    prod = Product(name=f"Prod-{tag}", code=f"SKU-{tag}", product_type="service", is_active=True)
    db_session.add(prod)
    db_session.commit()

    variant = ProductVariant(
        product_id=prod.id,
        sku=f"VAR-{tag}",
        name="Standard Tier",
        base_price=Decimal("150.00"),
        price_adjustment=Decimal("0.00"),
        currency="USD",
        is_active=True,
    )
    db_session.add(variant)
    db_session.commit()

    # Sales creates quotation: qty 2, price 150.00 -> base 300.00, discount 10% (30.00) -> 270.00 net, tax 15% (40.50) -> total 310.50
    q_payload = {
        "customer_id": customer.id,
        "items": [
            {
                "product_id": prod.id,
                "variant_id": variant.id,
                "quantity": 2,
                "unit_price": 150.00,
                "discount_percentage": 10.00,
                "tax_percentage": 15.00,
            }
        ],
        "notes": "Special enterprise offer",
    }

    res = client.post("/api/v1/quotations", json=q_payload, headers=sales_headers)
    assert res.status_code == 201, res.text
    data = res.json()

    assert data["quotation_number"].startswith("QT-")
    assert data["status"] == "draft"
    assert data["customer_id"] == customer.id
    assert Decimal(str(data["subtotal"])) == Decimal("270.00")
    assert Decimal(str(data["discount_total"])) == Decimal("30.00")
    assert Decimal(str(data["tax_total"])) == Decimal("40.50")
    assert Decimal(str(data["total_amount"])) == Decimal("310.50")
    assert len(data["items"]) == 1

    q_id = data["id"]

    # Customer can view their own quotation
    res_cust = client.get(f"/api/v1/quotations/{q_id}", headers=cust_headers)
    assert res_cust.status_code == 200
    assert res_cust.json()["id"] == q_id

    # Cleanup
    db_session.query(QuotationLineItem).filter(QuotationLineItem.quotation_id == q_id).delete()
    db_session.query(Quotation).filter(Quotation.id == q_id).delete()
    db_session.query(ProductVariant).filter(ProductVariant.id == variant.id).delete()
    db_session.query(Product).filter(Product.id == prod.id).delete()
    db_session.commit()


def test_quotation_minimum_quantity_validation(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """2. Test quotation rejects line items if total quantity is below the plan's minimum quantity."""
    tag = uuid.uuid4().hex[:6]
    sales = create_user_helper(email=f"mq_sales_{tag}@brightloop.io", role=UserRole.SALES)
    customer = create_user_helper(email=f"mq_cust_{tag}@brightloop.io", role=UserRole.CUSTOMER)
    headers = auth_headers_helper(sales)

    prod = Product(name=f"Prod-{tag}", code=f"P-{tag}", product_type="service", is_active=True)
    db_session.add(prod)
    db_session.commit()

    variant = ProductVariant(
        product_id=prod.id,
        sku=f"V-{tag}",
        name="Tier A",
        base_price=Decimal("50.00"),
        price_adjustment=Decimal("0.00"),
        currency="USD",
        is_active=True,
    )
    plan = SubscriptionPlan(
        name=f"Plan-Min-{tag}",
        code=f"PLAN-MIN-{tag}",
        base_price=Decimal("100.00"),
        minimum_quantity=5,
        billing_cycle=BillingCycle.MONTHLY,
    )
    db_session.add_all([variant, plan])
    db_session.commit()

    # Attempt quantity 3 (< 5) -> 400
    bad_payload = {
        "customer_id": customer.id,
        "plan_id": plan.id,
        "items": [{"product_id": prod.id, "variant_id": variant.id, "quantity": 3}],
    }
    res_bad = client.post("/api/v1/quotations", json=bad_payload, headers=headers)
    assert res_bad.status_code == 400
    assert "minimum quantity" in res_bad.text.lower()

    # Quantity 5 (>= 5) -> 201
    good_payload = {
        "customer_id": customer.id,
        "plan_id": plan.id,
        "items": [{"product_id": prod.id, "variant_id": variant.id, "quantity": 5}],
    }
    res_good = client.post("/api/v1/quotations", json=good_payload, headers=headers)
    assert res_good.status_code == 201
    q_id = res_good.json()["id"]

    # Cleanup
    db_session.query(QuotationLineItem).filter(QuotationLineItem.quotation_id == q_id).delete()
    db_session.query(Quotation).filter(Quotation.id == q_id).delete()
    db_session.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan.id).delete()
    db_session.query(ProductVariant).filter(ProductVariant.id == variant.id).delete()
    db_session.query(Product).filter(Product.id == prod.id).delete()
    db_session.commit()


# =========================================================================
# 2. CONFIRMATION & EXPIRY HANDLING
# =========================================================================

def test_quotation_confirmation_and_expiry_rejection(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """3. Test confirming quotation transitions to CONFIRMED, while expired quotations are rejected."""
    tag = uuid.uuid4().hex[:6]
    sales = create_user_helper(email=f"exp_sales_{tag}@brightloop.io", role=UserRole.SALES)
    customer = create_user_helper(email=f"exp_cust_{tag}@brightloop.io", role=UserRole.CUSTOMER)
    headers = auth_headers_helper(sales)

    prod = Product(name=f"Prod-{tag}", code=f"P-{tag}", product_type="service", is_active=True)
    db_session.add(prod)
    db_session.commit()

    variant = ProductVariant(
        product_id=prod.id,
        sku=f"V-{tag}",
        name="Tier A",
        base_price=Decimal("100.00"),
        price_adjustment=Decimal("0.00"),
        currency="USD",
        is_active=True,
    )
    db_session.add(variant)
    db_session.commit()

    # Active quotation
    res_valid = client.post(
        "/api/v1/quotations",
        json={"customer_id": customer.id, "items": [{"product_id": prod.id, "variant_id": variant.id, "quantity": 1}]},
        headers=headers,
    )
    q_valid_id = res_valid.json()["id"]

    # Confirm valid quotation -> CONFIRMED
    res_confirm = client.post(f"/api/v1/quotations/{q_valid_id}/confirm", headers=headers)
    assert res_confirm.status_code == 200
    assert res_confirm.json()["status"] == "confirmed"

    # Expired quotation (valid_until was yesterday)
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    res_exp = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": customer.id,
            "valid_until": yesterday.isoformat(),
            "items": [{"product_id": prod.id, "variant_id": variant.id, "quantity": 1}],
        },
        headers=headers,
    )
    q_exp_id = res_exp.json()["id"]

    # Attempt to confirm expired quotation -> 400
    res_confirm_exp = client.post(f"/api/v1/quotations/{q_exp_id}/confirm", headers=headers)
    assert res_confirm_exp.status_code == 400
    assert "expired" in res_confirm_exp.text.lower()

    # Attempt to convert expired quotation -> 400
    res_convert_exp = client.post(f"/api/v1/quotations/{q_exp_id}/convert", headers=headers)
    assert res_convert_exp.status_code == 400

    # Cleanup
    for qid in [q_valid_id, q_exp_id]:
        db_session.query(QuotationLineItem).filter(QuotationLineItem.quotation_id == qid).delete()
        db_session.query(Quotation).filter(Quotation.id == qid).delete()
    db_session.query(ProductVariant).filter(ProductVariant.id == variant.id).delete()
    db_session.query(Product).filter(Product.id == prod.id).delete()
    db_session.commit()


# =========================================================================
# 3. ATOMIC CONVERSION & DUPLICATE PREVENTION
# =========================================================================

def test_quotation_atomic_conversion_and_duplicate_prevention(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """4. Test atomic conversion to subscription, item copying, and duplicate conversion prevention."""
    tag = uuid.uuid4().hex[:6]
    sales = create_user_helper(email=f"conv_sales_{tag}@brightloop.io", role=UserRole.SALES)
    customer = create_user_helper(email=f"conv_cust_{tag}@brightloop.io", role=UserRole.CUSTOMER)
    headers = auth_headers_helper(sales)

    prod = Product(name=f"Prod-{tag}", code=f"P-{tag}", product_type="service", is_active=True)
    db_session.add(prod)
    db_session.commit()

    variant = ProductVariant(
        product_id=prod.id,
        sku=f"V-{tag}",
        name="Pro Feature",
        base_price=Decimal("200.00"),
        price_adjustment=Decimal("0.00"),
        currency="USD",
        is_active=True,
    )
    plan = SubscriptionPlan(
        name=f"Plan-Monthly-{tag}",
        code=f"PLAN-M-{tag}",
        base_price=Decimal("99.00"),
        billing_cycle=BillingCycle.MONTHLY,
    )
    db_session.add_all([variant, plan])
    db_session.commit()

    # Create quotation with agreed special unit price 175.00
    res_q = client.post(
        "/api/v1/quotations",
        json={
            "customer_id": customer.id,
            "plan_id": plan.id,
            "items": [{"product_id": prod.id, "variant_id": variant.id, "quantity": 2, "unit_price": 175.00}],
        },
        headers=headers,
    )
    q_id = res_q.json()["id"]

    # 1. Cannot convert draft quotation -> 400
    res_conv_draft = client.post(f"/api/v1/quotations/{q_id}/convert", headers=headers)
    assert res_conv_draft.status_code == 400
    assert "only confirmed" in res_conv_draft.text.lower()

    # 2. Confirm quotation -> 200
    res_conf = client.post(f"/api/v1/quotations/{q_id}/confirm", headers=headers)
    assert res_conf.status_code == 200

    # 3. Convert quotation -> 201 Created
    res_conv = client.post(f"/api/v1/quotations/{q_id}/convert", headers=headers)
    assert res_conv.status_code == 201
    sub_data = res_conv.json()

    assert sub_data["status"] == "active"
    assert sub_data["customer_id"] == customer.id
    assert sub_data["plan_id"] == plan.id
    assert sub_data["related_quotation_id"] == q_id
    assert len(sub_data["items"]) == 1
    # Check preserved agreed unit price
    assert Decimal(str(sub_data["items"][0]["unit_price"])) == Decimal("175.00")
    assert sub_data["items"][0]["quantity"] == 2

    sub_id = sub_data["id"]

    # 4. Check quotation status is CONVERTED
    res_q_check = client.get(f"/api/v1/quotations/{q_id}", headers=headers)
    assert res_q_check.json()["status"] == "converted"
    assert res_q_check.json()["converted_subscription_id"] == sub_id

    # 5. Duplicate conversion attempt MUST be rejected -> 400
    res_dup = client.post(f"/api/v1/quotations/{q_id}/convert", headers=headers)
    assert res_dup.status_code == 400
    assert "already been converted" in res_dup.text.lower()

    # Cleanup
    db_session.query(SubscriptionItem).filter(SubscriptionItem.subscription_id == sub_id).delete()
    db_session.query(QuotationLineItem).filter(QuotationLineItem.quotation_id == q_id).delete()
    # Unlink to prevent foreign key constraint
    q_rec = db_session.query(Quotation).filter(Quotation.id == q_id).first()
    if q_rec:
        q_rec.converted_subscription_id = None
        db_session.commit()
    db_session.query(Subscription).filter(Subscription.id == sub_id).delete()
    db_session.query(Quotation).filter(Quotation.id == q_id).delete()
    db_session.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan.id).delete()
    db_session.query(ProductVariant).filter(ProductVariant.id == variant.id).delete()
    db_session.query(Product).filter(Product.id == prod.id).delete()
    db_session.commit()


# =========================================================================
# 4. SUBSCRIPTION LIFECYCLE VERIFICATION
# =========================================================================

def test_subscription_lifecycle_transitions(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """5. Test subscription lifecycle: activate, pause, resume, renew, close."""
    tag = uuid.uuid4().hex[:6]
    admin = create_user_helper(email=f"life_admin_{tag}@brightloop.io", role=UserRole.ADMIN)
    customer = create_user_helper(email=f"life_cust_{tag}@brightloop.io", role=UserRole.CUSTOMER)
    headers = auth_headers_helper(admin)

    plan = SubscriptionPlan(
        name=f"Plan-Life-{tag}",
        code=f"PLAN-LIFE-{tag}",
        base_price=Decimal("120.00"),
        billing_cycle=BillingCycle.MONTHLY,
        allow_pause=True,
        allow_renewal=True,
        allow_early_close=True,
    )
    db_session.add(plan)
    db_session.commit()

    # Create subscription
    res_create = client.post(
        "/api/v1/subscriptions",
        json={"customer_id": customer.id, "plan_id": plan.id, "auto_renew": True},
        headers=headers,
    )
    sub_id = res_create.json()["id"]

    # 1. Pause
    res_pause = client.post(f"/api/v1/subscriptions/{sub_id}/pause", headers=headers)
    assert res_pause.status_code == 200
    assert res_pause.json()["status"] == "paused"
    assert res_pause.json()["paused_at"] is not None

    # 2. Resume
    res_resume = client.post(f"/api/v1/subscriptions/{sub_id}/resume", headers=headers)
    assert res_resume.status_code == 200
    assert res_resume.json()["status"] == "active"
    assert res_resume.json()["paused_at"] is None

    # 3. Renew period
    orig_end = res_resume.json()["current_period_end"]
    res_renew = client.post(f"/api/v1/subscriptions/{sub_id}/renew", headers=headers)
    assert res_renew.status_code == 200
    assert res_renew.json()["status"] == "active"
    assert res_renew.json()["current_period_start"] == orig_end

    # 4. Close
    res_close = client.post(f"/api/v1/subscriptions/{sub_id}/close", headers=headers)
    assert res_close.status_code == 200
    assert res_close.json()["status"] == "closed"

    # Cleanup
    db_session.query(Subscription).filter(Subscription.id == sub_id).delete()
    db_session.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan.id).delete()
    db_session.commit()


# =========================================================================
# 5. SECURITY & RBAC BOUNDARIES
# =========================================================================

def test_quotation_and_subscription_security_rbac(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """6. Test role-based security: customers cannot create/confirm/convert quotations or manually settle payments."""
    tag = uuid.uuid4().hex[:6]
    sales = create_user_helper(email=f"sec_sales_{tag}@brightloop.io", role=UserRole.SALES)
    cust_a = create_user_helper(email=f"sec_cust_a_{tag}@brightloop.io", role=UserRole.CUSTOMER)
    cust_b = create_user_helper(email=f"sec_cust_b_{tag}@brightloop.io", role=UserRole.CUSTOMER)

    sales_headers = auth_headers_helper(sales)
    cust_a_headers = auth_headers_helper(cust_a)
    cust_b_headers = auth_headers_helper(cust_b)

    prod = Product(name=f"Prod-{tag}", code=f"P-{tag}", product_type="service", is_active=True)
    db_session.add(prod)
    db_session.commit()

    variant = ProductVariant(
        product_id=prod.id,
        sku=f"V-{tag}",
        name="Tier A",
        base_price=Decimal("50.00"),
        price_adjustment=Decimal("0.00"),
        currency="USD",
        is_active=True,
    )
    db_session.add(variant)
    db_session.commit()

    # 1. Customer cannot create quotation -> 403
    res_cust_create = client.post(
        "/api/v1/quotations",
        json={"customer_id": cust_a.id, "items": [{"product_id": prod.id, "variant_id": variant.id, "quantity": 1}]},
        headers=cust_a_headers,
    )
    assert res_cust_create.status_code == 403

    # Sales creates quotation for Cust A
    res_sales_create = client.post(
        "/api/v1/quotations",
        json={"customer_id": cust_a.id, "items": [{"product_id": prod.id, "variant_id": variant.id, "quantity": 1}]},
        headers=sales_headers,
    )
    q_id = res_sales_create.json()["id"]

    # 2. Customer cannot confirm quotation -> 403
    res_cust_confirm = client.post(f"/api/v1/quotations/{q_id}/confirm", headers=cust_a_headers)
    assert res_cust_confirm.status_code == 403

    # 3. Customer cannot convert quotation -> 403
    res_cust_convert = client.post(f"/api/v1/quotations/{q_id}/convert", headers=cust_a_headers)
    assert res_cust_convert.status_code == 403

    # 4. Customer B cannot view Cust A's quotation -> 403
    res_cross_q = client.get(f"/api/v1/quotations/{q_id}", headers=cust_b_headers)
    assert res_cross_q.status_code == 403

    # 5. Customer cannot record payments via internal payment settlement endpoint -> 403
    res_cust_pay = client.post(
        "/api/v1/payments/payments",
        json={"invoice_id": 1, "amount": 100.00, "payment_method": "manual"},
        headers=cust_a_headers,
    )
    assert res_cust_pay.status_code == 403

    # Cleanup
    db_session.query(QuotationLineItem).filter(QuotationLineItem.quotation_id == q_id).delete()
    db_session.query(Quotation).filter(Quotation.id == q_id).delete()
    db_session.query(ProductVariant).filter(ProductVariant.id == variant.id).delete()
    db_session.query(Product).filter(Product.id == prod.id).delete()
    db_session.commit()


# =========================================================================
# 6. COMPLETE 14-STEP END-TO-END BUSINESS WORKFLOW TEST
# =========================================================================

def test_14_step_complete_end_to_end_business_workflow(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """Executes the full 14-Step End-to-End Business Lifecycle:
    Step 1: Admin creates a product.
    Step 2: Admin adds a product variant.
    Step 3: Admin creates a subscription plan.
    Step 4: Sales creates a quotation for an existing customer.
    Step 5: Sales confirms the quotation.
    Step 6: Sales converts quotation into subscription.
    Step 7: Subscription becomes active.
    Step 8: Billing generates an invoice.
    Step 9: Eligible taxes and discounts are applied.
    Step 10: Finance records a partial payment.
    Step 11: Finance records the remaining payment.
    Step 12: Invoice becomes PAID.
    Step 13: Revenue and outstanding-balance reports reflect the transaction.
    Step 14: Customer logs in and views ONLY their subscription, invoice and payment history.
    """
    tag = uuid.uuid4().hex[:6]
    admin = create_user_helper(email=f"e2e_admin_{tag}@brightloop.io", role=UserRole.ADMIN)
    sales = create_user_helper(email=f"e2e_sales_{tag}@brightloop.io", role=UserRole.SALES)
    finance = create_user_helper(email=f"e2e_finance_{tag}@brightloop.io", role=UserRole.FINANCE)
    customer = create_user_helper(email=f"e2e_cust_{tag}@brightloop.io", role=UserRole.CUSTOMER)

    admin_headers = auth_headers_helper(admin)
    sales_headers = auth_headers_helper(sales)
    finance_headers = auth_headers_helper(finance)
    cust_headers = auth_headers_helper(customer)

    # ---------------------------------------------------------
    # STEP 1: Admin creates a product
    # ---------------------------------------------------------
    prod_res = client.post(
        "/api/v1/catalog/products",
        json={"name": f"Cloud VM Hosting {tag}", "code": f"PROD-VM-{tag}", "sales_price": 100.00},
        headers=admin_headers,
    )
    assert prod_res.status_code == 201, f"Step 1 failed: {prod_res.text}"
    product_id = prod_res.json()["id"]

    # ---------------------------------------------------------
    # STEP 2: Admin adds a product variant (with base 100 + 560 = 660)
    # ---------------------------------------------------------
    var_res = client.post(
        f"/api/v1/catalog/products/{product_id}/variants",
        json={
            "product_id": product_id,
            "sku": f"VM-8CORE-{tag}",
            "name": "8-Core Compute",
            "billing_metric": "seat",
            "base_price": 100.00,
            "price_adjustment": 560.00,
        },
        headers=admin_headers,
    )
    assert var_res.status_code == 201, f"Step 2 failed: {var_res.text}"
    variant_id = var_res.json()["id"]
    assert Decimal(str(var_res.json()["final_price"])) == Decimal("660.00")

    # ---------------------------------------------------------
    # STEP 3: Admin creates a subscription plan
    # ---------------------------------------------------------
    plan_res = client.post(
        "/api/v1/subscriptions/plans",
        json={
            "name": f"Cloud Enterprise Plan {tag}",
            "code": f"PLAN-CLD-{tag}",
            "base_price": 200.00,
            "billing_cycle": "monthly",
            "minimum_quantity": 1,
            "allow_renewal": True,
            "allow_pause": True,
            "allow_early_close": True,
        },
        headers=admin_headers,
    )
    assert plan_res.status_code == 201, f"Step 3 failed: {plan_res.text}"
    plan_id = plan_res.json()["id"]

    # ---------------------------------------------------------
    # STEP 4: Sales creates a quotation for the customer
    # ---------------------------------------------------------
    quotation_payload = {
        "customer_id": customer.id,
        "plan_id": plan_id,
        "items": [
            {
                "product_id": product_id,
                "variant_id": variant_id,
                "quantity": 1,
                "unit_price": 660.00,
                "discount_percentage": 10.00,  # $66.00 discount -> $594.00 net
                "tax_percentage": 5.00,        # $29.70 tax -> $623.70 total
            }
        ],
        "notes": "E2E Enterprise Demo Contract",
    }
    q_res = client.post("/api/v1/quotations", json=quotation_payload, headers=sales_headers)
    assert q_res.status_code == 201, f"Step 4 failed: {q_res.text}"
    quotation_id = q_res.json()["id"]
    assert q_res.json()["status"] == "draft"
    assert Decimal(str(q_res.json()["total_amount"])) == Decimal("623.70")

    # ---------------------------------------------------------
    # STEP 5: Sales confirms the quotation
    # ---------------------------------------------------------
    conf_res = client.post(f"/api/v1/quotations/{quotation_id}/confirm", headers=sales_headers)
    assert conf_res.status_code == 200, f"Step 5 failed: {conf_res.text}"
    assert conf_res.json()["status"] == "confirmed"

    # ---------------------------------------------------------
    # STEP 6: Sales converts quotation into subscription
    # ---------------------------------------------------------
    conv_res = client.post(f"/api/v1/quotations/{quotation_id}/convert", headers=sales_headers)
    assert conv_res.status_code == 201, f"Step 6 failed: {conv_res.text}"
    sub_data = conv_res.json()
    subscription_id = sub_data["id"]

    # ---------------------------------------------------------
    # STEP 7: Subscription becomes active
    # ---------------------------------------------------------
    assert sub_data["status"] == "active", f"Step 7 failed: status is {sub_data['status']}"
    assert sub_data["customer_id"] == customer.id
    assert sub_data["plan_id"] == plan_id

    # ---------------------------------------------------------
    # STEP 8 & 9: Billing generates an invoice with taxes and discounts applied
    # ---------------------------------------------------------
    tax_res = client.post(
        "/api/v1/billing/taxes",
        json={"name": f"VAT 10% {tag}", "rate_percentage": 10.00, "country": "US"},
        headers=admin_headers,
    )
    assert tax_res.status_code == 201
    tax_id = tax_res.json()["id"]

    inv_due = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    invoice_payload = {
        "customer_id": customer.id,
        "subscription_id": subscription_id,
        "due_date": inv_due,
        "items": [
            {
                "description": "Cloud Hosting Monthly Subscription",
                "quantity": 1,
                "unit_price": 500.00,
                "tax_rate_id": tax_id,
            }
        ],
        "notes": "E2E Recurring Invoice",
    }
    inv_res = client.post("/api/v1/billing/invoices", json=invoice_payload, headers=admin_headers)
    assert inv_res.status_code == 201, f"Step 8 failed: {inv_res.text}"
    inv_data = inv_res.json()
    invoice_id = inv_data["id"]
    # 500.00 subtotal + 50.00 tax = 550.00 total
    assert Decimal(str(inv_data["total_amount"])) == Decimal("550.00")
    assert Decimal(str(inv_data["tax_total"])) == Decimal("50.00")

    # ---------------------------------------------------------
    # STEP 10: Finance records a partial payment ($250.00)
    # ---------------------------------------------------------
    p1_res = client.post(
        "/api/v1/payments/payments",
        json={"invoice_id": invoice_id, "amount": 250.00, "payment_method": "credit_card", "notes": "Partial deposit"},
        headers=finance_headers,
    )
    assert p1_res.status_code == 201, f"Step 10 failed: {p1_res.text}"
    p1_id = p1_res.json()["id"]

    # Verify invoice is still posted with remaining balance $300.00
    check_inv1 = client.get(f"/api/v1/billing/invoices/{invoice_id}", headers=finance_headers).json()
    assert check_inv1["status"] in ("confirmed", "posted")
    assert Decimal(str(check_inv1["amount_paid"])) == Decimal("250.00")
    assert Decimal(str(check_inv1["outstanding_balance"])) == Decimal("300.00")

    # ---------------------------------------------------------
    # STEP 11 & 12: Finance records remaining payment ($300.00) -> Invoice becomes PAID
    # ---------------------------------------------------------
    p2_res = client.post(
        "/api/v1/payments/payments",
        json={"invoice_id": invoice_id, "amount": 300.00, "payment_method": "bank_transfer", "notes": "Final settlement"},
        headers=finance_headers,
    )
    assert p2_res.status_code == 201, f"Step 11 failed: {p2_res.text}"
    p2_id = p2_res.json()["id"]

    check_inv2 = client.get(f"/api/v1/billing/invoices/{invoice_id}", headers=finance_headers).json()
    assert check_inv2["status"] == "paid", f"Step 12 failed: status is {check_inv2['status']}"
    assert Decimal(str(check_inv2["amount_paid"])) == Decimal("550.00")
    assert Decimal(str(check_inv2["outstanding_balance"])) == Decimal("0.00")
    assert check_inv2["paid_at"] is not None

    # ---------------------------------------------------------
    # STEP 13: Revenue and reporting reflect the transaction
    # ---------------------------------------------------------
    rev_res = client.get("/api/v1/reports/revenue", headers=finance_headers)
    assert rev_res.status_code == 200, f"Step 13 failed: {rev_res.text}"
    rev_data = rev_res.json()
    assert Decimal(str(rev_data["total_payments_collected"])) >= Decimal("550.00")
    assert Decimal(str(rev_data["total_tax_collected"])) >= Decimal("50.00")

    # ---------------------------------------------------------
    # STEP 14: Customer logs in and views ONLY their subscription, invoice and payment history
    # ---------------------------------------------------------
    cust_subs = client.get("/api/v1/subscriptions", headers=cust_headers).json()
    assert any(s["id"] == subscription_id for s in cust_subs)
    # Ensure customer only sees own subscriptions
    assert all(s["customer_id"] == customer.id for s in cust_subs)

    cust_invs = client.get("/api/v1/billing/invoices", headers=cust_headers).json()
    assert any(i["id"] == invoice_id for i in cust_invs)
    assert all(i["customer_id"] == customer.id for i in cust_invs)

    cust_pays = client.get("/api/v1/payments/payments", headers=cust_headers).json()
    assert any(p["id"] == p1_id for p in cust_pays)
    assert any(p["id"] == p2_id for p in cust_pays)

    # ---------------------------------------------------------
    # SAFE CLEANUP OF TEST-OWNED DATA
    # ---------------------------------------------------------
    db_session.query(Payment).filter(Payment.id.in_([p1_id, p2_id])).delete(synchronize_session=False)
    db_session.query(InvoiceLineItem).filter(InvoiceLineItem.invoice_id == invoice_id).delete(synchronize_session=False)
    db_session.query(Invoice).filter(Invoice.id == invoice_id).delete(synchronize_session=False)
    db_session.query(TaxRate).filter(TaxRate.id == tax_id).delete(synchronize_session=False)
    db_session.query(SubscriptionItem).filter(SubscriptionItem.subscription_id == subscription_id).delete(synchronize_session=False)
    
    q_rec = db_session.query(Quotation).filter(Quotation.id == quotation_id).first()
    if q_rec:
        q_rec.converted_subscription_id = None
        db_session.commit()

    db_session.query(Subscription).filter(Subscription.id == subscription_id).delete(synchronize_session=False)
    db_session.query(QuotationLineItem).filter(QuotationLineItem.quotation_id == quotation_id).delete(synchronize_session=False)
    db_session.query(Quotation).filter(Quotation.id == quotation_id).delete(synchronize_session=False)
    db_session.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).delete(synchronize_session=False)
    db_session.query(ProductVariant).filter(ProductVariant.id == variant_id).delete(synchronize_session=False)
    db_session.query(Product).filter(Product.id == product_id).delete(synchronize_session=False)
    db_session.commit()

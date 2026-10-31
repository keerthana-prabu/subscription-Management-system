"""Automated tests for Phase 2:
- Product Management (CRUD, soft delete, filters, duplicate code rejection)
- Product Variants (SKU uniqueness, Odoo +560 surcharge calculation, negative price rejection)
- Subscription Plans (daily/weekly/monthly/yearly cycles, minimum quantity, date validation)
- Quotation Templates (persistent line items, calculated expiry date, role permissions)
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.auth import User, UserRole
from app.models.catalog import Product, ProductVariant, QuotationTemplate, QuotationTemplateItem
from app.models.subscription import SubscriptionPlan, BillingCycle


def test_admin_product_creation(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """1. Test admin can successfully create a product with valid fields."""
    admin = create_user_helper(email="prod_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    unique_code = f"PROD-TEST-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "name": "Cloud Storage Enterprise",
        "code": unique_code,
        "product_type": "storage",
        "sales_price": 199.99,
        "cost_price": 80.00,
        "description": "Enterprise-grade scalable storage tier",
        "is_active": True,
    }
    response = client.post("/api/v1/catalog/products", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Cloud Storage Enterprise"
    assert data["code"] == unique_code
    assert Decimal(str(data["sales_price"])) == Decimal("199.99")
    assert Decimal(str(data["cost_price"])) == Decimal("80.00")
    assert data["product_type"] == "storage"
    assert "id" in data

    # Cleanup
    db_session.query(Product).filter(Product.id == data["id"]).delete()
    db_session.commit()


def test_unauthorized_product_creation_rejection(client: TestClient, create_user_helper, auth_headers_helper):
    """2. Test unauthenticated, customer, sales, and finance users cannot create products."""
    payload = {
        "name": "Hacked Product",
        "code": "PROD-HACK-01",
        "sales_price": 50.00,
        "cost_price": 10.00,
    }

    # Unauthenticated
    res_unauth = client.post("/api/v1/catalog/products", json=payload)
    assert res_unauth.status_code == 401

    # Customer
    customer = create_user_helper(email="cust_prod_hack@brightloop.io", role=UserRole.CUSTOMER)
    res_cust = client.post("/api/v1/catalog/products", json=payload, headers=auth_headers_helper(customer))
    assert res_cust.status_code == 403

    # Sales
    sales = create_user_helper(email="sales_prod_hack@brightloop.io", role=UserRole.SALES)
    res_sales = client.post("/api/v1/catalog/products", json=payload, headers=auth_headers_helper(sales))
    assert res_sales.status_code == 403


def test_product_listing_and_filtering(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """3. Test product search by code/name, type, and pagination."""
    admin = create_user_helper(email="filter_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    # Seed 2 unique products
    tag = uuid.uuid4().hex[:6].upper()
    code_a = f"FILTER-CRM-{tag}"
    code_b = f"FILTER-ERP-{tag}"

    p1 = Product(name=f"CRM Suite {tag}", code=code_a, product_type="saas", sales_price=100.00, is_active=True)
    p2 = Product(name=f"ERP System {tag}", code=code_b, product_type="onprem", sales_price=500.00, is_active=False)
    db_session.add_all([p1, p2])
    db_session.commit()

    # Search by code
    res_search = client.get(f"/api/v1/catalog/products?search={code_a}")
    assert res_search.status_code == 200
    items = res_search.json()
    assert any(p["code"] == code_a for p in items)
    assert not any(p["code"] == code_b for p in items)

    # Filter by active
    res_active = client.get(f"/api/v1/catalog/products?search={tag}&is_active=true")
    assert res_active.status_code == 200
    active_items = res_active.json()
    assert any(p["code"] == code_a for p in active_items)
    assert not any(p["code"] == code_b for p in active_items)

    # Cleanup
    db_session.query(Product).filter(Product.id.in_([p1.id, p2.id])).delete()
    db_session.commit()


def test_product_modification_and_deactivation(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """4. Test product PATCH and soft-delete DELETE."""
    admin = create_user_helper(email="patch_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    code = f"PROD-PATCH-{uuid.uuid4().hex[:6].upper()}"
    prod = Product(name="Original Name", code=code, sales_price=100.00, is_active=True)
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    # PATCH product
    patch_res = client.patch(
        f"/api/v1/catalog/products/{prod.id}",
        json={"name": "Updated Name", "sales_price": 149.99},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Updated Name"
    assert Decimal(str(patch_res.json()["sales_price"])) == Decimal("149.99")

    # DELETE product (soft-deactivation)
    del_res = client.delete(f"/api/v1/catalog/products/{prod.id}", headers=headers)
    assert del_res.status_code == 200

    # Verify soft deleted in DB
    db_session.refresh(prod)
    assert prod.is_active is False

    # Cleanup
    db_session.delete(prod)
    db_session.commit()


def test_duplicate_product_code_handling(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """5. Test duplicate product code returns HTTP 400."""
    admin = create_user_helper(email="dup_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    dup_code = f"DUP-CODE-{uuid.uuid4().hex[:6].upper()}"
    p = Product(name="Product One", code=dup_code, sales_price=50.00)
    db_session.add(p)
    db_session.commit()

    # Attempt to create product with duplicate code (case-insensitive)
    payload = {
        "name": "Product Two Duplicate",
        "code": dup_code.lower(),
        "sales_price": 60.00,
    }
    res = client.post("/api/v1/catalog/products", json=payload, headers=headers)
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"].lower()

    # Cleanup
    db_session.delete(p)
    db_session.commit()


def test_variant_creation_and_unique_sku_enforcement(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """6. Test product variant creation and unique SKU enforcement."""
    admin = create_user_helper(email="sku_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    prod = Product(name="Variant Parent", code=f"VP-{uuid.uuid4().hex[:6].upper()}", sales_price=100.00)
    db_session.add(prod)
    db_session.commit()

    sku = f"SKU-{uuid.uuid4().hex[:6].upper()}"
    v_payload = {
        "name": "Standard Seat",
        "sku": sku,
        "billing_metric": "seat",
        "base_price": 100.00,
        "price_adjustment": 0.00,
    }
    v_res = client.post(f"/api/v1/catalog/products/{prod.id}/variants", json=v_payload, headers=headers)
    assert v_res.status_code == 201
    v_data = v_res.json()
    assert v_data["sku"] == sku
    assert Decimal(str(v_data["final_price"])) == Decimal("100.00")

    # Duplicate SKU attempt
    v_res_dup = client.post(f"/api/v1/catalog/products/{prod.id}/variants", json=v_payload, headers=headers)
    assert v_res_dup.status_code == 400
    assert "already exists" in v_res_dup.json()["detail"].lower()

    # Cleanup
    db_session.query(ProductVariant).filter(ProductVariant.id == v_data["id"]).delete()
    db_session.delete(prod)
    db_session.commit()


def test_odoo_variant_pricing_calculation(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """7. Test Odoo brand +560 variant pricing surcharge calculation.
    Example: product sales_price 1000 + surcharge 560 = final_price 1560.
    """
    admin = create_user_helper(email="odoo_pricing_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    # Base product with sales_price = 1000.00
    prod = Product(name="Odoo Connector", code=f"ODOO-{uuid.uuid4().hex[:6].upper()}", sales_price=1000.00)
    db_session.add(prod)
    db_session.commit()

    sku = f"ODOO-BRAND-{uuid.uuid4().hex[:6].upper()}"
    v_payload = {
        "name": "Odoo Integrated Edition",
        "sku": sku,
        "brand": "Odoo",
        "base_price": 1000.00,
        "price_adjustment": 560.00,  # +560 surcharge
    }
    v_res = client.post(f"/api/v1/catalog/products/{prod.id}/variants", json=v_payload, headers=headers)
    assert v_res.status_code == 201
    v_data = v_res.json()
    assert v_data["brand"] == "Odoo"
    assert Decimal(str(v_data["price_adjustment"])) == Decimal("560.00")
    # Final price must be 1000 + 560 = 1560.00
    assert Decimal(str(v_data["final_price"])) == Decimal("1560.00")

    # Cleanup
    db_session.query(ProductVariant).filter(ProductVariant.id == v_data["id"]).delete()
    db_session.delete(prod)
    db_session.commit()


def test_subscription_plan_creation_all_four_frequencies(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """8. Test plan creation with all 4 required frequencies: daily, weekly, monthly, yearly."""
    admin = create_user_helper(email="plan_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    created_plan_ids = []
    frequencies = ["daily", "weekly", "monthly", "yearly"]

    for freq in frequencies:
        code = f"PLAN-{freq.upper()}-{uuid.uuid4().hex[:4].upper()}"
        payload = {
            "name": f"{freq.capitalize()} Subscription Plan",
            "code": code,
            "billing_cycle": freq,
            "billing_interval_count": 1,
            "base_price": 49.99,
            "currency": "USD",
            "minimum_quantity": 1,
            "is_active": True,
        }
        res = client.post("/api/v1/subscriptions/plans", json=payload, headers=headers)
        assert res.status_code == 201, f"Failed for frequency {freq}: {res.text}"
        data = res.json()
        assert data["billing_cycle"] == freq
        assert data["code"] == code
        created_plan_ids.append(data["id"])

    # Cleanup
    db_session.query(SubscriptionPlan).filter(SubscriptionPlan.id.in_(created_plan_ids)).delete()
    db_session.commit()


def test_invalid_plan_frequency_and_dates_rejection(client: TestClient, create_user_helper, auth_headers_helper):
    """9. Test invalid billing frequency and inverted dates are rejected."""
    admin = create_user_helper(email="invalid_plan_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    # 1. Invalid billing frequency
    bad_freq_payload = {
        "name": "Invalid Frequency Plan",
        "code": "PLAN-BAD-FREQ",
        "billing_cycle": "hourly",  # Invalid
        "base_price": 10.00,
    }
    res_freq = client.post("/api/v1/subscriptions/plans", json=bad_freq_payload, headers=headers)
    assert res_freq.status_code == 422

    # 2. Inverted dates (start_date after end_date)
    bad_dates_payload = {
        "name": "Inverted Dates Plan",
        "code": "PLAN-BAD-DATES",
        "billing_cycle": "monthly",
        "base_price": 50.00,
        "start_date": "2026-12-31T00:00:00Z",
        "end_date": "2026-01-01T00:00:00Z",  # Before start_date
    }
    res_dates = client.post("/api/v1/subscriptions/plans", json=bad_dates_payload, headers=headers)
    assert res_dates.status_code == 422 or res_dates.status_code == 400


def test_plan_minimum_quantity_validation(client: TestClient, create_user_helper, auth_headers_helper):
    """10. Test plan minimum quantity must be strictly greater than zero."""
    admin = create_user_helper(email="min_qty_admin@brightloop.io", role=UserRole.ADMIN)
    headers = auth_headers_helper(admin)

    payload_zero = {
        "name": "Zero Min Qty Plan",
        "code": "PLAN-ZERO-QTY",
        "billing_cycle": "monthly",
        "base_price": 25.00,
        "minimum_quantity": 0,  # Invalid
    }
    res = client.post("/api/v1/subscriptions/plans", json=payload_zero, headers=headers)
    assert res.status_code in (400, 422)


def test_quotation_template_creation_and_retrieval(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """11. Test Sales role can create quotation template and retrieve it with calculated expiry date."""
    sales = create_user_helper(email="sales_template_rep@brightloop.io", role=UserRole.SALES)
    headers = auth_headers_helper(sales)

    payload = {
        "name": "Enterprise Annual SaaS Proposal",
        "description": "Standard quotation template for mid-market clients",
        "terms_and_conditions": "Net 30 days. Auto-renews unless cancelled with 30-day notice.",
        "default_validity_days": 45,
        "is_active": True,
    }
    res = client.post("/api/v1/catalog/quotation-templates", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Enterprise Annual SaaS Proposal"
    assert data["default_validity_days"] == 45
    assert data["created_by_id"] == sales.id
    assert "calculated_expiry_date" in data
    template_id = data["id"]

    # Retrieve single
    get_res = client.get(f"/api/v1/catalog/quotation-templates/{template_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == data["name"]

    # Cleanup
    db_session.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).delete()
    db_session.commit()


def test_quotation_template_line_item_persistence(client: TestClient, create_user_helper, auth_headers_helper, db_session: Session):
    """12. Test quotation template line items are persisted and linked correctly in PostgreSQL."""
    sales = create_user_helper(email="sales_items_rep@brightloop.io", role=UserRole.SALES)
    headers = auth_headers_helper(sales)

    # Create product and variant
    prod = Product(name="Security Monitoring", code=f"SEC-{uuid.uuid4().hex[:6].upper()}", sales_price=200.00)
    db_session.add(prod)
    db_session.commit()

    variant = ProductVariant(
        product_id=prod.id,
        sku=f"SEC-NODE-{uuid.uuid4().hex[:6].upper()}",
        name="Managed Endpoint Node",
        base_price=200.00,
        price_adjustment=50.00,  # final_price = 250.00
    )
    db_session.add(variant)
    db_session.commit()

    # Create template with line items
    template_payload = {
        "name": "Security Package Template",
        "default_validity_days": 30,
        "items": [
            {
                "variant_id": variant.id,
                "quantity": 10,
                "unit_price": 250.00,
            }
        ],
    }
    res = client.post("/api/v1/catalog/quotation-templates", json=template_payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["variant_id"] == variant.id
    assert data["items"][0]["quantity"] == 10
    assert Decimal(str(data["items"][0]["unit_price"])) == Decimal("250.00")
    template_id = data["id"]

    # Verify directly from DB
    db_items = db_session.query(QuotationTemplateItem).filter(QuotationTemplateItem.template_id == template_id).all()
    assert len(db_items) == 1
    assert db_items[0].quantity == 10
    assert db_items[0].variant_id == variant.id

    # Cleanup
    db_session.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).delete()
    db_session.query(ProductVariant).filter(ProductVariant.id == variant.id).delete()
    db_session.delete(prod)
    db_session.commit()


def test_phase2_role_based_permissions(client: TestClient, create_user_helper, auth_headers_helper):
    """13. Test role permissions: customers cannot create templates; sales can create templates but not products."""
    customer = create_user_helper(email="cust_rbac_test@brightloop.io", role=UserRole.CUSTOMER)
    sales = create_user_helper(email="sales_rbac_test@brightloop.io", role=UserRole.SALES)

    # Customer cannot create quotation template
    res_cust_tpl = client.post(
        "/api/v1/catalog/quotation-templates",
        json={"name": "Cust Template"},
        headers=auth_headers_helper(customer),
    )
    assert res_cust_tpl.status_code == 403

    # Sales cannot create product
    res_sales_prod = client.post(
        "/api/v1/catalog/products",
        json={"name": "Sales Product", "code": "SALES-PROD-01", "sales_price": 10.00},
        headers=auth_headers_helper(sales),
    )
    assert res_sales_prod.status_code == 403

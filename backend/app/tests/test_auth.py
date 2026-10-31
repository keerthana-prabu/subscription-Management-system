"""Comprehensive automated tests for authentication, role-based authorization,
JWT lifecycle, staff provisioning, and password reset flows.
"""

from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, generate_reset_token, hash_reset_token
from app.core.dependencies import check_resource_access
from app.models.auth import User, UserRole, PasswordResetToken
from fastapi import HTTPException


# =========================================================================
# 1. USER REGISTRATION TESTS
# =========================================================================

def test_register_valid_customer(client: TestClient, db_session: Session):
    """Test successful registration of a customer account."""
    email = "new_customer_valid@brightloop.io"
    # Ensure clean state
    existing = db_session.query(User).filter(User.email == email).first()
    if existing:
        db_session.delete(existing)
        db_session.commit()

    payload = {
        "email": email,
        "password": "ValidP@ssw0rd999",
        "full_name": "Valid Customer",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == email
    assert data["full_name"] == "Valid Customer"
    assert data["role"] == "customer"
    assert data["is_active"] is True
    assert "id" in data
    assert "hashed_password" not in data  # Never expose hashed passwords!

    # Cleanup
    user = db_session.query(User).filter(User.id == data["id"]).first()
    if user:
        db_session.delete(user)
        db_session.commit()


def test_register_password_complexity_rules(client: TestClient):
    """Test that passwords violating complexity rules are rejected (422)."""
    base_payload = {
        "email": "pwd_test@brightloop.io",
        "full_name": "Password Tester",
    }

    # 1. Too short (length <= 8)
    res = client.post("/api/v1/auth/register", json={**base_payload, "password": "Ab1!cde"})
    assert res.status_code == 422
    assert "greater than 8 characters" in str(res.json())

    res = client.post("/api/v1/auth/register", json={**base_payload, "password": "Ab1!cdef"})
    assert res.status_code == 422
    assert "greater than 8 characters" in str(res.json())

    # 2. No uppercase
    res = client.post("/api/v1/auth/register", json={**base_payload, "password": "lowercase123!@#"})
    assert res.status_code == 422
    assert "uppercase" in str(res.json())

    # 3. No lowercase
    res = client.post("/api/v1/auth/register", json={**base_payload, "password": "UPPERCASE123!@#"})
    assert res.status_code == 422
    assert "lowercase" in str(res.json())

    # 4. No special character
    res = client.post("/api/v1/auth/register", json={**base_payload, "password": "UppercaseLowercase123"})
    assert res.status_code == 422
    assert "special character" in str(res.json())


def test_register_duplicate_email_case_insensitive(client: TestClient, create_user_helper):
    """Test that duplicate email registration is rejected regardless of case."""
    create_user_helper(
        email="existing_unique@brightloop.io",
        password="P@ssw0rdUnique123",
        full_name="Original User",
    )

    # Attempt registration with upper/mixed case
    payload = {
        "email": "Existing_UNIQUE@brightloop.io",
        "password": "NewP@ssw0rd999!",
        "full_name": "Duplicate User",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


def test_register_public_cannot_self_assign_privileged_role(client: TestClient, db_session: Session):
    """Test that public registration always results in customer role, ignoring privileged role requests."""
    email = "hacker_wannabe@brightloop.io"
    existing = db_session.query(User).filter(User.email == email).first()
    if existing:
        db_session.delete(existing)
        db_session.commit()

    payload = {
        "email": email,
        "password": "SecureP@ssw0rd123",
        "full_name": "Sneaky User",
        "role": "admin",  # Attempt privilege escalation
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "customer"  # Strictly customer!

    # Cleanup
    user = db_session.query(User).filter(User.id == data["id"]).first()
    if user:
        db_session.delete(user)
        db_session.commit()


# =========================================================================
# 2. USER LOGIN TESTS
# =========================================================================

def test_login_success(client: TestClient, create_user_helper):
    """Test valid user credentials return JWT token response."""
    email = "login_success@brightloop.io"
    password = "CorrectP@ssw0rd123"
    create_user_helper(email=email, password=password, full_name="Login Success User")

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email.upper(), "password": password},  # Case-insensitive email
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0


def test_login_wrong_password(client: TestClient, create_user_helper):
    """Test login failure with incorrect password returns 401."""
    email = "login_fail_pwd@brightloop.io"
    create_user_helper(email=email, password="ValidP@ssw0rd123")

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongP@ssw0rd999!"},
    )
    assert response.status_code == 401
    assert "invalid email or password" in response.json()["detail"].lower()


def test_login_nonexistent_user(client: TestClient):
    """Test login failure with nonexistent email returns 401."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent_999@brightloop.io", "password": "AnyP@ssw0rd123!"},
    )
    assert response.status_code == 401
    assert "invalid email or password" in response.json()["detail"].lower()


def test_login_inactive_user(client: TestClient, create_user_helper):
    """Test inactive account cannot log in and returns 403."""
    email = "inactive_account@brightloop.io"
    password = "InactiveP@ssw0rd123"
    create_user_helper(email=email, password=password, is_active=False)

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 403
    assert "inactive" in response.json()["detail"].lower()


# =========================================================================
# 3. CURRENT USER & JWT VALIDATION TESTS
# =========================================================================

def test_get_current_user_profile(client: TestClient, create_user_helper, auth_headers_helper):
    """Test /me returns profile for authenticated user."""
    user = create_user_helper(
        email="me_endpoint@brightloop.io",
        full_name="Me User",
        role=UserRole.CUSTOMER,
    )
    headers = auth_headers_helper(user)

    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user.id
    assert data["email"] == user.email
    assert data["full_name"] == "Me User"
    assert data["role"] == "customer"
    assert "hashed_password" not in data


def test_get_current_user_missing_or_invalid_token(client: TestClient):
    """Test /me returns 401 when token is missing or malformed."""
    # Missing token
    res_missing = client.get("/api/v1/auth/me")
    assert res_missing.status_code == 401

    # Invalid token
    res_invalid = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
    assert res_invalid.status_code == 401


def test_jwt_expired_token(client: TestClient, create_user_helper):
    """Test that an expired JWT token is rejected with 401."""
    user = create_user_helper(email="expired_token_user@brightloop.io")
    expired_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value},
        expires_delta=timedelta(seconds=-10),  # In the past
    )
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


# =========================================================================
# 4. STAFF PROVISIONING & RBAC TESTS
# =========================================================================

def test_admin_can_create_sales_and_finance_staff(
    client: TestClient,
    create_user_helper,
    auth_headers_helper,
    db_session: Session,
):
    """Test admin successfully provisions sales and finance staff accounts."""
    admin = create_user_helper(
        email="lead_admin@brightloop.io",
        role=UserRole.ADMIN,
    )
    admin_headers = auth_headers_helper(admin)

    # 1. Create Sales Staff
    sales_email = "sales_agent_01@brightloop.io"
    sales_payload = {
        "email": sales_email,
        "password": "SalesStaffP@ss123",
        "full_name": "Sales Rep 1",
        "role": "sales",
    }
    res_sales = client.post("/api/v1/auth/staff", json=sales_payload, headers=admin_headers)
    assert res_sales.status_code == 201
    sales_data = res_sales.json()
    assert sales_data["role"] == "sales"
    assert sales_data["email"] == sales_email

    # 2. Create Finance Staff
    finance_email = "finance_agent_01@brightloop.io"
    finance_payload = {
        "email": finance_email,
        "password": "FinanceStaffP@ss123",
        "full_name": "Finance Rep 1",
        "role": "finance",
    }
    res_finance = client.post("/api/v1/auth/staff", json=finance_payload, headers=admin_headers)
    assert res_finance.status_code == 201
    finance_data = res_finance.json()
    assert finance_data["role"] == "finance"
    assert finance_data["email"] == finance_email

    # Cleanup staff accounts
    db_session.query(User).filter(User.id.in_([sales_data["id"], finance_data["id"]])).delete()
    db_session.commit()


def test_unauthorized_users_cannot_create_staff(
    client: TestClient,
    create_user_helper,
    auth_headers_helper,
):
    """Test unauthenticated, customer, sales, and finance users cannot access /staff."""
    staff_payload = {
        "email": "unauthorized_staff_attempt@brightloop.io",
        "password": "StaffSecretP@ss123",
        "full_name": "Illegal Staff",
        "role": "sales",
    }

    # 1. Unauthenticated -> 401
    res_unauth = client.post("/api/v1/auth/staff", json=staff_payload)
    assert res_unauth.status_code == 401

    # 2. Customer -> 403
    customer = create_user_helper(email="regular_cust@brightloop.io", role=UserRole.CUSTOMER)
    res_cust = client.post("/api/v1/auth/staff", json=staff_payload, headers=auth_headers_helper(customer))
    assert res_cust.status_code == 403

    # 3. Sales -> 403
    sales = create_user_helper(email="sales_user_only@brightloop.io", role=UserRole.SALES)
    res_sales = client.post("/api/v1/auth/staff", json=staff_payload, headers=auth_headers_helper(sales))
    assert res_sales.status_code == 403

    # 4. Finance -> 403
    finance = create_user_helper(email="finance_user_only@brightloop.io", role=UserRole.FINANCE)
    res_fin = client.post("/api/v1/auth/staff", json=staff_payload, headers=auth_headers_helper(finance))
    assert res_fin.status_code == 403


def test_customer_role_restrictions_and_ownership(create_user_helper):
    """Test customer access is restricted to own records using check_resource_access."""
    customer_a = create_user_helper(email="customer_a@brightloop.io", role=UserRole.CUSTOMER)
    customer_b = create_user_helper(email="customer_b@brightloop.io", role=UserRole.CUSTOMER)
    admin_user = create_user_helper(email="super_admin@brightloop.io", role=UserRole.ADMIN)

    # Customer A accessing their own record succeeds
    check_resource_access(customer_a, customer_a.id)

    # Customer A accessing Customer B's record fails with 403
    try:
        check_resource_access(customer_a, customer_b.id)
        assert False, "Should have raised 403 Forbidden"
    except HTTPException as e:
        assert e.status_code == 403
        assert "own records" in str(e.detail)

    # Admin accessing any record succeeds
    check_resource_access(admin_user, customer_a.id)
    check_resource_access(admin_user, customer_b.id)


# =========================================================================
# 5. PASSWORD RESET TESTS
# =========================================================================

def test_password_reset_full_flow(
    client: TestClient,
    create_user_helper,
    db_session: Session,
):
    """Test complete password reset workflow from request to new password login."""
    initial_password = "InitialSecretP@ss123"
    new_password = "BrandNewSecretP@ss456!"
    email = "forgot_reset_flow@brightloop.io"
    user = create_user_helper(email=email, password=initial_password)

    # 1. Request forgot password
    forgot_res = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert forgot_res.status_code == 200
    assert "reset link has been sent" in forgot_res.json()["message"]
    assert "token" not in forgot_res.json()  # Never leak token in API response

    # 2. Check token in DB (stored as hash)
    reset_record = (
        db_session.query(PasswordResetToken)
        .filter(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .first()
    )
    assert reset_record is not None
    assert reset_record.token_hash is not None

    # For testing: create a known raw token and update token_hash to test reset endpoint
    test_raw_token = generate_reset_token()
    reset_record.token_hash = hash_reset_token(test_raw_token)
    db_session.commit()

    # 3. Submit reset password
    reset_res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": test_raw_token, "new_password": new_password},
    )
    assert reset_res.status_code == 200
    assert "successfully reset" in reset_res.json()["message"]

    # 4. Old password login must fail
    login_old = client.post("/api/v1/auth/login", json={"email": email, "password": initial_password})
    assert login_old.status_code == 401

    # 5. New password login must succeed
    login_new = client.post("/api/v1/auth/login", json={"email": email, "password": new_password})
    assert login_new.status_code == 200
    assert "access_token" in login_new.json()


def test_password_reset_replay_protection(
    client: TestClient,
    create_user_helper,
    db_session: Session,
):
    """Test that a reset token cannot be reused (single-use replay protection)."""
    email = "replay_protect@brightloop.io"
    user = create_user_helper(email=email, password="OriginalP@ss123")

    raw_token = generate_reset_token()
    token_record = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_reset_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    )
    db_session.add(token_record)
    db_session.commit()

    # First reset succeeds
    res1 = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "NewSecretP@ss111!"},
    )
    assert res1.status_code == 200

    # Second reset with SAME token must fail (replay attack blocked)
    res2 = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "AnotherSecretP@ss222!"},
    )
    assert res2.status_code == 400
    assert "invalid or already used" in res2.json()["detail"].lower()


def test_password_reset_token_expiration(
    client: TestClient,
    create_user_helper,
    db_session: Session,
):
    """Test that an expired password reset token is rejected."""
    email = "expired_reset_token@brightloop.io"
    user = create_user_helper(email=email)

    raw_token = generate_reset_token()
    token_record = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_reset_token(raw_token),
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),  # Expired
    )
    db_session.add(token_record)
    db_session.commit()

    res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "ExpiredTokenP@ss123!"},
    )
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()


def test_forgot_password_does_not_reveal_email_existence(client: TestClient):
    """Test forgot-password returns 200 with generic message even for unregistered emails."""
    res = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "completely_unknown_999@brightloop.io"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "reset link has been sent" in data["message"]
    assert "token" not in data


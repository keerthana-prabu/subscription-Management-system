"""Pytest fixtures and test client configuration for backend test suite.

Owner: Member 4 (Payments, Reports & Backend Tests)
"""

from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.core.security import get_password_hash, create_access_token
from app.models.auth import User, UserRole, PasswordResetToken


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """Session-scoped test client for FastAPI application."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide a fresh database session for a test and clean up test users created."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def create_user_helper(db_session: Session):
    """Helper fixture to create test users with specified roles."""
    created_users = []

    def _create_user(
        email: str,
        password: str = "StrongP@ssw0rd123!",
        full_name: str = "Test User",
        role: UserRole = UserRole.CUSTOMER,
        is_active: bool = True,
    ) -> User:
        # Check if already exists from prior run
        existing = db_session.query(User).filter(User.email == email.lower()).first()
        if existing:
            # Delete any dependent reset tokens first
            db_session.query(PasswordResetToken).filter(PasswordResetToken.user_id == existing.id).delete()
            db_session.delete(existing)
            db_session.commit()

        user = User(
            email=email.lower(),
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=role,
            is_active=is_active,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        created_users.append(user.id)
        return user

    yield _create_user

    # Cleanup created users after test
    for uid in created_users:
        u = db_session.query(User).filter(User.id == uid).first()
        if u:
            db_session.query(PasswordResetToken).filter(PasswordResetToken.user_id == u.id).delete()
            db_session.delete(u)
    db_session.commit()


@pytest.fixture
def auth_headers_helper():
    """Helper fixture to generate Authorization headers for a given user."""
    def _get_headers(user: User) -> dict:
        token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
                "role": user.role.value if hasattr(user.role, "value") else str(user.role),
                "name": user.full_name,
            }
        )
        return {"Authorization": f"Bearer {token}"}

    return _get_headers

"""Pytest fixtures and test client configuration for backend test suite.

Owner: Member 4 (Payments, Reports & Backend Tests)
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Session-scoped test client for FastAPI application."""
    with TestClient(app) as test_client:
        yield test_client


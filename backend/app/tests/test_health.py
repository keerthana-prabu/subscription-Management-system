"""Unit tests for root and API health endpoints.

Owner: Member 4 (Payments, Reports & Backend Tests)
"""

from fastapi.testclient import TestClient


def test_root_health_endpoint(client: TestClient):
    """Verify root /health returns HTTP 200 and operational status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "service" in data


def test_api_v1_health_endpoint(client: TestClient):
    """Verify API v1 /api/v1/health returns HTTP 200."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_docs_openapi_available(client: TestClient):
    """Verify OpenAPI specification and Swagger UI are accessible."""
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    openapi_spec = response.json()
    assert "paths" in openapi_spec
    assert "/api/v1/health" in openapi_spec["paths"]
    assert "/api/v1/auth/login" in openapi_spec["paths"]
    assert "/api/v1/subscriptions/plans" in openapi_spec["paths"]
    assert "/api/v1/billing/invoices" in openapi_spec["paths"]
    assert "/api/v1/payments/payments" in openapi_spec["paths"]
    assert "/api/v1/reports/mrr" in openapi_spec["paths"]


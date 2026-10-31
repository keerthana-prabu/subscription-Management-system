"""Health check endpoints for deployment verification and load balancer polling."""

from fastapi import APIRouter
from app.core.config import settings
from app.schemas.common import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns API service operational status, version, and environment.",
)
def get_health() -> HealthResponse:
    """Minimal working health endpoint."""
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        service=settings.PROJECT_NAME,
        environment=settings.ENVIRONMENT,
    )


"""FastAPI Application Entrypoint for Brightloop Subscription Management System."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.schemas.common import HealthResponse
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Brightloop Subscription Management System - Scalable SaaS Billing & Lifecycle Engine",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS middleware for frontend development and cross-origin clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health endpoint
@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Root service health check",
)
def root_health() -> HealthResponse:
    """Minimal root health check endpoint."""
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        service=settings.PROJECT_NAME,
        environment=settings.ENVIRONMENT,
    )

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

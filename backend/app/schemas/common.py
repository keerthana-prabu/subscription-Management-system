"""Shared response schemas, pagination, and health check structures."""

from datetime import datetime, timezone
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class HealthResponse(BaseModel):
    """System health check response."""
    status: str = Field(default="ok", examples=["ok"])
    version: str = Field(..., examples=["0.1.0"])
    service: str = Field(default="subscription-management-system")
    environment: str = Field(default="development")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True


class PaginationMeta(BaseModel):
    """Metadata describing a paginated list."""
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard generic pagination wrapper."""
    items: List[T]
    pagination: PaginationMeta

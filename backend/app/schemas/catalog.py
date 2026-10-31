"""Product catalog, variant, and quotation template request/response schemas.

Owner: Member 2 (Authentication & Catalog Backend)
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProductVariantBase(BaseModel):
    sku: str = Field(..., examples=["BRIGHT-ANALYTICS-SEAT"])
    name: str = Field(..., examples=["Enterprise Analytics Seat"])
    billing_metric: str = Field(default="seat", examples=["seat"])
    base_price: Decimal = Field(..., ge=0, examples=[49.99])
    currency: str = Field(default="USD", min_length=3, max_length=3, examples=["USD"])
    is_active: bool = True


class ProductVariantCreateRequest(ProductVariantBase):
    """Payload to create a new product variant."""
    pass


class ProductVariantUpdateRequest(BaseModel):
    """Payload to modify an existing product variant."""
    name: Optional[str] = None
    billing_metric: Optional[str] = None
    base_price: Optional[Decimal] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None


class ProductVariantResponse(ProductVariantBase):
    """Product variant response schema."""
    id: int
    product_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    name: str = Field(..., examples=["Brightloop Analytics Suite"])
    code: str = Field(..., examples=["PROD-BL-ANALYTICS"])
    description: Optional[str] = Field(None, examples=["End-to-end data telemetry platform"])
    is_active: bool = True


class ProductCreateRequest(ProductBase):
    """Payload to register a new product."""
    variants: Optional[List[ProductVariantCreateRequest]] = None


class ProductUpdateRequest(BaseModel):
    """Payload to modify product metadata."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    """Product detailed response."""
    id: int
    variants: List[ProductVariantResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuotationTemplateBase(BaseModel):
    name: str = Field(..., examples=["Enterprise Annual Tier Quotation"])
    description: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    default_validity_days: int = Field(default=30, ge=1, le=365)
    is_active: bool = True


class QuotationTemplateCreateRequest(QuotationTemplateBase):
    """Payload to create quotation template."""
    pass


class QuotationTemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    default_validity_days: Optional[int] = None
    is_active: Optional[bool] = None


class QuotationTemplateResponse(QuotationTemplateBase):
    """Quotation template detailed response."""
    id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

"""Product catalog, variant, and quotation template request/response schemas.

Owner: Member 2 (Authentication & Catalog Backend)
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProductVariantBase(BaseModel):
    sku: str = Field(..., examples=["BRIGHT-ANALYTICS-SEAT"])
    name: str = Field(..., examples=["Enterprise Analytics Seat"])
    brand: Optional[str] = Field(None, examples=["Odoo"])
    billing_metric: str = Field(default="seat", examples=["seat"])
    base_price: Decimal = Field(default=Decimal("0.00"), ge=0, examples=[49.99])
    price_adjustment: Decimal = Field(default=Decimal("0.00"), examples=[560.00])
    currency: str = Field(default="USD", min_length=3, max_length=3, examples=["USD"])
    is_active: bool = True


class ProductVariantCreateRequest(ProductVariantBase):
    """Payload to create a new product variant."""
    @field_validator("sku")
    @classmethod
    def validate_sku(cls, v: str) -> str:
        cleaned = v.strip().upper()
        if not cleaned:
            raise ValueError("SKU cannot be empty.")
        return cleaned


class ProductVariantUpdateRequest(BaseModel):
    """Payload to modify an existing product variant."""
    name: Optional[str] = None
    sku: Optional[str] = None
    brand: Optional[str] = None
    billing_metric: Optional[str] = None
    base_price: Optional[Decimal] = Field(None, ge=0)
    price_adjustment: Optional[Decimal] = None
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    is_active: Optional[bool] = None


class ProductVariantResponse(ProductVariantBase):
    """Product variant response schema."""
    id: int
    product_id: int
    final_price: Decimal = Field(..., examples=[609.99])
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    name: str = Field(..., examples=["Brightloop Analytics Suite"])
    code: str = Field(..., examples=["PROD-BL-ANALYTICS"])
    product_type: str = Field(default="software", examples=["software"])
    sales_price: Decimal = Field(default=Decimal("0.00"), ge=0, examples=[100.00])
    cost_price: Decimal = Field(default=Decimal("0.00"), ge=0, examples=[50.00])
    description: Optional[str] = Field(None, examples=["End-to-end data telemetry platform"])
    is_active: bool = True


class ProductCreateRequest(ProductBase):
    """Payload to register a new product."""
    variants: Optional[List[ProductVariantCreateRequest]] = None

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        cleaned = v.strip().upper()
        if not cleaned:
            raise ValueError("Product code cannot be empty.")
        return cleaned

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Product name cannot be empty.")
        return cleaned


class ProductUpdateRequest(BaseModel):
    """Payload to modify product metadata."""
    name: Optional[str] = None
    code: Optional[str] = None
    product_type: Optional[str] = None
    sales_price: Optional[Decimal] = Field(None, ge=0)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    """Product detailed response."""
    id: int
    variants: List[ProductVariantResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuotationTemplateItemInput(BaseModel):
    """Line item configuration payload for quotation template."""
    variant_id: int = Field(..., examples=[1])
    quantity: int = Field(default=1, ge=1, examples=[5])
    unit_price: Optional[Decimal] = Field(None, ge=0, examples=[120.00])


class QuotationTemplateItemResponse(BaseModel):
    """Quotation template line item response."""
    id: int
    template_id: int
    variant_id: int
    quantity: int
    unit_price: Decimal
    variant_name: Optional[str] = None
    variant_sku: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuotationTemplateBase(BaseModel):
    name: str = Field(..., examples=["Enterprise Annual Tier Quotation"])
    description: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    default_validity_days: int = Field(default=30, ge=1, le=365)
    plan_id: Optional[int] = None
    is_active: bool = True


class QuotationTemplateCreateRequest(QuotationTemplateBase):
    """Payload to create quotation template with line items."""
    items: Optional[List[QuotationTemplateItemInput]] = None


class QuotationTemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    default_validity_days: Optional[int] = Field(None, ge=1, le=365)
    plan_id: Optional[int] = None
    is_active: Optional[bool] = None
    items: Optional[List[QuotationTemplateItemInput]] = None


class QuotationTemplateResponse(QuotationTemplateBase):
    """Quotation template detailed response."""
    id: int
    created_by_id: Optional[int] = None
    items: List[QuotationTemplateItemResponse] = []
    calculated_expiry_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

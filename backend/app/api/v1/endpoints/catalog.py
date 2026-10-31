"""Product catalog, variants, and quotation templates endpoints.

Owner: Member 2 (Authentication & Catalog Backend)
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.catalog import (
    ProductCreateRequest,
    ProductResponse,
    ProductVariantCreateRequest,
    ProductVariantResponse,
    QuotationTemplateCreateRequest,
    QuotationTemplateResponse,
)
from app.core.dependencies import require_roles

router = APIRouter()


@router.get(
    "/products",
    response_model=List[ProductResponse],
    summary="List active products with variants",
)
def list_products() -> List[ProductResponse]:
    """Retrieve catalog products. Contract defined for Member 2 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Product listing contract defined; implementation pending Member 2.",
    )


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create product (Admin only)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def create_product(payload: ProductCreateRequest) -> ProductResponse:
    """Create product definition. Contract defined for Member 2 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Product creation contract defined; implementation pending Member 2.",
    )


@router.post(
    "/products/{product_id}/variants",
    response_model=ProductVariantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add product variant SKU (Admin only)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def create_product_variant(product_id: int, payload: ProductVariantCreateRequest) -> ProductVariantResponse:
    """Create product variant. Contract defined for Member 2 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Product variant contract defined; implementation pending Member 2.",
    )


@router.get(
    "/quotation-templates",
    response_model=List[QuotationTemplateResponse],
    summary="List quotation templates",
)
def list_quotation_templates() -> List[QuotationTemplateResponse]:
    """Retrieve quotation templates. Contract defined for Member 2 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Quotation templates contract defined; implementation pending Member 2.",
    )


@router.post(
    "/quotation-templates",
    response_model=QuotationTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create quotation template (Sales/Admin)",
    dependencies=[Depends(require_roles(["admin", "sales"]))],
)
def create_quotation_template(payload: QuotationTemplateCreateRequest) -> QuotationTemplateResponse:
    """Create quotation template. Contract defined for Member 2 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Quotation template creation contract defined; implementation pending Member 2.",
    )


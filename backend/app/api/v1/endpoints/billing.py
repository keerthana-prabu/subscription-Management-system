"""Invoices, automated recurring billing, taxes, and discount endpoints.

Owner: Member 3 (Subscriptions & Billing Backend)
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.billing import (
    InvoiceCreateRequest,
    InvoiceResponse,
    TaxRateCreateRequest,
    TaxRateResponse,
    DiscountCreateRequest,
    DiscountResponse,
)
from app.core.dependencies import require_roles

router = APIRouter()


@router.get(
    "/invoices",
    response_model=List[InvoiceResponse],
    summary="List invoices",
)
def list_invoices() -> List[InvoiceResponse]:
    """Retrieve invoices. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Invoice listing contract defined; implementation pending Member 3.",
    )


@router.post(
    "/invoices",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate manual invoice",
)
def create_invoice(payload: InvoiceCreateRequest) -> InvoiceResponse:
    """Create invoice. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Invoice creation contract defined; implementation pending Member 3.",
    )


@router.get(
    "/taxes",
    response_model=List[TaxRateResponse],
    summary="List active tax rates",
)
def list_tax_rates() -> List[TaxRateResponse]:
    """Retrieve tax rates. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Tax rates listing contract defined; implementation pending Member 3.",
    )


@router.post(
    "/taxes",
    response_model=TaxRateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create tax rate rule (Finance/Admin)",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def create_tax_rate(payload: TaxRateCreateRequest) -> TaxRateResponse:
    """Create tax rate. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Tax rate creation contract defined; implementation pending Member 3.",
    )


@router.get(
    "/discounts",
    response_model=List[DiscountResponse],
    summary="List promotional discount codes",
)
def list_discounts() -> List[DiscountResponse]:
    """Retrieve discounts. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Discount listing contract defined; implementation pending Member 3.",
    )


@router.post(
    "/discounts",
    response_model=DiscountResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create discount coupon (Finance/Admin)",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def create_discount(payload: DiscountCreateRequest) -> DiscountResponse:
    """Create discount rule. Contract defined for Member 3 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Discount creation contract defined; implementation pending Member 3.",
    )


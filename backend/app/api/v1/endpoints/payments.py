"""Payment execution, settlement, and refund endpoints.

Owner: Member 4 (Payments, Reports & Backend Tests)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.payment import (
    PaymentCreateRequest,
    PaymentRefundRequest,
    PaymentResponse,
)
from app.core.dependencies import require_roles

router = APIRouter()


@router.post(
    "/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record or process payment for invoice",
)
def create_payment(payload: PaymentCreateRequest) -> PaymentResponse:
    """Process payment. Contract defined for Member 4 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Payment processing contract defined; implementation pending Member 4.",
    )


@router.get(
    "/payments/{payment_id}",
    response_model=PaymentResponse,
    summary="Get payment details",
)
def get_payment(payment_id: int) -> PaymentResponse:
    """Retrieve payment by ID. Contract defined for Member 4 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Payment detail contract defined; implementation pending Member 4.",
    )


@router.post(
    "/payments/{payment_id}/refund",
    response_model=PaymentResponse,
    summary="Issue refund for settled payment (Finance/Admin)",
    dependencies=[Depends(require_roles(["admin", "finance"]))],
)
def refund_payment(payment_id: int, payload: PaymentRefundRequest) -> PaymentResponse:
    """Refund payment transaction. Contract defined for Member 4 implementation."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Payment refund contract defined; implementation pending Member 4.",
    )


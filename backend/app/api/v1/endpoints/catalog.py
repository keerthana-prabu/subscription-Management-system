"""Product catalog, variants, and quotation templates endpoints.

Owner: Member 2 (Authentication & Catalog Backend)
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.auth import User
from app.models.catalog import Product, ProductVariant, QuotationTemplate, QuotationTemplateItem
from app.models.subscription import SubscriptionPlan
from app.schemas.catalog import (
    ProductCreateRequest,
    ProductUpdateRequest,
    ProductResponse,
    ProductVariantCreateRequest,
    ProductVariantUpdateRequest,
    ProductVariantResponse,
    QuotationTemplateCreateRequest,
    QuotationTemplateUpdateRequest,
    QuotationTemplateResponse,
    QuotationTemplateItemResponse,
)
from app.schemas.common import MessageResponse

router = APIRouter()


# =========================================================================
# 1. PRODUCT MANAGEMENT ENDPOINTS
# =========================================================================

@router.get(
    "/products",
    response_model=List[ProductResponse],
    summary="List catalog products with variants",
    description="Retrieve catalog products with optional search by name/code and active status filter.",
)
def list_products(
    search: Optional[str] = Query(None, description="Search term for product name or code"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    product_type: Optional[str] = Query(None, description="Filter by product type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> List[ProductResponse]:
    """Retrieve catalog products with joined variants (avoids N+1 queries)."""
    query = db.query(Product).options(joinedload(Product.variants))

    if is_active is not None:
        query = query.filter(Product.is_active == is_active)

    if product_type is not None:
        query = query.filter(Product.product_type == product_type)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_term),
                Product.code.ilike(search_term),
            )
        )

    products = query.order_by(Product.id.asc()).offset(skip).limit(limit).all()
    return products


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
    summary="Get single product by ID",
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
) -> ProductResponse:
    """Retrieve single product with all associated variants."""
    product = (
        db.query(Product)
        .options(joinedload(Product.variants))
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found.",
        )
    return product


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create product (Admin only)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def create_product(
    payload: ProductCreateRequest,
    db: Session = Depends(get_db),
) -> ProductResponse:
    """Create a new product definition and optional initial variants."""
    code_upper = payload.code.strip().upper()
    existing = db.query(Product).filter(func.upper(Product.code) == code_upper).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with code '{code_upper}' already exists.",
        )

    if payload.sales_price < 0 or payload.cost_price < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product prices cannot be negative.",
        )

    product = Product(
        name=payload.name.strip(),
        code=code_upper,
        product_type=payload.product_type,
        sales_price=payload.sales_price,
        cost_price=payload.cost_price,
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(product)
    db.flush()  # populate product.id

    # Handle optional embedded variants
    if payload.variants:
        for v in payload.variants:
            sku_upper = v.sku.strip().upper()
            existing_sku = db.query(ProductVariant).filter(func.upper(ProductVariant.sku) == sku_upper).first()
            if existing_sku:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Variant SKU '{sku_upper}' already exists.",
                )
            base_p = v.base_price if v.base_price > 0 else payload.sales_price
            variant = ProductVariant(
                product_id=product.id,
                sku=sku_upper,
                name=v.name.strip(),
                brand=v.brand,
                billing_metric=v.billing_metric,
                base_price=base_p,
                price_adjustment=v.price_adjustment,
                currency=v.currency,
                is_active=v.is_active,
            )
            db.add(variant)

    db.commit()
    db.refresh(product)
    return product


@router.patch(
    "/products/{product_id}",
    response_model=ProductResponse,
    summary="Update product metadata (Admin only)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def update_product(
    product_id: int,
    payload: ProductUpdateRequest,
    db: Session = Depends(get_db),
) -> ProductResponse:
    """Modify product properties."""
    product = (
        db.query(Product)
        .options(joinedload(Product.variants))
        .filter(Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found.",
        )

    if payload.code is not None:
        code_upper = payload.code.strip().upper()
        if code_upper != product.code:
            existing = db.query(Product).filter(
                func.upper(Product.code) == code_upper,
                Product.id != product_id,
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product with code '{code_upper}' already exists.",
                )
            product.code = code_upper

    if payload.name is not None:
        name_clean = payload.name.strip()
        if not name_clean:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product name cannot be empty.")
        product.name = name_clean

    if payload.product_type is not None:
        product.product_type = payload.product_type

    if payload.sales_price is not None:
        if payload.sales_price < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sales price cannot be negative.")
        product.sales_price = payload.sales_price

    if payload.cost_price is not None:
        if payload.cost_price < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cost price cannot be negative.")
        product.cost_price = payload.cost_price

    if payload.description is not None:
        product.description = payload.description

    if payload.is_active is not None:
        product.is_active = payload.is_active

    db.commit()
    db.refresh(product)
    return product


@router.delete(
    "/products/{product_id}",
    response_model=MessageResponse,
    summary="Deactivate/Delete product (Admin only)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Soft-delete product through deactivation."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found.",
        )

    product.is_active = False
    # Deactivate associated variants as well
    for v in product.variants:
        v.is_active = False

    db.commit()
    return MessageResponse(message=f"Product '{product.name}' (ID {product_id}) successfully deactivated.")


# =========================================================================
# 2. PRODUCT VARIANTS ENDPOINTS
# =========================================================================

@router.get(
    "/products/{product_id}/variants",
    response_model=List[ProductVariantResponse],
    summary="List variants for a product",
)
def list_product_variants(
    product_id: int,
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
) -> List[ProductVariantResponse]:
    """Retrieve all variants for a specific product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found.",
        )

    query = db.query(ProductVariant).filter(ProductVariant.product_id == product_id)
    if is_active is not None:
        query = query.filter(ProductVariant.is_active == is_active)

    variants = query.order_by(ProductVariant.id.asc()).all()
    return variants


@router.post(
    "/products/{product_id}/variants",
    response_model=ProductVariantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add product variant SKU (Admin only)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def create_product_variant(
    product_id: int,
    payload: ProductVariantCreateRequest,
    db: Session = Depends(get_db),
) -> ProductVariantResponse:
    """Create a new variant under an existing product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found.",
        )

    sku_upper = payload.sku.strip().upper()
    existing_sku = db.query(ProductVariant).filter(func.upper(ProductVariant.sku) == sku_upper).first()
    if existing_sku:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Variant SKU '{sku_upper}' already exists.",
        )

    base_p = payload.base_price if payload.base_price > 0 else product.sales_price
    final_p = base_p + payload.price_adjustment
    if final_p < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Final calculated variant price cannot be negative.",
        )

    variant = ProductVariant(
        product_id=product_id,
        sku=sku_upper,
        name=payload.name.strip(),
        brand=payload.brand.strip() if payload.brand else None,
        billing_metric=payload.billing_metric,
        base_price=base_p,
        price_adjustment=payload.price_adjustment,
        currency=payload.currency,
        is_active=payload.is_active,
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant


@router.patch(
    "/products/{product_id}/variants/{variant_id}",
    response_model=ProductVariantResponse,
    summary="Update product variant (Admin only)",
    dependencies=[Depends(require_roles(["admin"]))],
)
def update_product_variant(
    product_id: int,
    variant_id: int,
    payload: ProductVariantUpdateRequest,
    db: Session = Depends(get_db),
) -> ProductVariantResponse:
    """Modify variant details and surcharge adjustments."""
    variant = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product_id,
        )
        .first()
    )
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Variant with ID {variant_id} for product {product_id} not found.",
        )

    if payload.sku is not None:
        sku_upper = payload.sku.strip().upper()
        if sku_upper != variant.sku:
            existing_sku = (
                db.query(ProductVariant)
                .filter(func.upper(ProductVariant.sku) == sku_upper, ProductVariant.id != variant_id)
                .first()
            )
            if existing_sku:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Variant SKU '{sku_upper}' already exists.",
                )
            variant.sku = sku_upper

    if payload.name is not None:
        cleaned_name = payload.name.strip()
        if not cleaned_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Variant name cannot be empty.")
        variant.name = cleaned_name

    if payload.brand is not None:
        variant.brand = payload.brand.strip() if payload.brand else None

    if payload.billing_metric is not None:
        variant.billing_metric = payload.billing_metric

    if payload.base_price is not None:
        variant.base_price = payload.base_price

    if payload.price_adjustment is not None:
        variant.price_adjustment = payload.price_adjustment

    if payload.currency is not None:
        variant.currency = payload.currency

    if payload.is_active is not None:
        variant.is_active = payload.is_active

    if variant.final_price < 0:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Updated final calculated price cannot be negative.",
        )

    db.commit()
    db.refresh(variant)
    return variant


# =========================================================================
# 3. QUOTATION TEMPLATES ENDPOINTS
# =========================================================================

def _build_quotation_template_response(template: QuotationTemplate) -> QuotationTemplateResponse:
    """Helper to transform ORM QuotationTemplate into QuotationTemplateResponse with calculated expiry date."""
    now_utc = datetime.now(timezone.utc)
    expiry = now_utc + timedelta(days=template.default_validity_days)

    items_out = []
    for it in template.items:
        items_out.append(
            QuotationTemplateItemResponse(
                id=it.id,
                template_id=it.template_id,
                variant_id=it.variant_id,
                quantity=it.quantity,
                unit_price=it.unit_price,
                variant_name=it.variant.name if it.variant else None,
                variant_sku=it.variant.sku if it.variant else None,
                created_at=it.created_at,
                updated_at=it.updated_at,
            )
        )

    return QuotationTemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        terms_and_conditions=template.terms_and_conditions,
        default_validity_days=template.default_validity_days,
        plan_id=template.plan_id,
        is_active=template.is_active,
        created_by_id=template.created_by_id,
        items=items_out,
        calculated_expiry_date=expiry,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.get(
    "/quotation-templates",
    response_model=List[QuotationTemplateResponse],
    summary="List quotation templates",
)
def list_quotation_templates(
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> List[QuotationTemplateResponse]:
    """Retrieve all quotation templates with line items eagerly loaded."""
    query = (
        db.query(QuotationTemplate)
        .options(
            joinedload(QuotationTemplate.items).joinedload(QuotationTemplateItem.variant),
        )
    )
    if is_active is not None:
        query = query.filter(QuotationTemplate.is_active == is_active)

    templates = query.order_by(QuotationTemplate.id.asc()).offset(skip).limit(limit).all()
    return [_build_quotation_template_response(t) for t in templates]


@router.get(
    "/quotation-templates/{template_id}",
    response_model=QuotationTemplateResponse,
    summary="Get quotation template by ID",
)
def get_quotation_template(
    template_id: int,
    db: Session = Depends(get_db),
) -> QuotationTemplateResponse:
    """Retrieve single quotation template with line items."""
    template = (
        db.query(QuotationTemplate)
        .options(
            joinedload(QuotationTemplate.items).joinedload(QuotationTemplateItem.variant),
        )
        .filter(QuotationTemplate.id == template_id)
        .first()
    )
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation template with ID {template_id} not found.",
        )
    return _build_quotation_template_response(template)


@router.post(
    "/quotation-templates",
    response_model=QuotationTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create quotation template (Sales/Admin)",
    dependencies=[Depends(require_roles(["admin", "sales"]))],
)
def create_quotation_template(
    payload: QuotationTemplateCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuotationTemplateResponse:
    """Create a new quotation template with persistent line items."""
    # Verify plan if specified
    if payload.plan_id is not None:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == payload.plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Associated subscription plan ID {payload.plan_id} not found.",
            )

    template = QuotationTemplate(
        name=payload.name.strip(),
        description=payload.description,
        terms_and_conditions=payload.terms_and_conditions,
        default_validity_days=payload.default_validity_days,
        plan_id=payload.plan_id,
        is_active=payload.is_active,
        created_by_id=current_user.id,
    )
    db.add(template)
    db.flush()

    if payload.items:
        for item in payload.items:
            if item.quantity <= 0:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Item quantity must be strictly greater than zero.",
                )
            variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
            if not variant:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Referenced product variant ID {item.variant_id} does not exist.",
                )
            unit_p = item.unit_price if item.unit_price is not None else variant.final_price
            line_item = QuotationTemplateItem(
                template_id=template.id,
                variant_id=item.variant_id,
                quantity=item.quantity,
                unit_price=unit_p,
            )
            db.add(line_item)

    db.commit()

    # Re-fetch with joined relations
    fresh_template = (
        db.query(QuotationTemplate)
        .options(
            joinedload(QuotationTemplate.items).joinedload(QuotationTemplateItem.variant),
        )
        .filter(QuotationTemplate.id == template.id)
        .first()
    )
    return _build_quotation_template_response(fresh_template)


@router.patch(
    "/quotation-templates/{template_id}",
    response_model=QuotationTemplateResponse,
    summary="Update quotation template (Sales/Admin)",
    dependencies=[Depends(require_roles(["admin", "sales"]))],
)
def update_quotation_template(
    template_id: int,
    payload: QuotationTemplateUpdateRequest,
    db: Session = Depends(get_db),
) -> QuotationTemplateResponse:
    """Modify quotation template parameters and optionally replace line items."""
    template = (
        db.query(QuotationTemplate)
        .options(
            joinedload(QuotationTemplate.items).joinedload(QuotationTemplateItem.variant),
        )
        .filter(QuotationTemplate.id == template_id)
        .first()
    )
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation template with ID {template_id} not found.",
        )

    if payload.name is not None:
        clean_name = payload.name.strip()
        if not clean_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Template name cannot be empty.")
        template.name = clean_name

    if payload.description is not None:
        template.description = payload.description

    if payload.terms_and_conditions is not None:
        template.terms_and_conditions = payload.terms_and_conditions

    if payload.default_validity_days is not None:
        template.default_validity_days = payload.default_validity_days

    if payload.plan_id is not None:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == payload.plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Associated subscription plan ID {payload.plan_id} not found.",
            )
        template.plan_id = payload.plan_id

    if payload.is_active is not None:
        template.is_active = payload.is_active

    # If items are specified, update/replace line items
    if payload.items is not None:
        # Delete old items
        db.query(QuotationTemplateItem).filter(QuotationTemplateItem.template_id == template.id).delete()
        for item in payload.items:
            if item.quantity <= 0:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Item quantity must be strictly greater than zero.",
                )
            variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
            if not variant:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Referenced product variant ID {item.variant_id} does not exist.",
                )
            unit_p = item.unit_price if item.unit_price is not None else variant.final_price
            line_item = QuotationTemplateItem(
                template_id=template.id,
                variant_id=item.variant_id,
                quantity=item.quantity,
                unit_price=unit_p,
            )
            db.add(line_item)

    db.commit()

    fresh_template = (
        db.query(QuotationTemplate)
        .options(
            joinedload(QuotationTemplate.items).joinedload(QuotationTemplateItem.variant),
        )
        .filter(QuotationTemplate.id == template.id)
        .first()
    )
    return _build_quotation_template_response(fresh_template)

"""Phase 2 Catalog, Product Variants, Plans, and Quotation Templates schema enhancements

Revision ID: 0003_phase2_catalog_plans
Revises: 0002_password_reset_tokens
Create Date: 2026-10-31 11:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0003_phase2_catalog_plans'
down_revision: Union[str, None] = '0002_password_reset_tokens'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enhance products table
    op.add_column('products', sa.Column('product_type', sa.String(length=64), nullable=False, server_default='software'))
    op.add_column('products', sa.Column('sales_price', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'))
    op.add_column('products', sa.Column('cost_price', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'))

    # 2. Enhance product_variants table
    op.add_column('product_variants', sa.Column('brand', sa.String(length=128), nullable=True))
    op.add_column('product_variants', sa.Column('price_adjustment', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'))

    # 3. Enhance subscription_plans table
    op.add_column('subscription_plans', sa.Column('minimum_quantity', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('subscription_plans', sa.Column('start_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('subscription_plans', sa.Column('end_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('subscription_plans', sa.Column('auto_close', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('subscription_plans', sa.Column('allow_early_close', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('subscription_plans', sa.Column('allow_pause', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('subscription_plans', sa.Column('allow_renewal', sa.Boolean(), nullable=False, server_default=sa.true()))

    # 4. Enhance quotation_templates table
    op.add_column('quotation_templates', sa.Column('plan_id', sa.Integer(), sa.ForeignKey('subscription_plans.id', ondelete='SET NULL'), nullable=True))
    op.create_index(op.f('ix_quotation_templates_plan_id'), 'quotation_templates', ['plan_id'], unique=False)

    # 5. Create quotation_template_items table
    op.create_table(
        'quotation_template_items',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('quotation_templates.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('variant_id', sa.Integer(), sa.ForeignKey('product_variants.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('quotation_template_items')
    op.drop_index(op.f('ix_quotation_templates_plan_id'), table_name='quotation_templates')
    op.drop_column('quotation_templates', 'plan_id')
    op.drop_column('subscription_plans', 'allow_renewal')
    op.drop_column('subscription_plans', 'allow_pause')
    op.drop_column('subscription_plans', 'allow_early_close')
    op.drop_column('subscription_plans', 'auto_close')
    op.drop_column('subscription_plans', 'end_date')
    op.drop_column('subscription_plans', 'start_date')
    op.drop_column('subscription_plans', 'minimum_quantity')
    op.drop_column('product_variants', 'price_adjustment')
    op.drop_column('product_variants', 'brand')
    op.drop_column('products', 'cost_price')
    op.drop_column('products', 'sales_price')
    op.drop_column('products', 'product_type')


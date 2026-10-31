"""Phase 7 Quotations and subscription conversion schema

Revision ID: 0006_phase7_quotations
Revises: 0005_phase5_discounts_payments
Create Date: 2026-10-31 15:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0006_phase7_quotations'
down_revision: Union[str, None] = '0005_phase5_discounts_payments'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create quotations table
    op.create_table(
        'quotations',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('quotation_number', sa.String(length=64), unique=True, index=True, nullable=False),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('plan_id', sa.Integer(), sa.ForeignKey('subscription_plans.id', ondelete='RESTRICT'), nullable=True, index=True),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('quotation_templates.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='draft', index=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('payment_terms', sa.String(length=64), nullable=True, server_default='immediate'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('terms_and_conditions', sa.Text(), nullable=True),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('discount_total', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('tax_total', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('converted_subscription_id', sa.Integer(), sa.ForeignKey('subscriptions.id', ondelete='SET NULL'), nullable=True, unique=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Add quotation_id to subscriptions
    op.add_column('subscriptions', sa.Column('quotation_id', sa.Integer(), sa.ForeignKey('quotations.id', ondelete='SET NULL'), nullable=True))
    op.create_index(op.f('ix_subscriptions_quotation_id'), 'subscriptions', ['quotation_id'], unique=False)

    # 3. Create quotation_line_items table
    op.create_table(
        'quotation_line_items',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('quotation_id', sa.Integer(), sa.ForeignKey('quotations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('variant_id', sa.Integer(), sa.ForeignKey('product_variants.id', ondelete='RESTRICT'), nullable=True, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('tax_percentage', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0.00'),
        sa.Column('discount_percentage', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0.00'),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('quotation_line_items')
    op.drop_index(op.f('ix_subscriptions_quotation_id'), table_name='subscriptions')
    op.drop_column('subscriptions', 'quotation_id')
    op.drop_table('quotations')


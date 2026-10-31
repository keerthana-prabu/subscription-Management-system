"""Initial database schema for Brightloop Subscription Management System

Revision ID: 0001_initial_schema
Revises: None
Create Date: 2026-10-31 09:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users table (Member 2)
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False, server_default='customer'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. Products table (Member 2)
    op.create_table(
        'products',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 3. Product variants table (Member 2)
    op.create_table(
        'product_variants',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('sku', sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('billing_metric', sa.String(length=64), nullable=False, server_default='seat'),
        sa.Column('base_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 4. Quotation templates table (Member 2)
    op.create_table(
        'quotation_templates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('terms_and_conditions', sa.Text(), nullable=True),
        sa.Column('default_validity_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 5. Subscription plans table (Member 3)
    op.create_table(
        'subscription_plans',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('billing_cycle', sa.String(length=32), nullable=False, server_default='monthly'),
        sa.Column('billing_interval_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('base_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('trial_period_days', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 6. Subscriptions table (Member 3)
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('plan_id', sa.Integer(), sa.ForeignKey('subscription_plans.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='draft', index=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('trial_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paused_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('auto_renew', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 7. Subscription items table (Member 3)
    op.create_table(
        'subscription_items',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('subscription_id', sa.Integer(), sa.ForeignKey('subscriptions.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('variant_id', sa.Integer(), sa.ForeignKey('product_variants.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 8. Tax rates table (Member 3)
    op.create_table(
        'tax_rates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('rate_percentage', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('country', sa.String(length=2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 9. Discounts table (Member 3)
    op.create_table(
        'discounts',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('code', sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column('discount_type', sa.String(length=32), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 10. Invoices table (Member 3)
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('invoice_number', sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('subscription_id', sa.Integer(), sa.ForeignKey('subscriptions.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='draft', index=True),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('discount_total', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('tax_total', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 11. Invoice line items table (Member 3)
    op.create_table(
        'invoice_line_items',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('description', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('tax_rate_id', sa.Integer(), sa.ForeignKey('tax_rates.id', ondelete='SET NULL'), nullable=True),
        sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 12. Payments table (Member 4)
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id', ondelete='RESTRICT'), nullable=False, index=True),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending', index=True),
        sa.Column('payment_method', sa.String(length=32), nullable=False, server_default='manual'),
        sa.Column('transaction_reference', sa.String(length=128), nullable=True, unique=True, index=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('refunded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('payments')
    op.drop_table('invoice_line_items')
    op.drop_table('invoices')
    op.drop_table('discounts')
    op.drop_table('tax_rates')
    op.drop_table('subscription_items')
    op.drop_table('subscriptions')
    op.drop_table('subscription_plans')
    op.drop_table('quotation_templates')
    op.drop_table('product_variants')
    op.drop_table('products')
    op.drop_table('users')


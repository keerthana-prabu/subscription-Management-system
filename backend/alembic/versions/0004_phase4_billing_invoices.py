"""Phase 4 Automated recurring billing, invoices, and tax calculation schema

Revision ID: 0004_phase4_billing_invoices
Revises: 0003_phase2_catalog_plans
Create Date: 2026-10-31 12:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0004_phase4_billing_invoices'
down_revision: Union[str, None] = '0003_phase2_catalog_plans'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enhance invoices table
    op.add_column('invoices', sa.Column('payment_terms', sa.String(length=64), nullable=False, server_default='Net 30'))
    op.add_column('invoices', sa.Column('amount_paid', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'))
    op.add_column('invoices', sa.Column('issue_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('invoices', sa.Column('billing_period_start', sa.DateTime(timezone=True), nullable=True))
    op.add_column('invoices', sa.Column('billing_period_end', sa.DateTime(timezone=True), nullable=True))

    # Concurrency and duplicate billing prevention partial unique index
    op.create_index(
        'uq_invoices_subscription_period',
        'invoices',
        ['subscription_id', 'billing_period_start', 'billing_period_end'],
        unique=True,
        postgresql_where=sa.text('subscription_id IS NOT NULL AND billing_period_start IS NOT NULL AND billing_period_end IS NOT NULL'),
    )

    # 2. Enhance invoice_line_items table
    op.add_column('invoice_line_items', sa.Column('product_variant_id', sa.Integer(), sa.ForeignKey('product_variants.id', ondelete='SET NULL'), nullable=True))
    op.add_column('invoice_line_items', sa.Column('tax_rate_percentage', sa.Numeric(precision=5, scale=2), nullable=False, server_default='0.00'))

    # 3. Allow country to be optional on tax_rates
    op.alter_column('tax_rates', 'country', existing_type=sa.String(length=2), nullable=True)


def downgrade() -> None:
    op.alter_column('tax_rates', 'country', existing_type=sa.String(length=2), nullable=False)
    op.drop_column('invoice_line_items', 'tax_rate_percentage')
    op.drop_column('invoice_line_items', 'product_variant_id')
    op.drop_index('uq_invoices_subscription_period', table_name='invoices')
    op.drop_column('invoices', 'billing_period_end')
    op.drop_column('invoices', 'billing_period_start')
    op.drop_column('invoices', 'issue_date')
    op.drop_column('invoices', 'amount_paid')
    op.drop_column('invoices', 'payment_terms')


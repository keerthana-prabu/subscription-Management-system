"""Phase 5 Discounts, payments recording, partial settlements and refunds schema

Revision ID: 0005_phase5_discounts_payments
Revises: 0004_phase4_billing_invoices
Create Date: 2026-10-31 13:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0005_phase5_discounts_payments'
down_revision: Union[str, None] = '0004_phase4_billing_invoices'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enhance discounts table
    op.add_column('discounts', sa.Column('minimum_purchase_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'))
    op.add_column('discounts', sa.Column('minimum_quantity', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('discounts', sa.Column('max_uses', sa.Integer(), nullable=True))
    op.add_column('discounts', sa.Column('current_uses', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('discounts', sa.Column('applicability', sa.String(length=32), nullable=False, server_default='all'))
    op.add_column('discounts', sa.Column('applicable_product_ids', sa.JSON(), nullable=True))
    op.add_column('discounts', sa.Column('applicable_subscription_ids', sa.JSON(), nullable=True))

    # 2. Enhance payments table
    op.add_column('payments', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('payments', sa.Column('refund_amount', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0.00'))
    op.add_column('payments', sa.Column('refund_reason', sa.Text(), nullable=True))

    # 3. Enhance invoices table
    op.add_column('invoices', sa.Column('discount_id', sa.Integer(), sa.ForeignKey('discounts.id', ondelete='SET NULL'), nullable=True))
    op.add_column('invoices', sa.Column('discount_code', sa.String(length=64), nullable=True))
    op.add_column('invoices', sa.Column('notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('invoices', 'notes')
    op.drop_column('invoices', 'discount_code')
    op.drop_column('invoices', 'discount_id')

    op.drop_column('payments', 'refund_reason')
    op.drop_column('payments', 'refund_amount')
    op.drop_column('payments', 'notes')

    op.drop_column('discounts', 'applicable_subscription_ids')
    op.drop_column('discounts', 'applicable_product_ids')
    op.drop_column('discounts', 'applicability')
    op.drop_column('discounts', 'current_uses')
    op.drop_column('discounts', 'max_uses')
    op.drop_column('discounts', 'minimum_quantity')
    op.drop_column('discounts', 'minimum_purchase_amount')


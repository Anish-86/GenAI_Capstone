"""Add store location inventory

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-24 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'stores',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('location', sa.String(255), nullable=False),
        sa.Column('status', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.add_column('users', sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('last_login', sa.DateTime(), nullable=True))
    op.create_foreign_key('fk_users_store_id', 'users', 'stores', ['store_id'], ['id'])
    op.create_table(
        'store_inventory',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=True),
        sa.Column('low_stock_threshold', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id']),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.add_column('inventory_transactions', sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_inventory_transactions_store_id', 'inventory_transactions', 'stores', ['store_id'], ['id'])
    op.add_column('low_stock_alerts', sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('low_stock_alerts', sa.Column('remaining_quantity', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_low_stock_alerts_store_id', 'low_stock_alerts', 'stores', ['store_id'], ['id'])
    op.create_table(
        'complaints',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('store_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('raised_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('complaint_type', sa.String(100), nullable=False),
        sa.Column('priority', sa.String(50), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id']),
        sa.ForeignKeyConstraint(['raised_by'], ['users.id']),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('complaints')
    op.drop_constraint('fk_low_stock_alerts_store_id', 'low_stock_alerts', type_='foreignkey')
    op.drop_column('low_stock_alerts', 'remaining_quantity')
    op.drop_column('low_stock_alerts', 'store_id')
    op.drop_constraint('fk_inventory_transactions_store_id', 'inventory_transactions', type_='foreignkey')
    op.drop_column('inventory_transactions', 'store_id')
    op.drop_table('store_inventory')
    op.drop_constraint('fk_users_store_id', 'users', type_='foreignkey')
    op.drop_column('users', 'last_login')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'store_id')
    op.drop_table('stores')

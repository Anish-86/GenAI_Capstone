"""Initial schema

Revision ID: 0001
Revises: 
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('contact_email', sa.String(255), nullable=False),
        sa.Column('status', sa.Enum('active', 'inactive', 'suspended', name='tenantstatus'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('contact_email')
    )
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password', sa.String(255), nullable=False),
        sa.Column('role', sa.Enum('super_admin', 'retailer_admin', 'inventory_manager', name='userrole'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_table('products',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_name', sa.String(255), nullable=False),
        sa.Column('sku', sa.String(100), nullable=False),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('brand', sa.String(100), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('supplier', sa.String(255), nullable=True),
        sa.Column('warehouse_location', sa.String(255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table('inventory_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('transaction_type', sa.Enum('stock_in', 'stock_out', 'adjustment', name='transactiontype'), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    # Indexes for common queries
    op.create_index('ix_products_tenant_id', 'products', ['tenant_id'])
    op.create_index('ix_products_sku', 'products', ['sku'])
    op.create_index('ix_inventory_transactions_tenant_id', 'inventory_transactions', ['tenant_id'])
    op.create_index('ix_inventory_transactions_product_id', 'inventory_transactions', ['product_id'])
    op.create_index('ix_users_email', 'users', ['email'])


def downgrade() -> None:
    op.drop_index('ix_users_email', table_name='users')
    op.drop_index('ix_inventory_transactions_product_id', table_name='inventory_transactions')
    op.drop_index('ix_inventory_transactions_tenant_id', table_name='inventory_transactions')
    op.drop_index('ix_products_sku', table_name='products')
    op.drop_index('ix_products_tenant_id', table_name='products')
    op.drop_table('inventory_transactions')
    op.drop_table('products')
    op.drop_table('users')
    op.drop_table('tenants')
    op.execute('DROP TYPE IF EXISTS transactiontype')
    op.execute('DROP TYPE IF EXISTS userrole')
    op.execute('DROP TYPE IF EXISTS tenantstatus')

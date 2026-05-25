"""Ensure one inventory record per store product

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-25 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        WITH grouped AS (
            SELECT
                store_id,
                product_id,
                array_agg(id ORDER BY updated_at ASC, id ASC) AS ids,
                COALESCE(SUM(quantity), 0) AS total_quantity,
                COALESCE(MIN(low_stock_threshold), 10) AS low_stock_threshold,
                MAX(updated_at) AS updated_at
            FROM store_inventory
            GROUP BY store_id, product_id
            HAVING COUNT(*) > 1
        )
        UPDATE store_inventory si
        SET
            quantity = grouped.total_quantity,
            low_stock_threshold = grouped.low_stock_threshold,
            updated_at = grouped.updated_at
        FROM grouped
        WHERE si.id = grouped.ids[1]
    """)
    op.execute("""
        WITH grouped AS (
            SELECT array_agg(id ORDER BY updated_at ASC, id ASC) AS ids
            FROM store_inventory
            GROUP BY store_id, product_id
            HAVING COUNT(*) > 1
        )
        DELETE FROM store_inventory si
        USING grouped
        WHERE si.id = ANY(grouped.ids[2:array_length(grouped.ids, 1)])
    """)
    op.create_unique_constraint(
        'uq_store_inventory_store_product',
        'store_inventory',
        ['store_id', 'product_id'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_store_inventory_store_product', 'store_inventory', type_='unique')

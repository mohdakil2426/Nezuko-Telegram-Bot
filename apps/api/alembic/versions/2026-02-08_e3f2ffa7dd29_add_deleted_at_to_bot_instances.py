"""add_deleted_at_to_bot_instances

Revision ID: e3f2ffa7dd29
Revises: abc123456789
Create Date: 2026-02-08 03:28:12.505018

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e3f2ffa7dd29'
down_revision: str | None = 'abc123456789'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add deleted_at columns for soft delete support
    op.add_column('admin_users', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_admin_users_deleted_at'), 'admin_users', ['deleted_at'], unique=False)
    op.add_column('bot_instances', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_bot_instances_deleted_at'), 'bot_instances', ['deleted_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_bot_instances_deleted_at'), table_name='bot_instances')
    op.drop_column('bot_instances', 'deleted_at')
    op.drop_index(op.f('ix_admin_users_deleted_at'), table_name='admin_users')
    op.drop_column('admin_users', 'deleted_at')

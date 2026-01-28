"""add_admin_logs

Revision ID: add_admin_logs
Revises: abcdef123456
Create Date: 2026-01-26 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "add_admin_logs"
down_revision = "abcdef123456"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("level", sa.String(length=10), nullable=False),
        sa.Column("logger", sa.String(length=100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("module", sa.String(length=100), nullable=True),
        sa.Column("function", sa.String(length=100), nullable=True),
        sa.Column("line_no", sa.Integer(), nullable=True),
        sa.Column("path", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_admin_logs_timestamp"), "admin_logs", ["timestamp"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_admin_logs_timestamp"), table_name="admin_logs")
    op.drop_table("admin_logs")

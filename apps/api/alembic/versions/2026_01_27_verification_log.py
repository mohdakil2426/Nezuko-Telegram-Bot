"""Add verification_log table

Revision ID: 2026_01_27_verification_log
Revises: 2026_01_26_add_admin_logs
Create Date: 2026-01-27
"""
# pylint: disable=invalid-name

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_01_27_verification_log"
down_revision: str | None = "add_admin_logs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create verification_log table for analytics."""
    # pylint: disable=no-member
    op.create_table(
        "verification_log",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("group_id", sa.BigInteger(), nullable=False),
        sa.Column("channel_id", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("cached", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for efficient querying
    op.create_index(
        "ix_verification_log_timestamp",
        "verification_log",
        ["timestamp"],
        unique=False,
    )
    op.create_index(
        "ix_verification_log_group_id",
        "verification_log",
        ["group_id"],
        unique=False,
    )
    op.create_index(
        "ix_verification_log_status",
        "verification_log",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_verification_log_user_id",
        "verification_log",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Drop verification_log table."""
    # pylint: disable=no-member
    op.drop_index("ix_verification_log_user_id", table_name="verification_log")
    op.drop_index("ix_verification_log_status", table_name="verification_log")
    op.drop_index("ix_verification_log_group_id", table_name="verification_log")
    op.drop_index("ix_verification_log_timestamp", table_name="verification_log")
    op.drop_table("verification_log")

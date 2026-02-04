"""Add charts analytics tables.

Revision ID: 2026_02_04_charts_analytics
Revises: 2026_01_27_verification_log
Create Date: 2026-02-04 07:00:00.000000

This migration adds:
- api_call_log table for tracking Telegram API calls
- member_count, last_sync_at columns to protected_groups
- subscriber_count, last_sync_at columns to enforced_channels
- error_type column to verification_log
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_02_04_charts_analytics"
down_revision: str | None = "2026_01_27_verification_log"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply migration - add charts analytics tables and columns."""
    # Create api_call_log table
    op.create_table(
        "api_call_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("method", sa.String(50), nullable=False, index=True),
        sa.Column("chat_id", sa.BigInteger(), nullable=True),
        sa.Column("user_id", sa.BigInteger(), nullable=True),
        sa.Column("success", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("error_type", sa.String(50), nullable=True),
        sa.Column("timestamp", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # Add composite index for time-based analytics queries
    op.create_index(
        "idx_api_call_log_method_timestamp",
        "api_call_log",
        ["method", "timestamp"],
    )
    op.create_index(
        "idx_api_call_log_timestamp",
        "api_call_log",
        ["timestamp"],
    )

    # Add member_count and last_sync_at to protected_groups
    op.add_column(
        "protected_groups",
        sa.Column("member_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "protected_groups",
        sa.Column("last_sync_at", sa.DateTime(), nullable=True),
    )

    # Add subscriber_count and last_sync_at to enforced_channels
    op.add_column(
        "enforced_channels",
        sa.Column("subscriber_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "enforced_channels",
        sa.Column("last_sync_at", sa.DateTime(), nullable=True),
    )

    # Add error_type to verification_log
    op.add_column(
        "verification_log",
        sa.Column("error_type", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    """Rollback migration - remove charts analytics tables and columns."""
    # Remove error_type from verification_log
    op.drop_column("verification_log", "error_type")

    # Remove columns from enforced_channels
    op.drop_column("enforced_channels", "last_sync_at")
    op.drop_column("enforced_channels", "subscriber_count")

    # Remove columns from protected_groups
    op.drop_column("protected_groups", "last_sync_at")
    op.drop_column("protected_groups", "member_count")

    # Drop api_call_log table
    op.drop_index("idx_api_call_log_timestamp", table_name="api_call_log")
    op.drop_index("idx_api_call_log_method_timestamp", table_name="api_call_log")
    op.drop_table("api_call_log")

"""Add bot_instance_id and performance indexes

Revision ID: abc123456789
Revises: 5cc8bbb64ffa
Create Date: 2026-02-08 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "abc123456789"
down_revision: str | None = "5cc8bbb64ffa"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add bot_instance_id columns, unique constraints, and performance indexes."""
    # ============================================================================
    # 1. Add bot_instance_id columns with foreign keys
    # ============================================================================

    # Add bot_instance_id to protected_groups
    op.add_column("protected_groups", sa.Column("bot_instance_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_groups_bot_instance",
        "protected_groups",
        "bot_instances",
        ["bot_instance_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Add bot_instance_id to enforced_channels
    op.add_column("enforced_channels", sa.Column("bot_instance_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_channels_bot_instance",
        "enforced_channels",
        "bot_instances",
        ["bot_instance_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Add bot_instance_id to verification_log
    op.add_column("verification_log", sa.Column("bot_instance_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_verification_log_bot_instance",
        "verification_log",
        "bot_instances",
        ["bot_instance_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Add bot_instance_id to api_call_log
    op.add_column("api_call_log", sa.Column("bot_instance_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_api_call_log_bot_instance",
        "api_call_log",
        "bot_instances",
        ["bot_instance_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # ============================================================================
    # 2. Add unique constraints for bot isolation
    # ============================================================================

    # Unique constraint: one group per bot instance
    op.create_unique_constraint(
        "uq_protected_groups_bot_group", "protected_groups", ["bot_instance_id", "group_id"]
    )

    # Unique constraint: one channel per bot instance
    op.create_unique_constraint(
        "uq_enforced_channels_bot_channel", "enforced_channels", ["bot_instance_id", "channel_id"]
    )

    # ============================================================================
    # 3. Add composite indexes for common query patterns
    # ============================================================================

    # verification_log indexes (already exist, adding bot_instance_id variants)
    op.create_index(
        "idx_verification_log_bot_timestamp", "verification_log", ["bot_instance_id", "timestamp"]
    )
    op.create_index(
        "idx_verification_log_bot_status",
        "verification_log",
        ["bot_instance_id", "status", "timestamp"],
    )

    # api_call_log indexes
    op.create_index("idx_api_call_log_timestamp_method", "api_call_log", ["timestamp", "method"])
    op.create_index(
        "idx_api_call_log_bot_timestamp", "api_call_log", ["bot_instance_id", "timestamp"]
    )
    op.create_index(
        "idx_api_call_log_bot_method", "api_call_log", ["bot_instance_id", "method", "timestamp"]
    )

    # admin_audit_log indexes
    op.create_index(
        "idx_admin_audit_log_action_timestamp", "admin_audit_log", ["action", "created_at"]
    )
    op.create_index(
        "idx_admin_audit_log_resource",
        "admin_audit_log",
        ["resource_type", "resource_id", "created_at"],
    )

    # ============================================================================
    # 4. Add full-text search indexes (PostgreSQL GIN)
    # ============================================================================

    # Full-text search on protected_groups.title
    op.execute(
        """
        CREATE INDEX idx_protected_groups_title_gin
        ON protected_groups
        USING gin(to_tsvector('english', COALESCE(title, '')))
        """
    )

    # Full-text search on enforced_channels.title and username
    op.execute(
        """
        CREATE INDEX idx_enforced_channels_title_gin
        ON enforced_channels
        USING gin(to_tsvector('english',
            COALESCE(title, '') || ' ' || COALESCE(username, '')))
        """
    )


def downgrade() -> None:
    """Remove bot_instance_id columns, constraints, and indexes."""
    # ============================================================================
    # Drop full-text search indexes
    # ============================================================================
    op.execute("DROP INDEX IF EXISTS idx_enforced_channels_title_gin")
    op.execute("DROP INDEX IF EXISTS idx_protected_groups_title_gin")

    # ============================================================================
    # Drop composite indexes
    # ============================================================================
    op.drop_index("idx_admin_audit_log_resource", table_name="admin_audit_log")
    op.drop_index("idx_admin_audit_log_action_timestamp", table_name="admin_audit_log")
    op.drop_index("idx_api_call_log_bot_method", table_name="api_call_log")
    op.drop_index("idx_api_call_log_bot_timestamp", table_name="api_call_log")
    op.drop_index("idx_api_call_log_timestamp_method", table_name="api_call_log")
    op.drop_index("idx_verification_log_bot_status", table_name="verification_log")
    op.drop_index("idx_verification_log_bot_timestamp", table_name="verification_log")

    # ============================================================================
    # Drop unique constraints
    # ============================================================================
    op.drop_constraint("uq_enforced_channels_bot_channel", "enforced_channels", type_="unique")
    op.drop_constraint("uq_protected_groups_bot_group", "protected_groups", type_="unique")

    # ============================================================================
    # Drop bot_instance_id columns and foreign keys
    # ============================================================================
    op.drop_constraint("fk_api_call_log_bot_instance", "api_call_log", type_="foreignkey")
    op.drop_column("api_call_log", "bot_instance_id")

    op.drop_constraint("fk_verification_log_bot_instance", "verification_log", type_="foreignkey")
    op.drop_column("verification_log", "bot_instance_id")

    op.drop_constraint("fk_channels_bot_instance", "enforced_channels", type_="foreignkey")
    op.drop_column("enforced_channels", "bot_instance_id")

    op.drop_constraint("fk_groups_bot_instance", "protected_groups", type_="foreignkey")
    op.drop_column("protected_groups", "bot_instance_id")

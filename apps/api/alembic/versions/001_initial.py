"""Initial schema - all tables.

Revision ID: 001_initial
Revises:
Create Date: 2026-02-05

Creates all tables for the Nezuko admin dashboard.
Best Practice: Don't use index=True in Column() and create_index() together.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create all tables."""

    # ===========================================
    # BOT CORE TABLES
    # ===========================================

    # Owners table (bot owners/admins)
    op.create_table(
        "owners",
        sa.Column("user_id", sa.BigInteger(), primary_key=True),
        sa.Column("username", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Protected Groups (groups using the bot)
    op.create_table(
        "protected_groups",
        sa.Column("group_id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "owner_id",
            sa.BigInteger(),
            sa.ForeignKey("owners.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("enabled", sa.Boolean(), server_default=sa.true()),
        sa.Column("params", sa.JSON(), nullable=True),
        sa.Column("member_count", sa.Integer(), server_default="0"),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_protected_groups_owner", "protected_groups", ["owner_id"])

    # Enforced Channels (channels users must join)
    op.create_table(
        "enforced_channels",
        sa.Column("channel_id", sa.BigInteger(), primary_key=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("username", sa.String(255), nullable=True),
        sa.Column("invite_link", sa.Text(), nullable=True),
        sa.Column("subscriber_count", sa.Integer(), server_default="0"),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Group-Channel Links (many-to-many)
    op.create_table(
        "group_channel_links",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("group_id", sa.BigInteger(), nullable=False),
        sa.Column("channel_id", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["group_id"], ["protected_groups.group_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["channel_id"], ["enforced_channels.channel_id"], ondelete="CASCADE"),
    )
    op.create_index("idx_group_channel_links_group", "group_channel_links", ["group_id"])
    op.create_index("idx_group_channel_links_channel", "group_channel_links", ["channel_id"])

    # ===========================================
    # DASHBOARD AUTH TABLES
    # ===========================================

    # Admin Users
    op.create_table(
        "admin_users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("supabase_uid", sa.String(36), nullable=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("full_name", sa.String(100), nullable=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("telegram_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("supabase_uid"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("telegram_id"),
    )

    # Admin Sessions (legacy)
    op.create_table(
        "admin_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("refresh_token", sa.String(512), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["admin_users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("refresh_token"),
    )
    op.create_index("ix_admin_sessions_user_id", "admin_sessions", ["user_id"])
    op.create_index("ix_admin_sessions_expires_at", "admin_sessions", ["expires_at"])

    # Telegram Sessions (new auth)
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("telegram_username", sa.String(255), nullable=True),
        sa.Column("telegram_name", sa.String(255), nullable=False),
        sa.Column("telegram_photo_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_sessions_telegram_id", "sessions", ["telegram_id"])
    op.create_index("idx_sessions_expires_at", "sessions", ["expires_at"])

    # Bot Instances (multi-bot management)
    op.create_table(
        "bot_instances",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("owner_telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("bot_id", sa.BigInteger(), nullable=False),
        sa.Column("bot_username", sa.String(255), nullable=False),
        sa.Column("bot_name", sa.String(255), nullable=True),
        sa.Column("token_encrypted", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("bot_id"),
    )
    op.create_index("idx_bot_instances_owner", "bot_instances", ["owner_telegram_id"])
    op.create_index("idx_bot_instances_bot_id", "bot_instances", ["bot_id"])

    # ===========================================
    # LOGGING TABLES
    # ===========================================

    # Admin Audit Log
    op.create_table(
        "admin_audit_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("resource_type", sa.String(50), nullable=False),
        sa.Column("resource_id", sa.String(100), nullable=True),
        sa.Column("old_value", sa.JSON(), nullable=True),
        sa.Column("new_value", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["admin_users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_admin_audit_log_created_at", "admin_audit_log", ["created_at"])
    op.create_index("ix_admin_audit_log_user_id", "admin_audit_log", ["user_id"])
    op.create_index(
        "idx_admin_audit_log_resource", "admin_audit_log", ["resource_type", "resource_id"]
    )

    # Admin Logs (general logs) - matches AdminLog model
    op.create_table(
        "admin_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("level", sa.String(10), nullable=False),
        sa.Column("logger", sa.String(100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("module", sa.String(100), nullable=True),
        sa.Column("function", sa.String(100), nullable=True),
        sa.Column("line_no", sa.Integer(), nullable=True),
        sa.Column("path", sa.String(255), nullable=True),
    )
    op.create_index("ix_admin_logs_timestamp", "admin_logs", ["timestamp"])
    op.create_index("ix_admin_logs_level", "admin_logs", ["level"])

    # Verification Log
    op.create_table(
        "verification_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("group_id", sa.BigInteger(), nullable=True),
        sa.Column("channel_id", sa.BigInteger(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("cached", sa.Boolean(), server_default=sa.false()),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("error_type", sa.String(50), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_verification_log_timestamp", "verification_log", ["timestamp"])
    op.create_index("ix_verification_log_user_id", "verification_log", ["user_id"])
    op.create_index("ix_verification_log_group_id", "verification_log", ["group_id"])
    op.create_index("ix_verification_log_status", "verification_log", ["status"])

    # API Call Log (for analytics charts)
    op.create_table(
        "api_call_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("method", sa.String(50), nullable=False),
        sa.Column("chat_id", sa.BigInteger(), nullable=True),
        sa.Column("user_id", sa.BigInteger(), nullable=True),
        sa.Column("success", sa.Boolean(), server_default=sa.true()),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("error_type", sa.String(50), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_api_call_log_method", "api_call_log", ["method"])
    op.create_index("idx_api_call_log_method_timestamp", "api_call_log", ["method", "timestamp"])
    op.create_index("idx_api_call_log_timestamp", "api_call_log", ["timestamp"])


def downgrade() -> None:
    """Drop all tables in reverse order."""
    op.drop_table("api_call_log")
    op.drop_table("verification_log")
    op.drop_table("admin_logs")
    op.drop_table("admin_audit_log")
    op.drop_table("bot_instances")
    op.drop_table("sessions")
    op.drop_table("admin_sessions")
    op.drop_table("admin_users")
    op.drop_table("group_channel_links")
    op.drop_table("enforced_channels")
    op.drop_table("protected_groups")
    op.drop_table("owners")

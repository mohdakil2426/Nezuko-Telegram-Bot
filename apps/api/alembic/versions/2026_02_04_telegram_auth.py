"""Add sessions and bot_instances tables for Telegram auth.

Revision ID: 2026_02_04_telegram_auth
Revises: 2026_02_04_charts_analytics
Create Date: 2026-02-04

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2026_02_04_telegram_auth"
down_revision: str | None = "2026_02_04_charts_analytics"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create sessions and bot_instances tables."""
    # Sessions table - stores authenticated user sessions
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("telegram_id", sa.BigInteger, nullable=False, index=True),
        sa.Column("telegram_username", sa.String(255), nullable=True),
        sa.Column("telegram_name", sa.String(255), nullable=False),
        sa.Column("telegram_photo_url", sa.Text, nullable=True),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # Bot instances table - stores multiple bots with encrypted tokens
    op.create_table(
        "bot_instances",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("owner_telegram_id", sa.BigInteger, nullable=False, index=True),
        sa.Column("bot_id", sa.BigInteger, nullable=False, unique=True, index=True),
        sa.Column("bot_username", sa.String(255), nullable=False),
        sa.Column("bot_name", sa.String(255), nullable=True),
        sa.Column("token_encrypted", sa.Text, nullable=False),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Drop sessions and bot_instances tables."""
    op.drop_table("bot_instances")
    op.drop_table("sessions")

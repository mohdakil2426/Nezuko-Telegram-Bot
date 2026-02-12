-- 001_core_tables.sql
-- Core tables: owners, bot_instances, protected_groups, enforced_channels, group_channel_links

CREATE TABLE IF NOT EXISTS owners (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_instances (
    id SERIAL PRIMARY KEY,
    owner_telegram_id BIGINT NOT NULL,
    bot_id BIGINT UNIQUE NOT NULL,
    bot_username VARCHAR(255) NOT NULL,
    bot_name VARCHAR(255),
    token_encrypted TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_instances_owner ON bot_instances (owner_telegram_id);
CREATE INDEX IF NOT EXISTS idx_bot_instances_bot_id ON bot_instances (bot_id);

CREATE TABLE IF NOT EXISTS protected_groups (
    group_id BIGINT PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES owners(user_id) ON DELETE CASCADE,
    title VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    params JSONB DEFAULT '{}',
    member_count INTEGER NOT NULL DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_owner ON protected_groups (owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_enabled ON protected_groups (enabled);

CREATE TABLE IF NOT EXISTS enforced_channels (
    channel_id BIGINT PRIMARY KEY,
    title VARCHAR(255),
    username VARCHAR(255),
    invite_link TEXT,
    subscriber_count INTEGER NOT NULL DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_channel_links (
    id SERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES protected_groups(group_id) ON DELETE CASCADE,
    channel_id BIGINT NOT NULL REFERENCES enforced_channels(channel_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_links_group ON group_channel_links (group_id);
CREATE INDEX IF NOT EXISTS idx_links_channel ON group_channel_links (channel_id);

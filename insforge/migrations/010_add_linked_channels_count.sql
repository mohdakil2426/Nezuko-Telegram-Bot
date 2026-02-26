-- Migration 010: Add linked_channels_count to protected_groups
-- This column was missing from the schema but expected by the web dashboard.

ALTER TABLE protected_groups
  ADD COLUMN IF NOT EXISTS linked_channels_count INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing group_channel_links
UPDATE protected_groups pg
SET linked_channels_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT group_id, COUNT(*) AS cnt
  FROM group_channel_links
  GROUP BY group_id
) sub
WHERE pg.group_id = sub.group_id;

-- Also backfill enforced_channels.linked_groups_count (column exists but was never updated)
UPDATE enforced_channels ec
SET linked_groups_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT channel_id, COUNT(*) AS cnt
  FROM group_channel_links
  GROUP BY channel_id
) sub
WHERE ec.channel_id = sub.channel_id;

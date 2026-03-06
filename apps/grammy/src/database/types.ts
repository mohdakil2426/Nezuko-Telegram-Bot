/**
 * Database entity types matching the canonical schema in
 * `insforge/migrations/009_clean_schema.sql`.
 *
 * All Telegram IDs are `number` — safe up to 2^53 (~9 quadrillion).
 * Telegram IDs are currently <10B, well within JS number precision.
 */

/** Row in `protected_groups` table. */
export interface ProtectedGroup {
  group_id: number;
  owner_id: number;
  title: string | null;
  enabled: boolean;
  params: Record<string, unknown>;
  member_count: number;
  linked_channels_count: number;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Row in `enforced_channels` table. */
export interface EnforcedChannel {
  channel_id: number;
  title: string | null;
  username: string | null;
  invite_link: string | null;
  subscriber_count: number;
  linked_groups_count: number;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Row in `group_channel_links` table. */
export interface GroupChannelLink {
  id: number;
  group_id: number;
  channel_id: number;
  is_required: boolean;
  created_at: string;
}

/** Row in `verification_log` table. */
export interface VerificationLog {
  id: number;
  user_id: number;
  group_id: number;
  channel_id: number;
  status: string;
  latency_ms: number | null;
  cached: boolean;
  error_type: string | null;
  timestamp: string;
}

/** Row in `bot_status` table. */
export interface BotStatus {
  id: number;
  bot_id: number;
  bot_instance_id: number;
  status: string;
  last_heartbeat: string;
  started_at: string | null;
  uptime_seconds: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

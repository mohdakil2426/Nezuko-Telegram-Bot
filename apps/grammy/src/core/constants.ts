/** Auto-delete delay for bot messages in groups (5 minutes). */
export const AUTO_DELETE_DELAY = 300_000;

/** Maximum channels that can be linked to a single group. */
export const MAX_CHANNELS_PER_GROUP = 5;

/** Chat member statuses considered "valid" (user is in the channel). */
export const VALID_MEMBER_STATUSES = ["member", "administrator", "creator", "restricted"] as const;

/** Chat member statuses that indicate administrator privileges. */
export const ADMIN_STATUSES = ["administrator", "creator"] as const;

/** Redis cache key namespace prefixes. */
export const CACHE_NAMESPACES = {
  VERIFIED: "verified",
  MEMBER: "member",
  DEBOUNCE: "verify_debounce",
} as const;

/** Interval durations in milliseconds. */
export const INTERVALS = {
  /** Status heartbeat interval (30 seconds). */
  STATUS_HEARTBEAT: 30_000,
  /** Member sync interval (15 minutes). */
  MEMBER_SYNC: 900_000,
  /** Verify button debounce TTL in seconds. */
  VERIFY_DEBOUNCE: 3,
} as const;

/** Maximum time to wait for in-flight updates during shutdown. */
export const SHUTDOWN_TIMEOUT_MS = 8_000;

/** Telegram update types the bot subscribes to. */
export const ALLOWED_UPDATES = [
  "message",
  "callback_query",
  "chat_member",
  "chat_join_request",
  "my_chat_member",
] as const;

/** Redis key prefix for all Nezuko v2 keys (avoid conflict with Python bot). */
export const CACHE_PREFIX = "nezuko:v2:";

/** Verified cache TTL in seconds (6 hours). */
export const VERIFIED_CACHE_TTL = 21_600;

/** Member cache TTL in seconds (5 minutes). */
export const MEMBER_CACHE_TTL = 300;

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
  ENFORCEMENT_BLOCK: "enforcement_block",
  DEBOUNCE: "verify_debounce",
  CONTRACT: "verify_contract",
  IDEMPOTENCY: "idempotency",
  JOIN_REQUEST_APPROVED: "join_request_approved",
  VERIFICATION_PROMPT: "verification_prompt",
} as const;

/** Interval durations in milliseconds. */
export const INTERVALS = {
  /** Status heartbeat interval (30 seconds). */
  STATUS_HEARTBEAT: 30_000,
  /** Member sync interval (15 minutes). */
  MEMBER_SYNC: 900_000,
  /** Bot runner health watchdog interval (1 minute). */
  RUNNER_WATCHDOG: 60_000,
  /** Verify button debounce TTL in seconds. */
  VERIFY_DEBOUNCE: 3,
  /** Lock TTL for verification/join-request idempotency in seconds. */
  IDEMPOTENCY_LOCK: 15,
  /** Cache TTL for auto-approved join requests in seconds. */
  JOIN_REQUEST_APPROVED: 300,
  /** Cache TTL for an active verification prompt in seconds. */
  VERIFICATION_PROMPT: 300,
  /** Short-lived fast-path block state for recently failed/unverified users. */
  ENFORCEMENT_BLOCK: 300,
} as const;

/** Maximum time a bot may go without processing Telegram updates before it is considered stalled. */
export const RUNNER_STALL_THRESHOLD_MS = 10 * 60_000;

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

/** Chat-member adapter cache TTL in seconds (1 hour). */
export const CHAT_MEMBER_CACHE_TTL = 3_600;

/** Maximum age of a DB-backed "verified" state before forcing fresh revalidation. */
export const VERIFIED_RECHECK_INTERVAL_MS = 600_000;

/** Positive member cache TTL in seconds (5 minutes). */
export const MEMBER_CACHE_TTL = 300;

/** Negative member cache TTL in seconds (30 seconds). */
export const MEMBER_NEGATIVE_CACHE_TTL = 30;

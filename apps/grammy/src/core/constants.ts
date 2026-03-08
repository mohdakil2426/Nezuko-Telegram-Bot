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
  /** Aggregated verdict cache keyed by (group, user, contract revision). */
  VERDICT: "verdict",
  /** Moderation state cache — tracks whether a user is restricted or unrestricted. */
  MOD_STATE: "mod_state",
  /** Verification contract cache — group enforcement configuration. */
  GROUP_CONTRACT: "group_contract",
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
  VERIFY_DEBOUNCE: 1,
  /** Lock TTL for verification/join-request idempotency in seconds. */
  IDEMPOTENCY_LOCK: 15,
  /** Cache TTL for auto-approved join requests in seconds. */
  JOIN_REQUEST_APPROVED: 300,
  /** Cache TTL for an active verification prompt in seconds. */
  VERIFICATION_PROMPT: 300,
  /** Short-lived fast-path block state for recently failed/unverified users. */
  ENFORCEMENT_BLOCK: 300,
} as const;

/**
 * S6 — Verification contract Redis cache TTL in seconds.
 * Contracts only change when an admin runs /protect, /unprotect, or /settings.
 */
export const GROUP_CONTRACT_CACHE_TTL = 300;

/**
 * S4 — Moderation state cache TTL in seconds.
 * Tracks whether a user is "restricted" or "unrestricted" to skip redundant
 * restrictChatMember calls at 746 ms average per call.
 */
export const MOD_STATE_CACHE_TTL = 300;

/** Maximum time a bot may go without processing Telegram updates before it is considered stalled.
 *
 * Set to 2 minutes (was 10 minutes). The previous 10-minute threshold caused the bot to appear
 * dead for up to 10+ minutes during inactivity periods before the watchdog fired.
 * At 2 minutes the watchdog fires while the stall is still invisible to users.
 */
export const RUNNER_STALL_THRESHOLD_MS = 2 * 60_000;

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

/** Extra fresh membership checks for explicit verify clicks after a recent channel rejoin. */
export const VERIFY_FRESH_CHECK_RETRIES = 2;

/** Delay between fresh verify retries to absorb Telegram membership propagation lag. */
export const VERIFY_FRESH_CHECK_RETRY_DELAY_MS = 350;

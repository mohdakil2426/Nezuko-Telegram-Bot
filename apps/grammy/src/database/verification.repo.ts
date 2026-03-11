import type { InsForgeClient } from "../core/insforge-client.js";
import type { VerificationLog } from "./types.js";

/** Data required to log a verification attempt. */
export interface LogVerificationData {
  user_id: number;
  group_id: number;
  channel_id: number;
  /** DB CHECK constraint allows ONLY these three values. */
  status: "verified" | "restricted" | "error";
  latency_ms?: number | null;
  cached?: boolean;
  error_type?: string | null;
}

export interface LatestVerificationState {
  status: VerificationLog["status"];
  timestamp: string;
}

/**
 * Insert a verification attempt record into `verification_log`.
 *
 * @param db - InsForgeClient instance
 * @param data - Verification data to log
 */
export async function logVerification(
  db: InsForgeClient,
  data: LogVerificationData
): Promise<void> {
  await db.postRecords<VerificationLog>("verification_log", [
    {
      user_id: data.user_id,
      group_id: data.group_id,
      channel_id: data.channel_id,
      status: data.status,
      latency_ms: data.latency_ms ?? null,
      cached: data.cached ?? false,
      error_type: data.error_type ?? null,
      timestamp: new Date().toISOString(),
    },
  ]);
}


export async function getLatestVerificationState(
  db: InsForgeClient,
  groupId: number,
  userId: number
): Promise<LatestVerificationState | null> {
  const rows = await db.getRecords<Pick<VerificationLog, "status" | "timestamp">>(
    "verification_log",
    {
      group_id: `eq.${groupId}`,
      user_id: `eq.${userId}`,
      select: "status,timestamp",
      order: "timestamp.desc,id.desc",
      limit: "1",
    }
  );

  const latest = rows[0];
  if (!latest) {
    return null;
  }

  return {
    status: latest.status,
    timestamp: latest.timestamp,
  };
}

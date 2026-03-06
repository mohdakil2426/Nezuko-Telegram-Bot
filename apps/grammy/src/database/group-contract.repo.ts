import type { InsForgeClient } from "../core/insforge-client.js";
import type { EnforcedChannel } from "./types.js";
import { getGroupChannels } from "./group.repo.js";

export interface GroupVerificationSettings {
  enabled: boolean;
  joinRequestPreferred: boolean;
}

export interface GroupVerificationContract {
  groupId: number;
  enabled: boolean;
  joinRequestPreferred: boolean;
  channels: EnforcedChannel[];
}

interface GroupVerificationContractRow {
  group_id: number;
  enabled: boolean;
  join_request_preferred: boolean;
  channels: EnforcedChannel[];
}

interface ProtectedGroupRow {
  group_id: number;
  enabled: boolean;
  params?: {
    join_request_preferred?: boolean;
  } | null;
}

export async function getGroupVerificationContract(
  db: InsForgeClient,
  groupId: number
): Promise<GroupVerificationContract> {
  try {
    const row = await db.rpc<GroupVerificationContractRow>("get_group_verification_contract", {
      p_group_id: groupId,
    });

    return {
      groupId: row.group_id,
      enabled: row.enabled,
      joinRequestPreferred: row.join_request_preferred,
      channels: row.channels ?? [],
    };
  } catch {
    const groups = await db.getRecords<ProtectedGroupRow>("protected_groups", {
      group_id: `eq.${groupId}`,
      select: "group_id,enabled,params",
      limit: "1",
    });

    const group = groups[0];
    if (!group) {
      return {
        groupId,
        enabled: false,
        joinRequestPreferred: false,
        channels: [],
      };
    }

    return {
      groupId: group.group_id,
      enabled: group.enabled,
      joinRequestPreferred: Boolean(group.params?.join_request_preferred),
      channels: group.enabled ? await getGroupChannels(db, groupId) : [],
    };
  }
}

export async function getGroupVerificationSettings(
  db: InsForgeClient,
  groupId: number
): Promise<GroupVerificationSettings> {
  const contract = await getGroupVerificationContract(db, groupId);
  return {
    enabled: contract.enabled,
    joinRequestPreferred: contract.joinRequestPreferred,
  };
}

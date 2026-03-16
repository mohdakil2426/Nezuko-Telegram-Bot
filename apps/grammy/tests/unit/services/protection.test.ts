import { describe, it, expect, vi, beforeEach } from "bun:test";
import { muteUser, unmuteUser, kickUser } from "../../../src/services/protection.js";

/** Minimal Telegram API mock matching protection.ts TelegramApi interface. */
function createMockApi(overrides?: {
  restrictChatMember?: ReturnType<typeof vi.fn>;
  banChatMember?: ReturnType<typeof vi.fn>;
  unbanChatMember?: ReturnType<typeof vi.fn>;
}) {
  return {
    restrictChatMember: overrides?.restrictChatMember ?? vi.fn().mockResolvedValue(true),
    banChatMember: overrides?.banChatMember ?? vi.fn().mockResolvedValue(true),
    unbanChatMember: overrides?.unbanChatMember ?? vi.fn().mockResolvedValue(true),
  };
}

describe("muteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls restrictChatMember with all permissions set to false", async () => {
    const api = createMockApi();
    const result = await muteUser(api as never, -100111, 999);

    expect(result.success).toBe(true);
    expect(api.restrictChatMember).toHaveBeenCalledWith(-100111, 999, {
      can_send_messages: false,
      can_send_photos: false,
      can_send_videos: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
    });
  });

  it("returns missing_permission on 403 error (EC-19)", async () => {
    const api = createMockApi({
      restrictChatMember: vi.fn().mockRejectedValue(new Error("403: Forbidden")),
    });
    const result = await muteUser(api as never, -100111, 999);

    expect(result.success).toBe(false);
    expect(result.error).toBe("missing_permission");
  });

  it("propagates unexpected errors (non-403)", async () => {
    const api = createMockApi({
      restrictChatMember: vi.fn().mockRejectedValue(new Error("Network timeout")),
    });

    await expect(muteUser(api as never, -100111, 999)).rejects.toThrow("Network timeout");
  });
});

describe("unmuteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls restrictChatMember with all permissions set to true", async () => {
    const api = createMockApi();
    const result = await unmuteUser(api as never, -100111, 999);

    expect(result.success).toBe(true);
    expect(api.restrictChatMember).toHaveBeenCalledWith(-100111, 999, {
      can_send_messages: true,
      can_send_photos: true,
      can_send_videos: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
    });
  });

  it("returns missing_permission on 403 error", async () => {
    const api = createMockApi({
      restrictChatMember: vi.fn().mockRejectedValue(new Error("403: Forbidden")),
    });
    const result = await unmuteUser(api as never, -100111, 999);

    expect(result.success).toBe(false);
    expect(result.error).toBe("missing_permission");
  });
});

describe("kickUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls banChatMember then unbanChatMember (Telegram kick pattern)", async () => {
    const api = createMockApi();
    const result = await kickUser(api as never, -100111, 999);

    expect(result.success).toBe(true);
    expect(api.banChatMember).toHaveBeenCalledWith(-100111, 999);
    expect(api.unbanChatMember).toHaveBeenCalledWith(-100111, 999, { only_if_banned: true });
  });

  it("returns missing_permission on 403 during kick", async () => {
    const api = createMockApi({
      banChatMember: vi.fn().mockRejectedValue(new Error("403: Forbidden")),
    });
    const result = await kickUser(api as never, -100111, 999);

    expect(result.success).toBe(false);
    expect(result.error).toBe("missing_permission");
  });
});

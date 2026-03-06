import { describe, expect, it, vi } from "vitest";
import {
  syncBotCommands,
  PRIVATE_COMMANDS,
  GROUP_COMMANDS,
  GROUP_ADMIN_COMMANDS,
} from "../../../../apps/grammy/src/core/bot-commands.js";
import { createMockLogger } from "../../helpers/mock-deps.js";

describe("bot command sync", () => {
  it("publishes private, group, and admin command scopes and enables the commands menu", async () => {
    const api = {
      setMyCommands: vi.fn().mockResolvedValue(true),
      setChatMenuButton: vi.fn().mockResolvedValue(true),
    };
    const logger = createMockLogger();

    await syncBotCommands(api, logger);

    expect(api.setMyCommands).toHaveBeenCalledTimes(3);
    expect(api.setMyCommands).toHaveBeenNthCalledWith(1, PRIVATE_COMMANDS, {
      scope: { type: "all_private_chats" },
    });
    expect(api.setMyCommands).toHaveBeenNthCalledWith(2, GROUP_COMMANDS, {
      scope: { type: "all_group_chats" },
    });
    expect(api.setMyCommands).toHaveBeenNthCalledWith(3, GROUP_ADMIN_COMMANDS, {
      scope: { type: "all_chat_administrators" },
    });
    expect(api.setChatMenuButton).toHaveBeenCalledWith({
      menu_button: { type: "commands" },
    });
  });
});

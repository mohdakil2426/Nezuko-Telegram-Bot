import type { BotCommand, BotCommandScope, MenuButtonCommands } from "grammy/types";
import type { Logger } from "../utils/logger.js";

interface CommandApi {
  setMyCommands(
    commands: readonly BotCommand[],
    other?: { scope?: BotCommandScope },
  ): Promise<true>;
  setChatMenuButton(other?: { menu_button?: MenuButtonCommands }): Promise<true>;
}

export const PRIVATE_COMMANDS: readonly BotCommand[] = [
  { command: "start", description: "Start the bot" },
  { command: "help", description: "Get help and commands" },
] as const;

export const GROUP_COMMANDS: readonly BotCommand[] = [
  { command: "help", description: "Show help" },
  { command: "status", description: "Show protection status" },
  { command: "channels", description: "List linked channels" },
  { command: "verify", description: "Check your verification status" },
  { command: "stats", description: "View group statistics" },
] as const;

export const GROUP_ADMIN_COMMANDS: readonly BotCommand[] = [
  ...GROUP_COMMANDS,
  { command: "protect", description: "Link a required channel" },
  { command: "unprotect", description: "Unlink a channel" },
  { command: "settings", description: "View group configuration" },
] as const;

const PRIVATE_SCOPE: BotCommandScope = { type: "all_private_chats" };
const GROUP_SCOPE: BotCommandScope = { type: "all_group_chats" };
const GROUP_ADMIN_SCOPE: BotCommandScope = { type: "all_chat_administrators" };
const COMMANDS_MENU_BUTTON: MenuButtonCommands = { type: "commands" };

export async function syncBotCommands(api: CommandApi, logger: Logger): Promise<void> {
  try {
    await api.setMyCommands(PRIVATE_COMMANDS, { scope: PRIVATE_SCOPE });
    await api.setMyCommands(GROUP_COMMANDS, { scope: GROUP_SCOPE });
    await api.setMyCommands(GROUP_ADMIN_COMMANDS, { scope: GROUP_ADMIN_SCOPE });
    await api.setChatMenuButton({ menu_button: COMMANDS_MENU_BUTTON });
    logger.info("Bot command menus synced for private chats, groups, and group admins");
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "Failed to sync bot command menus",
    );
  }
}

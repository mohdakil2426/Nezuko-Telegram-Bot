/** Centralized user-facing message strings with HTML formatting. */

export const WELCOME_PRIVATE =
  "👋 <b>Hi! I'm Nezuko</b> 🌸\n\n" +
  "I help protect Telegram groups by requiring members to join channels before chatting.\n\n" +
  "➡️ Add me to your group as <b>admin</b>\n" +
  "➡️ Use <code>/protect @channel</code> to get started\n\n" +
  "Type /help for all commands.";

export const WELCOME_GROUP = "✅ I'm active in this group! Use /help for commands.";

export const HELP_TEXT =
  "📖 <b>Commands</b>\n\n" +
  "<code>/start</code> — Show the welcome message\n" +
  "<code>/help</code> — Show this help message\n" +
  "<code>/status</code> — Show protection status\n" +
  "<code>/channels</code> — List linked channels\n" +
  "<code>/verify</code> — Check your verification status\n" +
  "<code>/stats</code> — View group statistics\n" +
  "<code>/protect @channel</code> — Link a channel (members must join to chat)\n" +
  "<code>/unprotect @channel</code> — Unlink a channel\n" +
  "<code>/settings</code> — View group settings\n" +
  "\n" +
  "Admin commands work in groups where I have the required permissions.";

export const PROTECT_SUCCESS = (channel: string): string =>
  `✅ Channel linked! New members must join <b>${channel}</b> to chat.`;

export const PROTECT_USAGE = "ℹ️ Usage: <code>/protect @channelname</code>";

export const PROTECT_ONLY_GROUPS = "⚠️ This command only works in groups. Add me to a group first!";

export const PROTECT_ONLY_ADMINS = "⚠️ Only admins can use this command.";

export const ADMIN_CHECK_UNAVAILABLE =
  "⚠️ I can't verify admin permissions for this message. If you are using anonymous admin mode, send the command as your personal account.";

export const ADMIN_CHECK_FAILED =
  "⚠️ I couldn't check your admin permissions right now. Please try again.";

export const PROTECT_CHANNEL_NOT_FOUND = (channel: string): string =>
  `❌ Channel <b>${channel}</b> not found.`;

export const PROTECT_NOT_ADMIN_IN_CHANNEL = (channel: string): string =>
  `❌ I need to be an admin in <b>${channel}</b> first.`;

export const PROTECT_ALREADY_LINKED = (channel: string): string =>
  `ℹ️ <b>${channel}</b> is already linked to this group.`;

export const PROTECT_MAX_CHANNELS =
  "⚠️ Maximum 5 channels per group. Remove one first with /unprotect.";

export const PROTECT_BOT_NOT_ADMIN =
  "⚠️ I need <b>Restrict Members</b> and <b>Delete Messages</b> permissions to work!";

export const PROTECT_BOT_PERMISSION_CHECK_FAILED =
  "⚠️ I couldn't verify my group permissions right now. Please confirm I am an admin with Restrict Members and Delete Messages, then try again.";

export const UNPROTECT_SUCCESS = (channel: string): string => `✅ <b>${channel}</b> unlinked.`;

export const UNPROTECT_NOT_LINKED = (channel: string): string =>
  `ℹ️ <b>${channel}</b> is not linked to this group.`;

export const VERIFY_SUCCESS = "✅ Verified! You can send messages now.";

export const VERIFY_MISSING_CHANNELS = (channels: string[]): string => {
  // answerCallbackQuery is plain text only — no HTML/Markdown.
  // t.me/username URLs are auto-detected by Telegram and rendered as tappable links.
  const links = channels.map((ch) => (ch.startsWith("@") ? `t.me/${ch.slice(1)}` : ch)).join("\n");
  return `❌ Join first:\n${links}`;
};

export const VERIFY_PROCESSING = "⏳ Processing...";

export const VERIFY_STATUS_VERIFIED = "✅ You're verified! You can send messages in this group.";

export const VERIFY_STATUS_NOT_VERIFIED = (channels: string[]): string =>
  `❌ Not verified. Please join: ${channels.join(", ")}`;

export const SETTINGS_NOT_PROTECTED =
  "⚙️ No channels linked. Use <code>/protect @channel</code> to get started.";

export const STATUS_PROTECTED = (title: string, enabled: boolean, channels: string[]): string =>
  `${enabled ? "🛡️" : "🔓"} <b>Protection Status: ${enabled ? "Active" : "Disabled"}</b>\n\n` +
  `<b>Group:</b> ${title}\n\n` +
  (channels.length > 0
    ? `<b>Enforced Channel(s):</b>\n${channels.map((channel) => `  • ${channel}`).join("\n")}\n\n`
    : "⚠️ <i>No channels linked</i>\n\n") +
  "<b>Commands:</b>\n" +
  (enabled
    ? "<code>/unprotect @channel</code> — Disable protection for a linked channel\n<code>/settings</code> — View current configuration"
    : "<code>/protect @channel</code> — Enable protection");

export const STATUS_NOT_PROTECTED = (title: string): string =>
  "❌ <b>Protection Status: Not Protected</b>\n\n" +
  `<b>${title}</b> is not currently protected.\n\n` +
  "<b>To enable protection:</b>\n" +
  "1. Add me as admin in this group\n" +
  "2. Add me as admin in your channel\n" +
  "3. Run <code>/protect @YourChannel</code>";

export const CHANNELS_LIST = (
  channels: Array<{ title: string; username: string; subscriberCount: number }>
): string =>
  "📡 <b>Linked Channels</b>\n\n" +
  channels
    .map(
      (c, i) => `${i + 1}. <b>${c.title}</b> (@${c.username}) — ${c.subscriberCount} subscribers`
    )
    .join("\n");

export const CHANNELS_EMPTY = "📡 No channels linked to this group.";

export const STATS_FORMAT = (stats: {
  verifications: number;
  successRate: number;
  memberCount: number;
  channelsCount: number;
}): string =>
  "📊 <b>Group Statistics</b>\n\n" +
  `✅ <b>Verifications:</b> ${stats.verifications}\n` +
  `📈 <b>Success rate:</b> ${stats.successRate}%\n` +
  `👥 <b>Members:</b> ${stats.memberCount}\n` +
  `📡 <b>Channels:</b> ${stats.channelsCount}`;

export const BOT_ADDED_WELCOME =
  "👋 Hi! I'm <b>Nezuko</b> 🌸 — use <code>/protect @channel</code> to enable verification.";

export const BOT_DEMOTED_WARNING =
  "⚠️ I've been demoted! I need admin permissions to protect this group.";

export const SUPERGROUP_REQUIRED =
  "⚠️ Protection only works in supergroups. Please convert this group first.";

export const VERIFY_GREETING = (
  userName: string,
  channels: Array<{ title: string; username: string; inviteLink?: string }>
): string =>
  `👋 Welcome, <b>${userName}</b>!\n\n` +
  `📋 To chat here, please join:\n` +
  channels
    .map((c) => {
      const link = c.username ? `https://t.me/${c.username}` : c.inviteLink;
      return link ? `  • <a href="${link}">${c.title}</a>` : `  • ${c.title}`;
    })
    .join("\n") +
  `\n\nThen tap the button below ⬇️`;

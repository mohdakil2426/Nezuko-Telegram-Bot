import type { Update, User, Chat } from "grammy/types";

let updateIdCounter = 1;
let messageIdCounter = 1000;

const DEFAULT_USER: User = {
  id: 111222333,
  is_bot: false,
  first_name: "Test",
  last_name: "User",
  username: "testuser",
  language_code: "en",
};

const DEFAULT_BOT_USER: any = {
  id: 12345678,
  is_bot: true,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
  first_name: "Nezuko Test",
  username: "nezuko_test_bot",
};

const DEFAULT_SUPERGROUP: Chat = {
  id: -1001234567890,
  type: "supergroup",
  title: "Test Group",
  username: "testgroup",
};

/**
 * Create a message update with optional overrides.
 * Defaults to a supergroup text message from a non-bot user.
 */
export function createMessageUpdate(overrides?: {
  text?: string;
  from?: Partial<User>;
  chat?: Partial<Chat>;
  message_id?: number;
}): Update {
  const from = { ...DEFAULT_USER, ...overrides?.from } as User;
  const chat = { ...DEFAULT_SUPERGROUP, ...overrides?.chat } as Chat;
  const text = overrides?.text ?? "/start";

  // grammY's .command() handler requires bot_command entities for detection
  const entities: { type: "bot_command"; offset: number; length: number }[] = [];
  if (text.startsWith("/")) {
    const commandPart = text.split(/\s/)[0];
    entities.push({ type: "bot_command", offset: 0, length: commandPart.length });
  }

  const message = {
    message_id: overrides?.message_id ?? messageIdCounter++,
    date: Math.floor(Date.now() / 1000),
    chat,
    from,
    text,
    ...(entities.length > 0 ? { entities } : {}),
  } as any;

  return {
    update_id: updateIdCounter++,
    message,
  } as any;
}

/**
 * Create a callback_query update with specified callback data.
 */
export function createCallbackUpdate(data: string): Update {
  const message = {
    message_id: messageIdCounter++,
    date: Math.floor(Date.now() / 1000),
    chat: DEFAULT_SUPERGROUP,
    from: DEFAULT_USER,
    text: "Verification message",
  } as any;

  return {
    update_id: updateIdCounter++,
    callback_query: {
      id: `cbq_${updateIdCounter}`,
      from: DEFAULT_USER,
      message,
      chat_instance: "test_chat_instance",
      data,
    },
  } as any;
}

/**
 * Create a new_chat_members update.
 */
export function createNewMemberUpdate(members: Partial<User>[]): Update {
  const newMembers = members.map((m) => ({
    id: 999888777,
    is_bot: false,
    first_name: "New",
    ...m,
  })) as User[];

  return {
    update_id: updateIdCounter++,
    message: {
      message_id: messageIdCounter++,
      date: Math.floor(Date.now() / 1000),
      chat: DEFAULT_SUPERGROUP,
      from: DEFAULT_USER,
      new_chat_members: newMembers,
    } as any,
  } as any;
}

/**
 * Create a left_chat_member update.
 */
export function createLeftMemberUpdate(member: Partial<User>): Update {
  const leftMember: User = {
    id: 999888777,
    is_bot: false,
    first_name: "Left",
    ...member,
  };

  return {
    update_id: updateIdCounter++,
    message: {
      message_id: messageIdCounter++,
      date: Math.floor(Date.now() / 1000),
      chat: DEFAULT_SUPERGROUP,
      from: DEFAULT_USER,
      left_chat_member: leftMember,
    } as any,
  } as any;
}

/**
 * Create a my_chat_member update for bot status changes.
 */
export function createMyChatMemberUpdate(oldStatus: string, newStatus: string): Update {
  return {
    update_id: updateIdCounter++,
    my_chat_member: {
      chat: DEFAULT_SUPERGROUP,
      from: DEFAULT_USER,
      date: Math.floor(Date.now() / 1000),
      old_chat_member: {
        user: DEFAULT_BOT_USER,
        status: oldStatus as "left",
      },
      new_chat_member: {
        user: DEFAULT_BOT_USER,
        status: newStatus as "administrator",
        can_be_edited: false,
        is_anonymous: false,
        can_manage_chat: true,
        can_delete_messages: true,
        can_manage_video_chats: false,
        can_restrict_members: true,
        can_promote_members: false,
        can_change_info: false,
        can_invite_users: false,
        can_post_messages: false,
        can_edit_messages: false,
        can_pin_messages: false,
        can_post_stories: false,
        can_edit_stories: false,
        can_delete_stories: false,
      } as any,
    },
  } as any;
}

/**
 * Create a chat_join_request update.
 */
export function createJoinRequestUpdate(overrides?: {
  user?: Partial<User>;
  chat?: Partial<Chat>;
}): Update {
  const from = { ...DEFAULT_USER, ...overrides?.user } as User;
  const chat = { ...DEFAULT_SUPERGROUP, ...overrides?.chat } as Chat;

  return {
    update_id: updateIdCounter++,
    chat_join_request: {
      chat: chat as any,
      from,
      user_chat_id: from.id,
      date: Math.floor(Date.now() / 1000),
      bio: undefined,
      invite_link: undefined,
    } as any,
  } as any;
}

/**
 * Create a chat_member update for channel membership changes.
 */
export function createChannelChatMemberUpdate(overrides?: {
  user?: Partial<User>;
  chat?: Partial<Chat>;
  oldStatus?: string;
  newStatus?: string;
}): Update {
  const user = { ...DEFAULT_USER, ...overrides?.user } as User;
  const chat = {
    id: -1001111111111,
    type: "channel",
    title: "Required Channel",
    username: "requiredchannel",
    ...overrides?.chat,
  } as any;

  return {
    update_id: updateIdCounter++,
    chat_member: {
      chat,
      from: DEFAULT_USER,
      date: Math.floor(Date.now() / 1000),
      old_chat_member: {
        user,
        status: (overrides?.oldStatus ?? "member") as "member",
      } as any,
      new_chat_member: {
        user,
        status: (overrides?.newStatus ?? "left") as "left",
      } as any,
    },
  } as any;
}

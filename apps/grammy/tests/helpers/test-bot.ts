import { Bot } from "grammy";
import type { NezukoContext, BotDeps } from "../../src/types.js";

/** Recorded outgoing API call intercepted by the test transformer. */
export interface ApiCall {
  method: string;
  payload: Record<string, unknown>;
}

export interface TestBotOptions {
  methodResults?: Partial<
    Record<string, unknown | ((payload: Record<string, unknown>) => unknown)>
  >;
}

/** Static bot info returned instead of calling getMe() in tests. */
const TEST_BOT_INFO: any = {
  id: 12345678,
  is_bot: true,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
  first_name: "Nezuko Test",
  username: "nezuko_test_bot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
};

let messageIdCounter = 5000;

/**
 * Create a test Bot instance with a transformer that intercepts ALL outgoing
 * Telegram API calls — no real HTTP requests are made.
 *
 * @returns bot instance and apiCalls array for assertion
 */
export function createTestBot(): {
  bot: Bot<NezukoContext>;
  apiCalls: ApiCall[];
} {
  return createConfiguredTestBot();
}

export function createConfiguredTestBot(options?: TestBotOptions): {
  bot: Bot<NezukoContext>;
  apiCalls: ApiCall[];
} {
  const apiCalls: ApiCall[] = [];

  const bot = new Bot<NezukoContext>("TEST_TOKEN", {
    botInfo: TEST_BOT_INFO as any,
  });

  // Install a transformer that intercepts ALL outgoing API calls
  bot.api.config.use((_prev, method, payload) => {
    const normalizedPayload = payload as Record<string, unknown>;
    apiCalls.push({
      method,
      payload: normalizedPayload,
    });

    const override = options?.methodResults?.[method];
    if (override !== undefined) {
      const result =
        typeof override === "function"
          ? (override as (payload: Record<string, unknown>) => unknown)(normalizedPayload)
          : override;
      return Promise.resolve({ ok: true as const, result } as ReturnType<typeof _prev>);
    }

    // sendMessage and editMessageText need a proper Message result
    // so grammY hydrate/reply plugins don't crash
    if (
      method === "sendMessage" ||
      method === "editMessageText" ||
      method === "sendPhoto" ||
      method === "sendDocument"
    ) {
      const mockMessage = {
        message_id: messageIdCounter++,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 0, type: "private" as const, first_name: "Test" },
        text: normalizedPayload.text ?? "",
      };
      return Promise.resolve({ ok: true as const, result: mockMessage } as ReturnType<
        typeof _prev
      >);
    }

    // getChatMember needs a ChatMember result
    if (method === "getChatMember") {
      return Promise.resolve({
        ok: true as const,
        result: { status: "member", user: TEST_BOT_INFO },
      } as ReturnType<typeof _prev>);
    }

    // Default: return true for boolean-result methods
    return Promise.resolve({ ok: true as const, result: true } as ReturnType<typeof _prev>);
  });

  return { bot, apiCalls };
}

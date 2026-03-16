import { describe, it, expect, vi, beforeEach } from "bun:test";
import { Composer } from "grammy";
import { permissionCheck } from "../../../src/middleware/permission-check.js";
import { contextEnricher } from "../../../src/middleware/context-enricher.js";
import { createConfiguredTestBot } from "../../helpers/test-bot.js";
import { createMockDb, createMockCache, createMockLogger } from "../../helpers/mock-deps.js";
import { createMessageUpdate } from "../../helpers/mock-update.js";
import type { NezukoContext, BotDeps } from "../../../src/types.js";

function makeDeps(): BotDeps {
  return {
    db: createMockDb(),
    cache: createMockCache(),
    botId: 12345678,
    logger: createMockLogger(),
  };
}

describe("permissionCheck middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("allows command flow when bot has required permissions", async () => {
    const { bot, apiCalls } = createConfiguredTestBot({
      methodResults: {
        getChatMember: (payload: any) => {
          if (payload.user_id === 12345678) {
            return {
              status: "administrator",
              can_restrict_members: true,
              can_delete_messages: true,
            };
          }
          return { status: "member" };
        },
      },
    });
    const deps = makeDeps();
    const nextMiddleware = vi.fn();

    bot.use(contextEnricher(deps));
    bot.use(permissionCheck());
    bot.use(nextMiddleware);

    await bot.handleUpdate(createMessageUpdate({ text: "/protect @testchannel" }));

    expect(nextMiddleware).toHaveBeenCalledTimes(1);
    expect(apiCalls.find((call) => call.method === "sendMessage")).toBeUndefined();
  });

  it("replies when bot is not an admin in the group", async () => {
    const { bot, apiCalls } = createConfiguredTestBot({
      methodResults: {
        getChatMember: (payload: any) => {
          if (payload.user_id === 12345678) {
            return { status: "member" };
          }
          return { status: "administrator" };
        },
      },
    });
    const deps = makeDeps();

    bot.use(contextEnricher(deps));

    const composer = new Composer<NezukoContext>();
    composer.command("protect", permissionCheck(), async (ctx) => {
      await ctx.reply("should not happen");
    });
    bot.use(composer);

    await bot.handleUpdate(createMessageUpdate({ text: "/protect @testchannel" }));

    const sendCall = apiCalls.find((call) => call.method === "sendMessage");
    expect((sendCall?.payload.text as string) ?? "").toContain("Restrict Members");
  });

  it("replies when permission lookup fails", async () => {
    const { bot, apiCalls } = createConfiguredTestBot({
      methodResults: {
        getChatMember: () => {
          throw new Error("500 Internal Server Error");
        },
      },
    });
    const deps = makeDeps();

    bot.use(contextEnricher(deps));

    const composer = new Composer<NezukoContext>();
    composer.command("protect", permissionCheck(), async (ctx) => {
      await ctx.reply("should not happen");
    });
    bot.use(composer);

    await bot.handleUpdate(createMessageUpdate({ text: "/protect @testchannel" }));

    const sendCall = apiCalls.find((call) => call.method === "sendMessage");
    expect((sendCall?.payload.text as string) ?? "").toContain(
      "couldn't verify my group permissions"
    );
  });
});

import { describe, expect, it } from "bun:test";
import type { Context } from "grammy";
import { getSequentializeKey } from "../../../../apps/grammy/src/middleware/sequentialize.js";

function makeContext(value: Partial<Context>): Context {
  return value as Context;
}

describe("getSequentializeKey", () => {
  it("serializes ordinary group messages per chat and actor", () => {
    const key = getSequentializeKey(
      makeContext({
        chat: { id: -100123, type: "supergroup" } as Context["chat"],
        from: { id: 42 } as Context["from"],
        update: {
          update_id: 1,
          message: {
            message_id: 10,
          },
        } as Context["update"],
      })
    );

    expect(key).toBe("-100123:42");
  });

  it("keeps slash commands serialized per chat", () => {
    const key = getSequentializeKey(
      makeContext({
        chat: { id: -100123, type: "supergroup" } as Context["chat"],
        from: { id: 42 } as Context["from"],
        message: { text: "/status" } as Context["message"],
        update: {
          update_id: 2,
          message: {
            message_id: 11,
            text: "/status",
          },
        } as Context["update"],
      })
    );

    expect(key).toBe("-100123");
  });

  it("keeps membership updates serialized per chat", () => {
    const key = getSequentializeKey(
      makeContext({
        chat: { id: -100123, type: "supergroup" } as Context["chat"],
        from: { id: 42 } as Context["from"],
        update: {
          update_id: 3,
          chat_member: {
            from: { id: 42 },
          },
        } as Context["update"],
      })
    );

    expect(key).toBe("-100123");
  });
});

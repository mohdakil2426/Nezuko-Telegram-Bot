import { describe, it, expect, vi, beforeEach } from "vitest";
import { InsForgeClient } from "../../../../apps/grammy/src/core/insforge-client.js";
import { createMockLogger } from "../../helpers/mock-deps.js";

const BASE_URL = "https://test.insforge.app";
const ANON_KEY = "test-anon-key";

function makeClient() {
  return new InsForgeClient({
    baseUrl: BASE_URL,
    anonKey: ANON_KEY,
    logger: createMockLogger(),
  });
}

describe("InsForgeClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getRecords", () => {
    it("fetches records and returns parsed JSON array", async () => {
      const rows = [{ id: 1, title: "Test Group" }];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(rows),
        }),
      );

      const client = makeClient();
      const result = await client.getRecords("protected_groups");

      expect(result).toEqual(rows);
      const fetchMock = vi.mocked(global.fetch);
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE_URL}/api/database/records/protected_groups`,
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("appends query params as URLSearchParams", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve([]),
        }),
      );

      const client = makeClient();
      await client.getRecords("protected_groups", { group_id: "eq.123" });

      const fetchMock = vi.mocked(global.fetch);
      const calledUrl = (fetchMock.mock.calls[0][0] as string);
      expect(calledUrl).toContain("group_id=eq.123");
    });

    it("throws on non-2xx response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: "Not Found",
        }),
      );

      const client = makeClient();
      await expect(client.getRecords("missing_table")).rejects.toThrow(
        "InsForge GET missing_table: 404 Not Found",
      );
    });
  });

  describe("postRecords", () => {
    it("posts records and returns inserted rows", async () => {
      const inserted = [{ id: 1, group_id: 123 }];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 201,
          json: () => Promise.resolve(inserted),
        }),
      );

      const client = makeClient();
      const result = await client.postRecords("protected_groups", [
        { group_id: 123, owner_id: 456, title: "Test" },
      ]);

      expect(result).toEqual(inserted);
    });

    it("returns empty array on 204 No Content", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 204,
        }),
      );

      const client = makeClient();
      const result = await client.postRecords("verification_log", [{ user_id: 1 }]);

      expect(result).toEqual([]);
    });

    it("throws on non-2xx error response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 409,
          statusText: "Conflict",
        }),
      );

      const client = makeClient();
      await expect(
        client.postRecords("protected_groups", [{ group_id: 999 }]),
      ).rejects.toThrow("InsForge POST protected_groups: 409 Conflict");
    });
  });

  describe("patchRecords", () => {
    it("patches records matching filter and returns updated rows", async () => {
      const updated = [{ group_id: 123, enabled: false }];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(updated),
        }),
      );

      const client = makeClient();
      const result = await client.patchRecords(
        "protected_groups",
        { group_id: "eq.123" },
        { enabled: false },
      );

      expect(result).toEqual(updated);
    });

    it("returns empty array when no rows matched (UPSERT pattern)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 204,
        }),
      );

      const client = makeClient();
      const result = await client.patchRecords(
        "protected_groups",
        { group_id: "eq.999" },
        { enabled: true },
      );

      // Empty result triggers the POST fallback in createGroup
      expect(result).toEqual([]);
    });

    it("throws on non-2xx response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        }),
      );

      const client = makeClient();
      await expect(
        client.patchRecords("protected_groups", { group_id: "eq.1" }, { enabled: true }),
      ).rejects.toThrow("InsForge PATCH protected_groups: 500 Internal Server Error");
    });
  });

  describe("deleteRecords", () => {
    it("deletes records matching filter", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
      vi.stubGlobal("fetch", fetchMock);

      const client = makeClient();
      await expect(
        client.deleteRecords("group_channel_links", {
          group_id: "eq.123",
          channel_id: "eq.456",
        }),
      ).resolves.toBeUndefined();

      const calledUrl = (fetchMock.mock.calls[0][0] as string);
      expect(calledUrl).toContain("group_id=eq.123");
      expect(calledUrl).toContain("channel_id=eq.456");
    });

    it("throws on error response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        }),
      );

      const client = makeClient();
      await expect(
        client.deleteRecords("group_channel_links", { group_id: "eq.1" }),
      ).rejects.toThrow("InsForge DELETE group_channel_links: 403 Forbidden");
    });
  });

  describe("UPSERT pattern (PATCH-then-POST)", () => {
    it("falls back to POST when PATCH returns empty (no matching row)", async () => {
      const fetchMock = vi
        .fn()
        // First call: PATCH returns 204 → empty array
        .mockResolvedValueOnce({ ok: true, status: 204 })
        // Second call: POST returns inserted row
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve([{ group_id: 999 }]),
        });
      vi.stubGlobal("fetch", fetchMock);

      const client = makeClient();
      // Simulate createGroup UPSERT pattern
      const patched = await client.patchRecords(
        "protected_groups",
        { group_id: "eq.999" },
        { owner_id: 1, title: "New", member_count: 0, updated_at: new Date().toISOString() },
      );
      expect(patched).toEqual([]);

      if (patched.length === 0) {
        const posted = await client.postRecords("protected_groups", [
          { group_id: 999, owner_id: 1, title: "New", enabled: true },
        ]);
        expect(posted).toEqual([{ group_id: 999 }]);
      }

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

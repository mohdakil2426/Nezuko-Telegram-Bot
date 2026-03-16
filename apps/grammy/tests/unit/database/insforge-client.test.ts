import { describe, it, expect, vi, beforeEach } from "bun:test";
import { InsForgeClient } from "../../../src/core/insforge-client.js";
import { createMockLogger } from "../../helpers/mock-deps.js";

describe("InsForgeClient", () => {
  const BASE_URL = "https://test.insforge.app";
  const API_KEY = "test-key";
  const logger = createMockLogger();
  const client = new InsForgeClient({ baseUrl: BASE_URL, anonKey: API_KEY, logger });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Manual wash of global fetch for Bun compatibility.
   */
  function stubFetch(mock: any) {
    global.fetch = mock;
  }

  describe("getRecords", () => {
    it("fetches records and returns parsed JSON array", async () => {
      const rows = [{ id: 1, name: "test" }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(rows),
      } as Response);
      stubFetch(fetchMock);

      const result = await client.getRecords("test_table");

      expect(result).toEqual(rows);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`${BASE_URL}/api/database/records/test_table`),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Bearer ${API_KEY}`,
          }),
        })
      );
    });

    it("appends query params as URLSearchParams", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);
      stubFetch(fetchMock);

      await client.getRecords("test_table", { id: "eq.1", select: "*" });

      const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
      expect(calledUrl).toContain("id=eq.1");
      expect(calledUrl).toContain("select=*");
    });

    it("throws on non-2xx response", async () => {
      stubFetch(
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: "Not Found",
          text: () => Promise.resolve("Table not found"),
        } as Response)
      );

      await expect(client.getRecords("invalid")).rejects.toThrow("InsForge GET invalid: 404");
    });

    it("fails fast when the request exceeds the configured timeout", async () => {
      // Use short timeout for test
      const fastClient = new InsForgeClient({
        baseUrl: BASE_URL,
        anonKey: API_KEY,
        logger,
        requestTimeoutMs: 10,
      });

      stubFetch(
        vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve({ ok: true } as Response), 50))
          )
      );

      await expect(fastClient.getRecords("slow")).rejects.toThrow();
    });
  });

  describe("postRecords", () => {
    it("posts records and returns inserted rows", async () => {
      const payload = [{ name: "new" }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(payload),
      } as Response);
      stubFetch(fetchMock);

      const result = await client.postRecords("test_table", payload);

      expect(result).toEqual(payload);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("test_table"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(payload),
          headers: expect.objectContaining({
            Prefer: "return=representation",
          }),
        })
      );
    });

    it("returns empty array on 204 No Content", async () => {
      stubFetch(
        vi.fn().mockResolvedValue({
          ok: true,
          status: 204,
        } as Response)
      );

      const result = await client.postRecords("test_table", []);
      expect(result).toEqual([]);
    });

    it("throws on non-2xx error response", async () => {
      stubFetch(
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Bad Request"),
        } as Response)
      );

      await expect(client.postRecords("t", [])).rejects.toThrow("InsForge POST t: 400");
    });
  });

  describe("patchRecords", () => {
    it("patches records matching filter and returns updated rows", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 1, val: "updated" }]),
      } as Response);
      stubFetch(fetchMock);

      const result = await client.patchRecords("test_table", { id: "eq.1" }, { val: "updated" });

      expect(result).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("test_table?id=eq.1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ val: "updated" }),
        })
      );
    });

    it("returns empty array when no rows matched (UPSERT pattern)", async () => {
      stubFetch(
        vi.fn().mockResolvedValue({
          ok: true,
          status: 204,
        } as Response)
      );

      const result = await client.patchRecords("t", {}, {});
      expect(result).toEqual([]);
    });

    it("throws on non-2xx response", async () => {
      stubFetch(
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: () => Promise.resolve("unauthorized"),
        } as Response)
      );

      await expect(client.patchRecords("t", {}, {})).rejects.toThrow("InsForge PATCH t: 401");
    });
  });

  describe("deleteRecords", () => {
    it("deletes records matching filter", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
      stubFetch(fetchMock);

      await client.deleteRecords("test_table", { id: "eq.5" });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("test_table?id=eq.5"),
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("throws on error response", async () => {
      stubFetch(vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
      await expect(client.deleteRecords("t", {})).rejects.toThrow();
    });
  });

  describe("rpc", () => {
    it("calls an RPC endpoint and returns parsed JSON", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: 42 }),
      } as Response);
      stubFetch(fetchMock);

      const result = await client.rpc("calculate_meaning", { input: "life" });

      expect(result).toEqual({ result: 42 });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/database/rpc/calculate_meaning"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ input: "life" }),
        })
      );
    });
  });

  describe("UPSERT pattern (PATCH-then-POST)", () => {
    it("falls back to POST when PATCH returns empty (no matching row)", async () => {
      // 1. PATCH returns empty
      const patchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
      // 2. POST returns created row
      const postMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve([{ id: 100, status: "created" }]),
      } as Response);

      stubFetch(vi.fn().mockImplementationOnce(patchMock).mockImplementationOnce(postMock));

      const patchRes = await client.patchRecords("t", { id: "eq.100" }, { status: "created" });
      expect(patchRes).toHaveLength(0);

      const postRes = await client.postRecords("t", [{ id: 100, status: "created" }]);
      expect(postRes).toHaveLength(1);
    });
  });
});

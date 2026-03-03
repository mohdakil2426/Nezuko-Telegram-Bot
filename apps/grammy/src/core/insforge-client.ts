import type { Logger } from "../utils/logger.js";

/** Options for constructing an InsForgeClient. */
export interface InsForgeClientOptions {
  baseUrl: string;
  anonKey: string;
  logger: Logger;
}

/** Query parameters for PostgREST-style filtering. */
export type QueryParams = Record<string, string>;

/**
 * Low-level HTTP client for the InsForge REST API (PostgREST).
 *
 * Mirrors the Python bot's `insforge_client.py` Phase 95 public API.
 * Uses native `fetch()` — no SDK dependency needed for server-side control.
 */
export class InsForgeClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly logger: Logger;

  constructor({ baseUrl, anonKey, logger }: InsForgeClientOptions) {
    // Strip trailing slash to prevent double-slash in URL construction
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.headers = {
      "Authorization": `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    };
    this.logger = logger;
  }

  /** Build the full PostgREST records URL for a table. */
  private recordsUrl(table: string, params?: QueryParams): string {
    const url = `${this.baseUrl}/api/database/records/${table}`;
    if (!params || Object.keys(params).length === 0) {
      return url;
    }
    const qs = new URLSearchParams(params).toString();
    return `${url}?${qs}`;
  }

  /**
   * GET records from a table with optional PostgREST filter params.
   *
   * @param table - Table name (e.g. "protected_groups")
   * @param params - PostgREST operators, e.g. { group_id: "eq.123" }
   * @returns Parsed array of type T
   * @throws Error with table name and HTTP status on non-2xx response
   */
  async getRecords<T>(table: string, params?: QueryParams): Promise<T[]> {
    const url = this.recordsUrl(table, params);
    const res = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!res.ok) {
      const msg = `InsForge GET ${table}: ${res.status} ${res.statusText}`;
      this.logger.error({ table, status: res.status }, msg);
      throw new Error(msg);
    }

    return res.json() as Promise<T[]>;
  }

  /**
   * POST (insert) records into a table.
   *
   * @param table - Table name
   * @param body - Array of records to insert (InsForge requires array format)
   * @param prefer - Prefer header value (default: "return=representation")
   * @returns Inserted records as T[], or empty array on 204 No Content
   */
  async postRecords<T>(
    table: string,
    body: Record<string, unknown>[],
    prefer = "return=representation",
  ): Promise<T[]> {
    const url = this.recordsUrl(table);
    const res = await fetch(url, {
      method: "POST",
      headers: { ...this.headers, "Prefer": prefer },
      body: JSON.stringify(body),
    });

    if (res.status === 204) {
      return [];
    }

    if (!res.ok) {
      const msg = `InsForge POST ${table}: ${res.status} ${res.statusText}`;
      this.logger.error({ table, status: res.status }, msg);
      throw new Error(msg);
    }

    return res.json() as Promise<T[]>;
  }

  /**
   * PATCH (update) records matching the given filter params.
   *
   * @param table - Table name
   * @param params - PostgREST filter params identifying rows to update
   * @param body - Fields to update
   * @returns Updated records as T[]
   */
  async patchRecords<T>(
    table: string,
    params: QueryParams,
    body: Record<string, unknown>,
  ): Promise<T[]> {
    const url = this.recordsUrl(table, params);
    const res = await fetch(url, {
      method: "PATCH",
      headers: { ...this.headers, "Prefer": "return=representation" },
      body: JSON.stringify(body),
    });

    if (res.status === 204) {
      return [];
    }

    if (!res.ok) {
      const msg = `InsForge PATCH ${table}: ${res.status} ${res.statusText}`;
      this.logger.error({ table, status: res.status }, msg);
      throw new Error(msg);
    }

    return res.json() as Promise<T[]>;
  }

  /**
   * DELETE records matching the given filter params.
   *
   * @param table - Table name
   * @param params - PostgREST filter params identifying rows to delete
   */
  async deleteRecords(table: string, params: QueryParams): Promise<void> {
    const url = this.recordsUrl(table, params);
    const res = await fetch(url, {
      method: "DELETE",
      headers: this.headers,
    });

    if (!res.ok) {
      const msg = `InsForge DELETE ${table}: ${res.status} ${res.statusText}`;
      this.logger.error({ table, status: res.status }, msg);
      throw new Error(msg);
    }
  }
}

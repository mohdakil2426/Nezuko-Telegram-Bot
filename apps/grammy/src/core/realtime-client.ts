import { io, type Socket } from "socket.io-client";
import type { Logger } from "../utils/logger.js";

/** Configuration for InsForgeRealtimeClient. */
export interface RealtimeClientOptions {
  /** InsForge backend base URL (e.g. https://app.insforge.app). */
  baseUrl: string;
  /** Anonymous JWT key for auth. */
  anonKey: string;
  logger: Logger;
}

const CONNECT_TIMEOUT_MS = 10_000;
const RECONNECTION_DELAY_MS = 2_000;
const RECONNECTION_DELAY_MAX_MS = 60_000;

/**
 * InsForge Realtime WebSocket client backed by socket.io-client v4.8.3.
 *
 * CRITICAL (Decision 13 / Phase 93 fix):
 *   Use `socket.emit("REALTIME_SUBSCRIBE", { channel })` — NOT `socket.call()`.
 *   InsForge Realtime does NOT send ACKs for REALTIME_SUBSCRIBE. `call()` causes
 *   a 10-second timeout freeze followed by disconnect.
 *
 * Auto-reconnect is handled by socket.io-client with exponential backoff
 * (2s initial → 60s max). The bot falls back to 30s polling while disconnected.
 */
export class InsForgeRealtimeClient {
  private socket: Socket | null = null;
  private readonly subscribedChannels = new Set<string>();
  private readonly options: RealtimeClientOptions;
  private readonly logger: Logger;

  constructor(options: RealtimeClientOptions) {
    this.options = options;
    this.logger = options.logger.child({ module: "realtime-client" });
  }

  /**
   * Establish a WebSocket connection to InsForge Realtime.
   *
   * @returns true if connected within 10s, false if timed out
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = io(this.options.baseUrl, {
        auth: { token: this.options.anonKey },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: RECONNECTION_DELAY_MS,
        reconnectionDelayMax: RECONNECTION_DELAY_MAX_MS,
      });

      const timeout = setTimeout(() => {
        this.logger.warn({ msg: "Realtime connection timed out — using 30s polling fallback" });
        socket.disconnect();
        resolve(false);
      }, CONNECT_TIMEOUT_MS);

      socket.on("connect", () => {
        clearTimeout(timeout);
        this.socket = socket;
        this.logger.info({ msg: "Realtime WebSocket connected", socketId: socket.id });
        resolve(true);
      });

      socket.on("connect_error", (err: Error) => {
        this.logger.warn({ msg: "Realtime connect_error", error: err.message });
        // Do not resolve here — let the timeout handle the failure
      });

      socket.on("disconnect", (reason: string) => {
        this.logger.warn({ msg: "Realtime WebSocket disconnected", reason });
      });

      socket.on("reconnect", (attempt: number) => {
        this.logger.info({ msg: "Realtime reconnected", attempt });
        // Re-subscribe all channels after reconnection
        for (const channel of this.subscribedChannels) {
          socket.emit("REALTIME_SUBSCRIBE", { channel });
        }
      });
    });
  }

  /**
   * Subscribe to an InsForge Realtime channel.
   *
   * Uses `emit()` NOT `call()` — InsForge does not ACK REALTIME_SUBSCRIBE
   * (Phase 93 fix, Decision 13).
   *
   * @param channel - Channel name (e.g. "commands", "bot_instances")
   */
  subscribe(channel: string): void {
    if (!this.socket?.connected) {
      this.logger.warn({ msg: "Cannot subscribe — socket not connected", channel });
      return;
    }

    this.subscribedChannels.add(channel);
    // emit() fires-and-forgets — no ACK expected (EC: Socket.IO ACK timeout)
    this.socket.emit("REALTIME_SUBSCRIBE", { channel });
    this.logger.debug({ msg: "Subscribed to realtime channel", channel });
  }

  /**
   * Register an event listener for incoming realtime events.
   *
   * @param event - Event name (e.g. "command_updated", "bot_instance_changed")
   * @param handler - Callback invoked with the event payload
   */
  on<T>(event: string, handler: (data: T) => void): void {
    if (!this.socket) {
      this.logger.warn({ msg: "Cannot register listener — socket not initialised", event });
      return;
    }

    this.socket.on(event, handler);
  }

  /**
   * Gracefully disconnect: unsubscribe all channels first, then disconnect.
   */
  disconnect(): void {
    if (!this.socket) return;

    for (const channel of this.subscribedChannels) {
      this.socket.emit("REALTIME_UNSUBSCRIBE", { channel });
    }
    this.subscribedChannels.clear();
    this.socket.disconnect();
    this.socket = null;
    this.logger.info({ msg: "Realtime client disconnected" });
  }

  /** Whether the socket is currently connected. */
  get isConnected(): boolean {
    return this.socket?.connected === true;
  }
}

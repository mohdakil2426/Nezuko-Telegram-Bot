import http from "node:http";
import type { Logger } from "./logger.js";

export interface HealthSnapshot {
  status: "ok" | "degraded";
  details?: Record<string, unknown>;
}

export type HealthReporter = () => HealthSnapshot;

/**
 * Start a minimal HTTP health check server.
 * Responds to GET /health with process and bot health details.
 * Used by Docker HEALTHCHECK and Kubernetes liveness probes.
 */
export async function startHealthServer(
  port: number,
  logger?: Logger,
  reportHealth?: HealthReporter
): Promise<http.Server | null> {
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      const snapshot = reportHealth?.() ?? { status: "ok" as const };
      const statusCode = snapshot.status === "ok" ? 200 : 503;
      const body = JSON.stringify({
        status: snapshot.status,
        uptime: Math.floor(process.uptime()),
        ...(snapshot.details ? { details: snapshot.details } : {}),
      });
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(body);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  return await new Promise<http.Server | null>((resolve) => {
    const cleanup = () => {
      server.off("error", onError);
      server.off("listening", onListening);
    };

    const onError = (error: NodeJS.ErrnoException) => {
      cleanup();
      if (error.code === "EADDRINUSE") {
        logger?.warn(
          { port },
          "Health server port already in use; continuing without health server"
        );
        resolve(null);
        return;
      }

      logger?.error({ err: error, port }, "Health server failed to start");
      resolve(null);
    };

    const onListening = () => {
      cleanup();
      resolve(server);
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port);
  });
}

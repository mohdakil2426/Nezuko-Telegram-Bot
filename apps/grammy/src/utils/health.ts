import http from "node:http";
import type { Logger } from "./logger.js";

/**
 * Start a minimal HTTP health check server.
 * Responds to GET /health with { status: "ok", uptime: <seconds> }.
 * Used by Docker HEALTHCHECK and Kubernetes liveness probes.
 */
export async function startHealthServer(
  port: number,
  logger?: Logger
): Promise<http.Server | null> {
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      const body = JSON.stringify({
        status: "ok",
        uptime: Math.floor(process.uptime()),
      });
      res.writeHead(200, { "Content-Type": "application/json" });
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
        logger?.warn({ port }, "Health server port already in use; continuing without health server");
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

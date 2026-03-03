import http from "node:http";

/**
 * Start a minimal HTTP health check server.
 * Responds to GET /health with { status: "ok", uptime: <seconds> }.
 * Used by Docker HEALTHCHECK and Kubernetes liveness probes.
 */
export function startHealthServer(port: number): http.Server {
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

  server.listen(port);
  return server;
}

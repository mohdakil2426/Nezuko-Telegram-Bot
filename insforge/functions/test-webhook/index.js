/**
 * test-webhook Edge Function
 *
 * Tests webhook URL connectivity and measures latency.
 * Includes SSRF protection to prevent requests to private/internal networks.
 *
 * Security requirements:
 * - HTTPS-only (no HTTP, no other schemes)
 * - Block private IP ranges: 10.x, 172.16-31.x, 192.168.x, 127.x, ::1, 169.254.x (link-local)
 * - Block metadata endpoints (169.254.169.254)
 * - Block localhost and loopback
 * - Block IPv6 private/link-local/ULA ranges
 */

// Fix ARCH-14: Convert module.exports to ES module export default
export default async function (request) {
  // CORS: Wildcard is acceptable here because this edge function is invoked via
  // the InsForge SDK which requires the anon key in the Authorization header.
  // The anon key acts as the access control mechanism, not CORS origin checks.
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fix SEC-20 (same pattern as manage-bot): Validate Content-Type before parsing JSON
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    return new Response(
      JSON.stringify({ error: "Content-Type must be application/json" }),
      {
        status: 415,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required and must be a string" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fix SEC-21: Reject URLs that exceed a safe maximum length
    if (url.length > 2048) {
      return new Response(JSON.stringify({ error: "URL exceeds maximum allowed length" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SSRF Validation ──────────────────────────────────────
    const ssrfError = validateUrl(url);
    if (ssrfError) {
      return new Response(JSON.stringify({ error: ssrfError }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Perform the webhook test ─────────────────────────────
    // Fix SEC-13: AbortController with 10s timeout on outbound fetch
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 10000);
    const start = Date.now();
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          source: "nezuko-webhook-test",
        }),
        // Prevent redirect to internal network
        redirect: "error",
        signal: controller.signal,
      });
      const latencyMs = Date.now() - start;

      return new Response(
        JSON.stringify({
          success: response.ok,
          status: response.status,
          latency_ms: latencyMs,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } finally {
      clearTimeout(fetchTimeout);
    }
  } catch (err) {
    // Fix SEC-19: Replace err.message with generic error to avoid leaking internals
    return new Response(
      JSON.stringify({
        success: false,
        status: 0,
        latency_ms: 0,
        error: "Webhook test failed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Validates a URL for SSRF safety.
 * Returns an error message string if the URL is invalid/unsafe, or null if OK.
 *
 * NOTE: DNS rebinding is a known limitation. This function validates URLs at parse-time
 * before DNS resolution. An attacker controlling DNS could rebind to a private IP after
 * validation passes. Full mitigation requires checking resolved IPs, which is not feasible
 * with standard fetch(). The HTTPS-only requirement and redirect: "error" provide partial
 * mitigation against the most common rebinding scenarios.
 *
 * @param {string} rawUrl - The URL to validate
 * @returns {string|null} Error message or null if safe
 */
function validateUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return "Invalid URL format";
  }

  // Only allow HTTPS
  if (parsed.protocol !== "https:") {
    return "Only HTTPS URLs are allowed (no HTTP, FTP, file://, etc.)";
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost / loopback
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  ) {
    return "Access to localhost/loopback addresses is not allowed";
  }

  // Block metadata services
  if (hostname === "169.254.169.254" || hostname === "metadata.google.internal") {
    return "Access to cloud metadata endpoints is not allowed";
  }

  // Block link-local (169.254.x.x)
  if (hostname.startsWith("169.254.")) {
    return "Access to link-local addresses is not allowed";
  }

  // Parse IPv4 for private range checks
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);

    // 10.0.0.0/8
    if (a === 10) {
      return "Access to private IP range 10.x.x.x is not allowed";
    }

    // 172.16.0.0/12 (172.16 - 172.31)
    if (a === 172 && b >= 16 && b <= 31) {
      return "Access to private IP range 172.16-31.x.x is not allowed";
    }

    // 192.168.0.0/16
    if (a === 192 && b === 168) {
      return "Access to private IP range 192.168.x.x is not allowed";
    }

    // 127.0.0.0/8 (already caught above but belt-and-suspenders)
    if (a === 127) {
      return "Access to loopback IP range is not allowed";
    }
  }

  // Fix SEC-15: Block IPv6 private/ULA/link-local ranges
  // Check bracketed form e.g. [fc00::1]
  if (hostname.startsWith("[")) {
    const ipv6 = hostname.slice(1, -1); // Remove surrounding brackets
    if (
      ipv6.startsWith("fc") || ipv6.startsWith("fd") ||           // fc00::/7 ULA
      ipv6.startsWith("fe8") || ipv6.startsWith("fe9") ||         // fe80::/10 link-local
      ipv6.startsWith("fea") || ipv6.startsWith("feb") ||
      ipv6.startsWith("::ffff:")                                   // IPv4-mapped IPv6
    ) {
      return "IPv6 private/link-local addresses are not allowed";
    }
  }

  // Also check bare IPv6 (some URL parsers strip brackets)
  if (
    hostname.startsWith("fc") || hostname.startsWith("fd") ||
    hostname.startsWith("fe8") || hostname.startsWith("fe9") ||
    hostname.startsWith("fea") || hostname.startsWith("feb") ||
    hostname.startsWith("::ffff:") ||
    hostname === "::" || hostname === "0:0:0:0:0:0:0:0"
  ) {
    return "IPv6 private/link-local addresses are not allowed";
  }

  return null; // URL is safe
}

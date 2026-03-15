import { createClient } from "npm:@insforge/sdk";

const TOKEN_REGEX = /^\d{8,15}:[A-Za-z0-9_-]{35,}$/;
const MASTER_KEY_NAME = "master_key";

async function encryptWithAES(plaintext, base64Key) {
  const binaryKey = Uint8Array.from(atob(base64Key), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", binaryKey, { name: "AES-GCM" }, false, [
    "encrypt",
  ]);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return `v2:${btoa(String.fromCharCode(...combined))}`;
}

function getCorsHeaders() {
  const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createAuthenticatedClient(userToken) {
  return createClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL"),
    edgeFunctionToken: userToken,
  });
}

async function requireAuthenticatedUser(req, corsHeaders) {
  const authHeader = req.headers.get("Authorization");
  const userToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!userToken) {
    return { response: json({ error: "Unauthorized" }, 401, corsHeaders), user: null, client: null };
  }

  const client = createAuthenticatedClient(userToken);
  const { data, error } = await client.auth.getCurrentUser();

  if (error || !data?.user?.id) {
    return { response: json({ error: "Unauthorized" }, 401, corsHeaders), user: null, client: null };
  }

  return { response: null, user: data.user, client };
}

async function requireDashboardAdmin(client, user, corsHeaders) {
  const userId = typeof user?.id === "string" ? user.id : null;
  const userEmail = typeof user?.email === "string" ? user.email.toLowerCase() : null;

  if (!userId || !userEmail) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  const { data, error } = await client.database
    .from("dashboard_admins")
    .select("auth_user_id,email")
    .or(`auth_user_id.eq.${userId},email.eq.${userEmail}`)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return json({ error: "Unauthorized owner account" }, 403, corsHeaders);
  }

  return null;
}

async function verifyBotToken(token) {
  if (!TOKEN_REGEX.test(token)) {
    throw new Error("Invalid token format");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: controller.signal,
    });
    const data = await response.json();

    if (!data.ok || !data.result) {
      throw new Error(data.description || "Invalid bot token");
    }

    return data.result;
  } finally {
    clearTimeout(timeout);
  }
}

async function getMasterKey(client) {
  const { data, error } = await client.database
    .from("nezuko_secrets")
    .select("key_name,key_value")
    .eq("key_name", MASTER_KEY_NAME)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to read Security Vault");
  }

  const key = data?.key_value;
  if (typeof key !== "string" || key.length === 0) {
    throw new Error("Security Vault not configured");
  }

  return key;
}

async function handleVerify(body, corsHeaders) {
  const { token } = body;

  if (!token) {
    return json({ error: "Token is required" }, 400, corsHeaders);
  }

  try {
    const botInfo = await verifyBotToken(token);
    return json(
      {
        is_valid: true,
        bot_id: botInfo.id,
        username: botInfo.username,
        first_name: botInfo.first_name,
      },
      200,
      corsHeaders
    );
  } catch (error) {
    return json(
      {
        is_valid: false,
        error: error instanceof Error ? error.message : "Token verification failed",
      },
      200,
      corsHeaders
    );
  }
}

async function handleAdd(body, client, user, corsHeaders) {
  const { token } = body;

  if (!token) {
    return json({ error: "Token is required" }, 400, corsHeaders);
  }

  try {
    const botInfo = await verifyBotToken(token);
    const masterKey = await getMasterKey(client);
    const encryptedToken = await encryptWithAES(token, masterKey);

    const payload = {
      owner_telegram_id: 0,
      bot_id: botInfo.id,
      bot_username: botInfo.username ?? `bot_${botInfo.id}`,
      bot_name: botInfo.first_name ?? null,
      token_encrypted: encryptedToken,
      is_active: true,
      is_deleted: false,
      deleted_at: null,
    };

    const { data, error } = await client.database
      .from("bot_instances")
      .upsert(payload, { onConflict: "bot_id" })
      .select()
      .single();

    if (error) {
      console.error("[manage-bot] add failed:", JSON.stringify(error));
      return json({ error: "Failed to store bot" }, 500, corsHeaders);
    }

    return json(data, 200, corsHeaders);
  } catch (error) {
    console.error("[manage-bot] add error:", error instanceof Error ? error.message : error);
    return json(
      { error: error instanceof Error ? error.message : "Failed to add bot" },
      400,
      corsHeaders
    );
  }
}

async function handleUpdate(body, client, corsHeaders) {
  const { id, is_active } = body;

  if (!id) {
    return json({ error: "id is required" }, 400, corsHeaders);
  }

  const { data, error } = await client.database
    .from("bot_instances")
    .update({ is_active })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[manage-bot] update failed:", JSON.stringify(error));
    return json({ error: "Failed to update bot" }, 500, corsHeaders);
  }

  if (!data) {
    return json({ error: "Bot not found" }, 404, corsHeaders);
  }

  return json(data, 200, corsHeaders);
}

async function handleDelete(body, client, corsHeaders) {
  const { id } = body;

  if (!id) {
    return json({ error: "id is required" }, 400, corsHeaders);
  }

  const { data, error } = await client.database
    .from("bot_instances")
    .update({
      is_deleted: true,
      is_active: false,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,is_deleted")
    .single();

  if (error) {
    console.error("[manage-bot] delete failed:", JSON.stringify(error));
    return json({ error: "Failed to delete bot" }, 500, corsHeaders);
  }

  if (!data) {
    return json({ error: "Bot not found" }, 404, corsHeaders);
  }

  return json({ success: true }, 200, corsHeaders);
}

export default async function manageBot(req) {
  const corsHeaders = getCorsHeaders();

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const contentType = req.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    return json({ error: "Content-Type must be application/json" }, 415, corsHeaders);
  }

  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "verify") {
      return await handleVerify(body, corsHeaders);
    }

    const authResult = await requireAuthenticatedUser(req, corsHeaders);
    if (authResult.response) {
      return authResult.response;
    }

    const adminResponse = await requireDashboardAdmin(authResult.client, authResult.user, corsHeaders);
    if (adminResponse) {
      return adminResponse;
    }

    if (action === "add") {
      return await handleAdd(body, authResult.client, authResult.user, corsHeaders);
    }

    if (action === "update") {
      return await handleUpdate(body, authResult.client, corsHeaders);
    }

    if (action === "delete") {
      return await handleDelete(body, authResult.client, corsHeaders);
    }

    return json({ error: `Unknown action: ${action}` }, 400, corsHeaders);
  } catch (error) {
    console.error("[manage-bot] unhandled error:", error instanceof Error ? error.message : error);
    return json({ error: "Internal server error" }, 500, corsHeaders);
  }
}

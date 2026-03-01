import { createClient } from 'npm:@insforge/sdk';

/**
 * Encrypt bot token using AES-256-GCM (Modern Standard)
 * Used when a master_key is provided from the dashboard.
 */
async function encryptWithAES(plaintext, base64Key) {
  try {
    const binaryKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'raw',
      binaryKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // 12-byte IV is standard for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plaintext)
    );

    // Combine IV (12 bytes) + Ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Prefix with v2: to identify the new format
    return 'v2:' + btoa(String.fromCharCode(...combined));
  } catch (err) {
    // Fix SEC-16: Sanitize error log — only log message, not full error object
    console.error('[encryptWithAES] Encryption failed:', err.message);
    throw new Error('Secret vault encryption failed');
  }
}

// Fix SEC-08: Token format regex — must match BEFORE any Telegram API call
const TOKEN_REGEX = /^\d{8,15}:[A-Za-z0-9_-]{35,}$/;

export default async function(req) {
  // Fix SEC-04: Replace wildcard CORS with env-based origin
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fix SEC-20: Validate Content-Type before parsing JSON
  const contentType = req.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
      status: 415,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'verify') {
      return await handleVerify(body, corsHeaders);
    } else if (action === 'add') {
      return await handleAdd(body, corsHeaders);
    } else if (action === 'update') {
      return await handleUpdate(body, corsHeaders);
    } else if (action === 'delete') {
      return await handleDelete(body, corsHeaders);
    } else {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('[manage-bot] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleVerify(body, corsHeaders) {
  const { token } = body;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Token is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fix SEC-08: Validate token format before hitting Telegram API
  if (!TOKEN_REGEX.test(token)) {
    return new Response(JSON.stringify({ error: 'Invalid token format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fix SEC-13: AbortController with 8s timeout on Telegram API fetch
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: controller.signal,
    });
    const data = await response.json();

    if (!data.ok) {
      return new Response(JSON.stringify({ is_valid: false, error: data.description || 'Invalid token' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      is_valid: true,
      bot_id: data.result.id,
      username: data.result.username,
      first_name: data.result.first_name,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Fix EF-01/SEC-07: Replace err.message with generic error to avoid leaking internals
    return new Response(JSON.stringify({ is_valid: false, error: 'Token verification failed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function handleAdd(body, corsHeaders) {
  const { token, master_key } = body;
  // owner_telegram_id is optional since Phase 75 (Telegram auth removed).
  // DB column has DEFAULT 0 and is NOT NULL, so we default to 0 here.
  const owner_telegram_id = body.owner_telegram_id ?? 0;
  console.log('[manage-bot] handleAdd called. master_key present:', !!master_key);

  if (!token) {
    return new Response(JSON.stringify({ error: 'Token is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fix SEC-08: Validate token format before hitting Telegram API
  if (!TOKEN_REGEX.test(token)) {
    return new Response(JSON.stringify({ error: 'Invalid token format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Step 1: Verify token with Telegram — Fix SEC-13: AbortController with 8s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let verifyData;
  try {
    const verifyResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: controller.signal,
    });
    verifyData = await verifyResponse.json();
  } finally {
    clearTimeout(timeout);
  }

  if (!verifyData.ok) {
    return new Response(JSON.stringify({ error: 'Invalid bot token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const botInfo = verifyData.result;

  // Step 2: Encrypt token — master_key is required (no fallback)
  if (!master_key) {
    return new Response(JSON.stringify({ error: 'Security Vault not configured. A master encryption key is required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  console.log('[manage-bot] Using AES-GCM vault encryption...');
  const encryptedToken = await encryptWithAES(token, master_key);

  // Step 3: UPSERT into database
  const baseUrl = Deno.env.get('INSFORGE_BASE_URL');
  const anonKey = Deno.env.get('ANON_KEY');

  const client = createClient({
    baseUrl,
    anonKey,
  });

  // Fix SEC-22: Remove updated_at — DB trigger handles this automatically
  const upsertPayload = {
    owner_telegram_id: owner_telegram_id,
    bot_id: botInfo.id,
    bot_username: botInfo.username,
    bot_name: botInfo.first_name,
    token_encrypted: encryptedToken,
    is_active: true,
    is_deleted: false,
    deleted_at: null,
  };

  const { data, error } = await client.database
    .from('bot_instances')
    .upsert(upsertPayload, { onConflict: 'bot_id' })
    .select()
    .single();

  if (error) {
    // Fix SEC-12: Log full error server-side, return generic message to client
    console.error('[manage-bot] DB upsert error:', JSON.stringify(error));
    return new Response(JSON.stringify({ error: 'Database operation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fix SQL-10: Return 200 (not 201) — upsert may update an existing row
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Update bot is_active status.
 * Used to bypass RLS in dev mode via authenticated Edge Function runner.
 */
async function handleUpdate(body, corsHeaders) {
  const { id, is_active } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const baseUrl = Deno.env.get('INSFORGE_BASE_URL');
  const anonKey = Deno.env.get('ANON_KEY');
  const client = createClient({ baseUrl, anonKey });

  const { data, error } = await client.database
    .from('bot_instances')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[manage-bot] Update error:', JSON.stringify(error));
    return new Response(JSON.stringify({ error: 'Failed to update bot' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!data) {
    console.error('[manage-bot] Update: No rows affected for id:', id, '— possible RLS block or missing row');
    return new Response(JSON.stringify({ error: 'Bot not found or update blocked by RLS' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Soft-delete a bot.
 * Used to bypass RLS in dev mode via authenticated Edge Function runner.
 */
async function handleDelete(body, corsHeaders) {
  const { id } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const baseUrl = Deno.env.get('INSFORGE_BASE_URL');
  const anonKey = Deno.env.get('ANON_KEY');
  const client = createClient({ baseUrl, anonKey });

  const { data, error } = await client.database
    .from('bot_instances')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq('id', id)
    .select('id, is_deleted')
    .single();

  if (error) {
    console.error('[manage-bot] Delete error:', JSON.stringify(error));
    return new Response(JSON.stringify({ error: 'Failed to delete bot' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!data) {
    console.error('[manage-bot] Delete: No rows affected for id:', id, '— possible RLS block or missing row');
    return new Response(JSON.stringify({ error: 'Bot not found or delete blocked by RLS' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[manage-bot] Bot soft-deleted successfully:', JSON.stringify(data));
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

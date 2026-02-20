import { createClient } from 'npm:@insforge/sdk';
import fernet from 'npm:fernet@0.4.0';

export default async function(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
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

  try {
    const body = await req.json();
    const { action } = body;

    console.log(`[manage-bot] Received action: ${action}`);

    if (action === 'verify') {
      return await handleVerify(body, corsHeaders);
    } else if (action === 'add') {
      return await handleAdd(body, corsHeaders);
    } else {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('[manage-bot] Unhandled error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
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

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
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
    return new Response(JSON.stringify({ is_valid: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleAdd(body, corsHeaders) {
  const { token, owner_telegram_id } = body;

  if (!token || owner_telegram_id === undefined || owner_telegram_id === null) {
    return new Response(JSON.stringify({ error: 'Token and owner_telegram_id are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Verify token
  const verifyResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const verifyData = await verifyResponse.json();

  if (!verifyData.ok) {
    return new Response(JSON.stringify({ error: 'Invalid bot token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const botInfo = verifyData.result;

  // 2. Encrypt token
  const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
  if (!encryptionKey) {
    console.error('[manage-bot] ENCRYPTION_KEY not set');
    return new Response(JSON.stringify({ error: 'Server configuration error: ENCRYPTION_KEY missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const secret = new fernet.Secret(encryptionKey);
    const tokenObj = new fernet.Token({
      secret: secret,
    });
    const encryptedToken = tokenObj.encode(token);

    // 3. Insert into DB
    const baseUrl = Deno.env.get('INSFORGE_BASE_URL');
    const anonKey = Deno.env.get('ANON_KEY');
    // Use SERVICE_ROLE_KEY if available for bypassing RLS, otherwise ANON_KEY
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') || anonKey;

    if (!baseUrl || !serviceKey) {
      console.error('[manage-bot] Missing INSFORGE_BASE_URL or Service/Anon Key');
      return new Response(JSON.stringify({ error: 'Server configuration error: Database credentials missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = createClient({
      baseUrl,
      anonKey: serviceKey, // Using service key to ensure write access
    });

    const insertPayload = {
      owner_telegram_id: owner_telegram_id,
      bot_id: botInfo.id,
      bot_username: botInfo.username,
      bot_name: botInfo.first_name,
      token_encrypted: encryptedToken,
      is_active: true,
    };

    const { data, error } = await client.database
      .from('bot_instances')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('[manage-bot] DB Insert Error:', error);
      return new Response(JSON.stringify({ error: error.message || 'Database insert failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[manage-bot] Encryption/DB Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error during bot addition' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

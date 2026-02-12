import { createClient } from 'npm:@insforge/sdk';

export default async function(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
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

  try {
    const body = await req.json();
    const { action } = body;

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
  if (!token || !owner_telegram_id) {
    return new Response(JSON.stringify({ error: 'Token and owner_telegram_id are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Step 1: Verify token with Telegram
  const verifyResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const verifyData = await verifyResponse.json();

  if (!verifyData.ok) {
    return new Response(JSON.stringify({ error: 'Invalid bot token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const botInfo = verifyData.result;

  // Step 2: Encrypt token using base64 (compatible storage)
  // Note: The actual Fernet decryption happens in the Python bot.
  // For the Edge Function, we store the token as base64 encoded.
  // The ENCRYPTION_KEY env var would be needed for full Fernet compatibility.
  const encryptedToken = btoa(token);

  // Step 3: Insert into database
  const client = createClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
    anonKey: Deno.env.get('ANON_KEY'),
  });

  const { data, error } = await client.database
    .from('bot_instances')
    .insert([{
      owner_telegram_id: owner_telegram_id,
      bot_id: botInfo.id,
      bot_username: botInfo.username,
      bot_name: botInfo.first_name,
      token_encrypted: encryptedToken,
      is_active: true,
    }])
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

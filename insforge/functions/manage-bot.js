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
  console.log('[manage-bot] handleAdd called with owner_telegram_id:', owner_telegram_id, 'token present:', !!token);

  if (!token || (owner_telegram_id === undefined || owner_telegram_id === null)) {
    return new Response(JSON.stringify({ error: 'Token and owner_telegram_id are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Step 1: Verify token with Telegram
  console.log('[manage-bot] Verifying token with Telegram API...');
  const verifyResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const verifyData = await verifyResponse.json();

  if (!verifyData.ok) {
    console.log('[manage-bot] Token verification failed:', verifyData.description);
    return new Response(JSON.stringify({ error: 'Invalid bot token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const botInfo = verifyData.result;
  console.log('[manage-bot] Token verified. Bot:', botInfo.username, 'ID:', botInfo.id);

  // Step 2: Encrypt token using base64 (compatible storage)
  const encryptedToken = btoa(token);

  // Step 3: Insert into database
  const baseUrl = Deno.env.get('INSFORGE_BASE_URL');
  const anonKey = Deno.env.get('ANON_KEY');
  console.log('[manage-bot] Creating InsForge client. baseUrl:', baseUrl ? 'set' : 'NOT SET', 'anonKey:', anonKey ? 'set' : 'NOT SET');

  const client = createClient({
    baseUrl,
    anonKey,
  });

  const insertPayload = {
    owner_telegram_id: owner_telegram_id,
    bot_id: botInfo.id,
    bot_username: botInfo.username,
    bot_name: botInfo.first_name,
    token_encrypted: encryptedToken,
    is_active: true,
  };
  console.log('[manage-bot] Inserting bot:', JSON.stringify({ ...insertPayload, token_encrypted: '***' }));

  const { data, error } = await client.database
    .from('bot_instances')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error('[manage-bot] DB insert error:', JSON.stringify(error));
    return new Response(JSON.stringify({ error: error.message || 'Database insert failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[manage-bot] Bot inserted successfully:', data?.id);
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

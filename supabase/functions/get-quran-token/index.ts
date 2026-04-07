import { corsHeaders } from '../_shared/cors.ts';

/**
 * Edge Function: get-quran-token
 *
 * Retrieves an OAuth2 access token from the Quran Foundation Content API
 * using client_credentials grant. Credentials are read from environment
 * variables and never exposed to the client.
 *
 * Env vars required (set via Supabase Secrets):
 *   QF_CLIENT_ID     — OAuth2 client ID
 *   QF_CLIENT_SECRET — OAuth2 client secret (server-side only)
 *   QF_ENV           — "prelive" | "production"  (defaults to "prelive")
 *
 * Response shape:
 *   { access_token, expires_in, token_type, env, client_id }
 *   NOTE: client_id is intentionally returned — it is not secret and is
 *   required as the `x-client-id` header on every Content API request.
 *   client_secret is NEVER returned.
 */

const OAUTH2_ENDPOINTS: Record<string, string> = {
  prelive:    'https://prelive-oauth2.quran.foundation',
  production: 'https://oauth2.quran.foundation',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Read credentials from environment — client_secret is never passed to the client
    const clientId     = Deno.env.get('QF_CLIENT_ID');
    const clientSecret = Deno.env.get('QF_CLIENT_SECRET');
    const env          = Deno.env.get('QF_ENV') ?? 'prelive';

    if (!clientId || !clientSecret) {
      console.error('get-quran-token: QF_CLIENT_ID or QF_CLIENT_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: credentials not set' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const baseUrl  = OAUTH2_ENDPOINTS[env] ?? OAUTH2_ENDPOINTS['prelive'];
    const tokenUrl = `${baseUrl}/oauth2/token`;

    // Build HTTP Basic auth header: Base64(clientId:clientSecret)
    const credentials = btoa(`${clientId}:${clientSecret}`);

    console.log(`get-quran-token: requesting token from ${tokenUrl} (env=${env})`);

    // POST /oauth2/token with client_credentials grant
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'content',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error(`get-quran-token: OAuth2 server error ${tokenRes.status}: ${errorBody}`);
      return new Response(
        JSON.stringify({
          error: `Quran Foundation OAuth2 error: [${tokenRes.status}] ${errorBody || tokenRes.statusText}`,
        }),
        {
          status: tokenRes.status >= 500 ? 502 : tokenRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tokenData = await tokenRes.json();
    const { access_token, expires_in, token_type } = tokenData;

    if (!access_token) {
      console.error('get-quran-token: no access_token in response', JSON.stringify(tokenData));
      return new Response(
        JSON.stringify({ error: 'Quran Foundation OAuth2: no access_token returned' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`get-quran-token: token retrieved successfully, expires_in=${expires_in}`);

    // Return token metadata + client_id (needed for x-client-id header).
    // client_secret is NEVER included in the response.
    return new Response(
      JSON.stringify({
        access_token,
        expires_in:  expires_in  ?? null,
        token_type:  token_type  ?? 'Bearer',
        env,
        client_id:   clientId,   // safe to return — not a secret
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('get-quran-token: unexpected error', err);
    return new Response(
      JSON.stringify({ error: `Internal error: ${String(err)}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

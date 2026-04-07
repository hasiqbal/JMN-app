import { corsHeaders } from '../_shared/cors.ts';
import { qfApiGet } from '../_shared/qf-token.ts';

/**
 * Edge Function: quran-chapters
 *
 * Backend proxy for GET /content/api/v4/chapters from the Quran Foundation
 * Content API. Credentials and access tokens stay server-side; only the
 * chapters payload is returned to the caller.
 *
 * Response shape:
 *   { chapters: Chapter[] }
 *
 * On error:
 *   { error: string }  with an appropriate HTTP status code.
 *
 * Env vars required (same as get-quran-token):
 *   QF_CLIENT_ID, QF_CLIENT_SECRET, QF_ENV
 */

Deno.serve(async (req) => {
  // ── CORS preflight ────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Allow GET and POST (Supabase invoke() uses POST)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    console.log('quran-chapters: fetching /content/api/v4/chapters');

    const data = await qfApiGet<{ chapters: unknown[] }>('/content/api/v4/chapters');

    // Verify the response contains a chapters array
    if (!Array.isArray(data?.chapters)) {
      console.error('quran-chapters: unexpected response shape', JSON.stringify(data).slice(0, 200));
      return new Response(
        JSON.stringify({ error: 'QF Content API returned unexpected response shape' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`quran-chapters: success — ${data.chapters.length} chapters returned`);

    return new Response(
      JSON.stringify({ chapters: data.chapters }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('quran-chapters: error', err);
    return new Response(
      JSON.stringify({ error: `quran-chapters: ${String(err)}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

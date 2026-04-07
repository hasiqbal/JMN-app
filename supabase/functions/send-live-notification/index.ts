import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const title   = body.title   ?? "JMN Live Radio";
    const message = body.message ?? "Jami' Masjid Noorani is now LIVE!";
    const data    = body.data    ?? {};

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Mark masjid as live in app_settings
    await supabase
      .from('app_settings')
      .upsert({ key: 'is_live', value: 'true', updated_at: new Date().toISOString() }, { onConflict: 'key' });

    // Fetch all active subscriptions
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('token')
      .eq('is_active', true);

    if (error) {
      console.error('DB error:', error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No active subscribers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Expo push messages (batch max 100 per request)
    const tokens = subs.map((s: { token: string }) => s.token);
    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += 100) {
      chunks.push(tokens.slice(i, i + 100));
    }

    let totalSent = 0;
    for (const chunk of chunks) {
      const messages = chunk.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body: message,
        data,
        priority: 'high',
        channelId: 'live-notifications',
      }));

      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });

      if (res.ok) {
        totalSent += chunk.length;
        console.log(`Sent batch of ${chunk.length} notifications`);
      } else {
        const errText = await res.text();
        console.error('Expo push error:', errText);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, subscribers: tokens.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

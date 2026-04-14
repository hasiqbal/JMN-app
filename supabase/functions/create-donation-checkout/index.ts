import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const requestBody = await req.json().catch(() => ({}));
    const requestedPriceSlot = requestBody && typeof requestBody.priceSlot === 'number'
      ? requestBody.priceSlot
      : 1;

    const paymentLinkUrl = Deno.env.get('STRIPE_DONATION_PAYMENT_LINK');
    if (paymentLinkUrl) {
      return jsonResponse({ url: paymentLinkUrl });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripePriceId = Deno.env.get('STRIPE_DONATION_PRICE_ID');
    const stripePriceId2 = Deno.env.get('STRIPE_DONATION_PRICE_ID_2');

    if (!stripeSecretKey || !stripePriceId) {
      console.error('create-donation-checkout: missing Stripe configuration');
      return jsonResponse(
        {
          error:
            'Stripe is not configured. Set STRIPE_DONATION_PAYMENT_LINK or both STRIPE_SECRET_KEY and STRIPE_DONATION_PRICE_ID.',
        },
        500,
      );
    }

    // These sentinel URLs are intercepted by the in-app WebView (on native) or ignored (on web).
    // Native app intercepts these deep links via onShouldStartLoadWithRequest.
    const successUrl = 'jmn://donation-success';
    const cancelUrl = 'jmn://donation-cancel';

    const selectedPriceId = requestedPriceSlot === 2 ? stripePriceId2 : stripePriceId;
    if (!selectedPriceId) {
      return jsonResponse({ error: 'Requested donation product is not configured.' }, 400);
    }

    const formData = new URLSearchParams();
    formData.set('mode', 'payment');
    formData.set('submit_type', 'donate');
    formData.set('success_url', successUrl);
    formData.set('cancel_url', cancelUrl);
    formData.set('line_items[0][price]', selectedPriceId);
    formData.set('line_items[0][quantity]', '1');

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('create-donation-checkout: Stripe API error', stripeResponse.status, errorText);
      return jsonResponse({ error: `Stripe API error: [${stripeResponse.status}] ${errorText}` }, 502);
    }

    const stripeData = await stripeResponse.json();
    const url = typeof stripeData?.url === 'string' ? stripeData.url : null;

    if (!url) {
      console.error('create-donation-checkout: Stripe returned no checkout URL');
      return jsonResponse({ error: 'Stripe checkout URL not returned' }, 502);
    }

    return jsonResponse({ url });
  } catch (error) {
    console.error('create-donation-checkout: unexpected error', error);
    return jsonResponse({ error: `Internal error: ${String(error)}` }, 500);
  }
});

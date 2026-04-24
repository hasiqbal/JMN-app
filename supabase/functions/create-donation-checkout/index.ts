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

type DonationPriceSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type FixedDonationPriceSlot = 1 | 2 | 3 | 4;

const DEFAULT_DONATION_PRODUCTS: Record<FixedDonationPriceSlot, { priceId: string; productId: string }> = {
  1: { priceId: 'price_1TM6Q7Kl0bvHjcPrDV3DVWhO', productId: 'prod_UKly0pbT2wbqlx' },
  2: { priceId: 'price_1TM75xKl0bvHjcPrKZg5gzWv', productId: 'prod_UKmfG0zH1Yl3Ec' },
  3: { priceId: 'price_1T8OikKl0bvHjcPrM36aSY3K', productId: 'prod_U6bwwHO6J7X7Wo' },
  4: { priceId: 'price_1T8OaYKl0bvHjcPrRYzpRoqz', productId: 'prod_U6boJoavxYY6pJ' },
};

function normalizePriceSlot(value: unknown): DonationPriceSlot {
  const numericSlot = typeof value === 'number' ? value : Number(value);
  if (
    numericSlot === 2
    || numericSlot === 3
    || numericSlot === 4
    || numericSlot === 5
    || numericSlot === 6
    || numericSlot === 7
    || numericSlot === 8
    || numericSlot === 9
  ) {
    return numericSlot;
  }
  return 1;
}

function parsePriceSlot(value: unknown): DonationPriceSlot | null {
  const numericSlot = typeof value === 'number' ? value : Number(value);
  if (
    numericSlot === 1
    || numericSlot === 2
    || numericSlot === 3
    || numericSlot === 4
    || numericSlot === 5
    || numericSlot === 6
    || numericSlot === 7
    || numericSlot === 8
    || numericSlot === 9
  ) {
    return numericSlot;
  }
  return null;
}

function normalizeStripePriceId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

function getMissingSlotConfigError(slot: DonationPriceSlot): string {
  switch (slot) {
    case 5:
      return 'Custom one off donation is not configured. Set STRIPE_DONATION_PAYMENT_LINK_CUSTOM or STRIPE_DONATION_PRICE_ID_5.';
    case 6:
      return 'One-off £10 donation is not configured. Set STRIPE_DONATION_PRICE_ID_6.';
    case 7:
      return 'Monthly £50 donation is not configured. Set STRIPE_DONATION_PRICE_ID_7.';
    case 8:
      return 'Monthly £75 donation is not configured. Set STRIPE_DONATION_PRICE_ID_8.';
    case 9:
      return 'Monthly £100 donation is not configured. Set STRIPE_DONATION_PRICE_ID_9.';
    default:
      return 'Requested donation product is not configured.';
  }
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
    const rawPriceSlot = parsePriceSlot(requestBody?.priceSlot);
    const requestedPriceSlot = rawPriceSlot ?? normalizePriceSlot(requestBody?.priceSlot);
    const directStripePriceId = normalizeStripePriceId(requestBody?.stripePriceId);
    const directOptionId = typeof requestBody?.optionId === 'string' ? requestBody.optionId.trim() : '';
    const requestedFrequency = typeof requestBody?.frequency === 'string'
      ? requestBody.frequency.trim().toLowerCase()
      : '';

    const directMode = requestedFrequency === 'monthly'
      ? 'subscription'
      : requestedFrequency === 'one-off'
      ? 'payment'
      : null;

    const customPaymentLinkUrl = Deno.env.get('STRIPE_DONATION_PAYMENT_LINK_CUSTOM');
    if (!directStripePriceId && requestedPriceSlot === 5 && customPaymentLinkUrl) {
      return jsonResponse({ url: customPaymentLinkUrl });
    }

    const paymentLinkUrl = Deno.env.get('STRIPE_DONATION_PAYMENT_LINK');
    if (!directStripePriceId && paymentLinkUrl) {
      return jsonResponse({ url: paymentLinkUrl });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const customPriceId =
      Deno.env.get('STRIPE_DONATION_PRICE_ID_5') ||
      Deno.env.get('STRIPE_DONATION_PRICE_ID_CUSTOM') ||
      '';
    const customProductId =
      Deno.env.get('STRIPE_DONATION_PRODUCT_ID_5') ||
      Deno.env.get('STRIPE_DONATION_PRODUCT_ID_CUSTOM') ||
      'custom_one_off';
    const oneOff10PriceId = Deno.env.get('STRIPE_DONATION_PRICE_ID_6') || '';
    const oneOff10ProductId = Deno.env.get('STRIPE_DONATION_PRODUCT_ID_6') || 'one_off_10';
    const monthly50PriceId = Deno.env.get('STRIPE_DONATION_PRICE_ID_7') || '';
    const monthly50ProductId = Deno.env.get('STRIPE_DONATION_PRODUCT_ID_7') || 'monthly_50';
    const monthly75PriceId = Deno.env.get('STRIPE_DONATION_PRICE_ID_8') || '';
    const monthly75ProductId = Deno.env.get('STRIPE_DONATION_PRODUCT_ID_8') || 'monthly_75';
    const monthly100PriceId = Deno.env.get('STRIPE_DONATION_PRICE_ID_9') || '';
    const monthly100ProductId = Deno.env.get('STRIPE_DONATION_PRODUCT_ID_9') || 'monthly_100';

    const donationProductBySlot: Record<DonationPriceSlot, { priceId: string; productId: string } | null> = {
      1: {
        priceId:
          Deno.env.get('STRIPE_DONATION_PRICE_ID_1') ||
          Deno.env.get('STRIPE_DONATION_PRICE_ID') ||
          DEFAULT_DONATION_PRODUCTS[1].priceId,
        productId:
          Deno.env.get('STRIPE_DONATION_PRODUCT_ID_1') ||
          DEFAULT_DONATION_PRODUCTS[1].productId,
      },
      2: {
        priceId: Deno.env.get('STRIPE_DONATION_PRICE_ID_2') || DEFAULT_DONATION_PRODUCTS[2].priceId,
        productId:
          Deno.env.get('STRIPE_DONATION_PRODUCT_ID_2') ||
          DEFAULT_DONATION_PRODUCTS[2].productId,
      },
      3: {
        priceId: Deno.env.get('STRIPE_DONATION_PRICE_ID_3') || DEFAULT_DONATION_PRODUCTS[3].priceId,
        productId:
          Deno.env.get('STRIPE_DONATION_PRODUCT_ID_3') ||
          DEFAULT_DONATION_PRODUCTS[3].productId,
      },
      4: {
        priceId: Deno.env.get('STRIPE_DONATION_PRICE_ID_4') || DEFAULT_DONATION_PRODUCTS[4].priceId,
        productId:
          Deno.env.get('STRIPE_DONATION_PRODUCT_ID_4') ||
          DEFAULT_DONATION_PRODUCTS[4].productId,
      },
      5: customPriceId
        ? {
            priceId: customPriceId,
            productId: customProductId,
          }
        : null,
      6: oneOff10PriceId
        ? {
            priceId: oneOff10PriceId,
            productId: oneOff10ProductId,
          }
        : null,
      7: monthly50PriceId
        ? {
            priceId: monthly50PriceId,
            productId: monthly50ProductId,
          }
        : null,
      8: monthly75PriceId
        ? {
            priceId: monthly75PriceId,
            productId: monthly75ProductId,
          }
        : null,
      9: monthly100PriceId
        ? {
            priceId: monthly100PriceId,
            productId: monthly100ProductId,
          }
        : null,
    };

    if (!stripeSecretKey) {
      console.error('create-donation-checkout: missing Stripe configuration');
      return jsonResponse(
        {
          error:
            'Stripe is not configured. Set STRIPE_DONATION_PAYMENT_LINK or STRIPE_SECRET_KEY.',
        },
        500,
      );
    }

    // These sentinel URLs are intercepted by the in-app WebView (on native) or ignored (on web).
    // Native app intercepts these deep links via onShouldStartLoadWithRequest.
    const successUrl = 'jmn://donation-success';
    const cancelUrl = 'jmn://donation-cancel';

    const selectedDonationProduct = donationProductBySlot[requestedPriceSlot];
    const selectedPriceId = directStripePriceId || selectedDonationProduct?.priceId;

    if (!selectedPriceId) {
      return jsonResponse({ error: getMissingSlotConfigError(requestedPriceSlot) }, 400);
    }

    const slotUsesSubscriptionMode =
      requestedPriceSlot === 3
      || requestedPriceSlot === 4
      || requestedPriceSlot === 7
      || requestedPriceSlot === 8
      || requestedPriceSlot === 9;

    const usesSubscriptionMode = directMode
      ? directMode === 'subscription'
      : slotUsesSubscriptionMode;

    const selectedProductId = selectedDonationProduct?.productId || directOptionId || 'direct_price';

    const formData = new URLSearchParams();
    formData.set('mode', usesSubscriptionMode ? 'subscription' : 'payment');
    if (!usesSubscriptionMode) {
      formData.set('submit_type', 'donate');
    }
    formData.set('success_url', successUrl);
    formData.set('cancel_url', cancelUrl);
    // Capture full billing details and Gift Aid opt-in at payment time on Stripe Checkout.
    formData.set('billing_address_collection', 'required');
    formData.set('custom_fields[0][key]', 'gift_aid_opt_in');
    formData.set('custom_fields[0][label][type]', 'custom');
    formData.set('custom_fields[0][label][custom]', 'Gift Aid: Are you a UK taxpayer and would you like to add Gift Aid?');
    formData.set('custom_fields[0][type]', 'dropdown');
    formData.set('custom_fields[0][dropdown][options][0][label]', 'Yes, add Gift Aid');
    formData.set('custom_fields[0][dropdown][options][0][value]', 'yes');
    formData.set('custom_fields[0][dropdown][options][1][label]', 'No, do not add Gift Aid');
    formData.set('custom_fields[0][dropdown][options][1][value]', 'no');
    formData.set('custom_fields[1][key]', 'gift_aid_declaration');
    formData.set('custom_fields[1][label][type]', 'custom');
    formData.set('custom_fields[1][label][custom]', 'Gift Aid declaration confirmation');
    formData.set('custom_fields[1][type]', 'dropdown');
    formData.set('custom_fields[1][dropdown][options][0][label]', 'I confirm I am a UK taxpayer and want Gift Aid applied');
    formData.set('custom_fields[1][dropdown][options][0][value]', 'confirmed');
    formData.set('custom_fields[1][dropdown][options][1][label]', 'I do not want to make this declaration');
    formData.set('custom_fields[1][dropdown][options][1][value]', 'not_confirmed');
    formData.set('line_items[0][price]', selectedPriceId);
    formData.set('line_items[0][quantity]', '1');
    if (rawPriceSlot !== null) {
      formData.set('metadata[donation_slot]', String(rawPriceSlot));
    }
    formData.set('metadata[donation_product_id]', selectedProductId);
    if (directStripePriceId) {
      formData.set('metadata[donation_source]', 'direct_price_id');
    }
    formData.set('metadata[gift_aid_capture]', 'stripe_checkout_custom_fields');

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

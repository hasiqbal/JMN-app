interface DonationCheckoutResponse {
  url?: string;
  checkout_url?: string;
  payment_link_url?: string;
  error?: string;
}

/**
 * Requests a fresh Stripe Checkout URL from the backend edge function.
 * Secrets stay server-side; the app only receives the hosted checkout URL.
 */
export async function createDonationCheckoutUrl(priceSlot: 1 | 2 = 1): Promise<string> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  // Use JWT anon key for Bearer auth; fall back to publishable key if needed
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase configuration missing');
  }

  const functionUrl = `${supabaseUrl}/functions/v1/create-donation-checkout`;

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ priceSlot }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`[${response.status}] ${errorBody || response.statusText}`);
    }

    const data: DonationCheckoutResponse = await response.json();
    const checkoutUrl = data?.url ?? data?.checkout_url ?? data?.payment_link_url;
    if (!checkoutUrl) {
      throw new Error('No checkout URL returned');
    }

    return checkoutUrl;
  } catch (error) {
    throw new Error(`Unable to start donation checkout: ${error instanceof Error ? error.message : String(error)}`);
  }
}

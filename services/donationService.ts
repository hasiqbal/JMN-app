import { DonationWallet } from '@/constants/donationTypes';

interface DonationCheckoutResponse {
  url?: string;
  checkout_url?: string;
  payment_link_url?: string;
  error?: string;
}

interface DonationSummaryResponse {
  total_raised_minor?: number;
  currency?: string;
  donation_count?: number;
  error?: string;
}

/**
 * Requests a fresh Stripe Checkout URL from the backend edge function.
 * Secrets stay server-side; the app only receives the hosted checkout URL.
 */
export async function createDonationCheckoutUrl(
  priceSlot: 1 | 2 = 1,
  preferredWallet?: DonationWallet,
): Promise<string> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase configuration missing');
  }

  const functionUrl = `${supabaseUrl}/functions/v1/create-donation-checkout`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ priceSlot, preferredWallet }),
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
}

/**
 * Fetches total amount raised from Stripe via Supabase edge function.
 */
export async function fetchDonationSummary(): Promise<{ totalRaisedMinor: number; currency: string; donationCount: number }> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase configuration missing');
  }

  const functionUrl = `${supabaseUrl}/functions/v1/get-donation-summary`;

  const response = await fetch(functionUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[${response.status}] ${errorBody || response.statusText}`);
  }

  const data: DonationSummaryResponse = await response.json();
  const totalRaisedMinor = Number.isFinite(data?.total_raised_minor) ? Number(data.total_raised_minor) : 0;
  const currency = typeof data?.currency === 'string' && data.currency ? data.currency : 'gbp';
  const donationCount = Number.isFinite(data?.donation_count) ? Number(data.donation_count) : 0;

  return { totalRaisedMinor, currency, donationCount };
}

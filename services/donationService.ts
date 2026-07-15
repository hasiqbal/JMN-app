import {
  DONATION_MONTHLY_OPTIONS,
  DONATION_ONE_OFF_OPTIONS,
  type DonationFrequency,
  type DonationPriceSlot,
} from '@/constants/donationTypes';
import { APP_CONFIG } from '@/constants/config';

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

type DonationOptionRow = {
  id: string;
  title: string;
  subtitle: string | null;
  frequency: DonationFrequency;
  price_slot: number | null;
  stripe_price_id: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_pinned: boolean;
  pin_order: number;
  display_order: number;
  global_order: number;
  campaign_label: string | null;
  campaign_copy: string | null;
  tags: string[] | null;
};

export interface AppDonationOption {
  id: string;
  title: string;
  subtitle: string;
  frequency: DonationFrequency;
  priceSlot: DonationPriceSlot | null;
  stripePriceId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isPinned: boolean;
  pinOrder: number;
  displayOrder: number;
  globalOrder: number;
  campaignLabel: string | null;
  campaignCopy: string | null;
  tags: string[];
}

export type DonationCheckoutInput =
  | DonationPriceSlot
  | {
      priceSlot?: DonationPriceSlot | null;
      stripePriceId?: string | null;
      optionId?: string | null;
      frequency?: DonationFrequency | null;
    };

function normalizeExternalUrl(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getFallbackDonationUrl(): string {
  return normalizeExternalUrl(process.env.EXPO_PUBLIC_DONATION_EXTERNAL_URL)
    ?? normalizeExternalUrl(APP_CONFIG.website)
    ?? 'https://noorani-masjid.org';
}

function normalizePriceSlot(value: unknown): DonationPriceSlot | null {
  const slot = Number(value);
  if (
    slot === 1
    || slot === 2
    || slot === 3
    || slot === 4
    || slot === 5
    || slot === 6
    || slot === 7
    || slot === 8
    || slot === 9
  ) {
    return slot;
  }
  return null;
}

function fallbackDonationOptions(): AppDonationOption[] {
  const all = [...DONATION_ONE_OFF_OPTIONS, ...DONATION_MONTHLY_OPTIONS];

  return all.map((option, index) => ({
    id: `slot-${option.priceSlot}`,
    title: option.title,
    subtitle: option.subtitle,
    frequency: option.frequency,
    priceSlot: option.priceSlot,
    stripePriceId: null,
    isActive: true,
    isFeatured: false,
    isPinned: false,
    pinOrder: 0,
    displayOrder: index,
    globalOrder: index,
    campaignLabel: null,
    campaignCopy: null,
    tags: [],
  }));
}

export async function fetchDonationOptionsForApp(): Promise<AppDonationOption[]> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !anonKey) {
    return fallbackDonationOptions();
  }

  const query = [
    'select=id,title,subtitle,frequency,price_slot,stripe_price_id,is_active,is_featured,is_pinned,pin_order,display_order,global_order,campaign_label,campaign_copy,tags',
    'order=is_pinned.desc,pin_order.asc,global_order.asc,frequency.asc,display_order.asc,created_at.asc',
    'is_active=eq.true',
  ].join('&');

  const endpoint = `${supabaseUrl}/rest/v1/donation_options?${query}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch donation options: ${response.status}`);
    }

    const rows = (await response.json()) as DonationOptionRow[];

    const normalized = rows
      .map((row): AppDonationOption => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle ?? '',
        frequency: row.frequency,
        priceSlot: normalizePriceSlot(row.price_slot),
        stripePriceId: row.stripe_price_id ?? null,
        isActive: row.is_active,
        isFeatured: row.is_featured,
        isPinned: row.is_pinned,
        pinOrder: Number(row.pin_order || 0),
        displayOrder: Number(row.display_order || 0),
        globalOrder: Number(row.global_order || 0),
        campaignLabel: row.campaign_label ?? null,
        campaignCopy: row.campaign_copy ?? null,
        tags: Array.isArray(row.tags) ? row.tags : [],
      }))
      .filter((row) => !!row.priceSlot || !!row.stripePriceId);

    return normalized.length > 0 ? normalized : fallbackDonationOptions();
  } catch {
    return fallbackDonationOptions();
  }
}

/**
 * Requests a fresh Stripe Checkout URL from the backend edge function.
 * Secrets stay server-side; the app only receives the hosted checkout URL.
 */
export async function createDonationCheckoutUrl(
  input: DonationCheckoutInput = 1,
): Promise<string> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !anonKey) {
    // Keep checkout usable in release builds even if edge-function env is absent.
    return getFallbackDonationUrl();
  }

  const functionUrl = `${supabaseUrl}/functions/v1/create-donation-checkout`;

  const payload = typeof input === 'number'
    ? { priceSlot: input }
    : {
        priceSlot: input.priceSlot ?? undefined,
        stripePriceId: input.stripePriceId?.trim() || undefined,
        optionId: input.optionId?.trim() || undefined,
        frequency: input.frequency ?? undefined,
      };

  if (!payload.priceSlot && !payload.stripePriceId) {
    throw new Error('No donation checkout target provided.');
  }

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
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

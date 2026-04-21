export type DonationPriceSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type DonationWallet = 'apple_pay' | 'google_pay';
export type DonationFrequency = 'one-off' | 'monthly';

export interface DonationTypeOption {
  priceSlot: DonationPriceSlot;
  frequency: DonationFrequency;
  title: string;
  subtitle: string;
}

export interface DonationWalletOption {
  key: DonationWallet;
  title: string;
  subtitle: string;
}

export const DONATION_ONE_OFF_OPTIONS: DonationTypeOption[] = [
  {
    priceSlot: 2,
    frequency: 'one-off',
    title: 'Custom donation amount',
    subtitle: 'Choose your own one-off amount for the masjid.',
  },
  {
    priceSlot: 1,
    frequency: 'one-off',
    title: '£5 donation',
    subtitle: 'Quick one-off contribution.',
  },
  {
    priceSlot: 6,
    frequency: 'one-off',
    title: '£10 donation',
    subtitle: 'One-off support for the masjid.',
  },
];

export const DONATION_MONTHLY_OPTIONS: DonationTypeOption[] = [
  {
    priceSlot: 4,
    frequency: 'monthly',
    title: '£10 monthly',
    subtitle: 'Starter monthly support for the masjid rebuild project.',
  },
  {
    priceSlot: 3,
    frequency: 'monthly',
    title: '£25 monthly',
    subtitle: 'Monthly sadaqah for the masjid rebuild project.',
  },
  {
    priceSlot: 8,
    frequency: 'monthly',
    title: '£50 monthly',
    subtitle: 'Sustained monthly support for masjid operations.',
  },
  {
    priceSlot: 9,
    frequency: 'monthly',
    title: '£75 monthly',
    subtitle: 'Higher monthly contribution for long-term impact.',
  },
  {
    priceSlot: 7,
    frequency: 'monthly',
    title: '£100 monthly',
    subtitle: 'Major monthly support for the masjid rebuild project.',
  },
];

export const DONATION_TYPE_OPTIONS: DonationTypeOption[] = [
  ...DONATION_ONE_OFF_OPTIONS,
  ...DONATION_MONTHLY_OPTIONS,
];

export const DONATION_WALLET_OPTIONS: DonationWalletOption[] = [
  {
    key: 'apple_pay',
    title: 'Apple Pay',
    subtitle: 'Preferred on iPhone where supported by Stripe Checkout.',
  },
  {
    key: 'google_pay',
    title: 'Google Pay',
    subtitle: 'Preferred on Android where supported by Stripe Checkout.',
  },
];

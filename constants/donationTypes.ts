export type DonationPriceSlot = 1 | 2;
export type DonationWallet = 'apple_pay' | 'google_pay';

export interface DonationTypeOption {
  priceSlot: DonationPriceSlot;
  title: string;
  subtitle: string;
}

export interface DonationWalletOption {
  key: DonationWallet;
  title: string;
  subtitle: string;
}

export const DONATION_TYPE_OPTIONS: DonationTypeOption[] = [
  {
    priceSlot: 1,
    title: '£5 Donation',
    subtitle: '',
  },
  {
    priceSlot: 2,
    title: '£10 Donation',
    subtitle: '',
  },
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

import { HowToGuide } from './types';

export const SALAH_TRAVELLER_GUIDE: HowToGuide = {
  id: 'salah-traveller',
  parentGroup: 'Salah',
  title: 'Salah of the Traveller صلاة المسافر (Musafir)',
  subtitle: 'Salah Core · Hanafi Method',
  icon: 'flight-takeoff',
  color: '#546E7A',
  intro: 'In Hanafi fiqh, travel changes some rulings of salah. This guide covers watan types, when qasr applies, and how to pray correctly as a musafir.',
  sections: [
    {
      heading: 'Three Residence States (Watan)',
      steps: [
        {
          step: 1,
          title: 'Watan al-Asli (permanent residence)',
          detail: 'Your permanent home where you intend to live long-term. Here, all prayers are offered in full.',
        },
        {
          step: 2,
          title: 'Watan al-Iqamah (temporary residence)',
          detail: 'A place where you intend to stay 15 days or more. Here too, prayers are offered in full.',
        },
        {
          step: 3,
          title: 'State of journey (safar)',
          detail: 'When you are traveling and do not intend to stay 15 days, you are a musafir and qasr rules apply.',
        },
      ],
    },
    {
      heading: 'When a Person Is a Musafir',
      steps: [
        {
          step: 1,
          title: 'Travel intention and distance',
          detail: 'Musafir rulings apply when one intends to travel and the journey is about 55 miles (approximately 88 km) or more, beyond city limits. Random movement without travel intention does not count.',
        },
        {
          step: 2,
          title: '15-day intention rule',
          detail: 'If you intend to stay less than 15 days, you remain musafir. If you intend 15 days or more, you become muqeem there.',
        },
        {
          step: 3,
          title: 'Constant movers',
          detail: 'Backpackers and soldiers with no settled 15-day stay remain musafir.',
        },
      ],
    },
    {
      heading: 'Qasr: What to Shorten',
      steps: [
        {
          step: 1,
          title: 'Qasr is wajib in Hanafi fiqh',
          detail: 'As a musafir, it is wajib to pray 2 rakahs in every 4-rakah fard prayer (Zuhr, Asr, and Isha).',
        },
        {
          step: 2,
          title: 'Prayers not shortened',
          detail: 'Fajr remains 2, Maghrib remains 3, and Witr remains 3 (and Witr is still wajib).',
        },
        {
          step: 3,
          title: 'Warning: deliberately praying full 4 when alone',
          detail: 'If a musafir praying alone intentionally prays 4 rakahs in a 4-rakah fard without excuse, he is sinful. If he sat after 2 rakahs for tashahhud, the first 2 count as fard and the second 2 become nafl. If he did not sit after the first 2 rakahs, all 4 are invalid.',
        },
      ],
    },
    {
      heading: 'Sunnah and Nafl While Traveling',
      steps: [
        {
          step: 1,
          title: 'Pray sunnah when able',
          detail: 'Sunnah prayers should be prayed when there is time and ease during travel.',
        },
        {
          step: 2,
          title: 'Not sinful if left due to travel hardship',
          detail: 'If sunnah prayers are left due to travel hardship, one is not sinful. If one has ease, praying them is better and rewarded.',
        },
      ],
    },
    {
      heading: 'Imam and Follower Cases',
      steps: [
        {
          step: 1,
          title: 'Musafir leading residents',
          detail: 'If a musafir leads residents in a 4-rakah fard prayer, he prays 2 and gives salam; residents then stand and complete their remaining rakahs.',
        },
        {
          step: 2,
          title: 'Inform the congregation',
          detail: 'A musafir imam should inform followers that he is traveling so they understand why he ends after 2 rakahs.',
        },
        {
          step: 3,
          title: 'Musafir behind resident imam',
          detail: 'If a musafir follows a resident imam, he must follow the imam and complete the prayer in full (4 rakahs where applicable).',
        },
      ],
    },
    {
      heading: 'Qada of Missed Prayers in Travel',
      steps: [
        {
          step: 1,
          title: 'Missed while traveling',
          detail: 'If a 4-rakah fard prayer was missed while you were a musafir, its qada is prayed as 2 rakahs.',
        },
      ],
    },
    {
      heading: 'Start and End of Travel Rulings',
      steps: [
        {
          step: 1,
          title: 'When qasr starts',
          detail: 'Qasr starts only after leaving the populated boundary of your city/town, not from the door of your house.',
        },
        {
          step: 2,
          title: 'When qasr ends',
          detail: 'Qasr ends when you return to your watan al-asli, or when you intend to stay 15 days or more in one place.',
        },
        {
          step: 3,
          title: 'Entering home city resets status (example)',
          detail: 'Example: You travel 70 miles and pray qasr on route. Once you re-enter your home city boundary, you are no longer musafir, even if this is only a stopover in the middle of your journey. Any new trip after that starts a fresh travel calculation and intention.',
        },
      ],
    },
  ],
  notes: [
    'In Hanafi fiqh, qasr applies to fard prayers of 4 rakahs only.',
    'This guide uses the distance instruction requested here: about 55 miles (approximately 88 km).',
    'For complex modern travel cases, follow a qualified local Hanafi scholar.',
  ],
};
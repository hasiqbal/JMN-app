import { HowToGuide } from './types';

export const SAJDAH_SAHW_GUIDE: HowToGuide = {
  id: 'sajdah-sahw',
  parentGroup: 'Salah',
  title: 'Sajdah Sahw سجدہ سہو (Forgetfulness Prostration)',
  subtitle: 'Salah Correction · Hanafi Method',
  icon: 'error-outline',
  color: '#00897B',
  intro: 'In the Hanafi madhab, sajdah sahw is for cases of forgetfulness, mainly around missed wajib acts or specific delay cases in prayer.',
  sections: [
    {
      heading: 'When Sajdah Sahw Is Needed',
      steps: [
        {
          step: 1,
          title: 'If a wajib is missed by mistake',
          detail: 'When a wajib act is left forgetfully, sajdah sahw becomes necessary to correct the prayer.',
        },
        {
          step: 2,
          title: 'If a fard is delayed beyond one rukn by mistake',
          detail: 'Sajdah sahw is also done when a fard is delayed by more than one rukn (about the time to say tasbih three times) due to forgetfulness.',
        },
        {
          step: 3,
          title: 'Warning: if missed deliberately, salah breaks',
          detail: 'If a wajib is left deliberately, sajdah sahw does not fix it. The salah breaks and must be repeated.',
        },
        {
          step: 4,
          title: 'Warning: not for a missed fard',
          detail: 'Sajdah sahw is not for a fard that is actually missed. It is for missed wajib or specific delay cases, not for replacing a missed fard.',
        },
      ],
    },
    {
      heading: 'How to Perform Sajdah Sahw (Hanafi)',
      steps: [
        {
          step: 1,
          title: 'Recite tashahhud in final sitting',
          detail: 'In the final sitting, recite al-Tahiyyat up to: أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللّٰهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
        },
        {
          step: 2,
          title: 'Make one salam to the right',
          detail: 'After tashahhud, give one salam to the right side only.',
        },
        {
          step: 3,
          title: 'Perform two sajdahs of sahw',
          detail: 'Do two prostrations of forgetfulness (sajdah sahw).',
        },
        {
          step: 4,
          title: 'Sit and recite tashahhud again',
          detail: 'After the two sajdahs, sit and recite al-Tahiyyat again from the beginning.',
        },
        {
          step: 5,
          title: 'Complete prayer normally',
          detail: 'Then recite Durood Sharif and dua, and finally make both salams to end the prayer.',
        },
      ],
    },
    {
      heading: 'Quick Sequence (Easy Memory)',
      steps: [
        {
          step: 1,
          title: 'Sequence to remember',
          detail: 'Attahiyat to abduhu wa rasuluh -> one salam to the right -> two sajdahs -> Attahiyat again -> Durood -> dua -> two salams.',
        },
      ],
    },
  ],
  notes: [
    'This guide follows the Hanafi method requested in your lesson format.',
    'For advanced edge cases behind imam or in late-join situations, confirm with a qualified local Hanafi scholar.',
  ],
};
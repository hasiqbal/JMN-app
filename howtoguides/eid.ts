import { HowToGuide } from './types';

export const EID_GUIDE: HowToGuide = {
  id: 'eid',
  parentGroup: 'Salah',
  title: 'Salat al-Eid',
  subtitle: 'Eid ul-Fitr & Eid ul-Adha · Hanafi Fiqh',
  icon: 'wb-sunny',
  color: '#4FE948',
  intro: 'Salat al-Eid is Wajib for those obliged by Hanafi fiqh conditions. It is 2 rakaats with 6 extra takbirs and is prayed after sunrise before zawaal.',
  sections: [
    {
      heading: 'Prayer Times - When to Pray',
      steps: [
        {
          step: 1,
          title: 'Eid ul-Fitr timing',
          detail: 'Begins about 20 minutes after sunrise and ends at zawaal. Usually delayed slightly for gathering.',
        },
        {
          step: 2,
          title: 'Eid ul-Adha timing',
          detail: 'Begins about 20 minutes after sunrise and ends at zawaal. Usually prayed earlier than Eid ul-Fitr.',
        },
      ],
    },
    {
      heading: 'Before Eid Salah',
      steps: [
        { step: 3, title: 'Ghusl and best clothing', detail: 'Ghusl and wearing clean, best clothing are emphasized Sunnahs.' },
        { step: 4, title: 'Fitrana for Eid ul-Fitr', detail: 'Pay Zakat al-Fitr before Eid prayer.' },
        { step: 5, title: 'Eating practice', detail: 'Eat odd dates before Eid ul-Fitr; avoid eating before Eid ul-Adha prayer.' },
        { step: 6, title: 'Takbir on the way', detail: 'Recite: الله أكبر الله أكبر لا إله إلا الله... (Allahu Akbar, Allahu Akbar...) on the way.' },
      ],
    },
    {
      heading: 'How to Pray - 1st Rakaat',
      steps: [
        { step: 7, title: 'Opening Takbir', detail: 'Begin with takbir and thana as usual.' },
        { step: 8, title: 'Three extra takbirs', detail: 'In Hanafi fiqh, perform 3 extra takbirs with hands raised each time, then fold hands.' },
        { step: 9, title: 'Recitation and completion', detail: 'Imam recites aloud, then complete the rakaat normally.' },
      ],
    },
    {
      heading: 'How to Pray - 2nd Rakaat',
      steps: [
        { step: 10, title: 'Recitation first', detail: 'In the second rakaat, recitation comes before extra takbirs.' },
        { step: 11, title: 'Three extra takbirs then ruku', detail: 'After recitation, make 3 extra takbirs, then a takbir for ruku.' },
        { step: 12, title: 'Finish salah and listen khutbah', detail: 'Complete prayer and remain for khutbah attentively.' },
      ],
    },
    {
      heading: 'Khutbah and Takbir al-Tashriq',
      steps: [
        { step: 13, title: 'Khutbah ruling', detail: 'Eid khutbah is after salah and should be listened to with attention.' },
        { step: 14, title: 'Takbir al-Tashriq', detail: 'For Eid ul-Adha days, recite Takbir al-Tashriq after fard prayers as taught.' },
      ],
    },
  ],
  notes: [
    'The 6 extra takbirs are wajib in Hanafi fiqh.',
    'Hands drop between extra takbirs; fold only where required.',
    'If Eid congregation is missed entirely, consult local Hanafi scholars for your case.',
    'Source baseline: Hanafi Fiqh manuals and local scholarly guidance.',
  ],
};

import { HowToGuide } from './types';

export const WITR_ISHA_GUIDE: HowToGuide = {
  id: 'witr-isha',
  parentGroup: 'Salah',
  title: 'Witr الوتر (Witr)',
  subtitle: 'Salah Core · Hanafi Method',
  icon: 'nights-stay',
  color: '#3949AB',
  intro: 'In Hanafi fiqh, Witr is wajib and prayed after Isha. The common method is three rakahs with qunut in the third rakah.',
  sections: [
    {
      heading: 'Ruling and Time',
      steps: [
        { step: 1, title: 'Witr is wajib', detail: 'It is wajib in Hanafi fiqh for those obligated by prayer.' },
        { step: 2, title: 'Best time window', detail: 'Pray after Isha before Fajr begins; delaying to last third of night is best for those confident they will wake.' },
      ],
    },
    {
      heading: 'How to Pray (Hanafi)',
      steps: [
        { step: 1, title: 'First two rakahs', detail: 'Pray first two rakahs like normal salah with recitation.' },
        { step: 2, title: 'Third rakah and extra takbir', detail: 'In third rakah, after recitation, raise hands for an extra takbir, then fold hands again.' },
        { step: 3, title: 'Recite dua qunut', detail: 'Recite qunut, such as: اللهم إنا نستعينك (Allahumma inna nastaeenu-ka...) then continue.' },
        { step: 4, title: 'Complete rakah', detail: 'Perform ruku, sujud, final tashahhud, then salam.' },
      ],
    },
    {
      heading: 'If Missed or Forgotten',
      steps: [
        { step: 1, title: 'Missed Witr', detail: 'If missed, make qada of Witr as soon as reasonably possible.' },
        { step: 2, title: 'Missed qunut by mistake', detail: 'If qunut is missed forgetfully, sajdah sahw is required.' },
      ],
    },
  ],
  notes: [
    'Memorize at least one authentic qunut text and keep pronunciation improving over time.',
    'If you cannot recite full qunut yet, recite known supplications while learning.',
    'Primary reference: Nur al-Idah (Nur ul Idah), Hanafi fiqh chapter on Witr.',
  ],
};

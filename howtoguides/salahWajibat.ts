import { HowToGuide } from './types';

export const SALAH_WAJIBAT_GUIDE: HowToGuide = {
  id: 'salah-wajibat',
  parentGroup: 'Salah',
  title: 'Wajibat of Salah واجبات الصلاة (Wajibat)',
  subtitle: 'Salah Core · Hanafi (Nur al-Idah)',
  icon: 'fact-check',
  color: '#673AB7',
  intro: 'These are the 13 wajibat of salah in the Hanafi school as taught in common study lists linked to Nur al-Idah style curricula.',
  sections: [
    {
      heading: 'The 13 Wajibat of Salah',
      steps: [
        { step: 1, title: 'Reciting al-Fatihah', detail: 'It is wajib to recite Surah al-Fatihah in the first two rakahs of fard, and in every rakah of witr, sunnah, and nafl.' },
        { step: 2, title: 'Adding another surah or three short verses', detail: 'After al-Fatihah, one must add another surah, or at least three short ayat, in the first two rakahs of fard, and in all wajib, sunnah, and nafl rakahs.' },
        { step: 3, title: 'Observing the order of recitation', detail: 'Al-Fatihah should come before the additional surah or verses, not after them.' },
        { step: 4, title: 'Standing upright after ruku (qawmah)', detail: 'After bowing, one must rise properly before going into sajdah.' },
        { step: 5, title: 'Sitting between the two sajdahs (jalsah)', detail: 'One must sit properly between the first and second prostration.' },
        { step: 6, title: 'The first sitting (al-qadah al-ula)', detail: 'In prayers of three or four rakahs, sitting after the second rakah is wajib.' },
        { step: 7, title: 'Calmness in postures (ta dil al-arkan)', detail: 'Do not rush through ruku, sujud, qawmah, and jalsah. Each posture should have stillness.' },
        { step: 8, title: 'Reciting al-Tahiyyat in sittings', detail: 'The tashahhud is wajib in the sittings of prayer. In 4-rakah sunnah (such as before Asr or before Isha) and 4-rakah nafl prayed as one salah, in the first sitting after two rakahs one should complete al-Tahiyyat and then stand for the third rakah without salam.' },
        { step: 9, title: 'Ending prayer with salam', detail: 'At least one salam is required to exit the prayer in the normal legislated way.' },
        { step: 10, title: 'Dua al-qunut in witr', detail: 'In the Hanafi school, reciting qunut in witr is wajib.' },
        { step: 11, title: 'Extra takbir before qunut in witr', detail: 'Many Hanafi teaching lists count this separately, which is one reason some lists say 13 rather than 12.' },
        { step: 12, title: 'Extra takbirs of Eid prayer', detail: 'The additional takbirs in the two rakahs of Eid are wajib in the Hanafi school.' },
        { step: 13, title: 'Proper loud and silent recitation places', detail: 'The imam recites aloud where jahr is prescribed and silently where sirr is prescribed; this must be observed in its proper places.' },
      ],
    },
    {
      heading: 'Rule to Remember',
      steps: [
        { step: 1, title: 'If left forgetfully', detail: 'The prayer is not automatically broken, but sajdat al-sahw becomes necessary.' },
        { step: 2, title: 'If left deliberately', detail: 'The prayer is invalidated and must be repeated.' },
      ],
    },
  ],
  notes: [
    'Primary reference: Nur al-Idah (Nur ul Idah), section of wajibat al-salah.',
    'For detailed cases, follow your local qualified mam.',
  ],
};

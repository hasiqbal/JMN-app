import { HowToGuide } from './types';

export const GHUSL_GUIDE: HowToGuide = {
  id: 'ghusl',
  title: 'Ghusl الغسل (Ghusl)',
  subtitle: 'Purification · Hanafi Method',
  icon: 'shower',
  color: '#00695C',
  intro: 'Ghusl removes major ritual impurity. In Hanafi fiqh, three acts are fard for a valid ghusl, and the sunnah method completes it with proper adab.',
  sections: [
    {
      heading: 'When Ghusl Is Required',
      steps: [
        { step: 1, title: 'After janabah', detail: 'Ghusl is required after marital relations or seminal discharge with desire.' },
        { step: 2, title: 'After menstruation or postnatal bleeding', detail: 'When bleeding ends, ghusl is required before salah and fasting validity.' },
        { step: 3, title: 'For new Muslim and some Sunnah occasions', detail: 'Some ghusls are emphasized sunnah, such as before Jumuah and Eid.' },
      ],
    },
    {
      heading: 'Fard (Obligatory) Acts of Ghusl',
      steps: [
        { step: 1, title: 'Rinse mouth', detail: 'Ensure water reaches all parts of the mouth at least once.' },
        { step: 2, title: 'Rinse nose', detail: 'Draw water into soft part of nose and rinse at least once.' },
        { step: 3, title: 'Wash entire body', detail: 'Let water flow over every part of the body once, with no dry area left.' },
      ],
    },
    {
      heading: 'Sunnah Method (Recommended Flow)',
      steps: [
        { step: 1, title: 'Start with intention and Bismillah', detail: 'Make niyyah to remove major impurity and begin with بسم الله (Bismillah).' },
        { step: 2, title: 'Wash private area and impurities', detail: 'Clean any visible impurity from body first.' },
        { step: 3, title: 'Perform complete wudhu', detail: 'Do wudhu like for salah, delaying feet wash if standing in pooled water.' },
        { step: 4, title: 'Pour water over head and body', detail: 'Pour water over head three times, then right side and left side thoroughly.' },
        { step: 5, title: 'Ensure difficult places are reached', detail: 'Behind ears, navel, skin folds, hair roots, and between fingers/toes must be wet.' },
      ],
    },
  ],
  notes: [
    'Remove barriers like thick paint or polish that prevent water reaching skin.',
    'For braided hair, women do not need to undo braids if roots are fully wet.',
    'Avoid wasting water; complete ghusl with care and modesty.',
  ],
};

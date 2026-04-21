import { HowToGuide } from './types';

export const WUDHU_GUIDE: HowToGuide = {
  id: 'wudhu',
  title: 'Wudhu الوضوء (Wudu)',
  subtitle: 'Purification · Hanafi Method',
  icon: 'water-drop',
  color: '#00897B',
  intro: 'Wudhu is required for salah and other acts that require ritual purity. In Hanafi fiqh, four actions are fard, and a complete sunnah method is recommended.',
  sections: [
    {
      heading: 'Fard (Obligatory) Acts of Wudhu',
      steps: [
        { step: 1, title: 'Wash face once', detail: 'Wash the entire face from hairline to chin and from ear to ear.' },
        { step: 2, title: 'Wash both arms including elbows', detail: 'Wash right arm then left arm at least once including elbows.' },
        { step: 3, title: 'Masah of one-quarter of head', detail: 'Wipe at least one-quarter of the head with wet hands once.' },
        { step: 4, title: 'Wash both feet including ankles', detail: 'Wash right foot then left foot including ankles at least once.' },
      ],
    },
    {
      heading: 'Sunnah Method (Recommended Flow)',
      steps: [
        { step: 1, title: 'Start with intention and Bismillah', detail: 'Make niyyah in heart and begin with: بسم الله (Bismillah).' },
        { step: 2, title: 'Wash hands, rinse mouth and nose', detail: 'Wash hands to wrists, rinse mouth three times, then rinse nose three times.' },
        { step: 3, title: 'Wash face and arms three times', detail: 'Wash each area thoroughly, beginning with the right side.' },
        { step: 4, title: 'Masah and ears', detail: 'Wipe head once, then wipe ears with the same moisture.' },
        { step: 5, title: 'Wash feet carefully', detail: 'Wash feet and between toes, beginning with the right foot.' },
      ],
    },
    {
      heading: 'What Breaks Wudhu',
      steps: [
        { step: 1, title: 'Anything exiting private parts', detail: 'Urine, stool, wind, or other discharge breaks wudhu.' },
        { step: 2, title: 'Flowing blood or pus', detail: 'If blood or pus flows beyond the wound point, wudhu breaks.' },
        { step: 3, title: 'Mouthful vomiting', detail: 'Vomiting a mouthful breaks wudhu according to Hanafi fiqh.' },
        { step: 4, title: 'Deep sleep or loss of awareness', detail: 'Sleeping in a way where joints relax, fainting, or intoxication breaks wudhu.' },
      ],
    },
  ],
  notes: [
    'Maintain continuity (muwalat) and avoid long gaps between washes when possible.',
    'If water cannot be used due to valid excuse, consult local scholars regarding tayammum.',
    'Doubt after finishing wudhu is ignored unless certain invalidation occurred.',
  ],
};

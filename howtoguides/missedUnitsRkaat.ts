import { HowToGuide } from './types';

export const MISSED_UNITS_RKAAT_GUIDE: HowToGuide = {
  id: 'missed-units-rkaat',
  parentGroup: 'Salah',
  title: 'Making Up Missed Units (Rakaat)',
  subtitle: 'Late Entry With Imam · Hanafi Method',
  icon: 'history',
  color: '#00897B',
  intro: 'This guide explains how to complete missed units when you join jamaah late (masbuq), including the common case where you miss 3 and pray 1 with the imam.',
  sections: [
    {
      heading: 'Core Hanafi Method (Masbuq)',
      steps: [
        { step: 1, title: 'Join the imam immediately', detail: 'If you come late, join the imam in whatever position he is in. Do not wait for the next unit.' },
        { step: 2, title: 'Pray with imam until salam', detail: 'Continue with the imam until he ends the prayer with salam.' },
        { step: 3, title: 'Stand and complete what you missed', detail: 'After the imam gives salam, stand and complete the units you missed.' },
        { step: 4, title: 'Pray missed units in original salah order', detail: 'Complete the missed rakahs as first missed, then second missed, then third missed, exactly in the order the salah is normally prayed.' },
        { step: 5, title: 'Keep count by total units prayed', detail: 'In a 4-unit salah, sit when your total reaches 2, and sit again at the end when total reaches 4.' },
      ],
    },
    {
      heading: 'Case You Asked: Missed 3, Prayed 1 With Imam',
      steps: [
        { step: 1, title: 'You caught only 1 unit with imam', detail: 'You joined late and managed to pray one unit with the imam.' },
        { step: 2, title: 'Imam ends, you stand', detail: 'When the imam gives salam, stand up to complete your remaining 3 units.' },
        { step: 3, title: 'Pray your first make-up unit', detail: 'Pray one full unit.' },
        { step: 4, title: 'Sit now (important)', detail: 'After this one make-up unit, sit for tashahhud because your total prayed is now 2 (1 with imam + 1 after imam).' },
        { step: 5, title: 'Stand and pray the next unit', detail: 'After that sitting, stand and pray the next unit.' },
        { step: 6, title: 'Pray the final unit and end', detail: 'Pray the last unit, then sit final sitting and end with salam.' },
        { step: 7, title: 'Simple memory line', detail: 'Missed 3 and caught 1: after one make-up unit you must sit, because your total has reached 2.' },
      ],
    },
    {
      heading: 'Quick 4-Unit Patterns',
      steps: [
        { step: 1, title: 'If you missed 1 (caught 3)', detail: 'After imam salam, pray 1 unit and finish.' },
        { step: 2, title: 'If you missed 2 (caught 2)', detail: 'After imam salam, pray 2 units and complete with final sitting and salam.' },
        { step: 3, title: 'If you missed 3 (caught 1)', detail: 'After imam salam: pray 1, sit (total 2), then pray remaining 2 and finish.' },
      ],
    },
  ],
  notes: [
    'This guide is for normal 4-unit salah flow in Hanafi fiqh and focuses on practical counting/sitting order.',
    'Recitation details in make-up units can vary by case; follow your local Hanafi imam for your exact scenario.',
    'Primary reference style: Hanafi fiqh teaching flow used in masbuq chapters (including Nur al-Idah based study).',
  ],
};

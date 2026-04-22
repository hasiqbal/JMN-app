import { HowToGuide } from './types';

export const ZAKAAT_AL_FITR_GUIDE: HowToGuide = {
  id: 'zakaat-al-fitr',
  parentGroup: 'Zakaat',
  title: 'Zakaat al-Fitr (Sadaqat al-Fitr)',
  subtitle: 'Zakaat · Hanafi Method',
  icon: 'redeem',
  color: '#388E3C',
  intro: 'This guide covers practical Hanafi fitr duty at Ramadan end: payer responsibility, timing discipline, and correct transfer to eligible recipients.',
  sections: [
    {
      heading: 'Who Pays Fitr',
      steps: [
        { step: 1, title: 'Eligible payer', detail: 'A Muslim with qualifying means beyond basic essentials is responsible for fitr according to Hanafi rulings.' },
        { step: 2, title: 'Dependents', detail: 'A guardian may pay on behalf of eligible dependents according to Hanafi practice.' },
        { step: 3, title: 'Check local amount updates', detail: 'Use current local valuation for staple-based fitr amount and avoid outdated figures.' },
      ],
    },
    {
      heading: 'Payment Timing',
      steps: [
        { step: 1, title: 'Prefer before Eid prayer', detail: 'Best practice is to deliver fitr before Eid salah so recipients benefit in time.' },
        { step: 2, title: 'Earlier payment allowed', detail: 'Giving in Ramadan before Eid day is valid and often better for distribution planning.' },
        { step: 3, title: 'Do not neglect if delayed', detail: 'If delayed beyond preferred window, obligation still remains and should be fulfilled immediately.' },
      ],
    },
    {
      heading: 'Correct Delivery',
      steps: [
        { step: 1, title: 'Give to eligible recipients', detail: 'Follow valid recipient criteria as with other zakatable transfers.' },
        { step: 2, title: 'Ensure ownership transfer', detail: 'The recipient must actually own and receive the value, directly or by reliable agency.' },
        { step: 3, title: 'Keep records for families', detail: 'In family payments, track who was covered and amount paid per person.' },
      ],
    },
  ],
  notes: [
    'Common mistake: confusing fitr amount/date with annual zakaat cycle.',
    'Fitr is separate from annual zakaat and has independent amount and timing basis.',
    'Paying through trusted channels is acceptable when ownership transfer is clear.',
    'Set reminders before Eid week to avoid last-minute confusion.',
  ],
};

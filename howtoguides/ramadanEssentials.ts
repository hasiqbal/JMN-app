import { HowToGuide } from './types';

export const RAMADAN_ESSENTIALS_GUIDE: HowToGuide = {
  id: 'ramadan-essentials',
  parentGroup: 'Fasting',
  title: 'Ramadan Essentials',
  subtitle: 'Fasting · Hanafi Method',
  icon: 'nights-stay',
  color: '#F57C00',
  intro: 'This guide focuses on practical Ramadan execution: disciplined daily routine, taraweeh consistency, suhoor/iftar correctness, and an i\'tikaf overview.',
  sections: [
    {
      heading: 'Daily Ramadan Flow',
      steps: [
        { step: 1, title: 'Prepare suhoor with intention', detail: 'Wake for suhoor, renew intention, and leave enough time to avoid fajr-time confusion.' },
        { step: 2, title: 'Build day around worship and work', detail: 'Protect prayers, recitation, responsibilities, and character throughout the day.' },
        { step: 3, title: 'Break fast at maghrib promptly', detail: 'Break at confirmed sunset without unnecessary delay, then proceed to maghrib prayer.' },
      ],
    },
    {
      heading: 'Taraweeh and Night Worship',
      steps: [
        { step: 1, title: 'Attend taraweeh consistently', detail: 'Maintain a realistic nightly taraweeh rhythm. Consistency is better than short unsustainable bursts.' },
        { step: 2, title: 'Balance quality and consistency', detail: 'Steady attendance with presence is better than unsustainable intensity.' },
        { step: 3, title: 'Use final nights wisely', detail: 'Increase dua, Quran, and repentance in the last ten nights.' },
      ],
    },
    {
      heading: "I'tikaf (Practical Overview)",
      steps: [
        { step: 1, title: "Sunnah i'tikaf timing", detail: "For men, sunnah i'tikaf in the last ten days is done in masjid with proper intention and continuity." },
        { step: 2, title: 'Limit exits to genuine need', detail: 'Avoid unnecessary exits so i\'tikaf integrity remains valid.' },
        { step: 3, title: 'Focus worship priorities', detail: 'Center the retreat around salah, Quran, dhikr, dua, and repentance.' },
      ],
    },
  ],
  notes: [
    'Common mistake: sacrificing fard consistency while chasing optional goals.',
    'Keep family and work scheduling realistic to sustain the full month.',
    'Plan zakat and fitr obligations before Eid pressure begins.',
    'For invalidated fast handling, continue to Qada and Kaffarah guide.',
  ],
};

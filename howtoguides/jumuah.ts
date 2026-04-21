import { HowToGuide } from './types';

export const JUMUAH_GUIDE: HowToGuide = {
  id: 'jumuah',
  parentGroup: 'Salah',
  title: 'Jumuah الجمعة (Jumuah)',
  subtitle: 'Salah Core · Hanafi Method',
  icon: 'campaign',
  color: '#1E88E5',
  intro: 'Jumuah replaces Zuhr for those upon whom it is obligatory. The khutbah and congregation are central conditions of valid Jumuah.',
  sections: [
    {
      heading: 'Who Jumuah Is Obligatory Upon',
      steps: [
        { step: 1, title: 'Core obligation', detail: 'Obligatory for adult, sane, resident Muslim men with valid access and no excuse.' },
        { step: 2, title: 'Valid excuses', detail: 'Serious illness, fear, unsafe travel, or severe hardship may excuse attendance.' },
      ],
    },
    {
      heading: 'Before and During Khutbah',
      steps: [
        { step: 1, title: 'Arrive with adab', detail: 'Come early, perform wudhu, and sit respectfully in the masjid.' },
        { step: 2, title: 'Silence is required', detail: 'When khutbah starts, avoid speaking, phone use, or distractions.' },
        { step: 3, title: 'No interruption', detail: 'Do not engage in conversation during khutbah, even to tell others to be quiet.' },
      ],
    },
    {
      heading: 'Prayer and After',
      steps: [
        { step: 1, title: 'Two fard with imam', detail: 'After khutbah, pray two fard rakahs behind imam.' },
        { step: 2, title: 'Complete sunnah prayers', detail: 'Pray the sunnah rakahs before and after according to local Hanafi teaching.' },
        { step: 3, title: 'If Jumuah missed', detail: 'If you miss valid Jumuah, pray Zuhr instead.' },
      ],
    },
  ],
  notes: [
    'Khutbah is a condition of Jumuah validity and must be attended attentively.',
    'Follow your local imam for mosque-specific scheduling and jamaah organization.',
    'If uncertain about your excuse status, consult a qualified local scholar.',
    'Primary reference: Nur al-Idah (Nur ul Idah), Hanafi fiqh chapter on Jumuah.',
  ],
};

import { HowToGuide } from './types';

export const SALAH_MAKRUH_GUIDE: HowToGuide = {
  id: 'salah-makruh',
  parentGroup: 'Salah',
  title: 'Makruh in Salah مكروهات الصلاة (Makruh)',
  subtitle: 'Salah Core · Hanafi (Nur al-Idah)',
  icon: 'report-problem',
  color: '#F9A825',
  intro: 'Makruh actions do not usually invalidate salah but reduce its reward and quality. A believer avoids them to perfect prayer.',
  sections: [
    {
      heading: 'Makruh Movements and Habits',
      steps: [
        { step: 1, title: 'Fidgeting', detail: 'Playing with clothes, beard, body, or objects without need is makruh.' },
        { step: 2, title: 'Looking around', detail: 'Turning face repeatedly without need is makruh and harms khushu.' },
        { step: 3, title: 'Unnecessary acts', detail: 'Extra actions not part of prayer are makruh even if they do not invalidate salah.' },
      ],
    },
    {
      heading: 'Makruh States During Prayer',
      steps: [
        { step: 1, title: 'Praying with severe bodily urge', detail: 'Praying while needing toilet urgently is makruh due to loss of concentration.' },
        { step: 2, title: 'Praying in distracting conditions', detail: 'Strong distraction from food, noise, or devices makes prayer makruh.' },
        { step: 3, title: 'Ignoring proper calmness', detail: 'Rushed recitation and posture without composure is makruh and may risk validity issues.' },
      ],
    },
    {
      heading: 'Adab-Based Makruh Cases',
      steps: [
        { step: 1, title: 'Not following recommended posture adab', detail: 'Leaving established adab repeatedly makes prayer deficient in quality.' },
        { step: 2, title: 'Imitating non-prayer behavior', detail: 'Gestures that resemble casual behavior are disliked in salah.' },
      ],
    },
  ],
  notes: [
    'Primary reference: Nur al-Idah (Nur ul Idah), section on makruhat al-salah.',
    'Avoiding makruh builds khushu and preserves the excellence of prayer.',
  ],
};

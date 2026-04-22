import { HowToGuide } from './types';

export const FASTING_FOUNDATIONS_GUIDE: HowToGuide = {
  id: 'fasting-foundations',
  parentGroup: 'Fasting',
  title: 'Fasting Foundations (Sawm)',
  subtitle: 'Fasting · Hanafi Method',
  icon: 'restaurant',
  color: '#EF6C00',
  intro: 'This guide covers practical Hanafi fasting fundamentals: intention timing, valid fasting window, nullifiers, exemptions, and discipline that protects the fast.',
  sections: [
    {
      heading: 'Core Requirements',
      steps: [
        { step: 1, title: 'Make intention (niyyah)', detail: 'Form clear intention within valid Hanafi time boundaries for the fast type you are keeping.' },
        { step: 2, title: 'Observe fasting window', detail: 'From true dawn (fajr) until sunset (maghrib), avoid food, drink, and marital relations.' },
        { step: 3, title: 'Protect conduct and tongue', detail: 'Guard eyes, speech, and behavior. A legally valid fast can still lose spiritual reward through sins.' },
      ],
    },
    {
      heading: 'What Breaks the Fast',
      steps: [
        { step: 1, title: 'Intentional eating or drinking', detail: 'Deliberate eating or drinking during fasting hours breaks the fast.' },
        { step: 2, title: 'Intentional marital relations', detail: 'Intentional marital relations during fasting hours break the fast and may trigger heavier compensation in Ramadan cases.' },
        { step: 3, title: 'Treat doubtful cases carefully', detail: 'If unsure about medical intake, sprays, injections, or accidental events, verify before acting.' },
      ],
    },
    {
      heading: 'Valid Exemptions',
      steps: [
        { step: 1, title: 'Illness or harm risk', detail: 'If fasting causes real harm or blocks recovery, exemption applies with makeup obligations as relevant.' },
        { step: 2, title: 'Travel hardship', detail: 'Travelers may use concession and make up missed fasts later.' },
        { step: 3, title: 'Menstruation and nifas', detail: 'A person in hayd or nifas does not fast and later makes up those Ramadan fasts.' },
      ],
    },
  ],
  notes: [
    'Common mistake: ending fast by timetable without confirming local sunset.',
    'Use this as baseline before Ramadan-specific rulings.',
    'For missed fast handling, continue to the Qada and Kaffarah guide.',
    'For menstrual-state rulings, use the Purification menstruation guide.',
  ],
};

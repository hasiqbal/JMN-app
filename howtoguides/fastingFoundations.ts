import { HowToGuide } from './types';

export const FASTING_FOUNDATIONS_GUIDE: HowToGuide = {
  id: 'fasting-foundations',
  parentGroup: 'Fasting',
  title: 'Fasting Foundations (Sawm)',
  subtitle: 'Fasting · Hanafi Method',
  icon: 'restaurant',
  color: '#EF6C00',
  intro: 'This guide covers practical Hanafi fasting fundamentals: intention timing, valid fasting window, nullifiers, exemptions, discipline that protects the fast, and key Sunnah voluntary fasts throughout the year.',
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
    {
      heading: 'Regular Sunnah Optional Fasts',
      steps: [
        { step: 1, title: 'Mondays and Thursdays', detail: 'Fast Monday and Thursday as a regular Sunnah pattern when possible, while keeping balance with health and responsibilities.' },
        { step: 2, title: 'White Fasts (Ayyam al-Bid: 13th, 14th, 15th)', detail: 'Fasting the white days each lunar month is a strongly encouraged Sunnah and easy monthly rhythm for nafl fasting.' },
        { step: 3, title: 'Fasting of Dawud (best nafl pattern)', detail: 'For advanced consistency, fast every other day if you can maintain rights of body, family, and worship balance.' },
      ],
    },
    {
      heading: 'Important Muharram and Dhul Hijjah Fasts',
      steps: [
        { step: 1, title: 'Muharram and Ashura', detail: 'Muharram fasting is highly virtuous (especially Ashura). Fast 10 Muharram with either 9 or 11 Muharram instead of fasting only the 10th.' },
        { step: 2, title: 'First nine days of Dhul Hijjah', detail: 'Voluntary fasting in the first nine days of Dhul Hijjah is meritorious, with special emphasis on the Day of Arafah for non-pilgrims.' },
        { step: 3, title: 'Day of Arafah (9 Dhul Hijjah, non-Hajj pilgrims)', detail: 'For those not on Hajj, fasting Arafah is among the most emphasized optional fasts of the year.' },
      ],
    },
    {
      heading: 'Other Highly Recommended Optional Fasts',
      steps: [
        { step: 1, title: 'Six days of Shawwal', detail: 'After completing Ramadan, fasting any six days of Shawwal carries great reward.' },
        { step: 2, title: 'Frequent fasting in Shaban', detail: 'Increasing voluntary fasting in Shaban is an established Sunnah practice before Ramadan.' },
        { step: 3, title: 'Pair Friday if you fast it nafl', detail: 'If fasting Friday as nafl, pair it with Thursday or Saturday unless it coincides with a regular routine or specific Sunnah date.' },
      ],
    },
    {
      heading: 'Days to Avoid Fasting',
      steps: [
        { step: 1, title: 'Eid days', detail: 'Fasting is prohibited on Eid al-Fitr and Eid al-Adha.' },
        { step: 2, title: 'Tashriq days', detail: 'For most people, fasting is prohibited on 11, 12, and 13 Dhul Hijjah.' },
        { step: 3, title: 'Single Friday without reason', detail: 'Avoid singling out Friday alone as a nafl fast unless paired with Thursday or Saturday, or due to a valid reason.' },
      ],
    },
  ],
  notes: [
    'Common mistake: ending fast by timetable without confirming local sunset.',
    'Use this as baseline before Ramadan-specific rulings.',
    'For lunar-date fasts, confirm your local moon-calendar date before intending the fast.',
    'If unsure about local fiqh details of a nafl day, verify with your local scholars before committing.',
    'For missed fast handling, continue to the Qada and Kaffarah guide.',
    'For menstrual-state rulings, use the Purification menstruation guide.',
  ],
};

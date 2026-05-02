import { HowToGuide } from './types';

export const NAFL_FASTING_PLANNER_GUIDE: HowToGuide = {
  id: 'nafl-fasting-planner',
  parentGroup: 'Fasting',
  title: 'Nafl Fasting Planner',
  subtitle: 'Fasting · Sunnah Optional Days',
  icon: 'event-note',
  color: '#FB8C00',
  intro: 'Use this planner to keep optional fasts in a structured way through the lunar year: weekly Sunnah days, monthly white fasts, and key dates like Muharram and Dhul Hijjah.',
  sections: [
    {
      heading: 'Weekly Rhythm',
      steps: [
        { step: 1, title: 'Prioritize Monday and Thursday', detail: 'Build your base around Monday and Thursday fasting when health and responsibilities allow.' },
        { step: 2, title: 'Start small and stay consistent', detail: 'If both days are hard at first, begin with one day weekly and grow gradually.' },
        { step: 3, title: 'Use intention from the night', detail: 'Set intention clearly before sleep so your fasting day starts with clarity and focus.' },
      ],
    },
    {
      heading: 'Monthly White Fasts (Ayyam al-Bid)',
      steps: [
        { step: 1, title: 'Fast 13, 14, 15 lunar days', detail: 'Keep the three white days each lunar month as a stable Sunnah target.' },
        { step: 2, title: 'Track by Hijri date, not Gregorian', detail: 'Confirm local moon-calendar dates each month to avoid date mismatch.' },
        { step: 3, title: 'Pair with your weekly pattern', detail: 'When possible, combine white fasts with Monday or Thursday for easier routine building.' },
      ],
    },
    {
      heading: 'Muharram Plan',
      steps: [
        { step: 1, title: 'Increase fasting in Muharram', detail: 'Muharram is among the most virtuous months for optional fasting.' },
        { step: 2, title: 'Keep Ashura with a paired day', detail: 'Fast 10 Muharram together with 9 Muharram or 11 Muharram.' },
        { step: 3, title: 'Plan dates early', detail: 'Mark Muharram targets in advance so you do not miss the Ashura sequence.' },
      ],
    },
    {
      heading: 'Dhul Hijjah Plan',
      steps: [
        { step: 1, title: 'Fast in first nine days', detail: 'Optional fasting in the first nine days of Dhul Hijjah is highly rewarding.' },
        { step: 2, title: 'Emphasize Arafah (9 Dhul Hijjah)', detail: 'For non-pilgrims, the Day of Arafah is one of the strongest Sunnah fast opportunities.' },
        { step: 3, title: 'Do not fast prohibited days', detail: 'Do not fast Eid al-Adha or the three Tashriq days (11 to 13 Dhul Hijjah).' },
      ],
    },
    {
      heading: 'Guardrails and Balance',
      steps: [
        { step: 1, title: 'Avoid singling out Friday', detail: 'Do not single out Friday as a nafl fast unless paired or linked to a valid reason.' },
        { step: 2, title: 'Protect health and rights', detail: 'Optional fasting should not harm your health or cause neglect of family, work, or obligations.' },
        { step: 3, title: 'Review with scholars when unsure', detail: 'For local fiqh details or medical questions, verify your plan with qualified scholars.' },
      ],
    },
  ],
  notes: [
    'Use a monthly checklist for Monday, Thursday, white fasts, Muharram, and Dhul Hijjah goals.',
    'If you miss optional days, restart the pattern without guilt and keep consistency.',
    'For fasting validity rules, refer to the Fasting Foundations guide.',
  ],
};

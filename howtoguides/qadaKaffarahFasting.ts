import { HowToGuide } from './types';

export const QADA_KAFFARAH_FASTING_GUIDE: HowToGuide = {
  id: 'qada-kaffarah-fasting',
  parentGroup: 'Fasting',
  title: 'Qada and Kaffarah for Fasting',
  subtitle: 'Fasting · Hanafi Method',
  icon: 'history',
  color: '#E65100',
  intro: 'This guide explains practical Hanafi correction of missed or invalidated fasts, with clear distinction between qada-only cases and possible kaffarah cases.',
  sections: [
    {
      heading: 'When Qada Is Required',
      steps: [
        { step: 1, title: 'Missed Ramadan days with valid excuse', detail: 'Make up each missed day later with one qada fast per day.' },
        { step: 2, title: 'Invalid fasts without kaffarah trigger', detail: 'Many invalidations require qada only. Not every broken fast, even in Ramadan, creates kaffarah.' },
        { step: 3, title: 'Plan and complete gradually', detail: 'Create a practical schedule so missed fasts do not remain unresolved long-term.' },
      ],
    },
    {
      heading: 'When Kaffarah May Be Required',
      steps: [
        { step: 1, title: 'Deliberate invalidation in Ramadan', detail: 'Certain intentional invalidations of a valid Ramadan fast can trigger both qada and kaffarah.' },
        { step: 2, title: 'Do not self-issue final ruling', detail: 'Because details differ by action and circumstance, confirm with qualified scholars before assuming kaffarah.' },
        { step: 3, title: 'Fulfill in correct sequence', detail: 'Apply Hanafi sequence and conditions for kaffarah performance according to verified ruling.' },
      ],
    },
    {
      heading: 'Practical Tracking and Repentance',
      steps: [
        { step: 1, title: 'Keep a missed-fast register', detail: 'Track date, reason, and completion status for every qada day.' },
        { step: 2, title: 'Combine repentance with correction', detail: 'Alongside qada/kaffarah, maintain sincere tawbah and consistency in future fasts.' },
        { step: 3, title: 'Avoid repeated uncertainty', detail: 'If the same confusion recurs yearly, seek a one-time full review of your fasting history.' },
      ],
    },
  ],
  notes: [
    'Common mistake: assuming kaffarah for every broken fast without checking case details.',
    'This guide should be paired with scholar consultation for disputed or older unresolved cases.',
    'Menstruation and nifas missed Ramadan days are qada only.',
    'Build completion targets before next Ramadan begins.',
  ],
};

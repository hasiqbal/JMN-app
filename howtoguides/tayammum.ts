import { HowToGuide } from './types';

export const TAYAMMUM_GUIDE: HowToGuide = {
  id: 'tayammum',
  parentGroup: 'Purification',
  title: 'Tayammum (Dry Ablution)',
  subtitle: 'Purification · Hanafi Method',
  icon: 'terrain',
  color: '#6D4C41',
  intro: 'Tayammum is a valid Hanafi concession when water cannot be used or is genuinely harmful. This guide presents the permission boundaries, method, nullifiers, and practical cautions in a consistent format.',
  sections: [
    {
      heading: 'When Tayammum Is Allowed',
      steps: [
        {
          step: 1,
          title: 'Water unavailable or unreachable',
          detail: 'If usable water is not reasonably accessible after valid effort, tayammum is permitted. Mere convenience is not a valid reason.',
        },
        {
          step: 2,
          title: 'Water use is harmful',
          detail: 'If using water causes likely harm, delayed recovery, severe pain, or medically recognized risk, tayammum is valid.',
        },
        {
          step: 3,
          title: 'Prayer-time hardship under valid excuse',
          detail: 'If seeking water would realistically cause missing prayer within time under recognized hardship, tayammum may be used.',
        },
      ],
    },
    {
      heading: 'How to Perform Tayammum (Hanafi Flow)',
      steps: [
        {
          step: 1,
          title: 'Make intention (niyyah)',
          detail: 'Intend purification for worship that requires taharah. Keep the intention specific and sincere.',
        },
        {
          step: 2,
          title: 'First strike and wipe full face',
          detail: 'Strike both hands on a valid earth-like surface, shake off excess dust, then wipe the full face once.',
        },
        {
          step: 3,
          title: 'Second strike and wipe both arms',
          detail: 'Strike again and wipe both arms including elbows once. Missing required area invalidates tayammum.',
        },
        {
          step: 4,
          title: 'Check complete coverage',
          detail: 'Ensure no required face/arm area is skipped. Rings and barriers should not block wiping of required zones.',
        },
      ],
    },
    {
      heading: 'What Invalidates Tayammum',
      steps: [
        {
          step: 1,
          title: 'Normal nullifiers of wudhu',
          detail: 'All standard nullifiers of wudhu also invalidate tayammum.',
        },
        {
          step: 2,
          title: 'Usable water becomes available',
          detail: 'If water becomes available and safely usable before prayer, tayammum ends and water purification is required.',
        },
        {
          step: 3,
          title: 'Original excuse ends',
          detail: 'If medical or access hardship no longer exists, return to wudhu or ghusl as required.',
        },
      ],
    },
    {
      heading: 'Practical Reminders',
      steps: [
        {
          step: 1,
          title: 'Do not treat tayammum as convenience',
          detail: 'Tayammum is a mercy concession, not a shortcut when water is safely available.',
        },
        {
          step: 2,
          title: 'Reassess whenever conditions change',
          detail: 'As soon as safe water access returns, resume normal wudhu/ghusl without delay.',
        },
      ],
    },
  ],
  notes: [
    'Common mistake: using tayammum for ease when water is available and safe.',
    'Common mistake: incomplete wipe area on face or arms; check coverage.',
    'When hardship ends, return promptly to wudhu or ghusl.',
  ],
};

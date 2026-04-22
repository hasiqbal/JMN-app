import { HowToGuide } from './types';

export const FOLLOW_IMAM_GUIDE: HowToGuide = {
  id: 'follow-imam',
  parentGroup: 'Salah',
  title: 'Following the Imam (Muqtadi) in Salah',
  subtitle: 'Congregational Prayer · Hanafi Method',
  icon: 'people',
  color: '#455A64',
  intro: 'This guide explains how a follower (muqtadi) should follow the imam in Hanafi fiqh, including late-join cases.',
  sections: [
    {
      heading: 'Core Rules of Following the Imam',
      steps: [
        {
          step: 1,
          title: 'Intend to follow the imam',
          detail: 'Join with the intention of praying behind the imam and remain with him until salam unless a valid excuse occurs.',
        },
        {
          step: 2,
          title: 'Do not move before the imam',
          detail: 'Do not precede the imam in ruku, sujud, standing, or salam. Follow after the imam begins each movement.',
        },
        {
          step: 3,
          title: 'Recitation behind imam (Hanafi)',
          detail: 'In Hanafi fiqh, the muqtadi does not recite Surah al-Fatihah or another surah behind the imam in fard prayers. Not in loud payers or silent prayers.',
        },
      ],
    },
    {
      heading: 'If You Join Late (Masbuq Basics)',
      steps: [
        {
          step: 1,
          title: 'Join immediately in current position',
          detail: 'If you arrive late, join the imam in whatever posture he is in. Do not wait for the next rakah.',
        },
        {
          step: 2,
          title: 'Catching a rakah in ruku',
          detail: 'If you join while the imam is in ruku and catch the ruku before he rises, that rakah counts for you.',
        },
        {
          step: 3,
          title: 'If ruku is missed',
          detail: 'If the imam rises from ruku before you catch it, that rakah is missed for you and will be made up later.',
        },
        {
          step: 4,
          title: 'If you join in final sitting',
          detail: 'Sit with the imam, complete the congregation, then stand after imam salam to complete your missed rakahs.',
        },
        {
          step: 5,
          title: 'Complete missed units after salam',
          detail: 'After the imam ends, stand and complete the missed units in proper Hanafi order as your remaining prayer.',
        },
      ],
    },
    {
      heading: 'Common Congregation Situations',
      steps: [
        {
          step: 1,
          title: 'If imam performs sajdah sahw',
          detail: 'The follower also performs sajdah sahw with the imam.',
        },
        {
          step: 2,
          title: 'If imam performs sajdah tilawah',
          detail: 'If the imam makes sajdah tilawah in salah, the follower must also follow him in that sajdah.',
        },
        {
          step: 3,
          title: 'If imam stands for an extra rakah after final sitting',
          detail: 'If the imam stands for an extra rakah after the final qadah, followers remain seated and do not stand with him. If the imam reaches sajdah of that extra rakah, the follower gives salam on his own.',
        },
        {
          step: 4,
          title: 'If imam misses middle sitting and stands',
          detail: 'If the imam stands and misses the middle sitting (qadah ula), follow him and do not force him to sit back down, because the middle sitting is wajib.',
        },
        {
          step: 5,
          title: 'Fill front gaps by sliding forward',
          detail: 'If there is a gap in the row in front of you, slide forward to fill it and keep the rows connected.',
        },
        {
          step: 6,
          title: 'Starting a new row with only one person',
          detail: 'If you are starting a new row alone, tap the person in front so he can slide back with you, because a new row should have at least two people.',
        },
        {
          step: 7,
          title: 'Minimum number for jamaah',
          detail: 'Minimum for jamaah is two (including imam and one follower). For Jumuah, minimum is three including imam.',
        },
        {
          step: 8,
          title: 'If imam invalidates his prayer',
          detail: 'If the imam prayer breaks and no replacement continues the prayer, restart with a valid imam.',
        },
        {
          step: 9,
          title: 'Keep rows straight and close gaps',
          detail: 'Stand shoulder to shoulder with calmness and avoid unnecessary movement or distraction.',
        },
      ],
    },
  ],
  notes: [
    'For detailed late-join counting, see the dedicated guide: Making Up Missed Units (Rakaat).',

  ],
};

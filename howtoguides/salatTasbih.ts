import { HowToGuide } from './types';

export const SALAT_TASBIH_GUIDE: HowToGuide = {
  id: 'salat-tasbih',
  parentGroup: 'Salah',
  title: 'Salat al-Tasbih صلاة التسبيح (Tasbih Prayer)',
  subtitle: 'Nafl Prayer · Hanafi Practice',
  icon: 'auto-awesome',
  color: '#6D4C41',
  intro: 'Salat al-Tasbih is a special nafl prayer with repeated tasbih. It is highly meritorious and prayed for forgiveness and spiritual renewal.',
  sections: [
    {
      heading: 'Tasbih to Recite',
      steps: [
        {
          step: 1,
          title: 'Main tasbih phrase',
          detail: `Recite this tasbih:

\`\`\`
سُبْحَانَ اللّٰهِ وَالْحَمْدُ لِلّٰهِ وَلَا إِلٰهَ إِلَّا اللّٰهُ وَاللّٰهُ أَكْبَرُ
\`\`\`

Transliteration: Subhanallahi wal-hamdu lillahi wa la ilaha illallahu wallahu akbar.`,
        },
      ],
    },
    {
      heading: 'When to Pray It',
      steps: [
        {
          step: 1,
          title: 'General time',
          detail: 'It can be prayed in permissible nafl times (not in prohibited times).',
        },
        {
          step: 2,
          title: 'Frequency',
          detail: 'If possible pray regularly; at minimum occasionally.',
        },
        {
          step: 3,
          title: 'Hadith guidance on frequency',
          detail: 'In hadith, the Prophet (Allah bless him and give him peace) taught Salat al-Tasbih to Sayyiduna al-Abbas and mentioned praying it daily, weekly, monthly, yearly, or at least once in a lifetime as reading it will forgive all minor sins regardless of the amount.',
        },
      ],
    },
    {
      heading: 'Method in Each Rakah (75 Tasbih)',
      steps: [
        {
          step: 1,
          title: 'Start of rakah',
          detail: 'After thana in qiyam, recite the tasbih 15 times.',
        },
        {
          step: 2,
          title: 'After recitation',
          detail: 'After Surah al-Fatihah and another surah, recite tasbih 10 times.',
        },
        {
          step: 3,
          title: 'In ruku and after ruku',
          detail: 'Recite tasbih 10 times in ruku, then 10 times in qawmah after rising from ruku.',
        },
        {
          step: 4,
          title: 'In sajdah positions',
          detail: 'Recite tasbih 10 times in first sajdah, 10 times in sitting between sajdahs, and 10 times in second sajdah.',
        },
        {
          step: 5,
          title: 'Total per rakah',
          detail: 'This makes 75 tasbih in one rakah.',
        },
      ],
    },
    {
      heading: 'Complete 4-Rakah Total',
      steps: [
        {
          step: 1,
          title: 'Total tasbih in full prayer',
          detail: 'Repeat the same pattern for 4 rakahs to complete 300 tasbih.',
        },
        {
          step: 2,
          title: 'Sittings',
          detail: 'In 4-rakah format, sit after two rakahs for tashahhud, then complete the final two rakahs and end with salam.',
        },
      ],
    },
    {
      heading: 'Important Notes',
      steps: [
        {
          step: 1,
          title: 'Warning: avoid prohibited times',
          detail: 'Do not pray Salat al-Tasbih in prohibited salah times.',
        },
        {
          step: 2,
          title: 'Maintain calmness',
          detail: 'Recite with focus and calm posture, without rushing through counts.',
        },
        {
          step: 3,
          title: 'If count is disturbed',
          detail: 'If you forget a count, continue with best estimate and complete prayer without excessive doubt.',
        },
        {
          step: 4,
          title: 'Middle sitting in 4-rakah format',
          detail: 'In this 4-rakah nafl prayer, in the middle sitting recite al-Tahiyyat plus salawat and dua, then stand for the third rakah without salam.',
        },
      ],
    },
  ],
  notes: [
    'This guide is a practical learning format; detailed juristic variants may differ by teacher and region.',
    'Hadith references are discussed in works citing Abu Dawud, Tirmidhi, and Ibn Majah narrations on Salat al-Tasbih.',
    'If you are new, first learn the count pattern slowly, then increase consistency over time.',
  ],
};
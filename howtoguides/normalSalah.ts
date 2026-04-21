import { HowToGuide } from './types';

export const NORMAL_SALAH_GUIDE: HowToGuide = {
  id: 'normal-salah',
  parentGroup: 'Salah',
  title: 'Normal Salah الصلاة (Salah)',
  subtitle: 'Daily Prayer · Hanafi Method',
  icon: 'self-improvement',
  color: '#5E35B1',
  intro: 'This is a beginner-friendly Hanafi guide for a 4-rakah fard salah, designed for a young child or a new Muslim with simple steps and full recitations.',
  sections: [
    {
      heading: 'Step 0: Before You Start',
      steps: [
        { step: 1, title: 'Have all conditions ready', detail: 'Have valid wudhu, clean body/clothes/place, covered awrah, prayer time entered, and face qiblah.' },
        { step: 2, title: 'Stand calmly on prayer place', detail: 'Stand straight with focus. Keep eyes toward place of sujud.' },
        { step: 3, title: 'Make niyyah in heart', detail: 'Intend the specific 4-rakah fard prayer in your heart. A spoken formula is not required.' },
      ],
    },
    {
      heading: 'Step 1: Start Salah (Takbir and Qiyam)',
      steps: [
        { step: 1, title: 'Say opening takbir', detail: 'Raise both hands and say exactly: الله أكبر.' },
        { step: 2, title: 'Fold hands in qiyam', detail: 'Place right hand over left below navel (Hanafi method).' },
        { step: 3, title: 'Recite sana', detail: 'Recite exactly: سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ وَتَبَارَكَ اسْمُكَ وَتَعَالَى جَدُّكَ وَلَا إِلٰهَ غَيْرُكَ' },
        { step: 4, title: 'Recite taawwudh', detail: 'Recite exactly: أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ' },
        { step: 5, title: 'Recite tasmiyah', detail: 'Recite exactly: بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
      ],
    },
    {
      heading: 'Step 2: Rakah 1 (Full Breakdown)',
      steps: [
        { step: 1, title: 'Recite Surah al-Fatihah', detail: `Recite full al-Fatihah: بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ، الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ، الرَّحْمَٰنِ الرَّحِيمِ، مَالِكِ يَوْمِ الدِّينِ، إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ، اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ، صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ` },
        { step: 2, title: 'Recite another surah', detail: `Recite a full surah or at least three short ayat. Example (full Surah al-Ikhlas): بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ، قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ` },
        { step: 3, title: 'Go to ruku', detail: 'Say: الله أكبر while moving into ruku.' },
        { step: 4, title: 'In ruku recite tasbih', detail: 'Recite exactly: سُبْحَانَ رَبِّيَ الْعَظِيمِ (at least 3 times).' },
        { step: 5, title: 'Rise from ruku (qawmah)', detail: 'Say exactly: سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ and then: رَبَّنَا لَكَ الْحَمْدُ' },
        { step: 6, title: 'Go to first sujud', detail: 'Say: الله أكبر while moving into sujud.' },
        { step: 7, title: 'In first sujud recite tasbih', detail: 'Recite exactly: سُبْحَانَ رَبِّيَ الْأَعْلَى (at least 3 times).' },
        { step: 8, title: 'Sit between two sujud', detail: 'Say: الله أكبر while sitting, then recite: رَبِّ اغْفِرْ لِي' },
        { step: 9, title: 'Go to second sujud', detail: 'Say: الله أكبر while going down.' },
        { step: 10, title: 'In second sujud recite tasbih', detail: 'Recite exactly: سُبْحَانَ رَبِّيَ الْأَعْلَى (at least 3 times).' },
        { step: 11, title: 'Stand for rakah 2', detail: 'Say: الله أكبر while standing.' },
      ],
    },
    {
      heading: 'Step 3: Rakah 2 and Middle Sitting',
      steps: [
        { step: 1, title: 'Start second rakah recitation', detail: `Recite: بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ then full al-Fatihah: الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ... وَلَا الضَّالِّينَ` },
        { step: 2, title: 'Recite another surah', detail: `Recite a full surah or at least three short ayat, for example: قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ` },
        { step: 3, title: 'Complete ruku and two sujud', detail: 'Repeat same exact recitations as in rakah 1 for ruku, qawmah, sujud, and between-sujud sitting.' },
        { step: 4, title: 'Sit after rakah 2', detail: `After second sujud, sit and recite full al-Tahiyyat: التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ` },
        { step: 5, title: 'Stand for rakah 3', detail: 'Say: الله أكبر and stand. Do not give salam here.' },
      ],
    },
    {
      heading: 'Step 4: Rakah 3 (Fard)',
      steps: [
        { step: 1, title: 'Recite in qiyam', detail: `Recite: بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ then full al-Fatihah only: الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ... وَلَا الضَّالِّينَ (no extra surah in fard).` },
        { step: 2, title: 'Complete ruku and sujud', detail: 'Repeat the same exact recitations of ruku, qawmah, two sujud, and between-sujud sitting.' },
        { step: 3, title: 'Stand for rakah 4', detail: 'After second sujud, say: الله أكبر and stand.' },
      ],
    },
    {
      heading: 'Step 5: Rakah 4, Final Sitting, and Salam',
      steps: [
        { step: 1, title: 'Recite in qiyam', detail: `Recite: بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ then full al-Fatihah only: الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ... وَلَا الضَّالِّينَ` },
        { step: 2, title: 'Complete ruku and sujud', detail: 'Repeat exact recitations for ruku, qawmah, and two sujud.' },
        { step: 3, title: 'Sit for final sitting', detail: `After second sujud, sit and recite full al-Tahiyyat: التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ` },
        { step: 4, title: 'Recite salawat', detail: `Recite full Salawat Ibrahimiyyah: اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ` },
        { step: 5, title: 'Recite final dua', detail: 'Recite exactly: رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِنْ ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ' },
        { step: 6, title: 'Finish prayer with salam', detail: 'Turn right and say: السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ then turn left and repeat the same.' },
      ],
    },
    {
      heading: 'Step 6: Sunnah and Nafl Difference (4 Rakah)',
      steps: [
        { step: 1, title: 'Recitation in rakah 3 and 4 of sunnah and nafl', detail: `In 4-rakah sunnah and nafl, in rakah 3 and 4 recite al-Fatihah (الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ...) plus another surah (for example: قُلْ هُوَ اللَّهُ أَحَدٌ). In fard, only recite al-Fatihah.` },
      ],
    },
    {
      heading: 'Step 7: Important Hanafi Reminders',
      steps: [
        { step: 1, title: 'Behind imam in fard', detail: 'Muqtadi does not recite Quran behind imam in fard; listen in loud salah and remain silent in silent salah.' },
        { step: 2, title: 'If wajib is missed by mistake', detail: 'Do sajdah sahw before salam.' },
        { step: 3, title: 'Keep calm in each posture', detail: 'Do not rush. Maintain ta dil al-arkan in ruku, qawmah, jalsah, and sujud.' },
      ],
    },
    {
      heading: 'Full Arabic Recitations (Block Format)',
      steps: [
        {
          step: 1,
          title: 'Opening recitations (Sana, Taawwudh, Tasmiyah)',
          detail: `Recite in order:

\`\`\`
سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ وَتَبَارَكَ اسْمُكَ وَتَعَالَى جَدُّكَ وَلَا إِلٰهَ غَيْرُكَ
\`\`\`

\`\`\`
أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
\`\`\`

\`\`\`
بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
\`\`\``,
        },
        {
          step: 2,
          title: 'Surah al-Fatihah (full)',
          detail: `Recite fully:

\`\`\`
بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ

الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ
الرَّحْمَٰنِ الرَّحِيمِ
مَالِكِ يَوْمِ الدِّينِ
إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ
اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ
صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ
\`\`\``,
        },
        {
          step: 3,
          title: 'Additional surah sample (Surah al-Ikhlas full)',
          detail: `In the first two rakahs of 4-rakah fard, after al-Fatihah recite another surah, for example:

\`\`\`
بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ

قُلْ هُوَ اللَّهُ أَحَدٌ
اللَّهُ الصَّمَدُ
لَمْ يَلِدْ وَلَمْ يُولَدْ
وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ
\`\`\``,
        },
        {
          step: 4,
          title: 'Ruku, Qawmah, Sujud, and between-sujud dhikr',
          detail: `Recite as follows:

\`\`\`
سُبْحَانَ رَبِّيَ الْعَظِيمِ
\`\`\`
(at least 3 times in ruku)

\`\`\`
سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ
رَبَّنَا لَكَ الْحَمْدُ
\`\`\`

\`\`\`
سُبْحَانَ رَبِّيَ الْأَعْلَى
\`\`\`
(at least 3 times in each sujud)

\`\`\`
رَبِّ اغْفِرْ لِي
\`\`\``,
        },
        {
          step: 5,
          title: 'Al-Tahiyyat (full)',
          detail: `Recite in first and final sitting:

\`\`\`
التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ
\`\`\``,
        },
        {
          step: 6,
          title: 'Salawat Ibrahimiyyah and dua in final sitting',
          detail: `After al-Tahiyyat in final sitting, recite salawat and then this dua:

\`\`\`
اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ
اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ
\`\`\`

\`\`\`
رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِنْ ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ
\`\`\``,
        },
        {
          step: 7,
          title: 'Salam to end prayer',
          detail: `Turn right, then left, saying:

\`\`\`
السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ
\`\`\``,
        },
      ],
    },
  ],
  notes: [
    'If a fard act is left out, that rakah or prayer is invalid and must be repeated.',
    'If a wajib act is missed by mistake, perform sajdah sahw.',
    'In Hanafi fiqh, Subhanak, taawwudh (aoodhu), and bismillah are read quietly (silently) in prayer.',
    'Behind the imam in fard prayer, the muqtadi does not recite Surah al-Fatihah or another surah; he listens in loud salah and stays silent in silent salah.',
    'Sunnah and nafl note: in 4 sunnah before Asr or before Isha, and in 4 nafl prayed together, in the middle sitting complete al-Tahiyyat plus salawat and dua, then stand for the third rakah without salam.',
    'Learn exact wording and posture from a qualified local teacher for precision.',
    'Primary reference: Nur al-Idah (Nur ul Idah), Hanafi fiqh chapter on salah.',
  ],
};

import { HowToGuide } from './types';

export const EID_GUIDE: HowToGuide = {
  id: 'eid',
  parentGroup: 'Salah',
  title: 'Salat al-Eid',
  subtitle: 'Eid ul-Fitr & Eid ul-Adha · Hanafi Fiqh',
  icon: 'wb-sunny',
  color: '#4FE948',
  intro: 'Eid salah is wajib in Hanafi fiqh for those required to attend. It is 2 rakahs with 6 extra takbirs, prayed after sunrise and before zawaal, followed by khutbah.',
  sections: [
    {
      heading: 'Core Eid Salah Method (Hanafi)',
      steps: [
        {
          step: 1,
          title: 'Prayer time window',
          detail: 'Eid prayer starts about 15-20 minutes after sunrise and ends at zawaal (midday time).',
        },
        {
          step: 2,
          title: 'First rakah',
          detail: 'Say opening takbir, then thana, then 3 extra takbirs (raising hands each time), then recitation and complete the rakah.',
        },
        {
          step: 3,
          title: 'Second rakah',
          detail: 'In second rakah, recitation comes first, then 3 extra takbirs, then takbir for ruku. Complete prayer and stay for khutbah.',
        },
      ],
    },
    {
      heading: 'Khutbah After Eid Prayer',
      steps: [
        {
          step: 1,
          title: 'Listening to khutbah is wajib',
          detail: 'After Eid salah, the khutbah is given. Listening attentively is wajib. Anything disliked during Jumuah khutbah is also disliked during Eid khutbah.',
        },
      ],
    },
    {
      heading: 'Latecomer (Masbuq) Rules in Eid Prayer',
      steps: [
        { step: 1, title: 'Scenario A: joined while standing', detail: 'If you join after extra takbirs but while imam is still standing, say opening takbir, then say Eid extra takbirs, even during imam recitation.' },
        { step: 2, title: 'Scenario B: joined in first rakah ruku (enough time)', detail: 'Say opening takbir while standing, remain standing to say Eid extra takbirs, then join imam in ruku.' },
        { step: 3, title: 'Scenario C: joined in first rakah ruku (fear missing)', detail: 'Say opening takbir while standing, join ruku, then say Eid extra takbirs in ruku before tasbih and without raising hands.' },
        { step: 4, title: 'If imam rises before you finish takbirs', detail: 'Drop any remaining extra takbirs immediately. Do not make them up in second rakah.' },
        { step: 5, title: 'Scenario D: missed first rakah', detail: 'After imam salam, stand and make up missed first rakah: recite Fatiha and a short surah first, then say Eid extra takbirs.' },
      ],
    },
    {
      heading: 'If Eid Is Missed and Tayammum Exception',
      steps: [
        { step: 1, title: 'Tayammum to catch Eid jamaah', detail: 'If doing wudu will make you miss Eid congregation, tayammum is allowed, even in city and without illness.' },
        { step: 2, title: 'Why this is an exception', detail: 'Eid has no replacement prayer if missed. This specific rule does not apply to Jumuah and regular daily prayers.' },
        { step: 3, title: 'Can Eid be prayed alone if missed?', detail: 'No. In Hanafi fiqh, Eid prayer is only in formal congregation.' },
        { step: 4, title: 'If Eid is missed or prayer breaks', detail: 'There is no individual makeup Eid prayer. It is recommended to pray 4 rakahs of Duha.' },
        { step: 5, title: 'If attendance was wajib and missed', detail: 'One should repent for missing a wajib obligation.' },
      ],
    },
    {
      heading: 'Recommended Acts on Eid al-Fitr',
      steps: [
        { step: 1, title: 'Wake early', detail: 'Wake up early, preferably before Fajr or at the entering of Fajr.' },
        { step: 2, title: 'Pray Fajr in congregation', detail: 'Pray the Fajr group prayer in the masjid.' },
        { step: 3, title: 'Eat before Eid prayer', detail: 'Eat something sweet after Fajr and before leaving for Eid prayer.' },
        { step: 4, title: 'Prefer dates in odd number', detail: 'If possible, eat dates and eat them in an odd number.' },
        { step: 5, title: 'Do ghusl before Eid prayer', detail: 'Perform ghusl before Eid prayer, even for someone not attending the prayer.' },
        { step: 6, title: 'Use siwak', detail: 'Clean the teeth with siwak or similar as much as possible.' },
        { step: 7, title: 'Use perfume correctly', detail: 'Wear scented perfume (women should not wear strong perfume outside their homes).' },
        { step: 8, title: 'Wear best clothing', detail: 'Wear your best, cleanest, and most beautiful (or newest) clothing, even if not white.' },
        { step: 9, title: 'Show joy and gratitude', detail: 'Make happiness visible and thank Allah for His blessings.' },
        { step: 10, title: 'Smile when meeting others', detail: 'Smile and show happiness when meeting people.' },
        { step: 11, title: 'Increase voluntary charity', detail: 'Give more non-obligatory charity than your usual habit.' },
        { step: 12, title: 'Say takbir quietly on way (Fitr)', detail: 'While going to Eid al-Fitr prayer area, say Allahu Akbar quietly to yourself and stop when the imam begins.' },
        { step: 13, title: 'Go to Eid prayer by foot', detail: 'Walk to the Eid prayer area when possible.' },
        { step: 14, title: 'Pay sadaqat al-fitr if required', detail: 'Pay sadaqat al-fitr (zakat al-fitr) if it is wajib for you.' },
        { step: 15, title: 'Arrive early', detail: 'Arrive early so you can pray in the first line.' },
        { step: 16, title: 'Return by a different route', detail: 'After Eid prayer, return from a different direction.' },
      ],
    },
    {
      heading: 'How Eid al-Adha Differs from Eid al-Fitr',
      steps: [
        { step: 1, title: 'Eating timing difference', detail: 'For Eid al-Adha, delay eating until after Eid prayer. For Eid al-Fitr, eating before Eid prayer is recommended.' },
        { step: 2, title: 'Takbir volume difference', detail: 'For Eid al-Adha, say Allahu Akbar out loud on the way to prayer. For Eid al-Fitr, say it quietly to yourself.' },
        { step: 3, title: 'Charity vs sacrifice', detail: 'There is no sadaqat al-fitr on Eid al-Adha. Instead, one offers udhiyah (animal sacrifice) if financially able.' },
      ],
    },
    {
      heading: 'What Is Disliked on Eid Day',
      steps: [
        { step: 1, title: 'Nafl before Eid prayer', detail: 'It is disliked to perform nafl before Eid prayer in the Eid prayer area or at home.' },
        { step: 2, title: 'Nafl after Eid prayer in Eid area', detail: 'It is disliked to perform nafl after Eid prayer in the Eid prayer area, but praying nafl at home is not disliked.' },
        { step: 3, title: 'Fasting on Eid day', detail: 'Fasting on Eid day is prohibitively disliked (sinful), and one must break the fast.' },
      ],
    },
    {
      heading: 'Takbir al-Tashriq (Hanafi)',
      steps: [
        { step: 1, title: 'When to say it', detail: 'Say it after every fard prayer from Fajr of 9th Dhul Hijjah (Arafah) to Asr of 13th Dhul Hijjah. Total: 23 prayers.' },
        { step: 2, title: 'Who must say it', detail: 'It is wajib for men and women praying fard in these days: imam, follower, latecomer, person praying alone, traveler, and resident.' },
        {
          step: 3,
          title: 'Wording',
          detail: `Say at least once:

      \`\`\`
      اللّٰهُ أَكْبَرُ، اللّٰهُ أَكْبَرُ، لَا إِلٰهَ إِلَّا اللّٰهُ، وَاللّٰهُ أَكْبَرُ، اللّٰهُ أَكْبَرُ، وَلِلّٰهِ الْحَمْدُ
      \`\`\`

      Transliteration: Allahu Akbar, Allahu Akbar, La ilaha illa Allah, Wallahu Akbar, Allahu Akbar, wa lillahil-hamd.`,
        },
        { step: 4, title: 'Volume and repetition', detail: 'Men say it out loud. Women say it softly. Repeating more than once is better according to some scholars.' },
        { step: 5, title: 'Where it applies', detail: 'It is for fard prayers (including Jumuah if it falls in these days), not for nafl, witr, or janazah. It may also be said after Eid prayers.' },
        { step: 6, title: 'Say it immediately', detail: 'Say it right after salam of fard prayer. If one talks, loses wudu, or does unrelated acts first, the wajib is missed.' },
      ],
    },
    {
      heading: 'Sadaqat al-Fitr (Zakat al-Fitr) Summary',
      steps: [
        { step: 1, title: 'What it is', detail: 'A wajib Eid al-Fitr charity given to poor recipients who are eligible for zakat.' },
        { step: 2, title: 'How much to pay', detail: 'Half sa of wheat (about 2 kg), or one full sa of dates/barley/raisins (about 4 kg), or cash equal to that amount.' },
        { step: 3, title: 'Who must pay', detail: 'Every free Muslim with nisab-level surplus wealth beyond basic needs and immediate debts at Fajr of Eid al-Fitr, even if one lunar year has not passed.' },
        { step: 4, title: 'Family payment rules', detail: 'A husband is not required to pay for his wife. A father or guardian pays for a child with no wealth; if the child has wealth, it is paid from the child\'s wealth.' },
        { step: 5, title: 'How nisab differs from annual zakat', detail: 'For sadaqat al-fitr, any extra wealth/assets can count toward nisab, not only standard zakatable items, and there is no hawl condition.' },
        { step: 6, title: 'When to pay', detail: 'It becomes wajib at Fajr of Eid al-Fitr. Paying before Eid prayer is recommended, but payment before or after Eid day is still valid.' },
        { step: 7, title: 'If unpaid from past years', detail: 'It remains a debt owed to poor recipients. Delaying is disliked, but the obligation is not cancelled.' },
        { step: 8, title: 'If wealth drops later', detail: 'If wealth decreases after it became wajib, the obligation still remains.' },
      ],
    },
  ],
  notes: [
    'Primary references summarized: Maraqi al-Falah, al-Hadiyya al-Alaiyya, Imdad al-Fattah, Durr al-Mukhtar, Radd al-Muhtar, al-Lubab, and related Hanafi commentaries.',
    'This guide is a practical summary. For personal cases and local masjid policy, ask a qualified Hanafi scholar or mufti.',
    'Key reminder: Eid prayer has no individual makeup in Hanafi fiqh, and takbir al-tashriq timing must be observed carefully in Dhul Hijjah days.',
  ],
};

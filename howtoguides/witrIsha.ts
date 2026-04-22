import { HowToGuide } from './types';

export const WITR_ISHA_GUIDE: HowToGuide = {
  id: 'witr-isha',
  parentGroup: 'Salah',
  title: 'Witr الوتر (Witr)',
  subtitle: 'Salah Core · Hanafi Method',
  icon: 'nights-stay',
  color: '#3949AB',
  intro: 'In Hanafi fiqh, Witr is wajib and prayed after Isha. The common method is three rakahs with qunoot in the third rakah.',
  sections: [
    {
      heading: 'Ruling and Time',
      steps: [
        { step: 1, title: 'Witr is wajib', detail: 'It is wajib in Hanafi fiqh for those obligated by prayer.' },
        { step: 2, title: 'Qunoot starts after Isha begins', detail: 'Qunoot time begins with the start of Isha time and remains until Fajr begins.' },
        { step: 3, title: 'Best time window', detail: 'Pray after Isha before Fajr begins; delaying to the last third of the night is best for those confident they will wake.' },
      ],
    },
    {
      heading: 'How to Pray (Hanafi)',
      steps: [
        { step: 1, title: 'Recitation in all three rakahs', detail: 'In Witr, recite al-Fatihah and a surah in all 3 rakahs.' },
        { step: 2, title: 'Third rakah extra takbir is wajib', detail: 'In the third rakah, after recitation, raise hands and say the extra takbir. Saying this takbir is wajib, then fold hands again.' },
        {
          step: 3,
          title: 'Recite full dua qunoot',
          detail: `Recite the Hanafi qunoot:

\`\`\`
اللّٰهُمَّ إِنَّا نَسْتَعِينُكَ وَنَسْتَغْفِرُكَ وَنُؤْمِنُ بِكَ وَنَتَوَكَّلُ عَلَيْكَ وَنُثْنِي عَلَيْكَ الْخَيْرَ كُلَّهُ نَشْكُرُكَ وَلَا نَكْفُرُكَ وَنَخْلَعُ وَنَتْرُكُ مَنْ يَفْجُرُكَ
اللّٰهُمَّ إِيَّاكَ نَعْبُدُ وَلَكَ نُصَلِّي وَنَسْجُدُ وَإِلَيْكَ نَسْعَى وَنَحْفِدُ وَنَرْجُو رَحْمَتَكَ وَنَخْشَى عَذَابَكَ إِنَّ عَذَابَكَ بِالْكُفَّارِ مُلْحِقٌ
\`\`\`

Transliteration: Allahumma inna nastaeenuka wa nastaghfiruka wa numinu bika wa natawakkalu alayka wa nuthni alaykal khayra kullahu nashkuruka wa la nakfuruka wa nakhlau wa natruku man yafjuruk. Allahumma iyyaka nabudu wa laka nusalli wa nasjudu wa ilayka nasaa wa nahfidu wa narju rahmataka wa nakhsha adhaba-ka inna adhaba-ka bil-kuffari mulhiq.`,
        },
        { step: 4, title: 'If qunoot not memorized', detail: 'It is wajib to recite a dua in this place. Reciting this specific qunoot is sunnah, so if not memorized yet, any suitable dua may be recited.' },
        { step: 5, title: 'Complete prayer', detail: 'Then perform ruku and sujud, sit for final tashahhud, and end with salam.' },
      ],
    },
    {
      heading: 'If Missed or Forgotten',
      steps: [
        { step: 1, title: 'Missed Witr', detail: 'If missed, make qada of Witr as soon as reasonably possible.' },
        { step: 2, title: 'Missed qunoot and entered ruku', detail: 'If qunoot is missed and you already went into ruku, recite the qunoot after standing from ruku, then continue to sajdah as normal and perform sajdah sahw.' },
      ],
    },
    {
      heading: 'Ramadan Jamaat Note',
      steps: [
        { step: 1, title: 'Witr in jamaat during Ramadan', detail: 'In Ramadan, Witr with qunoot is commonly prayed in jamaat.' },
        { step: 2, title: 'If Isha jamaat is missed', detail: 'According to some scholars, if someone misses the Isha jamaat, they may still join the Witr jamaat.' },
      ],
    },
  ],
  notes: [
    'Memorize the full qunoot and keep improving pronunciation over time.',
    'If full qunoot is not yet memorized, recite another suitable dua while learning.',
    'Primary reference: Nur al-Idah (Nur ul Idah), Hanafi fiqh chapter on Witr.',
  ],
};

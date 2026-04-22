import { HowToGuide } from './types';

export const JANAZAH_GUIDE: HowToGuide = {
  id: 'janazah',
  parentGroup: 'Salah',
  title: 'Salat al-Janazah',
  subtitle: 'Funeral Prayer · Hanafi Method',
  icon: 'self-improvement',
  color: '#3949AB',
  intro: 'Salat al-Janazah is Fard Kifayah (collective obligation). It is performed standing, with no ruku or sujud, after the deceased has been washed and shrouded.',
  sections: [
    {
      heading: 'Preparation',
      steps: [
        { step: 1, title: 'Purity', detail: 'Ensure you have wudu. The deceased must be washed (ghusl) and wrapped in a kafan before the prayer.' },
        { step: 2, title: 'Positioning', detail: 'The Imam stands near the chest of a male or the middle of a female. Congregation forms behind in at least three rows, facing the Qiblah.' },
        { step: 3, title: 'Intention', detail: 'Make intention in the heart: "I intend Salat al-Janazah for this deceased, for the sake of Allah, following the Imam."' },
      ],
    },
    {
      heading: 'The Four Takbirs',
      steps: [
        { step: 4, title: '1st Takbir', detail: 'Raise both hands to earlobes, say "Allahu Akbar", fold hands on chest. Recite Thana silently (Subhanakallahumma...) then Surah al-Fatihah.' },
        { step: 5, title: '2nd Takbir', detail: 'Say "Allahu Akbar" (no hand raise). Recite full Salawat Ibrahimiyyah silently upon the Prophet.' },
        { step: 6, title: '3rd Takbir', detail: "Say \"Allahu Akbar\" (no hand raise). Recite the du'a for the deceased (see below)."},
        { step: 7, title: '4th Takbir', detail: 'Say "Allahu Akbar" (no hand raise). Pause briefly, drop both hands and make salaam'}, 
      ],
    },
    {
      heading: "Du'a for the Deceased (3rd Takbir)",
      steps: [
        { step: 8, title: 'Adult (Male)', detail: `اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا وَشَاهِدِنَا وَغَائِبِنَا وَصَغِيرِنَا وَكَبِيرِنَا وَذَكَرِنَا وَأُنْثَانَا، اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الْإِسْلَامِ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الْإِيمَانِ، وَلا تُضِلَّنَا بَعْدَهُ.

Translation:
O Allah, forgive our living and our dead, those present and those absent, our young and our old, our males and our females. O Allah, whoever You keep alive among us, keep him alive upon Islam, and whoever You cause to die among us, cause him to die upon faith. Do not let us go astray after him.` },
        { step: 9, title: 'Adult (Female)', detail: `اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا وَشَاهِدِنَا وَغَائِبِنَا وَصَغِيرِنَا وَكَبِيرِنَا وَذَكَرِنَا وَأُنْثَانَا، اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الْإِسْلَامِ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الْإِيمَانِ، وَلا تُضِلَّنَا بَعْدَهَا.

Translation:
O Allah, forgive our living and our dead, those present and those absent, our young and our old, our males and our females. O Allah, whoever You keep alive among us, keep her alive upon Islam, and whoever You cause to die among us, cause her to die upon faith. Do not let us go astray after her.` },
        { step: 10, title: 'Child Dua', detail: `اللَّهُمَّ اجْعَلْهُ لَنَا فَرَطًا وَاجْعَلْهُ لَنَا أَجْرًا وَذُخْرًا وَاجْعَلْهُ لَنَا شَافِعًا وَمُشَفَّعًا. (لِلْبِنْتِ: اللَّهُمَّ اجْعَلْهَا لَنَا فَرَطًا ... وَمُشَفَّعَةً)

Translation:
O Allah, make this child a forerunner for us, a source of reward and treasure for us, and an intercessor whose intercession is accepted for us.` },
      ],
    },
    {
      heading: 'Funeral Procession - Sunnahs',
      steps: [
        {
          step: 11,
          title: 'Walk behind the bier, not in front',
          detail: 'It is Sunnah to walk BEHIND the bier (janazah). Walking in front is permitted but against the Sunnah according to the Hanafi school.\n\nThe Prophet taught that walking with janazah reminds one of death and the Hereafter.',
          note: 'Hanafi position: walking behind is Sunnah; walking in front is permitted but less virtuous.',
        },
        {
          step: 12,
          title: 'Hurry with a dignified pace',
          detail: 'The janazah should be carried briskly but with dignity and calmness.',
          note: '[Bukhari 1315, Muslim 944]',
        },
        {
          step: 13,
          title: 'Those on foot walk; those in vehicles follow behind',
          detail: 'Those on foot walk near or behind the bier. Those in vehicles should stay behind the procession.',
        },
        {
          step: 14,
          title: 'Recite dhikr quietly - not aloud as a group',
          detail: 'Reflect quietly on death and akhirah. Group loud chanting in procession is not established and is disliked in Hanafi fiqh.',
        },
        {
          step: 15,
          title: 'Do not sit until the bier is set down',
          detail: 'If accompanying the janazah, remain standing until it has been set down.',
          note: '[Bukhari 1307, Muslim 959]',
        },
        {
          step: 16,
          title: 'Non-Muslims present: remain respectful',
          detail: 'All attendees should maintain silence and respectful conduct during the procession and burial.',
        },
      ],
    },
    {
      heading: 'At the Graveside - Sunnahs and Duas',
      steps: [
        {
          step: 17,
          title: 'When lowering into the grave',
          detail: 'When lowering the body into the grave, recite:\nبِسْمِ اللَّهِ وَبِاللَّهِ وَعَلَى مِلَّةِ رَسُولِ اللَّهِ\n\nTranslation:\nIn the name of Allah, with the help of Allah, and on the religion of the Messenger of Allah.',
          note: 'Jami al-Tirmidhi 1046',
        },
        {
          step: 18,
          title: 'Cast three handfuls of earth',
          detail: 'It is Sunnah to place three handfuls of earth into the grave from the head-side. Family and attendees may join by placing the three handfuls respectfully.',
          note: 'Ibn Majah 1565',
        },
        {
          step: 19,
          title: 'Optional verse while placing earth',
          detail: 'Some scholars considered it mustahab (preferable), though not established Sunnah, to read from Surah Taha (20:55) while placing the three handfuls:\nFirst: مِنۡهَا خَلَقۡنٰكُمۡ (From it We created you)\nSecond: وَفِيهَا نُعِيدُكُمْ (Into it We will return you)\nThird: وَمِنْهَا نُخْرِجُكُمْ تَارَةً أُخْرَى (From it We will raise you again).',
          note: '[Quran 20:55]',
        },
        {
          step: 20,
          title: 'Dua after burial for steadfastness',
          detail: 'After burial, pause and make istighfar and dua for firmness:\nاسْتَغْفِرُوا لِأَخِيكُمْ وَسَلُوا لَهُ بِالتَّثْبِيتِ فَإِنَّهُ الْآنَ يُسْأَلُ\n\nTranslation:\nPray for forgiveness for your brother and ask that he be made steadfast, for he is being questioned now.',
          note: 'Abu Dawud 3221',
        },
        {
          step: 21,
          title: 'Graveside dua',
          detail: 'اللهم اغفر له وارحمه وعافه واعف عنه\n\nTranslation:\nO Allah, forgive him, have mercy on him, grant him wellbeing, and pardon him.',
        },
        {
          step: 22,
          title: 'Speak good of the deceased',
          detail: 'Avoid speaking ill of the deceased and mention their good. The Prophet taught:\nلاَ تَسُبُّوا الأَمْوَاتَ\n\nTranslation:\nDo not abuse the dead, for they have reached what they sent forward.',
          note: 'Sahih al-Bukhari 6516',
        },
        {
          step: 23,
          title: 'Remain in dhikr and remembrance',
          detail: 'At the graveside, remain in dhikr, reflect on death and the Hereafter, and avoid idle talk.',
        },
        {
          step: 24,
          title: 'Avoid sitting or walking on graves',
          detail: 'Do not sit, stand, or walk unnecessarily over graves; maintain full respect.',
        },
        {
          step: 25,
          title: 'Giving adhan at the grave',
          detail: 'It is recommended by some scholars to give adhan at the grave.',
        },
        {
          step: 26,
          title: 'Reciting final verses of Surah al-Baqarah',
          detail: 'It is recommended to recite the final verses of Surah al-Baqarah at or after burial.',
        },
      ],
    },
    {
      heading: 'Condolence Etiquette (Taziyah)',
      steps: [
        {
          step: 27,
          title: 'What is Taziyah?',
          detail: 'Offering condolences means comforting the bereaved family and encouraging sabr with dua.',
        },
        {
          step: 28,
          title: 'What to say when giving condolences',
          detail: 'A known wording is: Inna lillahi ma akhadha wa lahu ma aata wa kullu shayin indahu bi-ajalin musamma.',
          note: 'English or Arabic may be used; meaning and sincerity matter.',
        },
        {
          step: 29,
          title: 'Inna lillahi wa inna ilayhi rajiun',
          detail: 'إنا لله وإنا إليه راجعون\n\nTranslation:\nIndeed we belong to Allah and to Him we return.',
        },
        {
          step: 30,
          title: 'When to visit for condolences',
          detail: 'Offer condolences within three days where possible, usually after burial when family is less occupied.',
        },
        {
          step: 31,
          title: 'Preparing food for the bereaved family',
          detail: 'Relatives and neighbors should provide food to the bereaved; burden should not be on grieving family.',
        },
        {
          step: 32,
          title: 'Period of mourning',
          detail: 'General mourning is up to three days; widow observes her iddah period as prescribed.',
          note: 'Natural tears are permitted; prohibited mourning practices should be avoided.',
        },
      ],
    },
  ],
  notes: [
    'The Imam says Takbirs aloud; congregation follows silently throughout.',
    'No adhan, iqamah, ruku, sujud or tashahud in Janazah prayer.',
    'If you join late, match the Imam on whichever Takbir he is on.',
    'If the deceased left unpaid debts, they should be settled from the estate before distribution to heirs.',
    'consult a scholar to ensure inehritence is handled according to Islamic law.',
    'If there is a valid wasiyyah (will), execute it after funeral costs and debts, up to one-third of the estate for non-heirs.',
    'For missed prayers and fasts generally, follow Hanafi guidance of local scholars regarding fidyah and related arrangements.',
    'For detailed cases, consult a qualified local scholar.',],
};
  
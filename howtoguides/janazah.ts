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
        { step: 6, title: '3rd Takbir', detail: "Say \"Allahu Akbar\" (no hand raise). Recite the du'a for the deceased (see below).", note: "Du'a: Allahummaghfir lahu warhamhu wa Aafih wa Afu Anhu wa akrim nuzulahu wa wassi' mudkhalahu..." },
        { step: 7, title: '4th Takbir', detail: 'Say "Allahu Akbar" (no hand raise). Pause briefly, then make ONE Taslim to the RIGHT only: Assalamu Alaykum wa Rahmatullah.' },
      ],
    },
    {
      heading: "Du'a for the Deceased (3rd Takbir)",
      steps: [
        { step: 8, title: 'Adult (Male)', detail: `اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا وَشَاهِدِنَا وَغَائِبِنَا وَصَغِيرِنَا وَكَبِيرِنَا وَذَكَرِنَا وَأُنْثَانَا، اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الْإِسْلَامِ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الْإِيمَانِ، وَلا تُضِلَّنَا بَعْدَهُ.
Allahummaghfir lihayyina wa mayyitina wa shahidina wa gha'ibina wa saghirina wa kabirina wa dhakarina wa unthana. Allahumma man ahyaytahu minna fa ahyihi ala al-Islam, wa man tawaffaytahu minna fatawaffahu ala al-iman, wa la tudillana ba'dahu.
O Allah, forgive our living and our dead, those present and those absent, our young and our old, our males and our females. O Allah, whoever You keep alive among us, keep him alive upon Islam, and whoever You cause to die among us, cause him to die upon faith. Do not let us go astray after him.` },
        { step: 9, title: 'Adult (Female)', detail: `اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا وَشَاهِدِنَا وَغَائِبِنَا وَصَغِيرِنَا وَكَبِيرِنَا وَذَكَرِنَا وَأُنْثَانَا، اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الْإِسْلَامِ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الْإِيمَانِ، وَلا تُضِلَّنَا بَعْدَهَا.
Allahummaghfir lihayyina wa mayyitina wa shahidina wa gha'ibina wa saghirina wa kabirina wa dhakarina wa unthana. Allahumma man ahyaytahu minna fa ahyihi ala al-Islam, wa man tawaffaytahu minna fatawaffahu ala al-iman, wa la tudillana ba'daha.
O Allah, forgive our living and our dead, those present and those absent, our young and our old, our males and our females. O Allah, whoever You keep alive among us, keep her alive upon Islam, and whoever You cause to die among us, cause her to die upon faith. Do not let us go astray after her.` },
        { step: 10, title: 'Child Dua', detail: `اللَّهُمَّ اجْعَلْهُ لَنَا فَرَطًا وَاجْعَلْهُ لَنَا أَجْرًا وَذُخْرًا وَاجْعَلْهُ لَنَا شَافِعًا وَمُشَفَّعًا. (لِلْبِنْتِ: اللَّهُمَّ اجْعَلْهَا لَنَا فَرَطًا ... وَمُشَفَّعَةً)
Allahumma-jalhu lana faratan, wa-jalhu lana ajran wa dhukhran, wa-jalhu lana shafi'an wa mushaffa'an. (For a girl: Allahumma-jalha ... wa mushaffa'ah.)
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
          title: 'Stand at the graveside respectfully',
          detail: 'Stand facing qiblah, lower gaze, and reflect on the Hereafter.',
        },
        {
          step: 18,
          title: 'Cast three handfuls of earth',
          detail: 'It is Sunnah to place three handfuls of earth into the grave from the head-side.',
          note: '[Quran 20:55] - Ibn Majah, Abu Dawud',
        },
        {
          step: 19,
          title: 'Dua after burial',
          detail: 'After burial, pause briefly and ask Allah to grant firmness and forgiveness to the deceased.',
        },
        {
          step: 20,
          title: 'Dua to recite',
          detail: 'اللهم اغفر له وارحمه وعافه واعف عنه\nAllahummaghfir lahu warhamhu wa aafihi wa fu anhu\nO Allah, forgive him, have mercy on him, grant him wellbeing, and pardon him.',
        },
        {
          step: 21,
          title: 'Placing greenery on the grave',
          detail: 'Placing fresh greenery is considered permissible with precedent in hadith literature.',
        },
        {
          step: 22,
          title: 'Avoid sitting or walking on graves',
          detail: 'Do not sit, stand, or walk unnecessarily over graves; maintain full respect.',
        },
      ],
    },
    {
      heading: 'Condolence Etiquette (Taziyah)',
      steps: [
        {
          step: 23,
          title: 'What is Taziyah?',
          detail: 'Offering condolences means comforting the bereaved family and encouraging sabr with dua.',
        },
        {
          step: 24,
          title: 'What to say when giving condolences',
          detail: 'A known wording is: Inna lillahi ma akhadha wa lahu ma aata wa kullu shayin indahu bi-ajalin musamma.',
          note: 'English or Arabic may be used; meaning and sincerity matter.',
        },
        {
          step: 25,
          title: 'Inna lillahi wa inna ilayhi rajiun',
          detail: 'إنا لله وإنا إليه راجعون\nInna lillahi wa inna ilayhi rajiun\nIndeed we belong to Allah and to Him we return.',
        },
        {
          step: 26,
          title: 'When to visit for condolences',
          detail: 'Offer condolences within three days where possible, usually after burial when family is less occupied.',
        },
        {
          step: 27,
          title: 'Preparing food for the bereaved family',
          detail: 'Relatives and neighbors should provide food to the bereaved; burden should not be on grieving family.',
        },
        {
          step: 28,
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
    'Women are permitted to pray Salat al-Janazah.',
    'All recitation is silent (sirr) according to the Hanafi school.',
    'Walk behind the bier, not in front - this is the established Sunnah.',
    'Do not sit until the bier has been set down on the ground.',
    "Offer condolences (taziyah) once within three days of the death.",
    'Neighbours and relatives should provide food for the bereaved family - not the family themselves.',
  ],
};

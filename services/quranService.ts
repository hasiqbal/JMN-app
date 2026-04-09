
export interface Dua {
  id: string;
  category: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference?: string;
  count?: number;
}

export interface Surah {
  id: number;
  name: string;
  arabicName: string;
  verses: number;
  revelation: 'Meccan' | 'Medinan';
}

export interface YaseenVerse {
  ayah: number;
  arabic: string;
  transliteration: string;
  translation: string;
}

export const DUA_CATEGORIES = [
  'All',
  'Morning & Evening',
  'Before & After Prayer',
  'Daily Life',
  'Protection',
  'Forgiveness',
];

export const RATIB_AL_HADDAD: Dua[] = [
  {
    id: 'rh-1',
    category: 'Ratib al-Haddad',
    title: '1. Opening Dedication — Al-Fatihah',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\n' +
      'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴿١﴾ الرَّحْمَٰنِ الرَّحِيمِ ﴿٢﴾ مَالِكِ يَوْمِ الدِّينِ ﴿٣﴾ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ﴿٤﴾ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ﴿٥﴾ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ ﴿٦﴾',
    transliteration:
      'Bismi Llahi r-Rahmani r-Rahim. Al-hamdu li Llahi Rabbi l-aalamin, ar-Rahmani r-Rahim, Maliki yawmi d-din, iyyaka naAbudu wa iyyaka nastaIn, ihdina s-sirata l-mustaqim, sirata lladhina anAmta Alayhim ghayri l-maghdubi Alayhim wa la d-dallin.',
    translation:
      'In the name of Allah, the Most Gracious, the Most Merciful. All praise is due to Allah, Lord of all worlds, the Most Gracious, the Most Merciful, Master of the Day of Judgement. You alone we worship and You alone we ask for help. Guide us to the straight path — the path of those You have favoured, not of those who earn anger nor of those who go astray.',
    reference: "Quran 1:1-7",
    count: 1,
  },
  {
    id: 'rh-2',
    category: 'Ratib al-Haddad',
    title: '2. Ayat al-Kursi',
    arabic:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    transliteration:
      'Allahu la ilaha illa Huwa l-Hayyu l-Qayyum. La taakhudhuhu sinatun wa la nawm. Lahu ma fi s-samawati wa ma fi l-ard. Man dha lladhi yashfaAu Indahu illa bi idhnih. YaAlamu ma bayna aydihim wa ma khalfahum, wa la yuhituna bi shayIn min Ilmihi illa bi ma sha. WasiAa kursiyyuhu s-samawati wa l-ard, wa la yaUduhu hifzuhuma, wa Huwa l-Aliyyu l-Azim.',
    translation:
      'Allah — there is no god but He, the Ever-Living, the Self-Subsisting. Neither drowsiness nor sleep overtakes Him. To Him belongs all that is in the heavens and the earth. Who is there that can intercede with Him except by His permission? He knows what is before them and what is behind them, and they encompass nothing of His knowledge except what He wills. His Throne extends over the heavens and the earth, and their preservation does not tire Him. He is the Most High, the Most Great.',
    reference: "Quran 2:255",
    count: 1,
  },
  {
    id: 'rh-3',
    category: 'Ratib al-Haddad',
    title: '3. Closing of Surah al-Baqarah',
    arabic:
      'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ﴿٢٨٥﴾\n\n' +
      'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ ﴿٢٨٦﴾',
    transliteration:
      'Amana r-Rasulu bi ma unzila ilayhi min Rabbihi wa l-muuminun. Kullun amana bi Llahi wa malaIkatihi wa kutubihi wa rusulih. La nufarriqu bayna ahadin min rusulih. Wa qalu samiAna wa ataAna ghufranaka Rabbana wa ilayka l-masir.\n\nLa yukalliful Llahu nafsan illa wusAaha. Laha ma kasabat wa Alayha ma-ktasabat. Rabbana la tuaakhidhna in nasina aw akhtaana. Rabbana wa la tahmil Alayna isran kama hamaltahu Ala lladhina min qablina. Rabbana wa la tuhammilna ma la taqata lana bih. WaAfu Anna wa-ghfir lana wa-rhamna. Anta mawlana fa-nsurna Ala l-qawmi l-kafirin.',
    translation:
      'The Messenger believes in what was revealed to him from his Lord, and so do the believers. All believe in Allah, His angels, His books and His Messengers. They say: "We hear and we obey. Forgive us, our Lord; to You is the final return." Allah does not burden a soul beyond what it can bear. Pardon us, forgive us, and have mercy on us. You are our Protector — grant us victory over the disbelieving people.',
    reference: "Quran 2:285-286",
    count: 1,
  },
  {
    id: 'rh-4',
    category: 'Ratib al-Haddad',
    title: '4. La ilaha illa Llahu wahdahu',
    arabic: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'La ilaha illa Llahu wahdahu la sharika lahu, lahu l-mulku wa lahu l-hamdu yuhyi wa yumitu wa Huwa Ala kulli shayIn Qadir.',
    translation: 'There is no god but Allah, alone, without partner. To Him belongs the kingdom and all praise. He gives life and causes death, and He has power over all things.',
    reference: 'Bukhari & Muslim',
    count: 3,
  },
  {
    id: 'rh-5',
    category: 'Ratib al-Haddad',
    title: '5. Subhana Llahi wa l-hamdu',
    arabic: 'سُبْحَانَ اللهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللهُ وَاللهُ أَكْبَرُ',
    transliteration: 'Subhana Llahi wa l-hamdu li-Llahi wa la ilaha illa Llahu wa Llahu Akbar.',
    translation: 'Transcendent is Allah; all praise is for Allah; there is no god but Allah; Allah is the Greatest.',
    reference: 'Ratib al-Haddad',
    count: 3,
  },
  {
    id: 'rh-6',
    category: 'Ratib al-Haddad',
    title: '6. Subhana Llahi wa bi hamdihi',
    arabic: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ',
    transliteration: 'Subhana Llahi wa bi hamdihi, subhana Llahi l-Azim.',
    translation: 'Transcendent is Allah and praised be He; Transcendent is Allah, the Most Great.',
    reference: 'Bukhari & Muslim',
    count: 3,
  },
  {
    id: 'rh-7',
    category: 'Ratib al-Haddad',
    title: '7. Rabbana aghfir lana',
    arabic: 'رَبَّنَا اغْفِرْ لَنَا وَتُبْ عَلَيْنَا، إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
    transliteration: 'Rabbana aghfir lana wa tub Alayna, innaka Anta t-Tawwabu r-Rahim.',
    translation: 'Our Lord, forgive us and relent towards us; indeed You are the Relenting, the Merciful.',
    reference: 'Quran 2:128',
    count: 3,
  },
  {
    id: 'rh-8',
    category: 'Ratib al-Haddad',
    title: '8. Salawat upon the Prophet',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِ سَيِّدِنَا مُحَمَّدٍ وَسَلِّمْ',
    transliteration: 'Allahumma salli Ala Sayyidina Muhammadin wa Ala ali Sayyidina Muhammadin wa sallim.',
    translation: 'O Allah, send blessings and peace upon our master Muhammad and upon the family of our master Muhammad.',
    reference: 'Ratib al-Haddad',
    count: 3,
  },
  {
    id: 'rh-9',
    category: 'Ratib al-Haddad',
    title: '9. Surat al-Ikhlas',
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ اللَّهُ الصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ ﴿٤﴾',
    transliteration: 'Qul huwa Llahu ahad. Allahu s-Samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.',
    translation: 'Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is begotten. And there is none comparable to Him.',
    reference: "Quran 112",
    count: 3,
  },
  {
    id: 'rh-10',
    category: 'Ratib al-Haddad',
    title: '10. Surat al-Falaq',
    arabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ مِن شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ﴿٤﴾ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴿٥﴾',
    transliteration: 'Qul aAuthu bi-Rabbi l-falaq. Min sharri ma khalaq. Wa min sharri ghasiqin idha waqab. Wa min sharri n-naffathati fi l-uqad. Wa min sharri hasidin idha hasad.',
    translation: 'Say: I seek refuge in the Lord of the daybreak, from the evil of what He has created, and from the evil of darkness when it settles, and from the evil of those who blow on knots, and from the evil of an envier when he envies.',
    reference: "Quran 113",
    count: 3,
  },
  {
    id: 'rh-11',
    category: 'Ratib al-Haddad',
    title: '11. Surat al-Nas',
    arabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴿١﴾ مَلِكِ النَّاسِ ﴿٢﴾ إِلَٰهِ النَّاسِ ﴿٣﴾ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ﴿٤﴾ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ﴿٥﴾ مِنَ الْجِنَّةِ وَالنَّاسِ ﴿٦﴾',
    transliteration: 'Qul aAuthu bi-Rabbi n-nas. Maliki n-nas. Ilahi n-nas. Min sharri l-waswasi l-khannas. Alladhi yuwaswisu fi suduri n-nas. Mina l-jinnati wa n-nas.',
    translation: 'Say: I seek refuge in the Lord of mankind, the King of mankind, the God of mankind, from the evil of the retreating whisperer who whispers into the hearts of mankind — from among the jinn and mankind.',
    reference: "Quran 114",
    count: 3,
  },
  {
    id: 'rh-12',
    category: 'Ratib al-Haddad',
    title: '12. La ilaha illa Llahu x100',
    arabic: 'لَا إِلَهَ إِلَّا اللهُ',
    transliteration: 'La ilaha illa Llah.',
    translation: 'There is no god but Allah.',
    reference: 'Bukhari & Muslim',
    count: 100,
  },
  {
    id: 'rh-13',
    category: 'Ratib al-Haddad',
    title: '13. La ilaha illa Llahu Muhammad Rasulu Llah',
    arabic: 'لَا إِلَهَ إِلَّا اللهُ مُحَمَّدٌ رَسُولُ اللهِ ﷺ',
    transliteration: 'La ilaha illa Llahu Muhammadun Rasulu Llah, salla Llahu alayhi wa sallam.',
    translation: 'There is no god but Allah; Muhammad is the Messenger of Allah — may Allah bless him and grant him peace.',
    reference: 'Ratib al-Haddad',
    count: 1,
  },
  {
    id: 'rh-14',
    category: 'Ratib al-Haddad',
    title: '14. Seeking Forgiveness (Istighfar)',
    arabic: 'أَسْتَغْفِرُ اللهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfiru Llaha l-Azima lladhi la ilaha illa Huwa l-Hayyu l-Qayyumu wa atubu ilayh.',
    translation: 'I seek forgiveness from Allah the Most Great — there is no god but He, the Ever-Living, the Self-Subsisting — and I repent to Him.',
    reference: 'Ratib al-Haddad',
    count: 3,
  },
  {
    id: 'rh-15',
    category: 'Ratib al-Haddad',
    title: '15. Allahumma innaka Anta s-Salam',
    arabic: 'اللَّهُمَّ إِنَّكَ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    transliteration: 'Allahumma innaka Anta s-Salamu wa minka s-salam, tabarakta ya Dha l-Jalali wa l-Ikram.',
    translation: 'O Allah, You are Peace and from You comes peace. Blessed are You, O Possessor of Majesty and Honour.',
    reference: 'Muslim',
    count: 1,
  },
  {
    id: 'rh-16',
    category: 'Ratib al-Haddad',
    title: '16. Allahumma ajir-na min an-nar',
    arabic: 'اللَّهُمَّ أَجِرْنَا مِنَ النَّارِ\n\nيَا مُجِيرُ، يَا مُجِيرُ، يَا مُجِيرُ',
    transliteration: 'Allahumma ajir-na mina n-nar.\n\nYa Mujir, ya Mujir, ya Mujir.',
    translation: 'O Allah, protect us from the Fire.\n\nO Protector! O Protector! O Protector!',
    reference: 'Ratib al-Haddad',
    count: 3,
  },
  {
    id: 'rh-17',
    category: 'Ratib al-Haddad',
    title: '17. Salawat — Extended',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ عَبْدِكَ وَنَبِيِّكَ وَرَسُولِكَ النَّبِيِّ الْأُمِّيِّ وَعَلَى آلِهِ وَصَحْبِهِ وَسَلِّمْ',
    transliteration: 'Allahumma salli Ala Sayyidina Muhammadin abdika wa nabiyyika wa rasulika n-Nabiyyi l-Ummiyyi, wa Ala alihi wa sahbihi wa sallim.',
    translation: 'O Allah, send blessings upon our master Muhammad, Your servant, Prophet and Messenger, the unlettered Prophet, and upon his family and companions, and grant them peace.',
    reference: 'Ratib al-Haddad',
    count: 1,
  },
  {
    id: 'rh-18',
    category: 'Ratib al-Haddad',
    title: '18. Tasbih of Fatimah',
    arabic: 'سُبْحَانَ اللهِ ٣٣\nوَالْحَمْدُ لِلَّهِ ٣٣\nوَاللهُ أَكْبَرُ ٣٤',
    transliteration: 'SubhanAllah x33\nAlhamdulillah x33\nAllahu Akbar x34',
    translation: 'Glory be to Allah (x33)\nAll praise is to Allah (x33)\nAllah is the Greatest (x34)',
    reference: 'Bukhari 6318, Muslim 2727',
    count: 100,
  },
  {
    id: 'rh-19',
    category: 'Ratib al-Haddad',
    title: '19. Surah al-Hashr (last 3 ayat)',
    arabic:
      'هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ ۖ عَالِمُ الْغَيْبِ وَالشَّهَادَةِ ۖ هُوَ الرَّحْمَٰنُ الرَّحِيمُ ﴿٢٢﴾\n\n' +
      'هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ الْمَلِكُ الْقُدُّوسُ السَّلَامُ الْمُؤْمِنُ الْمُهَيْمِنُ الْعَزِيزُ الْجَبَّارُ الْمُتَكَبِّرُ ۚ سُبْحَانَ اللَّهِ عَمَّا يُشْرِكُونَ ﴿٢٣﴾\n\n' +
      'هُوَ اللَّهُ الْخَالِقُ الْبَارِئُ الْمُصَوِّرُ ۖ لَهُ الْأَسْمَاءُ الْحُسْنَىٰ ۚ يُسَبِّحُ لَهُ مَا فِي السَّمَاوَاتِ وَالْأَرْضِ ۖ وَهُوَ الْعَزِيزُ الْحَكِيمُ ﴿٢٤﴾',
    transliteration:
      'Huwa Llahu lladhi la ilaha illa huw. Alimu l-ghaybi wa sh-shahadah. Huwa r-Rahmanu r-Rahim.\n\nHuwa Llahu lladhi la ilaha illa huwa l-Maliku l-Quddusi s-Salamu l-Muuminu l-Muhaymin l-Azizu l-Jabbaru l-Mutakabbir. SubhanAllahi Amma yushrikun.\n\nHuwa Llahu l-Khaliqu l-Bariuu l-Musawwir. Lahu l-asmauu l-husna. Yusabbihu lahu ma fi s-samawati wa l-ard. Wa Huwa l-Azizu l-Hakim.',
    translation:
      'He is Allah — there is no god but He — the Knower of the unseen and the witnessed. He is the Most Gracious, the Most Merciful. He is Allah — the King, the Most Holy, the Source of Peace, the Overseer, the Almighty, the Compeller, the Supreme. He is Allah: the Creator, the Originator, the Fashioner. To Him belong the most beautiful names. He is the Almighty, the Wise.',
    reference: "Quran 59:22-24",
    count: 1,
  },
  {
    id: 'rh-20',
    category: 'Ratib al-Haddad',
    title: '20. Rabbana la tuzigh qulubana',
    arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً ۚ إِنَّكَ أَنتَ الْوَهَّابُ',
    transliteration: 'Rabbana la tuzigh qulubana baAda idh hadaytana wa hab lana min ladunka rahmah. Innaka Anta l-Wahhab.',
    translation: 'Our Lord, do not let our hearts deviate after You have guided us, and grant us from Yourself mercy. Indeed You are the Bestower.',
    reference: "Quran 3:8",
    count: 3,
  },
  {
    id: 'rh-21',
    category: 'Ratib al-Haddad',
    title: '21. Rabbana atina fi d-dunya hasanah',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    transliteration: 'Rabbana atina fi d-dunya hasanatan wa fi l-akhirati hasanatan wa qina Adhaba n-nar.',
    translation: 'Our Lord, grant us good in this world and good in the Hereafter, and protect us from the torment of the Fire.',
    reference: "Quran 2:201",
    count: 3,
  },
  {
    id: 'rh-22',
    category: 'Ratib al-Haddad',
    title: '22. Closing Salawat & Al-Hamdulillah',
    arabic:
      'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِ سَيِّدِنَا مُحَمَّدٍ وَبَارِكْ وَسَلِّمْ عَلَيْهِ وَعَلَيْهِمْ أَجْمَعِينَ\n\n' +
      'وَالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    transliteration:
      'Allahumma salli Ala Sayyidina Muhammadin wa Ala ali Sayyidina Muhammadin wa barik wa sallim Alayhi wa Alayhim ajmaIn.\n\nWa l-hamdu li Llahi Rabbi l-Aalamin.',
    translation:
      'O Allah, send blessings, abundant blessings and peace upon our master Muhammad and upon all the family of our master Muhammad.\n\nAnd all praise is due to Allah, Lord of all worlds.',
    reference: 'Ratib al-Haddad — closing',
    count: 3,
  },
];

export const DUAS: Dua[] = [
  {
    id: 'gen-1',
    category: 'Morning & Evening',
    title: 'Morning Remembrance',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
    transliteration: "Asbahna wa asbahal-mulku lillah, wal-hamdu lillah",
    translation: 'We have entered the morning and the kingdom belongs to Allah, and praise is to Allah.',
    reference: 'Abu Dawud 5078',
  },
  {
    id: 'gen-2',
    category: 'Morning & Evening',
    title: 'Evening Remembrance',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
    transliteration: "Amsayna wa amsal-mulku lillah, wal-hamdu lillah",
    translation: 'We have entered the evening and the kingdom belongs to Allah, and praise is to Allah.',
    reference: 'Abu Dawud 5076',
  },
  {
    id: 'gen-3',
    category: 'Before & After Prayer',
    title: 'Before Prayer',
    arabic: 'اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ',
    transliteration: "Allahumma-j'alni minat-tawwabeena waj-'alni minal-mutatahhireen",
    translation: 'O Allah, make me among those who repent and make me among those who purify themselves.',
    reference: 'Tirmidhi 55',
  },
  {
    id: 'gen-4',
    category: 'Before & After Prayer',
    title: 'After Prayer',
    arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَاللَّهُ أَكْبَرُ',
    transliteration: 'SubhanAllah, Alhamdulillah, Allahu Akbar',
    translation: 'Glory be to Allah, praise be to Allah, Allah is the Greatest.',
    reference: 'Muslim 597',
  },
  {
    id: 'gen-5',
    category: 'Daily Life',
    title: 'Before Eating',
    arabic: 'بِسْمِ اللَّهِ وَعَلَى بَرَكَةِ اللَّهِ',
    transliteration: 'Bismillahi wa ala barakatillah',
    translation: 'In the name of Allah and with the blessings of Allah.',
    reference: 'Abu Dawud 3767',
  },
  {
    id: 'gen-6',
    category: 'Daily Life',
    title: 'After Eating',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
    transliteration: 'Alhamdulillahil-ladhi at-amana wasaqana waja-alana muslimeen',
    translation: 'All praise is to Allah who fed us, gave us drink and made us Muslims.',
    reference: 'Abu Dawud 3850',
  },
  {
    id: 'gen-7',
    category: 'Protection',
    title: 'Seeking Refuge (Morning)',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wala fis-sama'i wahuwa as-sami'ul-'aleem",
    translation: 'In the name of Allah with whose name nothing can harm in the earth or heaven, and He is the All-Hearing, All-Knowing.',
    reference: 'Abu Dawud 5088',
  },
  {
    id: 'gen-8',
    category: 'Forgiveness',
    title: 'Master Dua of Forgiveness',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ',
    transliteration: "Allahumma anta rabbi la ilaha illa anta, khalaqtani wa ana abduk",
    translation: 'O Allah, You are my Lord, there is no god but You, You created me and I am Your servant.',
    reference: 'Bukhari 6306',
  },
];

export const SURAHS: Surah[] = [
  { id: 1, name: 'Al-Fatihah', arabicName: 'الفاتحة', verses: 7, revelation: 'Meccan' },
  { id: 2, name: 'Al-Baqarah', arabicName: 'البقرة', verses: 286, revelation: 'Medinan' },
  { id: 3, name: 'Ali Imran', arabicName: 'آل عمران', verses: 200, revelation: 'Medinan' },
  { id: 36, name: 'Ya-Sin', arabicName: 'يس', verses: 83, revelation: 'Meccan' },
  { id: 55, name: 'Ar-Rahman', arabicName: 'الرحمان', verses: 78, revelation: 'Medinan' },
  { id: 67, name: 'Al-Mulk', arabicName: 'الملك', verses: 30, revelation: 'Meccan' },
  { id: 112, name: 'Al-Ikhlas', arabicName: 'الإخلاص', verses: 4, revelation: 'Meccan' },
  { id: 113, name: 'Al-Falaq', arabicName: 'الفلق', verses: 5, revelation: 'Meccan' },
  { id: 114, name: 'An-Nas', arabicName: 'الناس', verses: 6, revelation: 'Meccan' },
];

export interface HowToStep {
  step: number;
  title: string;
  detail: string;
  note?: string;
}

export interface HowToSection {
  heading: string;
  steps: HowToStep[];
}

export interface HowToGuide {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  intro: string;
  sections: HowToSection[];
  notes?: string[];
}

export const HOW_TO_GUIDES: HowToGuide[] = [
  {
    id: 'janazah',
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
          { step: 8, title: 'Adult (Male)', detail: '\u0627\u0644\u0644\u0651\u064e\u0647\u064f\u0645\u0651\u064e \u0627\u063a\u0652\u0641\u0650\u0631\u0652 \u0644\u064e\u0647\u064f \u0648\u064e\u0627\u0631\u0652\u062d\u064e\u0645\u0652\u0647\u064f \u0648\u064e\u0639\u064e\u0627\u0641\u0650\u0647\u0650 \u0648\u064e\u0627\u0639\u0652\u0641\u064f \u0639\u064e\u0646\u0652\u0647\u064f\nAllahummaghfir lahu warhamhu wa Aafih wa Afu Anhu\nO Allah, forgive him, have mercy on him, grant him wellbeing and pardon him.' },
          { step: 9, title: 'Adult (Female)', detail: "Same du'a replacing masculine pronouns with feminine: Allahummaghfir LAHA warhamHA wa AafiHA wa Afu AnHA." },
          { step: 10, title: 'Child Du\'a', detail: '\u0627\u0644\u0644\u0651\u064e\u0647\u064f\u0645\u0651\u064e \u0627\u062c\u0652\u0639\u064e\u0644\u0652\u0647\u064f \u0644\u064e\u0646\u064e\u0627 \u0641\u064e\u0631\u064e\u0637\u064b\u0627 \u0648\u064e\u0627\u062c\u0652\u0639\u064e\u0644\u0652\u0647\u064f \u0644\u064e\u0646\u064e\u0627 \u0623\u062c\u0652\u0631\u064b\u0627 \u0648\u064e\u0630\u064f\u062e\u0652\u0631\u064b\u0627\nAllahumma-jAlhu lana faratan wa-jAlhu lana ajran wa dhukhran\nO Allah, make him/her a forerunner for us and a source of reward.' },
        ],
      },
      {
        heading: '\uD83D\uDEB6 The Funeral Procession \u2014 Sunnahs',
        steps: [
          {
            step: 11,
            title: 'Walk behind the bier, not in front',
            detail: 'It is Sunnah to walk BEHIND the bier (janazah). Walking in front is permitted but against the Sunnah according to the Hanafi school.\n\nThe Prophet \uFDFA said: "Walk behind the janazah, for it reminds you of death and the Hereafter."',
            note: 'Hanafi position: walking behind is Sunnah; walking in front is permitted but less virtuous.',
          },
          {
            step: 12,
            title: 'Hurry with a dignified pace',
            detail: 'The Prophet \uFDFA instructed: "Hasten with the janazah \u2014 if the deceased was righteous, you are bringing him to goodness; if otherwise, you are placing an evil away from your necks."\n\nThis means walking briskly but not running \u2014 with dignity and purpose.',
            note: '[Bukhari 1315, Muslim 944]',
          },
          {
            step: 13,
            title: 'Those on foot walk; those in vehicles follow behind',
            detail: 'Those on foot walk near or behind the bier. Those travelling by vehicle should position themselves behind the procession, not driving ahead of the body.',
          },
          {
            step: 14,
            title: 'Recite dhikr quietly \u2014 not aloud as a group',
            detail: 'It is recommended to reflect on death and the Hereafter during the procession. Reciting dhikr quietly in the heart or under the breath is good.\n\n\u26A0\uFE0F Calling out dhikr or Quran ALOUD as a group chant during the procession is NOT established in the Sunnah and is disliked (makruh) in the Hanafi school.',
          },
          {
            step: 15,
            title: 'Do NOT sit until the bier is set down',
            detail: 'The Prophet \uFDFA commanded: "When you see a janazah, stand up. Whoever follows it, let him not sit until it is placed on the ground."\n\nIf you are accompanying the bier, do NOT sit until it has been set down \u2014 either for the prayer or at the graveside.',
            note: '[Bukhari 1307, Muslim 959]',
          },
          {
            step: 16,
            title: 'Non-Muslims present: remain respectful',
            detail: 'The Prophet \uFDFA once stood for the janazah of a Jewish man passing by. When asked, he said: "Was it not a soul?" [Bukhari 1312].\n\nAll human life is honoured. Non-Muslim attendees should maintain silence and respectful behaviour throughout.',
          },
        ],
      },
      {
        heading: '\u26B0\uFE0F At the Graveside \u2014 Sunnahs & Duas',
        steps: [
          {
            step: 17,
            title: 'Stand at the graveside respectfully',
            detail: 'Stand facing the Qiblah at the graveside. Lower your gaze. Reflect on the reality of death. The Prophet \uFDFA would stand at graves and remind the Companions of the Hereafter.',
          },
          {
            step: 18,
            title: 'Cast three handfuls of earth',
            detail: 'It is Sunnah for those present to cast three handfuls of earth into the grave from the head-end, saying after each handful:\n\n\u2460 "Minha khalaqnakum" (From it We created you)\n\u2461 "Wa fiha nuAidukum" (And into it We return you)\n\u2462 "Wa minha nukhrijukum taratan ukhra" (And from it We will bring you out once more)',
            note: '[Quran 20:55] \u2014 Ibn Majah, Abu Dawud; Hanafi scholars affirm this practice.',
          },
          {
            step: 19,
            title: 'Dua after burial \u2014 Talqin',
            detail: 'After the burial is complete and people are about to leave, the Imam (or a knowledgeable person) may make dua for the deceased aloud.\n\nThe Prophet \uFDFA said: "Seek forgiveness for your brother and ask for him to be made firm, for he is now being questioned." [Abu Dawud 3221]\n\nIt is Sunnah to spend a moment in dua before dispersing \u2014 do not rush away immediately after the burial.',
          },
          {
            step: 20,
            title: 'Dua to recite at the graveside',
            detail: '\u0627\u0644\u0644\u064E\u0651\u0647\u064F\u0645\u064E\u0651 \u0627\u063A\u0652\u0641\u0650\u0631\u0652 \u0644\u064E\u0647\u064F \u0648\u064E\u0627\u0631\u0652\u062D\u064E\u0645\u0652\u0647\u064F \u0648\u064E\u0639\u064E\u0627\u0641\u0650\u0647\u0650 \u0648\u064E\u0627\u0639\u0652\u0641\u064F \u0639\u064E\u0646\u0652\u0647\u064F\n\nAllahummaghfir lahu warhamhu wa Aafihi wa Afu Anhu.\n\n"O Allah, forgive him, have mercy on him, grant him wellbeing, and pardon him."\n\nFor a female: replace lahu/hu with laha/ha throughout.',
          },
          {
            step: 21,
            title: 'Placing a green branch on the grave',
            detail: 'The Prophet \uFDFA placed a green date-palm branch on a grave and said: "Perhaps it will reduce their punishment as long as it remains fresh." [Bukhari 1361]\n\nThis is a recognised Sunnah. Placing fresh flowers or greenery on the grave is therefore permissible and carries this Sunnah basis.',
          },
          {
            step: 22,
            title: 'Avoid sitting or walking on graves',
            detail: 'The Prophet \uFDFA said: "It is better for one of you to sit on burning coal until his clothes burn than to sit on a grave." [Muslim 971]\n\nDo not sit, lean, stand unnecessarily on, or walk over graves without need. Treat the graveyard with full respect at all times.',
          },
        ],
      },
      {
        heading: '\uD83E\uDD1D Condolence Etiquette (Ta\'ziyah)',
        steps: [
          {
            step: 23,
            title: 'What is Ta\'ziyah?',
            detail: 'Ta\'ziyah means offering condolences to the family of the deceased \u2014 comforting them, reminding them of patience (sabr), and making dua for the deceased and the family.\n\nThis is a communal Sunnah (Sunnah Muakkadah) and should be done once. Repeating it multiple times with the same person is disliked.',
          },
          {
            step: 24,
            title: 'What to say when giving condolences',
            detail: 'The Prophet \uFDFA taught us to say:\n\n\u0625\u0650\u0646\u064E\u0651 \u0644\u0650\u0644\u064E\u0651\u0647\u0650 \u0645\u064E\u0627 \u0623\u064E\u062E\u064E\u0630\u064E \u0648\u064E\u0644\u064E\u0647\u064F \u0645\u064E\u0627 \u0623\u064E\u0639\u0652\u0637\u064E\u0649 \u0648\u064E\u0643\u064F\u0644\u064F\u0651 \u0634\u064E\u064A\u0652\u0621\u064D \u0639\u0650\u0646\u0652\u062F\u064E\u0647\u064F \u0628\u0650\u0623\u064E\u062C\u064E\u0644\u064D \u0645\u064F\u0633\u064E\u0645\u064B\u0651\u0649\n\nInna lillahi ma akhada wa lahu ma aAta wa kullu shayIn indahu bi-ajalin musamma.\n\n"Verily to Allah belongs what He took, and to Him belongs what He gave. Everything with Him is by an appointed term."\n\nThen advise them: "So be patient and expect Allah\'s reward." [Bukhari & Muslim]',
            note: 'You may say this in English or Arabic \u2014 the message is what matters.',
          },
          {
            step: 25,
            title: 'Inna lillahi wa inna ilayhi raji\'un',
            detail: '\u0625\u0650\u0646\u064E\u0651\u0627 \u0644\u0650\u0644\u064E\u0651\u0647\u0650 \u0648\u064E\u0625\u0650\u0646\u064E\u0651\u0627 \u0625\u0650\u0644\u064E\u064A\u0652\u0647\u0650 \u0631\u064E\u0627\u062C\u0650\u0639\u064F\u0648\u0646\u064E\n\nInna lillahi wa inna ilayhi raji\'un.\n\n"Indeed we belong to Allah, and indeed to Him we shall return."\n\n[Quran 2:156]\n\nSay this upon hearing of a death. Encourage the family to say it too \u2014 Allah promises reward and mercy for those who say it with sincerity.',
          },
          {
            step: 26,
            title: 'When to visit for condolences',
            detail: 'The period of ta\'ziyah is THREE days from the time of death. It is best to visit within this window.\n\nAvoid visiting BEFORE the burial \u2014 the family are occupied with preparations. Visit after the janazah has been performed.\n\nIf you live far away and could not attend, it is permissible to phone or message \u2014 the intention and dua are what count.',
          },
          {
            step: 27,
            title: 'Preparing food for the bereaved family',
            detail: 'It is Sunnah for NEIGHBOURS and RELATIVES to prepare and send food to the bereaved family for the day of the death and one day after.\n\nThe Prophet \uFDFA said: "Prepare food for the family of Ja\'far, for something has come upon them that has preoccupied them." [Abu Dawud 3132; Ibn Majah 1610]\n\n\u26A0\uFE0F The family of the deceased should NOT be the ones cooking and feeding visitors \u2014 this is burdensome and against the Sunnah.',
          },
          {
            step: 28,
            title: 'Period of mourning',
            detail: 'General mourning for a Muslim: THREE days maximum, according to the Sunnah.\n\nFor a widow: mourning her husband is FOUR months and ten days (the Iddah period). During this time she stays in her home as much as possible.\n\nExcessive wailing, beating the chest or face, tearing clothing, and loudly lamenting are all prohibited in Islam.',
            note: 'Shedding tears out of grief is natural and permitted \u2014 the Prophet \uFDFA himself wept at the death of his son Ibrahim.',
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
      'Walk behind the bier, not in front \u2014 this is the established Sunnah.',
      'Do not sit until the bier has been set down on the ground.',
      "Offer condolences (ta'ziyah) once within three days of the death.",
      'Neighbours and relatives should provide food for the bereaved family \u2014 not the family themselves.',
    ],
  },
  {
    id: 'janazah-2',
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
          { step: 6, title: '3rd Takbir', detail: 'Say "Allahu Akbar" (no hand raise). Recite the du\'a for the deceased (see below).', note: "Du'a: Allahummaghfir lahu warhamhu wa Aafih wa Afu Anhu wa akrim nuzulahu wa wassi' mudkhalahu..." },
          { step: 7, title: '4th Takbir', detail: 'Say "Allahu Akbar" (no hand raise). Pause briefly, then make ONE Taslim to the RIGHT only: Assalamu Alaykum wa Rahmatullah.' },
        ],
      },
      {
        heading: "Du'a for the Deceased (3rd Takbir)",
        steps: [
          { step: 8, title: 'Adult (Male)', detail: '\u0627\u0644\u0644\u0651\u064e\u0647\u064f\u0645\u0651\u064e \u0627\u063a\u0652\u0641\u0650\u0631\u0652 \u0644\u064e\u0647\u064f \u0648\u064e\u0627\u0631\u0652\u062d\u064e\u0645\u0652\u0647\u064f \u0648\u064e\u0639\u064e\u0627\u0641\u0650\u0647\u0650 \u0648\u064e\u0627\u0639\u0652\u0641\u064f \u0639\u064e\u0646\u0652\u0647\u064f\nAllahummaghfir lahu warhamhu wa Aafih wa Afu Anhu\nO Allah, forgive him, have mercy on him, grant him wellbeing and pardon him.' },
          { step: 9, title: 'Adult (Female)', detail: 'Same du\'a replacing masculine pronouns with feminine: Allahummaghfir LAHA warhamHA wa AafiHA wa Afu AnHA.' },
          { step: 10, title: 'Child Du\'a', detail: '\u0627\u0644\u0644\u0651\u064e\u0647\u064f\u0645\u0651\u064e \u0627\u062c\u0652\u0639\u064e\u0644\u0652\u0647\u064f \u0644\u064e\u0646\u064e\u0627 \u0641\u064e\u0631\u064e\u0637\u064b\u0627 \u0648\u064e\u0627\u062c\u0652\u0639\u064e\u0644\u0652\u0647\u064f \u0644\u064e\u0646\u064e\u0627 \u0623\u062c\u0652\u0631\u064b\u0627 \u0648\u064e\u0630\u064f\u062e\u0652\u0631\u064b\u0627\nAllahumma-jAlhu lana faratan wa-jAlhu lana ajran wa dhukhran\nO Allah, make him/her a forerunner for us and a source of reward.' },
        ],
      },
      {
        heading: '🚶 The Funeral Procession — Sunnahs',
        steps: [
          {
            step: 11,
            title: 'Walk behind the bier, not in front',
            detail: 'It is Sunnah to walk BEHIND the bier (janazah). Walking in front is permitted but against the Sunnah according to the Hanafi school.\n\nThe Prophet ﷺ said: "Walk behind the janazah, for it reminds you of death and the Hereafter."',
            note: 'Hanafi position: walking behind is Sunnah; walking in front is permitted but less virtuous.',
          },
          {
            step: 12,
            title: 'Hurry with a dignified pace',
            detail: 'The Prophet ﷺ instructed: "Hasten with the janazah — if the deceased was righteous, you are bringing him to goodness; if otherwise, you are placing an evil away from your necks."\n\nThis means walking briskly but not running — with dignity and purpose.',
            note: '[Bukhari 1315, Muslim 944]',
          },
          {
            step: 13,
            title: 'Those on foot walk; those in vehicles follow behind',
            detail: 'Those on foot walk near or behind the bier. Those travelling by vehicle should position themselves behind the procession, not driving ahead of the body.',
          },
          {
            step: 14,
            title: 'Recite dhikr quietly — not aloud as a group',
            detail: 'It is recommended to reflect on death and the Hereafter during the procession. Reciting dhikr quietly in the heart or under the breath is good.\n\n⚠️ Calling out dhikr or Quran ALOUD as a group chant during the procession is NOT established in the Sunnah and is disliked (makruh) in the Hanafi school.',
          },
          {
            step: 15,
            title: 'Do NOT sit until the bier is set down',
            detail: 'The Prophet ﷺ commanded: "When you see a janazah, stand up. Whoever follows it, let him not sit until it is placed on the ground."\n\nIf you are accompanying the bier, do NOT sit until it has been set down — either for the prayer or at the graveside.',
            note: '[Bukhari 1307, Muslim 959]',
          },
          {
            step: 16,
            title: 'Non-Muslims present: remain respectful',
            detail: 'The Prophet ﷺ once stood for the janazah of a Jewish man passing by. When asked, he said: "Was it not a soul?" [Bukhari 1312].\n\nAll human life is honoured. Non-Muslim attendees should maintain silence and respectful behaviour throughout.',
          },
        ],
      },
      {
        heading: '⚰️ At the Graveside — Sunnahs & Duas',
        steps: [
          {
            step: 17,
            title: 'Stand at the graveside respectfully',
            detail: 'Stand facing the Qiblah at the graveside. Lower your gaze. Reflect on the reality of death. The Prophet ﷺ would stand at graves and remind the Companions of the Hereafter.',
          },
          {
            step: 18,
            title: 'Cast three handfuls of earth',
            detail: 'It is Sunnah for those present to cast three handfuls of earth into the grave from the head-end, saying after each handful:\n\n① "Minha khalaqnakum" (From it We created you)\n② "Wa fiha nuAidukum" (And into it We return you)\n③ "Wa minha nukhrijukum taratan ukhra" (And from it We will bring you out once more)',
            note: '[Quran 20:55] — Ibn Majah, Abu Dawud; Hanafi scholars affirm this practice.',
          },
          {
            step: 19,
            title: "Dua after burial — Talqin",
            detail: 'After the burial is complete and people are about to leave, the Imam (or a knowledgeable person) may make dua for the deceased aloud.\n\nThe Prophet ﷺ said: "Seek forgiveness for your brother and ask for him to be made firm, for he is now being questioned." [Abu Dawud 3221]\n\nIt is Sunnah to spend a moment in dua before dispersing — do not rush away immediately after the burial.',
          },
          {
            step: 20,
            title: 'Dua to recite at the graveside',
            detail: 'اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ\n\nAllahummaghfir lahu warhamhu wa Aafihi wa Afu Anhu.\n\n"O Allah, forgive him, have mercy on him, grant him wellbeing, and pardon him."\n\nFor a female: replace lahu/hu with laha/ha throughout.',
          },
          {
            step: 21,
            title: 'Placing a green branch on the grave',
            detail: 'The Prophet ﷺ placed a green date-palm branch on a grave and said: "Perhaps it will reduce their punishment as long as it remains fresh." [Bukhari 1361]\n\nThis is a recognised Sunnah. Placing fresh flowers or greenery on the grave is therefore permissible and carries this Sunnah basis.',
          },
          {
            step: 22,
            title: 'Avoid sitting or walking on graves',
            detail: 'The Prophet ﷺ said: "It is better for one of you to sit on burning coal until his clothes burn than to sit on a grave." [Muslim 971]\n\nDo not sit, lean, stand unnecessarily on, or walk over graves without need. Treat the graveyard with full respect at all times.',
          },
        ],
      },
      {
        heading: '🤝 Condolence Etiquette (Ta\'ziyah)',
        steps: [
          {
            step: 23,
            title: 'What is Ta\'ziyah?',
            detail: 'Ta\'ziyah means offering condolences to the family of the deceased — comforting them, reminding them of patience (sabr), and making dua for the deceased and the family.\n\nThis is a communal Sunnah (Sunnah Muakkadah) and should be done once. Repeating it multiple times with the same person is disliked.',
          },
          {
            step: 24,
            title: 'What to say when giving condolences',
            detail: 'The Prophet ﷺ taught us to say:\n\nإِنَّ لِلَّهِ مَا أَخَذَ وَلَهُ مَا أَعْطَى وَكُلُّ شَيْءٍ عِنْدَهُ بِأَجَلٍ مُسَمًّى\n\nInna lillahi ma akhada wa lahu ma aAta wa kullu shayIn indahu bi-ajalin musamma.\n\n"Verily to Allah belongs what He took, and to Him belongs what He gave. Everything with Him is by an appointed term."\n\nThen advise them: "So be patient and expect Allah\'s reward." [Bukhari & Muslim]',
            note: 'You may say this in English or Arabic — the message is what matters.',
          },
          {
            step: 25,
            title: 'Inna lillahi wa inna ilayhi raji\'un',
            detail: 'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ\n\nInna lillahi wa inna ilayhi raji\'un.\n\n"Indeed we belong to Allah, and indeed to Him we shall return."\n\n[Quran 2:156]\n\nSay this upon hearing of a death. Encourage the family to say it too — Allah promises reward and mercy for those who say it with sincerity.',
          },
          {
            step: 26,
            title: 'When to visit for condolences',
            detail: 'The period of ta\'ziyah is THREE days from the time of death. It is best to visit within this window.\n\nAvoid visiting BEFORE the burial — the family are occupied with preparations. Visit after the janazah has been performed.\n\nIf you live far away and could not attend, it is permissible to phone or message — the intention and dua are what count.',
          },
          {
            step: 27,
            title: 'Preparing food for the bereaved family',
            detail: 'It is Sunnah for NEIGHBOURS and RELATIVES to prepare and send food to the bereaved family for the day of the death and one day after.\n\nThe Prophet ﷺ said: "Prepare food for the family of Ja\'far, for something has come upon them that has preoccupied them." [Abu Dawud 3132; Ibn Majah 1610]\n\n⚠️ The family of the deceased should NOT be the ones cooking and feeding visitors — this is burdensome and against the Sunnah.',
          },
          {
            step: 28,
            title: 'Period of mourning',
            detail: 'General mourning for a Muslim: THREE days maximum, according to the Sunnah.\n\nFor a widow: mourning her husband is FOUR months and ten days (the Iddah period). During this time she stays in her home as much as possible.\n\nExcessive wailing, beating the chest or face, tearing clothing, and loudly lamenting are all prohibited in Islam.',
            note: 'Shedding tears out of grief is natural and permitted — the Prophet ﷺ himself wept at the death of his son Ibrahim.',
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
      'Walk behind the bier, not in front — this is the established Sunnah.',
      'Do not sit until the bier has been set down on the ground.',
      'Offer condolences (ta\'ziyah) once within three days of the death.',
      'Neighbours and relatives should provide food for the bereaved family — not the family themselves.',
    ],
  },
  {
    id: 'eid',
    title: 'Salat al-Eid',
    subtitle: 'Eid ul-Fitr & Eid ul-Adha · Hanafi Fiqh',
    icon: 'wb-sunny',
    color: '#4FE948',
    intro: 'Salat al-Eid is Wajib (necessary/obligatory) for sane, adult men who are residents and in good health — the same people who must attend Jumuah. Women, children, travellers, and the sick are not obliged but receive reward for attending. The prayer is 2 rakaats with 6 extra Takbirs. It begins 20 minutes after Sunrise and ends at Zawaal (Dhuhr time).',
    sections: [
      {
        heading: '⏰ Prayer Times — When to Pray',
        steps: [
          {
            step: 1,
            title: 'Eid ul-Fitr — When?',
            detail: 'Start time: 20 minutes after Sunrise.\nEnd time: When Dhuhr (Zawaal) time enters.\n\nIt is recommended to delay the start slightly to allow more people to gather.\n\nOnly valid on 1st Shawwal. With a valid excuse, may be prayed on 2nd Shawwal. Cannot be done after that.',
            note: 'Hadith: "Hasten Eid al-Adha and delay Eid al-Fitr." [al-Bayhaqi]',
          },
          {
            step: 2,
            title: 'Eid ul-Adha — When?',
            detail: 'Start time: 20 minutes after Sunrise.\nEnd time: When Dhuhr (Zawaal) time enters.\n\nIt is recommended to start early (unlike Eid ul-Fitr).\n\nValid on 10th Dhul Hijjah. Can be delayed to 11th or 12th with valid excuse. Cannot be done after the 12th.',
          },
        ],
      },
      {
        heading: '🌙 Before Eid Salah',
        steps: [
          {
            step: 3,
            title: 'Ghusl (full bath) and best clothes',
            detail: 'Have a full bath (ghusl) and wear your best, cleanest clothes. Apply perfume (for men). These are strong Sunnahs for both Eids.',
          },
          {
            step: 4,
            title: 'Walk to the Eid prayer if possible',
            detail: 'It is Sunnah to walk to the Eid prayer ground. The Prophet \ufdfa would walk, and each step is a reward. Return on foot as well if able.',
          },
          {
            step: 5,
            title: '🍬 Eid ul-Fitr: Pay Zakat al-Fitr (Fitrana) FIRST',
            detail: 'Before going to the Eid prayer, ensure Zakat al-Fitr — also called Fitrana — has been paid for yourself and everyone you are responsible for (spouse, children).\n\nThis MUST be paid before the prayer, not after.\n\nThe Fitrana amount is announced by Jami\u2019 Masjid Noorani each year — please check with the Masjid for the current amount.',
            note: 'The Imam will remind the community of Fitrana rulings in the Eid ul-Fitr Khutbah.',
          },
          {
            step: 6,
            title: '🍬 Eid ul-Fitr: Eat an odd number of dates before leaving',
            detail: 'Eat 1, 3, 5 or 7 dates before leaving for the Eid al-Fitr prayer. This is a confirmed Sunnah of the Prophet \ufdfa.',
          },
          {
            step: 7,
            title: '🐑 Eid ul-Adha: Do NOT eat before the prayer',
            detail: 'On Eid ul-Adha, it is Sunnah NOT to eat before going to the prayer. Wait and eat from your Qurbani (sacrifice) meat after the prayer.',
          },
          {
            step: 8,
            title: 'Recite Takbirs on the way to the prayer',
            detail: 'Allahu Akbar, Allahu Akbar, La ilaha illa Llahu wa Llahu Akbar, Allahu Akbar wa Lillahi l-hamd.\n\nEid ul-Fitr: recite quietly on the way.\nEid ul-Adha: men recite aloud, women quietly.',
          },
          {
            step: 9,
            title: 'Greet people with Eid Mubarak',
            detail: 'It is Sunnah to congratulate one another on Eid. The Companions would say:\n\n"Taqabbal Allahu minna wa minkum"\n(May Allah accept from us and from you)\n\nGreet family, friends, and fellow worshippers warmly.',
          },
          {
            step: 10,
            title: 'Go one way, return another',
            detail: 'It is Sunnah to take a different route home from the one you used to reach the Eid prayer. The Prophet \ufdfa did this consistently.',
          },
          {
            step: 11,
            title: 'No Adhan and no Iqamah',
            detail: 'There is NO Adhan (call to prayer) and NO Iqamah for Eid prayer. The prayer begins straight away with the opening Takbir.',
          },
        ],
      },
      {
        heading: '⛔ What Is Disliked on Eid Day',
        steps: [
          {
            step: 10,
            title: 'No nafl prayers before the Eid prayer',
            detail: 'It is disliked (makruh) to perform optional (nafl) prayers BEFORE the Eid prayer — whether in the prayer area or at home.\n\nAfter the Eid prayer: nafl in the prayer area is disliked, but praying them at home is NOT disliked.',
          },
          {
            step: 11,
            title: 'Do NOT fast on Eid day',
            detail: 'Fasting on Eid al-Fitr or Eid al-Adha is prohibitively disliked (makruh tahriman) — it is sinful. If you are fasting, you MUST break your fast immediately.',
            note: 'This applies to BOTH Eids. Breaking the fast is obligatory on these days.',
          },
        ],
      },
      {
        heading: '🕌 How to Pray — 1st Rakaat',
        steps: [
          {
            step: 12,
            title: 'Make your intention (Niyyah)',
            detail: 'Say in your heart: "I intend to pray 2 rakaats of Wajib Eid prayer, following the Imam, for the sake of Allah."\n\nYou can quietly say it with your lips too.',
          },
          {
            step: 13,
            title: 'Opening Takbir',
            detail: 'Raise both hands to your earlobes and say "Allahu Akbar".\nThen fold your hands on your chest (right hand over left).\nRecite the opening dua (Thana: Subhanakallahumma...) quietly to yourself.',
          },
          {
            step: 14,
            title: '3 Extra Takbirs — WAJIB (obligatory)',
            detail: 'The Imam says THREE extra Takbirs one after another.\n\n⚠️ These extra Takbirs are WAJIB (obligatory) in the Hanafi school — not optional.\n\nFor EACH Takbir:\n① Raise both hands to earlobes\n② Say "Allahu Akbar"\n③ Let your hands DROP to your SIDES\n④ Pause briefly\n\nAfter the 3rd Takbir: FOLD your hands on your chest.',
            note: 'Remember: hands DROP between each Takbir. Only FOLD after the 3rd one.',
          },
          {
            step: 15,
            title: 'Imam recites Quran aloud',
            detail: 'The Imam recites Surah al-Fatihah then another Surah aloud. It is recommended to recite Surah al-A\'la (Chapter 87).\n\nYou listen quietly.',
          },
          {
            step: 16,
            title: 'Complete the rakaat as normal',
            detail: 'Ruku (bow) → stand → 2 Sujuds (prostrate) → sit briefly → stand for 2nd rakaat.\n\nDo NOT raise your hands when going into Ruku.',
          },
        ],
      },
      {
        heading: '🕌 How to Pray — 2nd Rakaat',
        steps: [
          {
            step: 17,
            title: 'Quran is recited FIRST (before extra Takbirs)',
            detail: 'In the 2nd rakaat, the Imam recites Surah al-Fatihah + another Surah FIRST. It is recommended to recite Surah al-Ghashiyah (Chapter 88).\n\nYou listen quietly.',
          },
          {
            step: 18,
            title: '3 Extra Takbirs THEN Ruku — WAJIB',
            detail: 'After the Quran recitation, the Imam says THREE extra Takbirs (these are also Wajib):\n\nFor EACH: raise hands → say Allahu Akbar → drop hands to sides → pause.\n\nThen a 4th Takbir to go into Ruku (without raising hands).',
            note: 'So you hear 4 Takbirs in a row at this point: 3 extra (Wajib) + 1 for Ruku.',
          },
          {
            step: 19,
            title: 'Finish the prayer',
            detail: 'Ruku → stand → 2 Sujuds → sit for Tashahhud → send Salawat on the Prophet \ufdfa → make a short dua → say Salam to the right then left:\n"Assalamu Alaykum wa Rahmatullah"',
          },
        ],
      },
      {
        heading: '❓ What If You Miss a Takbir?',
        steps: [
          {
            step: 20,
            title: 'You missed some extra Takbirs in 1st rakaat',
            detail: 'If the Imam has said 1 or 2 of the 3 extra Takbirs and you joined late:\n\n→ Say the remaining Takbirs before the Imam starts reciting Quran.\n→ If the Imam has already begun reciting Quran: do NOT say the missed Takbirs — they are dropped. Just listen.',
            note: 'Missing extra Takbirs does not invalidate the prayer. The prayer remains valid.',
          },
          {
            step: 21,
            title: 'You joined when Imam is already in Ruku (1st rakaat)',
            detail: 'If you joined after the Imam went into Ruku:\n\n→ Make your opening Takbir and go straight into Ruku with the Imam.\n→ The missed extra Takbirs are dropped — do NOT say them in Ruku.\n\nYou have caught the rakaat as long as you joined before the Imam lifted his head from Ruku.',
          },
          {
            step: 22,
            title: 'You missed some extra Takbirs in 2nd rakaat',
            detail: 'If the Imam has said some of the 3 extra Takbirs in the 2nd rakaat and you are joining late:\n\n→ Say your remaining Takbirs quickly before the Imam goes into Ruku.\n→ If the Imam is already moving to Ruku: follow him immediately. The missed Takbirs are dropped.',
          },
          {
            step: 23,
            title: 'You missed the entire Eid prayer (congregation)',
            detail: 'According to the Hanafi school, if you miss the Eid prayer in congregation entirely, you CANNOT make it up alone or in a small group.\n\nThe prayer requires a proper congregation with an Imam. If one congregation missed, check if another is available (some Masaajid offer multiple times).\n\nOtherwise: seek forgiveness, give charity, and engage in dhikr and gratitude on that day.',
            note: 'This is the Hanafi position. Consult your local scholar if you have a specific situation.',
          },
        ],
      },
      {
        heading: '📢 Khutbah (Sermon) — MUST LISTEN',
        steps: [
          {
            step: 24,
            title: 'The Khutbah comes AFTER the prayer',
            detail: 'After both rakaats are complete, the Imam delivers TWO short Khutbahs (sermons).\n\n⚠️ This is different from Jumuah — Eid Khutbah is AFTER the prayer, not before.',
          },
          {
            step: 25,
            title: '🔴 LISTENING TO THE KHUTBAH IS WAJIB',
            detail: 'It is Wajib (necessary/obligatory) for everyone present to listen attentively to the Eid Khutbah.\n\nDo NOT:\n✗ Talk during the Khutbah\n✗ Walk around\n✗ Use your phone\n✗ Leave early\n\nThe same rules as Jumuah Khutbah apply.',
            note: 'Leaving or ignoring the Khutbah after the prayer is sinful. Stay, listen, and make dua.',
          },
          {
            step: 26,
            title: 'What the Imam will talk about',
            detail: 'Eid ul-Fitr: The Imam explains Zakat al-Fitr rulings.\nEid ul-Adha: The Imam explains Qurbani (sacrifice) rulings and teaches the Takbir al-Tashriq.',
          },
        ],
      },
      {
        heading: '📣 Takbir al-Tashriq (Eid ul-Adha only)',
        steps: [
          {
            step: 27,
            title: 'What to say',
            detail: 'Allahu Akbar, Allahu Akbar, La ilaha illa Llahu wa Llahu Akbar, Allahu Akbar wa Lillahi l-hamd.\n\nAllah is the Greatest, Allah is the Greatest, there is no god but Allah, Allah is the Greatest. Allah is the Greatest, and all praise belongs to Allah.',
          },
          {
            step: 28,
            title: 'When to say it',
            detail: 'Say it ONCE after every Fard (obligatory) prayer:\n• Starting: Fajr of the 9th Dhul Hijjah (Day of Arafa)\n• Ending: Asr of the 13th Dhul Hijjah\n• Total: 23 prayers in a row\n\nSay it straight after the Fard prayer, before any Sunnah prayers.',
          },
          {
            step: 29,
            title: 'Who says it and how',
            detail: 'Men: Say it ALOUD (like the Imam after congregation).\nWomen: Say it quietly.\n\nIf you forget, there is no makeup. Just say it for the remaining prayers.',
          },
        ],
      },
    ],
    notes: [
      'The 6 extra Takbirs (3 in each rakaat) are WAJIB in the Hanafi school — obligatory for Imam and follower.',
      'Hands drop to sides between each extra Takbir — only fold after the 3rd Takbir in each rakaat.',
      'Missing extra Takbirs does not invalidate the prayer — the prayer remains valid.',
      'If you miss Eid congregation entirely, you cannot make it up alone (Hanafi position).',
      'Source: Hanafi Fiqh — Maraqi al-Falah, al-Hadiyya al-Alaiyya, SeekersGuidance',
    ],
  },
  {
    id: 'qada',
    title: "Sala\u0101t al-Qad\u0101",
    subtitle: 'Makeup of Missed Prayers · Hanafi Method',
    icon: 'restore',
    color: '#E65100',
    intro: 'Qada means making up a prayer that was missed or not performed correctly in its time. It is Fard (obligatory) to make up all missed obligatory prayers. One must repent sincerely and hasten to complete them.',
    sections: [
      {
        heading: 'Key Principles',
        steps: [
          { step: 1, title: 'What Must Be Made Up', detail: 'All five daily obligatory (Fard) prayers that were missed must be made up. Witr prayer must also be made up according to the Hanafi school (it is Wajib).' },
          { step: 2, title: 'What Does NOT Need Making Up', detail: 'Sunnah prayers (Rawatib), Nafl prayers, and Eid prayers do NOT need to be made up (Hanafi position).' },
          { step: 3, title: 'Intention (Niyyah)', detail: 'Be specific: e.g. "I intend to pray the Fard of Fajr that I missed." If you have many of the same, say "the first/oldest Fajr I owe" and work through them in order.' },
          { step: 4, title: 'Method', detail: 'Qada prayer is performed EXACTLY as the original: same rakaat count, same recitation (aloud for Fajr/Maghrib/Isha at night, silent for Dhuhr/Asr). No differences in method between ada (on-time) and qada.' },
        ],
      },
      {
        heading: 'Order of Making Up (Tartib)',
        steps: [
          { step: 5, title: 'Fewer Than 6 Missed', detail: 'If you have fewer than 6 total missed prayers, the Hanafi school requires maintaining sequence (tartib): make up the oldest missed prayer first before praying the current one.' },
          { step: 6, title: 'Six or More Missed', detail: 'Once you have 6 or more missed prayers simultaneously, the tartib requirement is lifted. You may pray the current prayer without making up missed ones first.' },
          { step: 7, title: 'Tight Prayer Window', detail: 'If the current prayer time is about to expire, pray it in its time first, then return to making up the missed ones.', note: 'If the current prayer has ample time remaining and you have fewer than 6 missed, perform the missed prayer first.' },
        ],
      },
      {
        heading: 'Practical Guidance',
        steps: [
          { step: 8, title: 'Many Years of Missed Prayers', detail: 'Estimate honestly and keep a log. Many scholars recommend performing 1-2 extra prayers per day alongside the five daily prayers until all qada is complete.' },
          { step: 9, title: 'Can Qada Be Prayed At Any Time?', detail: 'Yes. Qada prayers may be performed at any time, including the three normally forbidden times, when making up a prayer specifically owed during that period. Avoiding forbidden times is preferable when possible.' },
          { step: 10, title: 'Repentance (Tawbah)', detail: 'Making up missed prayers must be accompanied by sincere tawbah for having missed them without valid excuse. Commit to maintaining all prayers going forward.' },
        ],
      },
    ],
    notes: [
      'Witr is Wajib in the Hanafi school and must be made up if missed.',
      'A travelling person (musafir) shortens Dhuhr, Asr and Isha to 2 rakaats — make up missed travel prayers as 2 rakaats.',
      'A woman who missed prayers during menstruation does NOT need to make them up.',
      'A person in terminal illness unable to perform qada may appoint Fidyah (expiation) in their will.',
      'Seek guidance from a local scholar for your specific situation.',
    ],
  },
];

export const SURAH_YASEEN: YaseenVerse[] = [
  { ayah: 1, arabic: 'يس', transliteration: 'Ya Sin.', translation: 'Ya Sin.' },
  { ayah: 2, arabic: 'وَالْقُرْآنِ الْحَكِيمِ', transliteration: 'Wa l-Qurani l-hakim.', translation: 'By the wise Quran.' },
  { ayah: 3, arabic: 'إِنَّكَ لَمِنَ الْمُرْسَلِينَ', transliteration: 'Innaka la-mina l-mursalin.', translation: 'Indeed you are among the messengers,' },
  { ayah: 4, arabic: 'عَلَىٰ صِرَاطٍ مُّسْتَقِيمٍ', transliteration: 'Ala siratin mustaqim.', translation: 'On a straight path.' },
  { ayah: 5, arabic: 'تَنزِيلَ الْعَزِيزِ الرَّحِيمِ', transliteration: 'Tanzila l-Azizi r-Rahim.', translation: 'A revelation of the Almighty, the Most Merciful,' },
  { ayah: 6, arabic: 'لِتُنذِرَ قَوْمًا مَّا أُنذِرَ آبَاؤُهُمْ فَهُمْ غَافِلُونَ', transliteration: 'Li-tundhira qawman ma undhira abauhum fahum ghafilun.', translation: 'That you may warn a people whose forefathers were not warned, so they are heedless.' },
  { ayah: 7, arabic: 'لَقَدْ حَقَّ الْقَوْلُ عَلَىٰ أَكْثَرِهِمْ فَهُمْ لَا يُؤْمِنُونَ', transliteration: 'La-qad haqqa l-qawlu Ala akthirihim fa-hum la yuuminun.', translation: 'Already the word has proved true of most of them, so they do not believe.' },
  { ayah: 8, arabic: 'إِنَّا جَعَلْنَا فِي أَعْنَاقِهِمْ أَغْلَالًا فَهِيَ إِلَى الْأَذْقَانِ فَهُم مُّقْمَحُونَ', transliteration: 'Inna jaAlna fi aAnaqihim aghlalan fa-hiya ila l-adhqani fa-hum muqmahun.', translation: 'Indeed We have placed shackles around their necks reaching their chins, so their heads are raised up.' },
  { ayah: 9, arabic: 'وَجَعَلْنَا مِن بَيْنِ أَيْدِيهِمْ سَدًّا وَمِنْ خَلْفِهِمْ سَدًّا فَأَغْشَيْنَاهُمْ فَهُمْ لَا يُبْصِرُونَ', transliteration: 'Wa jaAlna min bayni aydihim saddan wa min khalfihim saddan fa-aghshaynamhum fa-hum la yubsirun.', translation: 'And We have placed before them a barrier and behind them a barrier, and covered them over, so they do not see.' },
  { ayah: 10, arabic: 'وَسَوَاءٌ عَلَيْهِمْ أَأَنذَرْتَهُمْ أَمْ لَمْ تُنذِرْهُمْ لَا يُؤْمِنُونَ', transliteration: 'Wa sawaun Alayhim a-andhartahum am lam tundhirhum la yuuminun.', translation: 'And it is alike for them whether you warn them or do not warn them — they will not believe.' },
  { ayah: 11, arabic: 'إِنَّمَا تُنذِرُ مَنِ اتَّبَعَ الذِّكْرَ وَخَشِيَ الرَّحْمَٰنَ بِالْغَيْبِ ۖ فَبَشِّرْهُ بِمَغْفِرَةٍ وَأَجْرٍ كَرِيمٍ', transliteration: 'Innama tundhiru mani ttabaAa dh-dhikra wa khashiya r-Rahmana bi-l-ghayb. Fa-bashshirhu bi-maghfiratin wa ajrin karim.', translation: 'You can only warn one who follows the Reminder and fears the Most Merciful unseen. So give him good news of forgiveness and a generous reward.' },
  { ayah: 12, arabic: 'إِنَّا نَحْنُ نُحْيِي الْمَوْتَىٰ وَنَكْتُبُ مَا قَدَّمُوا وَآثَارَهُمْ ۚ وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ', transliteration: 'Inna nahnu nuhyi l-mawta wa naktubu ma qaddamu wa atharahum. Wa kulla shayIn ahsaynahu fi imamin mubin.', translation: 'Indeed We give life to the dead, and We record what they have put forward and their traces. We have enumerated all things in a clear register.' },
  { ayah: 13, arabic: 'وَاضْرِبْ لَهُم مَّثَلًا أَصْحَابَ الْقَرْيَةِ إِذْ جَاءَهَا الْمُرْسَلُونَ', transliteration: 'Wa-drib lahum mathalan ashaba l-qaryati idh jaaaha l-mursalun.', translation: 'And set out for them an example: the people of the city, when the messengers came to it.' },
  { ayah: 14, arabic: 'إِذْ أَرْسَلْنَا إِلَيْهِمُ اثْنَيْنِ فَكَذَّبُوهُمَا فَعَزَّزْنَا بِثَالِثٍ فَقَالُوا إِنَّا إِلَيْكُم مُّرْسَلُونَ', transliteration: 'Idh arsalna ilayhimu thnayn fa-kadhdhabuhuma fa-Azzazna bi-thalithin fa-qalu inna ilaykum mursalun.', translation: 'When We sent to them two, but they denied them, so We reinforced them with a third, and they said: "Indeed we are messengers to you."' },
  { ayah: 15, arabic: 'قَالُوا مَا أَنتُمْ إِلَّا بَشَرٌ مِّثْلُنَا وَمَا أَنزَلَ الرَّحْمَٰنُ مِن شَيْءٍ إِنْ أَنتُمْ إِلَّا تَكْذِبُونَ', transliteration: 'Qalu ma antum illa basharun mithluna wa ma anzala r-Rahmanu min shayIn in antum illa takdhibun.', translation: 'They said: "You are only humans like us, and the Most Merciful has revealed nothing. You are only lying."' },
  { ayah: 16, arabic: 'قَالُوا رَبُّنَا يَعْلَمُ إِنَّا إِلَيْكُمْ لَمُرْسَلُونَ', transliteration: 'Qalu Rabbuna yaAlamu inna ilaykum la-mursalun.', translation: 'They said: "Our Lord knows that we are indeed messengers to you."' },
  { ayah: 17, arabic: 'وَمَا عَلَيْنَا إِلَّا الْبَلَاغُ الْمُبِينُ', transliteration: 'Wa ma Alayna illa l-blaghu l-mubin.', translation: 'And our duty is only to deliver the clear message.' },
  { ayah: 18, arabic: 'قَالُوا إِنَّا تَطَيَّرْنَا بِكُمْ ۖ لَئِن لَّمْ تَنتَهُوا لَنَرْجُمَنَّكُمْ وَلَيَمَسَّنَّكُم مِّنَّا عَذَابٌ أَلِيمٌ', transliteration: 'Qalu inna tatayyarna bikum. La-in lam tantahu la-narjumannakum wa la-yamassannakum minna Adhabun alim.', translation: 'They said: "We consider you an evil omen. If you do not desist, we will surely stone you, and a painful punishment will touch you from us."' },
  { ayah: 19, arabic: 'قَالُوا طَائِرُكُم مَّعَكُمْ ۚ أَئِن ذُكِّرْتُم ۚ بَلْ أَنتُمْ قَوْمٌ مُّسْرِفُونَ', transliteration: 'Qalu taiurukum maAakum. A-in dhukkirtum bal antum qawmun musrifun.', translation: 'They said: "Your omen is with yourselves. Is it because you were reminded? Rather, you are a transgressing people."' },
  { ayah: 20, arabic: 'وَجَاءَ مِنْ أَقْصَى الْمَدِينَةِ رَجُلٌ يَسْعَىٰ قَالَ يَا قَوْمِ اتَّبِعُوا الْمُرْسَلِينَ', transliteration: 'Wa jaa min aqsa l-madinati rajulun yasAa qala ya qawmi ttabiAu l-mursalin.', translation: 'And there came a man from the far end of the city running. He said: "O my people, follow the messengers."' },
  { ayah: 21, arabic: 'اتَّبِعُوا مَن لَّا يَسْأَلُكُمْ أَجْرًا وَهُم مُّهْتَدُونَ', transliteration: 'IttabiAu man la yasalukum ajran wa hum muhtadun.', translation: 'Follow those who do not ask of you any payment, and they are rightly guided.' },
  { ayah: 22, arabic: 'وَمَا لِيَ لَا أَعْبُدُ الَّذِي فَطَرَنِي وَإِلَيْهِ تُرْجَعُونَ', transliteration: 'Wa ma liya la aAbudu lladhi fatarani wa ilayhi turjaAun.', translation: 'And why should I not worship He who created me and to whom you will be returned?' },
  { ayah: 23, arabic: 'أَأَتَّخِذُ مِن دُونِهِ آلِهَةً إِن يُرِدْنِ الرَّحْمَٰنُ بِضُرٍّ لَّا تُغْنِ عَنِّي شَفَاعَتُهُمْ شَيْئًا وَلَا يُنقِذُونِ', transliteration: 'A-attakhidhu min dunihi alihatan in yuridni r-Rahmanu bi-durrin la tughni Anni shafaAtuhum shayan wa la yunqidhun.', translation: 'Should I take gods other than Him? If the Most Merciful intends me any harm, their intercession will not help me at all, nor will they save me.' },
  { ayah: 24, arabic: 'إِنِّي إِذًا لَّفِي ضَلَالٍ مُّبِينٍ', transliteration: 'Inni idhan la-fi dalalin mubin.', translation: 'I would then indeed be in clear error.' },
  { ayah: 25, arabic: 'إِنِّي آمَنتُ بِرَبِّكُمْ فَاسْمَعُونِ', transliteration: 'Inni amantu bi-Rabbikum fa-smaAun.', translation: 'Indeed I have believed in your Lord, so listen to me.' },
  { ayah: 26, arabic: 'قِيلَ ادْخُلِ الْجَنَّةَ ۖ قَالَ يَا لَيْتَ قَوْمِي يَعْلَمُونَ', transliteration: 'Qila dkhuli l-jannata qala ya layta qawmi yaAlamun.', translation: 'He was told: "Enter Paradise." He said: "I wish my people could know"' },
  { ayah: 27, arabic: 'بِمَا غَفَرَ لِي رَبِّي وَجَعَلَنِي مِنَ الْمُكْرَمِينَ', transliteration: 'Bi-ma ghafara li Rabbi wa jaAlani mina l-mukramin.', translation: 'Of how my Lord has forgiven me and placed me among the honoured.' },
  { ayah: 28, arabic: 'وَمَا أَنزَلْنَا عَلَىٰ قَوْمِهِ مِن بَعْدِهِ مِن جُندٍ مِّنَ السَّمَاءِ وَمَا كُنَّا مُنزِلِينَ', transliteration: 'Wa ma anzalna Ala qawmihi min baAdihi min jundin mina s-samaI wa ma kunna munzilin.', translation: 'And We did not send down upon his people after him any soldiers from the heaven, nor would We have done so.' },
  { ayah: 29, arabic: 'إِن كَانَتْ إِلَّا صَيْحَةً وَاحِدَةً فَإِذَا هُمْ خَامِدُونَ', transliteration: 'In kanat illa sayhatan wahidatan fa-idha hum khamidun.', translation: 'It was not but one shout, and at once they were extinguished.' },
  { ayah: 30, arabic: 'يَا حَسْرَةً عَلَى الْعِبَادِ ۚ مَا يَأْتِيهِم مِّن رَّسُولٍ إِلَّا كَانُوا بِهِ يَسْتَهْزِئُونَ', transliteration: 'Ya hasratan Ala l-Aibad. Ma yatihim min rasulin illa kanu bihi yastahziun.', translation: 'Alas for the servants! There did not come to them any messenger except that they used to ridicule him.' },
  { ayah: 31, arabic: 'أَلَمْ يَرَوْا كَمْ أَهْلَكْنَا قَبْلَهُم مِّنَ الْقُرُونِ أَنَّهُمْ إِلَيْهِمْ لَا يَرْجِعُونَ', transliteration: 'A-lam yaraw kam ahlaknagha qablahum mina l-quruni annahum ilayhim la yarjiAun.', translation: 'Do they not see how many generations We destroyed before them — that they will not return to them?' },
  { ayah: 32, arabic: 'وَإِن كُلٌّ لَّمَّا جَمِيعٌ لَّدَيْنَا مُحْضَرُونَ', transliteration: 'Wa in kullun lamma jamiAun ladayna muHdarun.', translation: 'And all of them will surely be brought present before Us.' },
  { ayah: 33, arabic: 'وَآيَةٌ لَّهُمُ الْأَرْضُ الْمَيْتَةُ أَحْيَيْنَاهَا وَأَخْرَجْنَا مِنْهَا حَبًّا فَمِنْهُ يَأْكُلُونَ', transliteration: 'Wa ayatun lahumu l-ardu l-maytatu ahyaynaha wa akhrajna minha habban fa-minhu yakulun.', translation: 'And a sign for them is the dead earth. We gave it life and brought forth from it grain, and from it they eat.' },
  { ayah: 34, arabic: 'وَجَعَلْنَا فِيهَا جَنَّاتٍ مِّن نَّخِيلٍ وَأَعْنَابٍ وَفَجَّرْنَا فِيهَا مِنَ الْعُيُونِ', transliteration: 'Wa jaAlna fiha jannatin min nakhilin wa aAnabin wa fajjarna fiha mina l-Ayun.', translation: 'And We placed therein gardens of palm trees and grapevines, and caused springs to gush forth within it,' },
  { ayah: 35, arabic: 'لِيَأْكُلُوا مِن ثَمَرِهِ وَمَا عَمِلَتْهُ أَيْدِيهِمْ ۖ أَفَلَا يَشْكُرُونَ', transliteration: 'Li-yakulou min thamarihi wa ma Amilathu aydihim. Afala yashkurun.', translation: 'That they might eat of its fruits, though their hands did not make it. Will they not then be grateful?' },
  { ayah: 36, arabic: 'سُبْحَانَ الَّذِي خَلَقَ الْأَزْوَاجَ كُلَّهَا مِمَّا تُنبِتُ الْأَرْضُ وَمِنْ أَنفُسِهِمْ وَمِمَّا لَا يَعْلَمُونَ', transliteration: 'Subhana lladhi khalaqa l-azwaja kullaha mimma tunbitu l-ardu wa min anfusihim wa mimma la yaAlamun.', translation: 'Exalted is He who created all pairs — from what the earth grows and from themselves and from that which they do not know.' },
  { ayah: 37, arabic: 'وَآيَةٌ لَّهُمُ اللَّيْلُ نَسْلَخُ مِنْهُ النَّهَارَ فَإِذَا هُم مُّظْلِمُونَ', transliteration: 'Wa ayatun lahumu l-laylu naslakhu minhu n-nahara fa-idha hum muzlimun.', translation: 'And a sign for them is the night. We strip from it the day, and behold, they are in darkness.' },
  { ayah: 38, arabic: 'وَالشَّمْسُ تَجْرِي لِمُسْتَقَرٍّ لَّهَا ۚ ذَٰلِكَ تَقْدِيرُ الْعَزِيزِ الْعَلِيمِ', transliteration: 'Wa sh-shamsu tajri li-mustaqarrin laha. Dhalika taqdiru l-Azizi l-Alim.', translation: 'And the sun runs towards its stopping point. That is the determination of the Almighty, the All-Knowing.' },
  { ayah: 39, arabic: 'وَالْقَمَرَ قَدَّرْنَاهُ مَنَازِلَ حَتَّىٰ عَادَ كَالْعُرْجُونِ الْقَدِيمِ', transliteration: 'Wa l-qamara qaddarnahu manazila hatta Ada ka-l-urjuni l-qadim.', translation: 'And the moon — We have determined it in phases until it returns like the old date stalk.' },
  { ayah: 40, arabic: 'لَا الشَّمْسُ يَنبَغِي لَهَا أَن تُدْرِكَ الْقَمَرَ وَلَا اللَّيْلُ سَابِقُ النَّهَارِ ۚ وَكُلٌّ فِي فَلَكٍ يَسْبَحُونَ', transliteration: 'La sh-shamsu yanbaghli laha an tudrika l-qamara wa la l-laylu sabiqu n-nahar. Wa kullun fi falakin yasbaHun.', translation: 'It is not for the sun to overtake the moon, nor does the night outpace the day. Each swims in an orbit.' },
  { ayah: 41, arabic: 'وَآيَةٌ لَّهُمْ أَنَّا حَمَلْنَا ذُرِّيَّتَهُمْ فِي الْفُلْكِ الْمَشْحُونِ', transliteration: 'Wa ayatun lahum anna hamalna dhurriyyatahum fi l-fulki l-mashHun.', translation: 'And a sign for them is that We carried their ancestors in the laden ship,' },
  { ayah: 42, arabic: 'وَخَلَقْنَا لَهُم مِّن مِّثْلِهِ مَا يَرْكَبُونَ', transliteration: 'Wa khalaqna lahum min mithlihi ma yarkabun.', translation: 'And We created for them of the like of it what they ride.' },
  { ayah: 43, arabic: 'وَإِن نَّشَأْ نُغْرِقْهُمْ فَلَا صَرِيخَ لَهُمْ وَلَا هُمْ يُنقَذُونَ', transliteration: 'Wa in nashA nughriqhum fa-la sariikha lahum wa la hum yunqadhun.', translation: 'And if We willed, We could drown them; then there would be no response for them, nor would they be saved.' },
  { ayah: 44, arabic: 'إِلَّا رَحْمَةً مِّنَّا وَمَتَاعًا إِلَىٰ حِينٍ', transliteration: 'Illa rahmatan minna wa mataan ila hin.', translation: 'Except as a mercy from Us and enjoyment for a time.' },
  { ayah: 45, arabic: 'وَإِذَا قِيلَ لَهُمُ اتَّقُوا مَا بَيْنَ أَيْدِيكُمْ وَمَا خَلْفَكُمْ لَعَلَّكُمْ تُرْحَمُونَ', transliteration: 'Wa idha qila lahumu ttaqu ma bayna aydikum wa ma khalfakum laAllakum turhamun.', translation: 'And when it is said to them: "Fear what is before you and what is behind you so that you may receive mercy."' },
  { ayah: 46, arabic: 'وَمَا تَأْتِيهِم مِّنْ آيَةٍ مِّنْ آيَاتِ رَبِّهِمْ إِلَّا كَانُوا عَنْهَا مُعْرِضِينَ', transliteration: 'Wa ma tatiihim min ayatin min ayati Rabbihim illa kanu Anha muAridin.', translation: 'And no sign came to them from the signs of their Lord except that they turned away from it.' },
  { ayah: 47, arabic: 'وَإِذَا قِيلَ لَهُمْ أَنفِقُوا مِمَّا رَزَقَكُمُ اللَّهُ قَالَ الَّذِينَ كَفَرُوا لِلَّذِينَ آمَنُوا أَنُطْعِمُ مَن لَّوْ يَشَاءُ اللَّهُ أَطْعَمَهُ إِنْ أَنتُمْ إِلَّا فِي ضَلَالٍ مُّبِينٍ', transliteration: 'Wa idha qila lahum anfaqu mimma razaqakumu Llahu qala lladhina kafaru li-lladhina amanu a-nutAimu man law yashau Llahu atAmahu in antum illa fi dalalin mubin.', translation: 'And when it is said to them: "Spend from that which Allah has provided for you," those who disbelieve say: "Should we feed one whom Allah would have fed, if He had willed? You are in nothing but clear error."' },
  { ayah: 48, arabic: 'وَيَقُولُونَ مَتَىٰ هَٰذَا الْوَعْدُ إِن كُنتُمْ صَادِقِينَ', transliteration: 'Wa yaquluna mata hadha l-waAdu in kuntum sadiqin.', translation: 'And they say: "When is this promise, if you should be truthful?"' },
  { ayah: 49, arabic: 'مَا يَنظُرُونَ إِلَّا صَيْحَةً وَاحِدَةً تَأْخُذُهُمْ وَهُمْ يَخِصِّمُونَ', transliteration: 'Ma yanzuruna illa sayhatan wahidatan taakhudhuhu wa hum yakhissimun.', translation: 'They do not wait except for one blast which will seize them while they are disputing.' },
  { ayah: 50, arabic: 'فَلَا يَسْتَطِيعُونَ تَوْصِيَةً وَلَا إِلَىٰ أَهْلِهِمْ يَرْجِعُونَ', transliteration: 'Fa-la yastatiAuna tawsiyatan wa la ila ahlihim yarjiAun.', translation: 'And they will not be able to give any instruction, nor to their people will they return.' },
  { ayah: 51, arabic: 'وَنُفِخَ فِي الصُّورِ فَإِذَا هُم مِّنَ الْأَجْدَاثِ إِلَىٰ رَبِّهِمْ يَنسِلُونَ', transliteration: 'Wa nufikha fi s-suri fa-idha hum mina l-ajdathi ila Rabbihim yansilun.', translation: 'And the trumpet will be blown, and at once from the graves to their Lord they will hasten.' },
  { ayah: 52, arabic: 'قَالُوا يَا وَيْلَنَا مَن بَعَثَنَا مِن مَّرْقَدِنَا ۜ ۗ هَٰذَا مَا وَعَدَ الرَّحْمَٰنُ وَصَدَقَ الْمُرْسَلُونَ', transliteration: 'Qalu ya waylana man baAathana min marqadina. Hadha ma waAada r-Rahmanu wa sadaqa l-mursalun.', translation: 'They will say: "Woe to us! Who has raised us from our sleeping place?" This is what the Most Merciful had promised, and the messengers told the truth.' },
  { ayah: 53, arabic: 'إِن كَانَتْ إِلَّا صَيْحَةً وَاحِدَةً فَإِذَا هُمْ جَمِيعٌ لَّدَيْنَا مُحْضَرُونَ', transliteration: 'In kanat illa sayhatan wahidatan fa-idha hum jamiAun ladayna muHdarun.', translation: 'It will be no more than a single blast, and all will be brought present before Us.' },
  { ayah: 54, arabic: 'فَالْيَوْمَ لَا تُظْلَمُ نَفْسٌ شَيْئًا وَلَا تُجْزَوْنَ إِلَّا مَا كُنتُمْ تَعْمَلُونَ', transliteration: 'Fa-l-yawma la tuzlamu nafsun shayan wa la tujzawna illa ma kuntum taAmalun.', translation: 'So today no soul will be wronged at all, and you will not be recompensed except for what you used to do.' },
  { ayah: 55, arabic: 'إِنَّ أَصْحَابَ الْجَنَّةِ الْيَوْمَ فِي شُغُلٍ فَاكِهُونَ', transliteration: 'Inna ashaba l-jannati l-yawma fi shughulin fakihun.', translation: 'Indeed the companions of Paradise, that Day, are happily occupied.' },
  { ayah: 56, arabic: 'هُمْ وَأَزْوَاجُهُمْ فِي ظِلَالٍ عَلَى الْأَرَائِكِ مُتَّكِئُونَ', transliteration: 'Hum wa azwajuhum fi zillin Ala l-araiki muttakiun.', translation: 'They and their spouses, in shade, reclining on adorned couches.' },
  { ayah: 57, arabic: 'لَهُمْ فِيهَا فَاكِهَةٌ وَلَهُم مَّا يَدَّعُونَ', transliteration: 'Lahum fiha fakihatun wa lahum ma yaddaAun.', translation: 'For them therein is fruit, and for them is whatever they request.' },
  { ayah: 58, arabic: 'سَلَامٌ قَوْلًا مِّن رَّبٍّ رَّحِيمٍ', transliteration: 'Salamun qawlan min Rabbin Rahim.', translation: 'Peace — a word from a Most Merciful Lord.' },
  { ayah: 59, arabic: 'وَامْتَازُوا الْيَوْمَ أَيُّهَا الْمُجْرِمُونَ', transliteration: 'Wa-mtazu l-yawma ayyuha l-mujrimun.', translation: 'And stand apart this Day, you criminals.' },
  { ayah: 60, arabic: 'أَلَمْ أَعْهَدْ إِلَيْكُمْ يَا بَنِي آدَمَ أَن لَّا تَعْبُدُوا الشَّيْطَانَ ۖ إِنَّهُ لَكُمْ عَدُوٌّ مُّبِينٌ', transliteration: 'A-lam aAhad ilaykum ya bani Adama an la taAbudu sh-shaytan. Innahu lakum Aduwwun mubin.', translation: 'Did I not enjoin you, O children of Adam, that you not worship Satan — for he is to you a clear enemy —' },
  { ayah: 61, arabic: 'وَأَنِ اعْبُدُونِي ۚ هَٰذَا صِرَاطٌ مُّسْتَقِيمٌ', transliteration: 'Wa ani-Abuduni. Hadha siratun mustaqim.', translation: 'And that you worship Me? This is a straight path.' },
  { ayah: 62, arabic: 'وَلَقَدْ أَضَلَّ مِنكُمْ جِبِلًّا كَثِيرًا ۖ أَفَلَمْ تَكُونُوا تَعْقِلُونَ', transliteration: 'Wa la-qad adalla minkum jibillan kathira. Afa-lam takunu taAqilun.', translation: 'And he had already led astray from among you much of creation, so did you not reason?' },
  { ayah: 63, arabic: 'هَٰذِهِ جَهَنَّمُ الَّتِي كُنتُمْ تُوعَدُونَ', transliteration: 'Hadhihi jahannamu llati kuntum tuAAdun.', translation: 'This is the Hellfire which you were promised.' },
  { ayah: 64, arabic: 'اصْلَوْهَا الْيَوْمَ بِمَا كُنتُمْ تَكْفُرُونَ', transliteration: 'Islawiha l-yawma bi-ma kuntum takfurun.', translation: 'Enter to burn therein this Day for what you used to deny.' },
  { ayah: 65, arabic: 'الْيَوْمَ نَخْتِمُ عَلَىٰ أَفْوَاهِهِمْ وَتُكَلِّمُنَا أَيْدِيهِمْ وَتَشْهَدُ أَرْجُلُهُم بِمَا كَانُوا يَكْسِبُونَ', transliteration: 'Al-yawma nakhtimu Ala afwahihim wa tukallimuna aydihim wa tashhadu arjuluhum bi-ma kanu yaksibun.', translation: 'That Day, We will seal their mouths, and their hands will speak to Us, and their feet will testify about what they used to earn.' },
  { ayah: 66, arabic: 'وَلَوْ نَشَاءُ لَطَمَسْنَا عَلَىٰ أَعْيُنِهِمْ فَاسْتَبَقُوا الصِّرَاطَ فَأَنَّىٰ يُبْصِرُونَ', transliteration: 'Wa law nashau la-tamasna Ala aAyunihim fa-stabaquu s-sirata fa-anna yubsirun.', translation: 'And if We willed, We could have obliterated their eyes, and they would race to the path, but how could they see?' },
  { ayah: 67, arabic: 'وَلَوْ نَشَاءُ لَمَسَخْنَاهُمْ عَلَىٰ مَكَانَتِهِمْ فَمَا اسْتَطَاعُوا مُضِيًّا وَلَا يَرْجِعُونَن', transliteration: 'Wa law nashau la-masakhnahum Ala makanatihim fa-ma-stataAu mudiyyan wa la yarjiAun.', translation: 'And if We willed, We could have deformed them in their places, so they would not be able to proceed, nor could they return.' },
  { ayah: 68, arabic: 'وَمَن نُّعَمِّرْهُ نُنَكِّسْهُ فِي الْخَلْقِ ۖ أَفَلَا يَعْقِلُونَ', transliteration: 'Wa man nuAammirhu nunakkishu fi l-khalqi. Afala yaAqilun.', translation: 'And whoever We grant long life, We cause him to decline in power. Will they not then reason?' },
  { ayah: 69, arabic: 'وَمَا عَلَّمْنَاهُ الشِّعْرَ وَمَا يَنبَغِي لَهُ ۚ إِنْ هُوَ إِلَّا ذِكْرٌ وَقُرْآنٌ مُّبِينٌ', transliteration: 'Wa ma Allamnahu sh-shiAra wa ma yanbaghli lahu. In huwa illa dhikrun wa Quranun mubin.', translation: 'And We did not give Muhammad knowledge of poetry, nor is it befitting for him. It is not but a reminder and a clear Quran,' },
  { ayah: 70, arabic: 'لِيُنذِرَ مَن كَانَ حَيًّا وَيَحِقَّ الْقَوْلُ عَلَى الْكَافِرِينَ', transliteration: 'Li-yundhira man kana hayyan wa yahiqqa l-qawlu Ala l-kafirin.', translation: 'To warn whoever is alive and justify the word against the disbelievers.' },
  { ayah: 71, arabic: 'أَوَلَمْ يَرَوْا أَنَّا خَلَقْنَا لَهُم مِّمَّا عَمِلَتْ أَيْدِينَا أَنْعَامًا فَهُمْ لَهَا مَالِكُونَ', transliteration: 'A-wa-lam yaraw anna khalaqna lahum mimma Amilat aydina anAaman fa-hum laha malikun.', translation: 'Do they not see that We have created for them from what Our hands have made, grazing livestock, and they are their owners?' },
  { ayah: 72, arabic: 'وَذَلَّلْنَاهَا لَهُمْ فَمِنْهَا رَكُوبُهُمْ وَمِنْهَا يَأْكُلُونَ', transliteration: 'Wa dhallalnahaa lahum fa-minha rakubuhum wa minha yakulun.', translation: 'And We have tamed them for them, so some of them they ride and some of them they eat.' },
  { ayah: 73, arabic: 'وَلَهُمْ فِيهَا مَنَافِعُ وَمَشَارِبُ ۖ أَفَلَا يَشْكُرُونَ', transliteration: 'Wa lahum fiha manafiu wa masharib. Afala yashkurun.', translation: 'And for them therein are other benefits and drinks, so will they not be grateful?' },
  { ayah: 74, arabic: 'وَاتَّخَذُوا مِن دُونِ اللَّهِ آلِهَةً لَّعَلَّهُمْ يُنصَرُونَ', transliteration: 'Wa ttakhadhu min duni Llahi alihatan laAllahum yunsarun.', translation: 'But they have taken besides Allah other gods that perhaps they would be helped.' },
  { ayah: 75, arabic: 'لَا يَسْتَطِيعُونَ نَصْرَهُمْ وَهُمْ لَهُمْ جُندٌ مُّحْضَرُونَ', transliteration: 'La yastatiAuna nasrahum wa hum lahum jundun muHdarun.', translation: 'They are not able to help them, but they are soldiers brought present for them.' },
  { ayah: 76, arabic: 'فَلَا يَحْزُنكَ قَوْلُهُمْ ۘ إِنَّا نَعْلَمُ مَا يُسِرُّونَ وَمَا يُعْلِنُونَ', transliteration: 'Fa-la yahzunka qawluhum. Inna naAlamu ma yusirrun wa ma yuAlinun.', translation: 'So let not their speech grieve you. Indeed, We know what they conceal and what they declare.' },
  { ayah: 77, arabic: 'أَوَلَمْ يَرَ الْإِنسَانُ أَنَّا خَلَقْنَاهُ مِن نُّطْفَةٍ فَإِذَا هُوَ خَصِيمٌ مُّبِينٌ', transliteration: 'A-wa-lam yara l-insanu anna khalaqnahu min nutfatin fa-idha huwa khasimun mubin.', translation: 'Does man not consider that We created him from a sperm-drop — then at once he is a clear adversary?' },
  { ayah: 78, arabic: 'وَضَرَبَ لَنَا مَثَلًا وَنَسِيَ خَلْقَهُ ۖ قَالَ مَن يُحْيِي الْعِظَامَ وَهِيَ رَمِيمٌ', transliteration: 'Wa daraba lana mathalan wa nasiya khalqahu. Qala man yuhyi l-iizama wa hiya ramim.', translation: 'And he presents an example for Us and has forgotten his own creation. He says: "Who will give life to bones when they are disintegrated?"' },
  { ayah: 79, arabic: 'قُلْ يُحْيِيهَا الَّذِي أَنشَأَهَا أَوَّلَ مَرَّةٍ ۖ وَهُوَ بِكُلِّ خَلْقٍ عَلِيمٌ', transliteration: 'Qul yuhyiha lladhi anshaaha awwala marratin wa Huwa bi-kulli khalqin Alim.', translation: 'Say: "He will give them life who produced them the first time, and He is of all creation Knowing."' },
  { ayah: 80, arabic: 'الَّذِي جَعَلَ لَكُم مِّنَ الشَّجَرِ الْأَخْضَرِ نَارًا فَإِذَا أَنتُم مِّنْهُ تُوقِدُونَ', transliteration: 'Alladhi jaAala lakum mina sh-shajari l-akhdarui naran fa-idha antum minhu tuqidun.', translation: 'He who made for you from the green tree, fire, and then from it you ignite.' },
  { ayah: 81, arabic: 'أَوَلَيْسَ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ بِقَادِرٍ عَلَىٰ أَن يَخْلُقَ مِثْلَهُم ۚ بَلَىٰ وَهُوَ الْخَلَّاقُ الْعَلِيمُ', transliteration: 'A-wa laysa lladhi khalaqa s-samawati wa l-arda bi-qadirin Ala an yakhluqa mithlahum. Bala wa Huwa l-Khallaqu l-Alim.', translation: 'Is not He who created the heavens and the earth able to create the likes of them? Yes, and He is the Knowing Creator.' },
  { ayah: 82, arabic: 'إِنَّمَا أَمْرُهُ إِذَا أَرَادَ شَيْئًا أَن يَقُولَ لَهُ كُن فَيَكُونُ', transliteration: 'Innama amruhu idha arada shayan an yaqula lahu kun fa-yakun.', translation: 'His command is only when He intends a thing that He says to it: "Be," and it is.' },
  { ayah: 83, arabic: 'فَسُبْحَانَ الَّذِي بِيَدِهِ مَلَكُوتُ كُلِّ شَيْءٍ وَإِلَيْهِ تُرْجَعُونَ', transliteration: 'Fa-subhana lladhi bi-yadihi malakutu kulli shayan wa ilayhi turjaAun.', translation: 'So exalted is He in whose hand is the realm of all things, and to Him you will be returned.' },
];

export interface WaqiahVerse {
  ayah: number;
  arabic: string;
  transliteration: string;
  translation: string;
}

export const SURAH_WAQIAH: WaqiahVerse[] = [
  { ayah: 1, arabic: 'إِذَا وَقَعَتِ ٱلْوَاقِعَةُ', transliteration: 'Idha waqa-Aati l-waqi-Ah.', translation: 'When the Occurrence occurs,' },
  { ayah: 2, arabic: 'لَيْسَ لِوَقْعَتِهَا كَاذِبَةٌ', transliteration: 'Laysa li-waqAatiha kadhiba.', translation: 'There is, at its occurrence, no denial.' },
  { ayah: 3, arabic: 'خَافِضَةٌ رَّافِعَةٌ', transliteration: 'Khafidatun rafia.', translation: 'It will bring down some and raise up others.' },
  { ayah: 4, arabic: 'إِذَا رُجَّتِ ٱلْأَرْضُ رَجًّا', transliteration: 'Idha rujjati l-ardu rajja.', translation: 'When the earth is shaken with convulsion' },
  { ayah: 5, arabic: 'وَبُسَّتِ ٱلْجِبَالُ بَسًّا', transliteration: 'Wa bussati l-jibalu bassa.', translation: 'And the mountains are broken down, crumbling' },
  { ayah: 6, arabic: 'فَكَانَتْ هَبَآءً مُّنۢبَثًّا', transliteration: 'Fa-kanat habaan munbaththa.', translation: 'And become dust dispersing.' },
  { ayah: 7, arabic: 'وَكُنتُمْ أَزْوَٰجًا ثَلَٰثَةً', transliteration: 'Wa kuntum azwajan thalatha.', translation: 'And you become three groups:' },
  { ayah: 8, arabic: 'فَأَصْحَٰبُ ٱلْمَيْمَنَةِ مَآ أَصْحَٰبُ ٱلْمَيْمَنَةِ', transliteration: 'Fa-as-habu l-maymanati ma as-habu l-maymana.', translation: 'The companions of the right — what are the companions of the right?' },
  { ayah: 9, arabic: 'وَأَصْحَٰبُ ٱلْمَشْـَٔمَةِ مَآ أَصْحَٰبُ ٱلْمَشْـَٔمَةِ', transliteration: 'Wa as-habu l-mashamati ma as-habu l-mashama.', translation: 'And the companions of the left — what are the companions of the left?' },
  { ayah: 10, arabic: 'وَٱلسَّٰبِقُونَ ٱلسَّٰبِقُونَ', transliteration: 'Wa s-sabiquna s-sabiqun.', translation: 'And the forerunners, the forerunners —' },
  { ayah: 11, arabic: 'أُو۟لَٰٓئِكَ ٱلْمُقَرَّبُونَ', transliteration: 'Ulaika l-muqarrabun.', translation: 'Those are the ones brought near to Allah.' },
  { ayah: 12, arabic: 'فِى جَنَّٰتِ ٱلنَّعِيمِ', transliteration: 'Fi jannati n-naim.', translation: 'In the Gardens of Pleasure,' },
  { ayah: 13, arabic: 'ثُلَّةٌ مِّنَ ٱلْأَوَّلِينَ', transliteration: 'Thullatun mina l-awwalin.', translation: 'A large company from the former peoples' },
  { ayah: 14, arabic: 'وَقَلِيلٌ مِّنَ ٱلْءَاخِرِينَ', transliteration: 'Wa qalilun mina l-akhirin.', translation: 'And a few from the later ones.' },
  { ayah: 15, arabic: 'عَلَىٰ سُرُرٍ مَّوْضُونَةٍ', transliteration: 'Ala sururin mawdhuna.', translation: 'On thrones woven with ornament,' },
  { ayah: 16, arabic: 'مُّتَّكِـِٔينَ عَلَيْهَا مُتَقَٰبِلِينَ', transliteration: 'Muttakiina alayha mutaqabilin.', translation: 'Reclining on them, facing each other.' },
  { ayah: 17, arabic: 'يَطُوفُ عَلَيْهِمْ وِلْدَٰنٌ مُّخَلَّدُونَ', transliteration: 'Yatufu alayhim wildanun mukhalladun.', translation: 'There will circulate among them young boys made eternal' },
  { ayah: 18, arabic: 'بِأَكْوَابٍ وَأَبَارِيقَ وَكَأْسٍ مِّن مَّعِينٍ', transliteration: 'Bi-akwabin wa abariqua wa kasin min main.', translation: 'With vessels, pitchers and a cup from a flowing spring —' },
  { ayah: 19, arabic: 'لَّا يُصَدَّعُونَ عَنْهَا وَلَا يُنزِفُونَ', transliteration: 'La yusaddaAuna anha wa la yunzafun.', translation: 'No headache will they have therefrom, nor will they be intoxicated —' },
  { ayah: 20, arabic: 'وَفَٰكِهَةٍ مِّمَّا يَتَخَيَّرُونَ', transliteration: 'Wa fakihatin mimma yatakhayyarun.', translation: 'And fruit of what they select' },
  { ayah: 21, arabic: 'وَلَحْمِ طَيْرٍ مِّمَّا يَشْتَهُونَ', transliteration: 'Wa lahmi tayrin mimma yashtahun.', translation: 'And the meat of fowl, from whatever they desire.' },
  { ayah: 22, arabic: 'وَحُورٌ عِينٌ', transliteration: 'Wa hurun in.', translation: 'And companions with beautiful, wide, and lustrous eyes,' },
  { ayah: 23, arabic: 'كَأَمْثَٰلِ ٱللُّؤْلُؤِ ٱلْمَكْنُونِ', transliteration: 'Ka-amthali l-luluI l-maknun.', translation: 'The likeliness of pearls well-protected,' },
  { ayah: 24, arabic: 'جَزَآءًۢ بِمَا كَانُوا۟ يَعْمَلُونَ', transliteration: 'Jazaan bima kanu yaAmalun.', translation: 'As reward for what they used to do.' },
  { ayah: 25, arabic: 'لَا يَسْمَعُونَ فِيهَا لَغْوًا وَلَا تَأْثِيمًا', transliteration: 'La yasmaAuna fiha laghwan wa la tathima.', translation: 'They will not hear therein ill speech or commission of sin —' },
  { ayah: 26, arabic: 'إِلَّا قِيلًا سَلَٰمًا سَلَٰمًا', transliteration: 'Illa qilan salaman salama.', translation: 'Only a saying of peace, peace.' },
  { ayah: 27, arabic: 'وَأَصْحَٰبُ ٱلْيَمِينِ مَآ أَصْحَٰبُ ٱلْيَمِينِ', transliteration: 'Wa as-habu l-yamini ma as-habu l-yamin.', translation: 'The companions of the right — what are the companions of the right?' },
  { ayah: 28, arabic: 'فِى سِدْرٍ مَّخْضُودٍ', transliteration: 'Fi sidrin makhdhud.', translation: 'In lote-trees with thorns removed,' },
  { ayah: 29, arabic: 'وَطَلْحٍ مَّنضُودٍ', transliteration: 'Wa talhin mandud.', translation: 'And banana trees layered with fruit' },
  { ayah: 30, arabic: 'وَظِلٍّ مَّمْدُودٍ', transliteration: 'Wa zillin mamdud.', translation: 'And shade extended' },
  { ayah: 31, arabic: 'وَمَآءٍ مَّسْكُوبٍ', transliteration: 'Wa main maskub.', translation: 'And water poured out' },
  { ayah: 32, arabic: 'وَفَٰكِهَةٍ كَثِيرَةٍ', transliteration: 'Wa fakihatin kathira.', translation: 'And fruit, abundant' },
  { ayah: 33, arabic: 'لَّا مَقْطُوعَةٍ وَلَا مَمْنُوعَةٍ', transliteration: 'La maqtuAatin wa la mamnu-Aa.', translation: 'Neither limited nor forbidden,' },
  { ayah: 34, arabic: 'وَفُرُشٍ مَّرْفُوعَةٍ', transliteration: 'Wa furushin marfuAa.', translation: 'And elevated couches.' },
  { ayah: 35, arabic: 'إِنَّآ أَنشَأْنَٰهُنَّ إِنشَآءً', transliteration: 'Inna anshanahunna inshaa.', translation: 'Indeed, We have produced them in a new creation' },
  { ayah: 36, arabic: 'فَجَعَلْنَٰهُنَّ أَبْكَارًا', transliteration: 'Fa-jaaAlnahunna abkara.', translation: 'And made them virgins,' },
  { ayah: 37, arabic: 'عُرُبًا أَتْرَابًا', transliteration: 'Uruban atraba.', translation: 'Devoted and of equal age,' },
  { ayah: 38, arabic: 'لِّأَصْحَٰبِ ٱلْيَمِينِ', transliteration: 'Li-as-haabi l-yamin.', translation: 'For the companions of the right.' },
  { ayah: 39, arabic: 'ثُلَّةٌ مِّنَ ٱلْأَوَّلِينَ', transliteration: 'Thullatun mina l-awwalin.', translation: 'A large company from the former peoples' },
  { ayah: 40, arabic: 'وَثُلَّةٌ مِّنَ ٱلْءَاخِرِينَ', transliteration: 'Wa thullatun mina l-akhirin.', translation: 'And a large company from the later ones.' },
  { ayah: 41, arabic: 'وَأَصْحَٰبُ ٱلشِّمَالِ مَآ أَصْحَٰبُ ٱلشِّمَالِ', transliteration: 'Wa as-habu sh-shimali ma as-habu sh-shimal.', translation: 'The companions of the left — what are the companions of the left?' },
  { ayah: 42, arabic: 'فِى سَمُومٍ وَحَمِيمٍ', transliteration: 'Fi samumin wa hamim.', translation: 'In scorching fire and scalding water' },
  { ayah: 43, arabic: 'وَظِلٍّ مِّن يَحْمُومٍ', transliteration: 'Wa zillin min yahmum.', translation: 'And a shade of black smoke,' },
  { ayah: 44, arabic: 'لَّا بَارِدٍ وَلَا كَرِيمٍ', transliteration: 'La baridin wa la karim.', translation: 'Neither cool nor beneficial.' },
  { ayah: 45, arabic: 'إِنَّهُمْ كَانُوا۟ قَبْلَ ذَٰلِكَ مُتْرَفِينَ', transliteration: 'Innahum kanu qabla dhalika mutrafin.', translation: 'Indeed, before that they were living in luxury,' },
  { ayah: 46, arabic: 'وَكَانُوا۟ يُصِرُّونَ عَلَى ٱلْحِنثِ ٱلْعَظِيمِ', transliteration: 'Wa kanu yusirruna Ala l-hinthi l-Azim.', translation: 'And they persisted in the great violation,' },
  { ayah: 47, arabic: 'وَكَانُوا۟ يَقُولُونَ أَئِذَا مِتْنَا وَكُنَّا تُرَابًا وَعِظَٰمًا أَءِنَّا لَمَبْعُوثُونَ', transliteration: 'Wa kanu yaquluna a-idha mitna wa kunna turaban wa izaman a-inna la-mabAuthun.', translation: 'And they used to say: When we die and become dust and bones, are we indeed to be resurrected?' },
  { ayah: 48, arabic: 'أَوَءَابَآؤُنَا ٱلْأَوَّلُونَ', transliteration: 'Awa abauna l-awwalun.', translation: 'And our forefathers as well?' },
  { ayah: 49, arabic: 'قُلْ إِنَّ ٱلْأَوَّلِينَ وَٱلْءَاخِرِينَ', transliteration: 'Qul inna l-awwalina wa l-akhirin.', translation: 'Say: Indeed, the former and later peoples' },
  { ayah: 50, arabic: 'لَمَجْمُوعُونَ إِلَىٰ مِيقَٰتِ يَوْمٍ مَّعْلُومٍ', transliteration: 'La-majmuAuna ila miqati yawmin mAlum.', translation: 'Will surely be gathered for the appointment of a known Day.' },
  { ayah: 51, arabic: 'ثُمَّ إِنَّكُمْ أَيُّهَا ٱلضَّآلُّونَ ٱلْمُكَذِّبُونَ', transliteration: 'Thumma innakum ayyuha d-dalluna l-mukadhibun.', translation: 'Then indeed you, O those astray who deny,' },
  { ayah: 52, arabic: 'لَـَٔاكِلُونَ مِن شَجَرٍ مِّن زَقُّومٍ', transliteration: 'La-akiluna min shajarin min zaqqum.', translation: 'Will be eating from trees of zaqqum' },
  { ayah: 53, arabic: 'فَمَالِـُٔونَ مِنْهَا ٱلْبُطُونَ', transliteration: 'Fa-maliuna minha l-butun.', translation: 'And filling your bellies with it,' },
  { ayah: 54, arabic: 'فَشَٰرِبُونَ عَلَيْهِ مِنَ ٱلْحَمِيمِ', transliteration: 'Fa-sharibuna alayhi mina l-hamim.', translation: 'And drinking on top of it scalding water' },
  { ayah: 55, arabic: 'فَشَٰرِبُونَ شُرْبَ ٱلْهِيمِ', transliteration: 'Fa-sharibuna shurba l-him.', translation: 'And drinking as drinks the thirsty camels.' },
  { ayah: 56, arabic: 'هَٰذَا نُزُلُهُمْ يَوْمَ ٱلدِّينِ', transliteration: 'Hadha nuzuluhum yawma d-din.', translation: 'This is their accommodation on the Day of Recompense.' },
  { ayah: 57, arabic: 'نَحْنُ خَلَقْنَٰكُمْ فَلَوْلَا تُصَدِّقُونَ', transliteration: 'Nahnu khalaqnakum fa-lawla tusaddiqun.', translation: 'We created you, so why do you not believe?' },
  { ayah: 58, arabic: 'أَفَرَءَيْتُم مَّا تُمْنُونَ', transliteration: 'A-fara-aytum ma tumnun.', translation: 'Have you seen that which you emit?' },
  { ayah: 59, arabic: 'ءَأَنتُمْ تَخْلُقُونَهُۥٓ أَمْ نَحْنُ ٱلْخَٰلِقُونَ', transliteration: 'A-antum takhluqunahu am nahnu l-khaliqun.', translation: 'Is it you who creates it, or are We the Creator?' },
  { ayah: 60, arabic: 'نَحْنُ قَدَّرْنَا بَيْنَكُمُ ٱلْمَوْتَ وَمَا نَحْنُ بِمَسْبُوقِينَ', transliteration: 'Nahnu qaddarna baynakumu l-mawta wa ma nahnu bi-masbiqin.', translation: 'We have decreed death among you, and We are not to be outdone' },
  { ayah: 61, arabic: 'عَلَىٰٓ أَن نُّبَدِّلَ أَمْثَٰلَكُمْ وَنُنشِئَكُمْ فِى مَا لَا تَعْلَمُونَ', transliteration: 'Ala an nubaddila amthalakum wa nunshinakum fi ma la taAlamun.', translation: 'In that We will change your likenesses and produce you in what you do not know.' },
  { ayah: 62, arabic: 'وَلَقَدْ عَلِمْتُمُ ٱلنَّشْأَةَ ٱلْأُولَىٰ فَلَوْلَا تَذَكَّرُونَ', transliteration: 'Wa la-qad Alimtumu n-nashat l-ula fa-lawla tadhakkarun.', translation: 'And you have already known the first creation, so will you not remember?' },
  { ayah: 63, arabic: 'أَفَرَءَيْتُم مَّا تَحْرُثُونَ', transliteration: 'A-fara-aytum ma tahurthun.', translation: 'Have you seen that which you sow?' },
  { ayah: 64, arabic: 'ءَأَنتُمْ تَزْرَعُونَهُۥٓ أَمْ نَحْنُ ٱلزَّٰرِعُونَ', transliteration: 'A-antum tazrAunahu am nahnu z-zariAun.', translation: 'Is it you who makes it grow, or are We the grower?' },
  { ayah: 65, arabic: 'لَوْ نَشَآءُ لَجَعَلْنَٰهُ حُطَٰمًا فَظَلْتُمْ تَفَكَّهُونَ', transliteration: 'Law nashau la-jaaAlnahu hutaman fa-zaltum tafakkahun.', translation: 'If We willed, We could make it debris, and you would remain in wonder,' },
  { ayah: 66, arabic: 'إِنَّا لَمُغْرَمُونَ', transliteration: 'Inna la-mughrhamun.', translation: 'Indeed, we are in debt;' },
  { ayah: 67, arabic: 'بَلْ نَحْنُ مَحْرُومُونَ', transliteration: 'Bal nahnu mahrumun.', translation: 'Rather, we are deprived.' },
  { ayah: 68, arabic: 'أَفَرَءَيْتُمُ ٱلْمَآءَ ٱلَّذِى تَشْرَبُونَ', transliteration: 'A-fara-aytumu l-maa alladhi tashrabun.', translation: 'Have you seen the water that you drink?' },
  { ayah: 69, arabic: 'ءَأَنتُمْ أَنزَلْتُمُوهُ مِنَ ٱلْمُزْنِ أَمْ نَحْنُ ٱلْمُنزِلُونَ', transliteration: 'A-antum anzaltumahu mina l-muzni am nahnu l-munzilun.', translation: 'Is it you who brought it down from the clouds, or is it We who bring it down?' },
  { ayah: 70, arabic: 'لَوْ نَشَآءُ جَعَلْنَٰهُ أُجَاجًا فَلَوْلَا تَشْكُرُونَ', transliteration: 'Law nashau jaaAlnahu ujajan fa-lawla tashkurun.', translation: 'If We willed, We could make it bitter, so why are you not grateful?' },
  { ayah: 71, arabic: 'أَفَرَءَيْتُمُ ٱلنَّارَ ٱلَّتِى تُورُونَ', transliteration: 'A-fara-aytumu n-nara llati turun.', translation: 'Have you seen the fire that you ignite?' },
  { ayah: 72, arabic: 'ءَأَنتُمْ أَنشَأْتُمْ شَجَرَتَهَآ أَمْ نَحْنُ ٱلْمُنشِـُٔونَ', transliteration: 'A-antum anshatam shajarataha am nahnu l-munshiun.', translation: 'Is it you who produced its tree, or are We the producer?' },
  { ayah: 73, arabic: 'نَحْنُ جَعَلْنَٰهَا تَذْكِرَةً وَمَتَٰعًا لِّلْمُقْوِينَ', transliteration: 'Nahnu jaaAlnaha tadhkiratan wa mataan li-l-muqwin.', translation: 'We have made it a reminder and provision for the travelers,' },
  { ayah: 74, arabic: 'فَسَبِّحْ بِٱسْمِ رَبِّكَ ٱلْعَظِيمِ', transliteration: 'Fa-sabbih bismi Rabbika l-Azim.', translation: 'So exalt the name of your Lord, the Most Great.' },
  { ayah: 75, arabic: 'فَلَآ أُقْسِمُ بِمَوَٰقِعِ ٱلنُّجُومِ', transliteration: 'Fa-la uqsimu bi-mawaqi-Ai n-nujum.', translation: 'Then I swear by the setting of the stars,' },
  { ayah: 76, arabic: 'وَإِنَّهُۥ لَقَسَمٌ لَّوْ تَعْلَمُونَ عَظِيمٌ', transliteration: 'Wa innahu la-qasamun law taAlamuna Azim.', translation: 'And indeed, it is an oath — if you could know — most tremendous.' },
  { ayah: 77, arabic: 'إِنَّهُۥ لَقُرْءَانٌ كَرِيمٌ', transliteration: 'Innahu la-Quranun karim.', translation: 'Indeed, it is a noble Quran' },
  { ayah: 78, arabic: 'فِى كِتَٰبٍ مَّكْنُونٍ', transliteration: 'Fi kitabin maknun.', translation: 'In a Register well-protected;' },
  { ayah: 79, arabic: 'لَّا يَمَسُّهُۥٓ إِلَّا ٱلْمُطَهَّرُونَ', transliteration: 'La yamassuhu illa l-mutahharun.', translation: 'None shall touch it except the purified.' },
  { ayah: 80, arabic: 'تَنزِيلٌ مِّن رَّبِّ ٱلْعَٰلَمِينَ', transliteration: 'Tanzilun min Rabbi l-Aalamin.', translation: 'It is a revelation from the Lord of the worlds.' },
  { ayah: 81, arabic: 'أَفَبِهَٰذَا ٱلْحَدِيثِ أَنتُم مُّدْهِنُونَ', transliteration: 'A-fa-bi-hadha l-hadithi antum mudhinun.', translation: 'Is it to this statement that you are indifferent?' },
  { ayah: 82, arabic: 'وَتَجْعَلُونَ رِزْقَكُمْ أَنَّكُمْ تُكَذِّبُونَ', transliteration: 'Wa tajAaluna rizqakum annakum tukadhhibun.', translation: 'And make it your provision that you deny it?' },
  { ayah: 83, arabic: 'فَلَوْلَآ إِذَا بَلَغَتِ ٱلْحُلْقُومَ', transliteration: 'Fa-lawla idha balaghati l-hulqum.', translation: 'Then why, when the soul at death reaches the throat' },
  { ayah: 84, arabic: 'وَأَنتُمْ حِينَئِذٍ تَنظُرُونَ', transliteration: 'Wa antum hina-idhin tanzurun.', translation: 'And you are at that time looking on —' },
  { ayah: 85, arabic: 'وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنكُمْ وَلَٰكِن لَّا تُبْصِرُونَ', transliteration: 'Wa nahnu aqrabu ilayhi minkum wa lakin la tubsirun.', translation: 'And We are nearer to him than you, but you do not see —' },
  { ayah: 86, arabic: 'فَلَوْلَآ إِن كُنتُمْ غَيْرَ مَدِينِينَ', transliteration: 'Fa-lawla in kuntum ghayra madinin.', translation: 'Then why do you not, if you are not subject to recompense,' },
  { ayah: 87, arabic: 'تَرْجِعُونَهَآ إِن كُنتُمْ صَٰدِقِينَ', transliteration: 'Tarji-Aunaha in kuntum sadiqin.', translation: 'Bring it back, if you should be truthful?' },
  { ayah: 88, arabic: 'فَأَمَّآ إِن كَانَ مِنَ ٱلْمُقَرَّبِينَ', transliteration: 'Fa-amma in kana mina l-muqarrabin.', translation: 'And if the deceased was of those brought near to Allah,' },
  { ayah: 89, arabic: 'فَرَوْحٌ وَرَيْحَانٌ وَجَنَّتُ نَعِيمٍ', transliteration: 'Fa-rawHun wa rayhanum wa jannatu naim.', translation: 'Then rest and bounty and a garden of pleasure.' },
  { ayah: 90, arabic: 'وَأَمَّآ إِن كَانَ مِنْ أَصْحَٰبِ ٱلْيَمِينِ', transliteration: 'Wa amma in kana min as-haabi l-yamin.', translation: 'And if he was of the companions of the right,' },
  { ayah: 91, arabic: 'فَسَلَٰمٌ لَّكَ مِنْ أَصْحَٰبِ ٱلْيَمِينِ', transliteration: 'Fa-salamun laka min as-haabi l-yamin.', translation: 'Then peace to you from the companions of the right.' },
  { ayah: 92, arabic: 'وَأَمَّآ إِن كَانَ مِنَ ٱلْمُكَذِّبِينَ ٱلضَّآلِّينَ', transliteration: 'Wa amma in kana mina l-mukadhibina d-dalllin.', translation: 'But if he was of the deniers who went astray,' },
  { ayah: 93, arabic: 'فَنُزُلٌ مِّنْ حَمِيمٍ', transliteration: 'Fa-nuzulun min hamim.', translation: 'Then an accommodation of scalding water' },
  { ayah: 94, arabic: 'وَتَصْلِيَةُ جَحِيمٍ', transliteration: 'Wa tasliyatu jahim.', translation: 'And burning in Hellfire.' },
  { ayah: 95, arabic: 'إِنَّ هَٰذَا لَهُوَ حَقُّ ٱلْيَقِينِ', transliteration: 'Inna hadha la-huwa haqqu l-yaqin.', translation: 'Indeed, this is the very truth of certainty.' },
  { ayah: 96, arabic: 'فَسَبِّحْ بِٱسْمِ رَبِّكَ ٱلْعَظِيمِ', transliteration: 'Fa-sabbih bismi Rabbika l-Azim.', translation: 'So exalt the name of your Lord, the Most Great.' },
];

export const WAQIAH_MUSHAF_PAGES: number[][] = [
  [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24],
  [25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44],
  [45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67],
  [68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96],
];

export interface HizbSection {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
}

export const HIZB_AL_BAHR: HizbSection[] = [
  // Content will be added — current content removed pending verification
];

export interface HizbPage {
  arabic: string;
  transliteration: string;
  translation: string;
}

export const HIZB_AL_BAHR_PAGES: HizbPage[] = [
  {
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ ❧ يَا عَلِيُّ يَا عَظِيمُ ❧ يَا حَلِيمُ يَا عَلِيمُ ❧ أَنْتَ رَبِّي ❧ وَعِلْمُكَ حَسْبِي ❧ فَنِعْمَ الرَّبُّ رَبِّي ❧ وَنِعْمَ الْحَسْبُ حَسْبِي ❧ تَنْصُرُ مَنْ تَشَاءُ ❧ وَأَنْتَ الْعَزِيزُ الرَّحِيمُ ❧ نَسْأَلُكَ الْعِصْمَةَ فِي الْحَرَكَاتِ وَالسَّكَنَاتِ وَالْكَلِمَاتِ وَالْإِرَادَاتِ وَالْخَطَرَاتِ ❧ مِنَ الشُّكُوكِ وَالظُّنُونِ ❧ وَالْأَوْهَامِ السَّاتِرَةِ لِلْقُلُوبِ عَنِ النَّظَرِ فِي الْغُيُوبِ ❧ فَقَدِ ابْتُلِيَ الْمُؤْمِنُونَ وَزُلْزِلُوا زِلْزَالًا شَدِيدًا ❧ وَإِذْ يَقُولُ الْمُنَافِقُونَ وَالَّذِينَ فِي قُلُوبِهِمْ مَرَضٌ مَا وَعَدَنَا اللَّهُ وَرَسُولُهُ إِلَّا غُرُورًا ❧ فَثَبِّتْنَا وَانْصُرْنَا ❧ وَسَخِّرْ لَنَا هَذَا الْبَحْرَ ❧ كَمَا سَخَّرْتَ الْبَحْرَ لِمُوسَى ❧ وَسَخَّرْتَ النَّارَ لِإِبْرَاهِيمَ ❧ وَسَخَّرْتَ الْجِبَالَ وَالْحَدِيدَ لِدَاوُدَ ❧ وَسَخَّرْتَ الرِّيحَ وَالشَّيَاطِينَ وَالْجِنَّ لِسُلَيْمَانَ ❧ وَسَخِّرْ لَنَا كُلَّ بَحْرٍ هُوَ لَكَ فِي الْأَرْضِ وَالسَّمَاءِ ❧ وَالْمُلْكِ وَالْمَلَكُوتِ ❧ وَبَحْرَ الدُّنْيَا وَبَحْرَ الْآخِرَةِ ❧ وَسَخِّرْ لَنَا كُلَّ شَيْءٍ ❧ يَا مَنْ بِيَدِهِ مَلَكُوتُ كُلِّ شَيْءٍ ❧ كهيعص ❧ أَنْصُرْنَا فَإِنَّكَ خَيْرُ النَّاصِرِينَ ❧ وَافْتَحْ لَنَا فَإِنَّكَ خَيْرُ الْفَاتِحِينَ ❧ وَاغْفِرْ لَنَا فَإِنَّكَ خَيْرُ الْغَافِرِينَ ❧ وَارْحَمْنَا فَإِنَّكَ خَيْرُ الرَّاحِمِينَ ❧ وَارْزُقْنَا فَإِنَّكَ خَيْرُ الرَّازِقِينَ',
    transliteration:
      'Bismillahi r-Rahmani r-Rahim. Ya Aliyyu ya Azimu ya Halimu ya Alim. Anta Rabbi wa Ilmuka hasbi. Fa-niAma r-Rabbu Rabbi wa niAma l-hasbu hasbi. Tansuru man tasha wa Anta l-Azizu r-Rahim. Nas-aluka l-Ismata fi l-harakati wa s-sakanati wa l-kalimati wa l-iraadati wa l-khararat. Mina sh-shukuki wa z-zununi wa l-awhami s-satirati li-l-qulubi Ani n-nazari fi l-ghuyub. Fa-qadi-btulia l-muuminuna wa zulzilu zilzalan shadida. Wa idh yaqulu l-munafiquna wa lladhina fi qulubihim maradun ma waAdana Llahu wa Rasuluhu illa ghurura. Fa-thabbitna wa-nsurna wa-sakhkhir lana hadha l-bahra kama sakhkharta l-bahra li-Musa wa sakhkharta n-nara li-Ibrahim wa sakhkharta l-jibala wa l-hadida li-Dawud wa sakhkharta r-riha wa sh-shayatina wa l-jinna li-Sulayman. Wa sakhkhir lana kulla bahrin huwa laka fi l-ardi wa s-samaa wa l-mulki wa l-malakut wa bahra d-dunya wa bahra l-akhira wa sakhkhir lana kulla shayin ya man bi-yadihi malakutu kulli shay. Kaf-Ha-Ya-Ayn-Sad. Ansurna fa-innaka khayru n-nasirin wa-ftah lana fa-innaka khayru l-fatihin wa-ghfir lana fa-innaka khayru l-ghafirin wa-rhamna fa-innaka khayru r-rahimin wa-rzuqna fa-innaka khayru r-raziqin.',
    translation:
      'In the name of Allah, the Most Gracious, the Most Merciful. O Most High, O Most Great, O Most Forbearing, O All-Knowing — You are my Lord and Your knowledge is sufficient for me. How blessed is my Lord as a Lord, and how blessed is my sufficiency as sufficiency. You aid whomever You will, and You are the Almighty, the Merciful. We ask You for protection in our movements and stillness, our words and intentions and thoughts — from doubts, suspicions, and illusions that veil the hearts from perceiving the unseen. The believers were certainly tried and shaken with a mighty shaking. The hypocrites said: "Allah and His Messenger promised us only delusion." So make us firm and grant us victory. Subject this sea to us, as You subjected the sea for Musa, fire for Ibrahim, mountains and iron for Dawud, and wind, devils and jinn for Sulayman. Subject to us every sea in earth and heaven, the dominion and sovereignty, the sea of this world and the Hereafter. Subject all things to us, O You in whose hand is the sovereignty of all things. Kaf-Ha-Ya-Ayn-Sad. Aid us, for You are the best of helpers; open for us, for You are the best of openers; forgive us, for You are the best of forgivers; have mercy on us, for You are the most merciful; provide for us, for You are the best of providers.',
  },
  {
    arabic:
      'وَاهْدِنَا وَنَجِّنَا مِنَ الْقَوْمِ الظَّالِمِينَ ❧ وَهَبْ لَنَا رِيحًا طَيِّبَةً ❧ كَمَا هِيَ فِي عِلْمِكَ ❧ وَانْشُرْهَا عَلَيْنَا مِنْ خَزَائِنِ رَحْمَتِكَ ❧ وَاحْمِلْنَا بِهَا حَمْلَ الْكَرَامَةِ ❧ مَعَ السَّلَامَةِ وَالْعَافِيَةِ فِي الدِّينِ وَالدُّنْيَا وَالْآخِرَةِ ❧ إِنَّكَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ ❧ اللَّهُمَّ يَسِّرْ لَنَا أُمُورَنَا ❧ مَعَ الرَّاحَةِ لِقُلُوبِنَا وَأَبْدَانِنَا وَدُنْيَانَا ❧ وَكُنْ لَنَا صَاحِبًا فِي سَفَرِنَا ❧ وَخَلِيفَةً فِي أَهْلِنَا ❧ وَاطْمِسْ عَلَى وُجُوهِ أَعْدَائِنَا ❧ وَامْسَخْهُمْ عَلَى مَكَانَتِهِمْ فَلَا يَسْتَطِيعُونَ الْمُضِيَّ وَلَا الْمَجِيءَ إِلَيْنَا ❧ وَلَوْ نَشَاءُ لَطَمَسْنَا عَلَى أَعْيُنِهِمْ فَاسْتَبَقُوا الصِّرَاطَ فَأَنَّى يُبْصِرُونَ ❧ وَلَوْ نَشَاءُ لَمَسَخْنَاهُمْ عَلَى مَكَانَتِهِمْ فَمَا اسْتَطَاعُوا مُضِيًّا وَلَا يَرْجِعُونَ ❧ يس وَالْقُرْآنِ الْحَكِيمِ إِنَّكَ لَمِنَ الْمُرْسَلِينَ عَلَى صِرَاطٍ مُسْتَقِيمٍ تَنْزِيلَ الْعَزِيزِ الرَّحِيمِ لِتُنْذِرَ قَوْمًا مَا أُنْذِرَ آبَاؤُهُمْ فَهُمْ غَافِلُونَ لَقَدْ حَقَّ الْقَوْلُ عَلَى أَكْثَرِهِمْ فَهُمْ لَا يُؤْمِنُونَ إِنَّا جَعَلْنَا فِي أَعْنَاقِهِمْ أَغْلَالًا فَهِيَ إِلَى الْأَذْقَانِ فَهُمْ مُقْمَحُونَ وَجَعَلْنَا مِنْ بَيْنِ أَيْدِيهِمْ سَدًّا وَمِنْ خَلْفِهِمْ سَدًّا فَأَغْشَيْنَاهُمْ فَهُمْ لَا يُبْصِرُونَ ❧ شَاهَتِ الْوُجُوهُ ❧ وَعَنَتِ الْوُجُوهُ لِلْحَيِّ الْقَيُّومِ ❧ وَقَدْ خَابَ مَنْ حَمَلَ ظُلْمًا ❧ طس حم عسق ❧ مَرَجَ الْبَحْرَيْنِ يَلْتَقِيَانِ ❧ بَيْنَهُمَا بَرْزَخٌ لَا يَبْغِيَانِ ❧ حم حم حم حم حم حم حم',
    transliteration:
      'Wa-hdina wa-najjina mina l-qawmi z-zalimin. Wa-hab lana rihan tayyibatan kama hiya fi ilmik wa-nshurha Alayna min khazaini rahmatika wa-hmilna biha hamla l-karama maAa s-salama wa l-Aafiya fi d-dini wa d-dunya wa l-akhira. Innaka Ala kulli shayin qadir. Allahumma yassir lana umumrana maAa r-rahati li-qulubina wa abdanina wa dunyyana. Wa kun lana sahiban fi safarana wa khalifatan fi ahllina. Wa-tmis Ala wujuhi aAdaina wa-msakhahum Ala makanatihim fa-la yastatiAuna l-mudiyya wa la l-majia ilayna. Wa law nashau la-tamasna Ala aAyunihim fa-stabaquu s-sirata fa-anna yubsirun. Wa law nashau la-masakhnahum Ala makanatihim fa-ma-stataAu mudiyyan wa la yarjiAun. Ya-Sin wa l-Qurani l-Hakim. Innaka la-mina l-mursalin. Ala siratin mustaqim. Tanzila l-Azizi r-Rahim. Li-tundhira qawman ma undhira abauhum fahum ghafilun. La-qad haqqa l-qawlu Ala akthirihim fa-hum la yuuminun. Inna jaAlna fi aAnaqihim aghlalan fa-hiya ila l-adhqani fa-hum muqmahun. Wa jaAlna min bayni aydihim saddan wa min khalfihim saddan fa-aghshaynamhum fa-hum la yubsirun. Shahat il-wujuh. Wa Anati l-wujuhu li-l-Hayyi l-Qayyum. Wa qad khaba man hamala zulma. Ta-Sin. Ha-Mim. Ayn-Sin-Qaf. Maraja l-bahrayni yaltaqiyan. Baynahuma barzakhun la yabghiyan. Ha-Mim Ha-Mim Ha-Mim Ha-Mim Ha-Mim Ha-Mim Ha-Mim.',
    translation:
      'Guide us and save us from the wrongdoing people. Grant us a good wind as it exists in Your knowledge, and spread it over us from the treasuries of Your mercy. Carry us upon it with honour, along with safety and wellbeing in religion, this world, and the Hereafter — for You have power over all things. O Allah, make our affairs easy for us, with ease for our hearts and bodies and world. Be our companion in travel and successor over our family. Blot out the faces of our enemies and transform them in their places so they cannot move forward or come toward us. Had We willed, We would have blotted out their eyes — then they would race toward the path, but how could they see? Had We willed, We would have transformed them in their places, and they would be unable to proceed or return. Ya-Sin, by the wise Quran — indeed you are from the messengers, on a straight path. A revelation of the Almighty, the Merciful, to warn a people whose forefathers were not warned. The word has proved true against most of them, so they do not believe. We placed shackles around their necks, so their heads are raised up. And We placed barriers before and behind them, covering them so they cannot see. Faces have been disgraced! Faces are humbled before the Ever-Living, the Self-Subsisting. Failed is the one who carries injustice. Ta-Sin. Ha-Mim. Ayn-Sin-Qaf. He has released the two bodies of water to flow and meet — between them is a barrier they do not transgress. Ha-Mim (seven times).',
  },
  {
    arabic:
      'حم الْأَمْرُ وَجَاءَ النَّصْرُ فَعَلَيْنَا لَا يُنْصَرُونَ ❧ حم ❧ تَنْزِيلُ الْكِتَابِ مِنَ اللَّهِ الْعَزِيزِ الْعَلِيمِ ❧ غَافِرِ الذَّنْبِ وَقَابِلِ التَّوْبِ شَدِيدِ الْعِقَابِ ❧ ذِي الطَّوْلِ لَا إِلَهَ إِلَّا هُوَ إِلَيْهِ الْمَصِيرُ ❧ بِسْمِ اللَّهِ بَابُنَا ❧ تَبَارَكَ حِيطَانُنَا ❧ يس سَقْفُنَا ❧ كهيعص كَفِيلُنَا ❧ حم عسق حِمَايَتُنَا ❧ فَسَيَكْفِيكَهُمُ اللَّهُ وَهُوَ السَّمِيعُ الْعَلِيمُ ❧ سِتْرُ الْعَرْشِ مَسْبُولٌ عَلَيْنَا ❧ وَعَيْنُ اللَّهِ نَاظِرَةٌ إِلَيْنَا ❧ بِحَوْلِ اللَّهِ لَا يُقْدَرُ عَلَيْنَا ❧ فِي لَوْحٍ مَحْفُوظٍ ❧ بَلْ هُوَ قُرْآنٌ مَجِيدٌ ❧ فَاللَّهُ خَيْرٌ حَافِظًا وَهُوَ أَرْحَمُ الرَّاحِمِينَ ❧ إِنَّ وَلِيِّيَ اللَّهُ الَّذِي نَزَّلَ الْكِتَابَ وَهُوَ يَتَوَلَّى الصَّالِحِينَ ❧ حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ ❧ بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ ❧ أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ ❧ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ ❧ وَصَلَّى اللَّهُ عَلَى سَيِّدِنَا مُحَمَّدٍ وَآلِهِ وَصَحْبِهِ وَسَلَّمَ ❧ وَالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    transliteration:
      'Ha-Mim — the matter is decreed and victory has come; they shall not be aided against us. Ha-Mim. Tanzilu l-kitabi mina Llahi l-Azizi l-Alim. Ghafiri dh-dhanbi wa qabili t-tawbi shadidi l-Iqab. Dhi t-tawli la ilaha illa Huwa ilayhi l-masir. Bismillahi babuna. Tabaraka hitanuna. Ya-Sin saqfuna. Kaf-Ha-Ya-Ayn-Sad kafiluna. Ha-Mim Ayn-Sin-Qaf himayatuna. Fa-sayakfikumhu Llahu wa Huwa s-samiAu l-Alim. Sitru l-Arshi masbulun Alayna. Wa Aynu Llahi naziratun ilayna. Bi-hawli Llahi la yuqdaru Alayna. Fi lawhin mahfuz. Bal huwa Quranun majid. Fa-Llahu khayrun hafizhan wa Huwa arhamu r-rahimin. Inna waliyyiya Llahu lladhi nazzala l-kitaba wa Huwa yatawalla s-salihin. Hasbiya Llahu la ilaha illa Huwa Alayhi tawakkaltu wa Huwa Rabbu l-Arshi l-Azim. Bismillahi lladhi la yadurru maAsmihi shayyun fi l-ardi wa la fi s-samaI wa Huwa s-samiAu l-Alim. AAudhu bi-kalimati Llahi t-tammati min sharri ma khalaq. Wa la hawla wa la quwwata illa billahi l-Aliyyi l-Azim. Wa salla Llahu Ala Sayyidina Muhammadin wa alihi wa sahbihi wa sallam. Wa l-hamdu lillahi Rabbi l-Aalamin.',
    translation:
      'Ha-Mim — the command is settled and victory has arrived; they shall not prevail against us. Ha-Mim. The revelation of the Book is from Allah, the Almighty, the All-Knowing — Forgiver of sin and Acceptor of repentance, severe in punishment, full of bounty. There is no god but He; to Him is the final return. Bismillah is our door. Tabaraka (Blessed is He) are our walls. Ya-Sin is our roof. Kaf-Ha-Ya-Ayn-Sad is our guarantor. Ha-Mim Ayn-Sin-Qaf is our protection. Allah will suffice you against them — He is the All-Hearing, the All-Knowing. The curtain of the Throne is drawn over us. The Eye of Allah watches over us. By the power of Allah, none can overpower us. In a Preserved Tablet. Indeed it is a glorious Quran. Allah is the best Guardian and He is the most merciful of those who show mercy. Indeed my Protector is Allah who sent down the Book, and He takes care of the righteous. Sufficient for me is Allah — there is no god but He. In Him I place my trust, and He is the Lord of the Great Throne. In the name of Allah, with whose name nothing in the earth or heaven can cause harm — He is the All-Hearing, the All-Knowing. I seek refuge in the perfect words of Allah from the evil of what He has created. There is no might and no power except with Allah, the Most High, the Most Great. May Allah send blessings upon our Master Muhammad, his Family and Companions, and grant them peace. All praise is for Allah, Lord of all the worlds.',
  },
];

const _HIZB_AL_BAHR_PLACEHOLDER: HizbSection[] = [
  {
    id: 'hb-opening',
    title: 'Opening — Bismillah & Fatiha',
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ\n\nالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴿١﴾ الرَّحْمَـٰنِ الرَّحِيمِ ﴿٢﴾ مَالِكِ يَوْمِ الدِّينِ ﴿٣﴾ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ﴿٤﴾ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ﴿٥﴾ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ ﴿٦﴾',
    transliteration: 'Bismillahi r-Rahmani r-Rahim.\nAl-hamdu lillahi Rabbi l-Aalamin, ar-Rahmani r-Rahim, Maliki yawmi d-din, iyyaka naAbudu wa iyyaka nastaIn, ihdina s-sirata l-mustaqim, sirata lladhina anAmta Alayhim, ghayri l-maghdubi Alayhim wa la d-dallin.',
    translation: 'In the name of Allah, the Most Gracious, the Most Merciful.\nAll praise is for Allah, Lord of the worlds, the Most Gracious, the Most Merciful, Master of the Day of Judgment. You alone we worship and You alone we ask for help. Guide us to the straight path — the path of those You have blessed, not of those who earned anger or who went astray.',
  },
  {
    id: 'hb-1',
    title: 'The Opening Invocation',
    arabic: 'اللَّهُمَّ يَا عَلِيُّ يَا عَظِيمُ يَا حَلِيمُ يَا عَلِيمُ\nأَنْتَ رَبِّي وَعِلْمُكَ حَسْبِي\nفَنِعْمَ الرَّبُّ رَبِّي وَنِعْمَ الْحَسْبُ حَسْبِي\nتَنْصُرُ مَنْ تَشَاءُ وَأَنْتَ الْعَزِيزُ الرَّحِيمُ',
    transliteration: 'Allahumma ya Aliyyu ya Azim ya Halim ya Alim.\nAnta Rabbi wa Ilmuka hasbi.\nFa-niAma r-Rabbu Rabbi wa niAma l-hasbu hasbi.\nTansuru man tashau wa Anta l-Azizu r-Rahim.',
    translation: 'O Allah, O Most High, O Most Great, O Most Forbearing, O All-Knowing.\nYou are my Lord, and Your knowledge is sufficient for me.\nHow blessed is my Lord as a Lord, and how blessed is my sufficiency as sufficiency.\nYou aid whomever You will, and You are the Almighty, the Merciful.',
  },
  {
    id: 'hb-2',
    title: 'Seeking Protection in All States',
    arabic: 'نَسْأَلُكَ الْعِصْمَةَ فِي الْحَرَكَاتِ وَالسَّكَنَاتِ وَالْكَلِمَاتِ وَالْإِرَادَاتِ وَالْخَطَرَاتِ\nمِنَ الشُّكُوكِ وَالظُّنُونِ وَالْأَوْهَامِ السَّاتِرَةِ لِلْقُلُوبِ عَنِ النَّظَرِ فِي الْغُيُوبِ\n\nفَقَدِ ابْتُلِيَ الْمُؤْمِنُونَ وَزُلْزِلُوا زِلْزَالًا شَدِيدًا\nوَإِذْ يَقُولُ الْمُنَافِقُونَ وَالَّذِينَ فِي قُلُوبِهِمْ مَرَضٌ مَا وَعَدَنَا اللَّهُ وَرَسُولُهُ إِلَّا غُرُورًا',
    transliteration: 'NasAluka l-Ismata fi l-harakati wa s-sakanati wa l-kalimati wa l-iraadati wa l-kharakat.\nMina sh-shukuki wa z-zununi wa l-awhami s-satirati li-l-qulubi Ani n-nazari fi l-ghuyub.\n\nFa-qadi-btulia l-muuminuna wa zulzilu zilzalan shadida.\nWa idh yaqulu l-munafiquna wa lladhina fi qulubihim maradun ma waAdana Llahu wa Rasuluhu illa ghurura.',
    translation: 'We ask You for protection in our movements and stillness, our words and intentions and thoughts — from doubts, suspicions, and illusions that veil the hearts from perceiving the unseen.\n\nThe believers were certainly tried and shaken with a mighty shaking. When the hypocrites and those in whose hearts was disease said: Allah and His Messenger promised us only delusion.',
  },
  {
    id: 'hb-3',
    title: 'Divine Sovereignty',
    arabic: 'اللَّهُ لَطِيفٌ بِعِبَادِهِ يَرْزُقُ مَنْ يَشَاءُ وَهُوَ الْقَوِيُّ الْعَزِيزُ\n\nمَنْ كَانَ يُرِيدُ حَرْثَ الْآخِرَةِ نَزِدْ لَهُ فِي حَرْثِهِ\nوَمَنْ كَانَ يُرِيدُ حَرْثَ الدُّنْيَا نُؤْتِهِ مِنْهَا وَمَا لَهُ فِي الْآخِرَةِ مِنْ نَصِيبٍ',
    transliteration: 'Allahu Latifun bi-ibadihi yarzuqu man yashau wa Huwa l-Qawiyyu l-Aziz.\n\nMan kana yuridu hartha l-akhirati nazid lahu fi harthi. Wa man kana yuridu hartha d-dunya nutihi minha wa ma lahu fi l-akhirati min nasib.',
    translation: 'Allah is subtle with His servants; He gives provision to whom He wills, and He is the Strong, the Almighty.\n\nWhoever desires the harvest of the Hereafter — We increase for him in his harvest. And whoever desires the harvest of this world — We give him thereof, but he has no share in the Hereafter.',
  },
  {
    id: 'hb-4',
    title: 'The Hasbi Dhikr',
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ\nنِعْمَ الْمَوْلَى وَنِعْمَ النَّصِيرُ\nغُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ\nوَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ',
    transliteration: 'Hasbuna Llahu wa niAma l-wakil.\nNiAma l-mawla wa niAma n-nasir.\nGhufranaka Rabbana wa ilayka l-masir.\nWa la hawla wa la quwwata illa billahi l-Aliyyi l-Azim.',
    translation: 'Sufficient for us is Allah, and how excellent is the Disposer of affairs.\nHow excellent is the Protector and how excellent is the Helper.\nYour forgiveness, our Lord! And to You is the final destination.\nThere is no might and no power except with Allah, the Most High, the Most Great.',
  },
  {
    id: 'hb-5',
    title: 'Ayat al-Kursi — Throne Verse',
    arabic: 'اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    transliteration: 'Allahu la ilaha illa Huwa l-Hayyu l-Qayyum. La taakhudhuhu sinatun wa la nawm. Lahu ma fi s-samawati wa ma fi l-ard. Man dha lladhi yashfaAu Indahu illa bi-idhnih. YaAlamu ma bayna aydihim wa ma khalfahum. Wa la yuhituna bi-shayIn min Ilmihi illa bi-ma sha. WasiAa kursiyyuhu s-samawati wa l-ard. Wa la yaUduhu hifzuhuma wa Huwa l-Aliyyu l-Azim.',
    translation: 'Allah — there is no god but He, the Ever-Living, the Self-Subsisting. Neither drowsiness nor sleep overtakes Him. To Him belongs all in the heavens and the earth. Who can intercede with Him except by His permission? He knows what is before them and what is behind them. They encompass nothing of His knowledge except what He wills. His Throne extends over the heavens and earth. Their preservation does not tire Him. He is the Most High, the Most Great.',
  },
  {
    id: 'hb-6',
    title: 'Ya Hayyu Ya Qayyum — Seeking Aid',
    arabic: 'وَعَنَتِ الْوُجُوهُ لِلْحَيِّ الْقَيُّومِ وَقَدْ خَابَ مَنْ حَمَلَ ظُلْمًا\n\nيَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ وَمِنْ عَذَابِكَ أَسْتَجِيرُ\nأَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
    transliteration: 'Wa Anati l-wujuhu li-l-Hayyi l-Qayyum. Wa qad khaba man hamala zulma.\n\nYa Hayyu Ya Qayyum bi-rahmatika astaghith. Wa min Adhabika astajir. Aslih li shaani kullahu. Wa la takilni ila nafsi tarfata Ayn.',
    translation: 'Faces will be humbled before the Ever-Living, the Self-Subsisting. And he who carried wrongdoing will have failed.\n\nO Ever-Living, O Self-Subsisting — in Your mercy I seek aid. And from Your punishment I seek refuge. Make easy all my affairs. And do not leave me to myself even for the blink of an eye.',
  },
  {
    id: 'hb-7',
    title: 'Sea & Safety — Travel Prayer',
    arabic: 'وَسَخَّرَ لَكُمُ الْبَحْرَ لِتَجْرِيَ الْفُلْكُ فِيهِ بِأَمْرِهِ وَلِتَبْتَغُوا مِنْ فَضْلِهِ وَلَعَلَّكُمْ تَشْكُرُونَ\n\nاللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ\nاللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الْأَهْلِ',
    transliteration: 'Wa sakhkhara lakumu l-bahra li-tajriya l-fulku fihi bi-amrihi wa li-tabtaghu min fadlihi wa laAllakum tashkurun.\n\nAllahumma hawwin Alayna safarana hadha, wa-twi Anna buAdahu. Allahumma Anta s-sahibu fi s-safar, wa l-khalifatu fi l-ahl.',
    translation: 'And He has subjected the sea for you so that ships may sail through it by His command, and that you may seek of His bounty, and that you might be grateful.\n\nO Allah, make this journey of ours easy for us and fold its distance for us. O Allah, You are the Companion in travel and the Successor over our family.',
  },
  {
    id: 'hb-8',
    title: 'The Prophetic Shield',
    arabic: 'إِنَّ وَلِيِّيَ اللَّهُ الَّذِي نَزَّلَ الْكِتَابَ وَهُوَ يَتَوَلَّى الصَّالِحِينَ\n\nفَإِنْ تَوَلَّوْا فَقُلْ حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ\n\nقُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ اللَّهُ الصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ ﴿٤﴾',
    transliteration: 'Inna waliyyiya Llahu lladhi nazzala l-kitab, wa Huwa yatawalla s-salihin.\n\nFa-in tawallaw fa-qul hasbiya Llahu la ilaha illa Huwa, Alayhi tawakkaltu wa Huwa Rabbu l-Arshi l-Azim.\n\nQul huwa Llahu ahad. Allahu s-Samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.',
    translation: 'Indeed, my Protector is Allah who has sent down the Book, and He takes care of the righteous.\n\nBut if they turn away, then say: Sufficient for me is Allah; there is no deity except Him. On Him I have relied, and He is the Lord of the Great Throne.\n\nSay: He is Allah, the One. Allah, the Eternal. He neither begets nor is begotten. And none is comparable to Him.',
  },
  {
    id: 'hb-9',
    title: 'Closing Salawat',
    arabic: 'وَصَلَّى اللَّهُ عَلَى سَيِّدِنَا مُحَمَّدٍ كُلَّمَا ذَكَرَهُ الذَّاكِرُونَ وَغَفَلَ عَنْ ذِكْرِهِ الْغَافِلُونَ\nوَصَلَّى اللَّهُ عَلَى سَيِّدِنَا مُحَمَّدٍ فِي الْأَوَّلِينَ وَالْآخِرِينَ وَفِي الْمَلَأِ الْأَعْلَى إِلَى يَوْمِ الدِّينِ\nوَصَلَّى اللَّهُ عَلَى جَمِيعِ إِخْوَانِهِ مِنَ النَّبِيِّينَ وَالْمُرْسَلِينَ\nوَالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    transliteration: 'Wa salla Llahu Ala Sayyidina Muhammadin kullama dhakarahu dh-dhakirun, wa ghafala An dhikrihi l-ghafilun.\nWa salla Llahu Ala Sayyidina Muhammadin fi l-awwalina wa l-akhirin.\nWa fi l-malai l-aAla ila yawmi d-din.\nWa salla Llahu Ala jamiAi ikhwanihi mina n-nabiyyina wa l-mursalin.\nWa l-hamdu lillahi Rabbi l-Aalamin.',
    translation: 'May Allah send blessings upon our Master Muhammad whenever those who remember him do so — and whenever the heedless are heedless of his remembrance. May Allah send blessings upon our Master Muhammad among the first and the last, and in the Highest Assembly until the Day of Judgment. May Allah send blessings upon all his brothers from the prophets and messengers. And all praise is for Allah, Lord of the worlds.',
  },
];

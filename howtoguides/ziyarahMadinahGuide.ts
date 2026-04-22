import { HowToGuide } from './types';

const PHOTO_SOURCE = 'Source: hajjumrahplanner.com/visiting-the-prophet/';
const BAQI_MAP_SOURCE = 'Source: hajjumrahplanner.com/jannat-al-baqi-map/';
const BAQI_DETAILS_SOURCE = 'Source: hajjumrahplanner.com/jannatul-baqi/';
const BAQI_ALT_SOURCE = 'Source: takemetoumrah.com/jannatul-baqi/';

export const ZIYARAH_MADINAH_GUIDE: HowToGuide = {
  id: 'ziyarah-madinah',
  parentGroup: 'Hajj & Umrah',
  title: 'Visiting the Prophet ﷺ in Madinah (Ziyarah Adab)',
  subtitle: 'Sunni guide with adab, salam, duas, and practical city flow',
  icon: 'location-city',
  color: '#2E7D32',
  intro:
    'This guide summarizes a mainstream Sunni approach to visiting the Prophet ﷺ in Madinah: sincere intention, reverence, adab in Masjid al-Nabawi, sending salam, and making dua with proper creed and etiquette.',
  sections: [
    {
      heading: 'Virtue, Intention, and Heart Preparation',
      steps: [
        {
          step: 1,
          title: 'Set a clear intention before travel',
          detail:
            'Intend to visit the Prophet ﷺ, pray in Masjid al-Nabawi, and seek closeness to Allah. Keep the intention pure and avoid turning the visit into only tourism or photo-taking.',
        },
        {
          step: 2,
          title: 'Prepare with tawbah and the rights of people',
          detail:
            'Before arrival, repent sincerely, clear debts where possible, and ask forgiveness from people you may have wronged. A clean heart is part of proper ziyarah adab.',
        },
        {
          step: 3,
          title: 'Increase Salawat throughout travel',
          detail:
            'From departure until arrival, recite abundant Salawat with concentration. Keep your tongue busy with dhikr while waiting, walking, and traveling between locations.',
        },
        {
          step: 4,
          title: 'Arrive in a state of dignity',
          detail:
            'Before your first ziyarah, perform ghusl if possible, wear clean clothing, apply non-harmful perfume, and avoid loud speech or rushed behavior. Outward adab helps inward focus.',
        },
        {
          step: 5,
          title: 'Use language of presence and reverence',
          detail:
            'Many Sunni scholars recommend speaking in a way that reflects adab and presence, such as saying you are visiting the Prophet ﷺ rather than using expressions that reduce the visit to a physical structure only.',
        },
      ],
    },
    {
      heading: 'Entering Madinah and Masjid al-Nabawi',
      steps: [
        {
          step: 1,
          title: 'Enter Madinah with reverence and the reported dua',
          detail: `As you approach Madinah, increase Salawat and enter with humility.

Dua:
اَللَّهُمَّ هَذَا حَرَمُ نَبِيِّكَ فَاجْعَلْهُ وِقَايَةً لِي مِنَ النَّارِ وَآمِنَّا مِنْ الْعَذَابِ وَسُوْءِ الْحِسَابِ

Transliteration:
Allahumma hadha haramu nabiyyika fajalhu wiqayatan li mina n-nar, wa amanan mina l-adhabi wa su'i l-hisab.

Translation:
O Allah, this is the sacred precinct of Your Prophet, so make it a protection for me from the Fire and a security from punishment and a bad reckoning.`,
          images: [
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2019/01/masjid-nabawi-green-dome.jpg',
              caption: 'Masjid Nabawi as you approach Madinah.',
              source: PHOTO_SOURCE,
            },
          ],
        },
        {
          step: 2,
          title: 'Give charity and proceed calmly to the mosque',
          detail:
            'If possible, give a little charity before your first visit. Walk to the mosque with focus, lower your gaze, and avoid unnecessary conversation on the way.',
        },
        {
          step: 3,
          title: 'Use the normal mosque-entry adab and dua',
          detail: `Enter with the right foot and read the masjid dua:

بِسْمِ اللهِ، اَللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ، اَللَّهُمَّ اغْفِرْ لِي وَافْتَحْ لِي أَبْوَابَ رَحْمَتِكَ

Transliteration:
Bismi Allah, Allahumma salli ala Muhammad, Allahumma-ghfir li wa-ftah li abwaba rahmatik.`,
        },
        {
          step: 4,
          title: 'Prefer Bab Jibril when possible, otherwise any gate',
          detail:
            'If Bab Jibril is open and accessible, entering from there is recommended by many scholars. If closed or restricted, enter from any available gate and keep full adab.',
          images: [
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2019/01/bab-jibril.jpg',
              caption: 'Bab Jibril entrance area (access can vary by time and policy).',
              source: PHOTO_SOURCE,
            },
          ],
        },
        {
          step: 5,
          title: 'Follow current access rules for Rawdah',
          detail:
            'Access routes and timing are controlled by authorities and may change by season. Use official channels (for example Nusuk booking where required), and follow staff instructions without argument.',
          images: [
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2019/01/rawdah-entrance.jpg',
              caption: 'Rawdah entrance area (permit policies may apply).',
              source: PHOTO_SOURCE,
            },
          ],
        },
        {
          step: 6,
          title: 'Pray with composure before peak crowd movement',
          detail:
            'Pray obligatory salah with jamaah and perform nafl where feasible. If you cannot enter Rawdah at first attempt, do not force entry; continue worship and return at a valid time slot.',
        },
      ],
    },
    {
      heading: 'Rawdah and Prayer Flow',
      steps: [
        {
          step: 1,
          title: 'Pray Tahiyyat al-Masjid when appropriate',
          detail:
            'If a congregational prayer is not starting immediately, pray two rakah greeting of the mosque. If iqamah begins, join the jamaah first; that is better and sufficient.',
        },
        {
          step: 2,
          title: 'Use your time in Rawdah well',
          detail:
            'If you are granted entry, keep duas brief and sincere because space is shared by many visitors. Pray, make istighfar, and send Salawat rather than trying to prolong one physical spot.',
        },
        {
          step: 3,
          title: 'Approach Bab al-Salam route with humility',
          detail:
            'After prayer and dua, follow permitted pathways toward Bab al-Salam if open in your flow channel. Continue Salawat and avoid jostling or blocking others.',
          images: [
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2019/01/bab-al-salam.jpg',
              caption: 'Bab al-Salam approach route toward the salam area.',
              source: PHOTO_SOURCE,
            },
          ],
        },
        {
          step: 4,
          title: 'Understand the sacred chamber orientation',
          detail:
            'The visible enclosures are not separate burial spots in the way many people assume. The Prophet ﷺ, Abu Bakr, and Umar are in the middle enclosure area according to the standard explanation used by guides there.',
          images: [
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2019/01/Mawajaha.jpg',
              caption: 'The Mawajaha (front-facing chamber grille area).',
              source: PHOTO_SOURCE,
            },
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2019/01/southern-gallery-masjid-nabawi.jpg',
              caption: 'Southern gallery near the salam passage route.',
              source: PHOTO_SOURCE,
            },
          ],
        },
        {
          step: 5,
          title: 'Avoid pushing and vocal excess',
          detail:
            'Do not shove, climb barriers, or raise slogans loudly. Preserving adab with fellow Muslims is part of honoring the Prophet ﷺ and part of the accepted etiquette of ziyarah.',
        },
        {
          step: 6,
          title: 'Keep worship quality above quantity',
          detail:
            'A short prayer with presence is better than many distracted actions. Inward humility, gratitude, and truthful dua are central goals of this visit.',
        },
      ],
    },
    {
      heading: 'Presenting Salam to the Prophet ﷺ',
      steps: [
        {
          step: 1,
          title: 'Approach with stillness, adab, and a moderate voice',
          detail:
            'When you reach the salam area, stand respectfully according to barriers and staff direction. A common adab description is to stand slightly leftward with your back to qiblah while facing the blessed chamber area. Keep your voice average and calm; do not raise it loudly.',
        },
        {
          step: 2,
          title: 'Give at least the minimum salam',
          detail: `The minimum you should say is:

اَلسَّلَامُ عَلَيْكَ يَا رَسُولَ اللهِ

Transliteration:
As-salamu alayka ya rasula Allah.

Translation:
Peace be upon you, O Messenger of Allah.`,
        },
        {
          step: 3,
          title: 'Choose short or long salam by heart presence',
          detail:
            'It is not compulsory to recite a long salam. If a longer form increases your yearning and focus, use it. Otherwise, repeat a short salam with sincerity, tranquility, and full decorum so the words truly resonate in your heart.',
        },
        {
          step: 4,
          title: 'Examples of additional salam formulas',
          detail: `You may also recite:

اَلصَّلوةُ وَ السَّلَامُ عَلَيْكَ يَا رَسُولَ اللهِ
صَلَّى اللهُ عَلَيْكَ يَا رَسُولَ اللهِ
اَلسَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ

Transliteration:
As-salatu wa s-salamu alayka ya rasula Allah.
Salla Allahu alayka ya rasula Allah.
As-salamu alayka ayyuha n-nabiyyu wa rahmatu Allahi wa barakatuh.`,
        },
        {
          step: 5,
          title: 'Optional longer greeting forms',
          detail: `Longer forms include:

اَلصَّلَاةُ وَالسَّلَامُ عَلَيْكَ يَا سَيِّدِي يَا رَسُولَ اللهِ
اَلصَّلَاةُ وَالسَّلَامُ عَلَيْكَ يَا سَيِّدِي يَا حَبِيبَ اللهِ
اَلصَّلَاةُ وَالسَّلَامُ عَلَيْكَ يَا سَيِّدِي يَا رَحْمَةً لِّلْعَالَمِينَ
وَعَلَى آلِكَ وَأَصْحَابِكَ يَا سَيِّدِي يَا نُورَ اللهِ

And:
اَلسَّلَامُ عَلَيْكَ يَا رَسُولَ اللهِ
السَّلَامُ عَلَيْكَ يَا خَيْرَةَ اللهِ مِنْ خَلْقِهِ
اَلسَّلَامُ عَلَيْكَ يَا حَبِيبَ اللهِ
اَلسَّلَامُ عَلَيْكَ يَا سَيِّدَ الْمُرْسَلِينَ وَخَاتَمَ النَّبِيِّينَ
السَّلَامُ عَلَيْكَ وَعَلَى آلِكَ وَأَصْحَابِكَ وَأَهْلِ بَيْتِكَ وَعَلَى النَّبِيِّينَ وَسَائِرَ الصَّالِحِينَ
أَشْهَدُ أَنَّكَ بَلَّغْتَ الرِّسَالَةَ وَأَدَّيْتَ الْأَمَانَةَ وَنَصَحْتَ الْأُمَّةَ
جَزَاكَ اللهُ عَنَّا أَفْضَلَ مَا جَزَى رَسُولًا عَنْ أُمَّتِهِ`,
        },
        {
          step: 6,
          title: 'After salam: durood, shahadah, and intercession',
          detail: `After salam, you may recite Salat al-Ibrahimiyyah (Durood Ibrahim), repeat the shahadah, and ask the Prophet ﷺ for intercession for yourself and the Ummah.

Common intercession dua:
يَا رَسُولَ اللهِ أَسْأَلُكَ الشَّفَاعَةَ وَأَتَوَسَّلُ بِكَ إِلَى اللهِ أَنْ أَمُوتَ مُسْلِمًا عَلَى مِلَّتِكَ وَسُنَّتِكَ

Transliteration:
Ya rasula Allah, asaluka ash-shafaata wa atawassalu bika ila Allahi an amuta musliman ala millatika wa sunnatika.

Note:
If you open your hands in dua while facing the blessed chamber, some authorities may object even where scholars permit this. Follow local rules and avoid confrontation.`,
        },
        {
          step: 7,
          title: 'Convey salam on behalf of others',
          detail: `Individual formula:
السَّلَامُ عَلَيْكَ يَا رَسُولَ اللهِ مِنْ فُلَانِ بْنِ فُلَانٍ

Transliteration:
As-salamu alayka ya rasula Allahi min fulanin ibni (binti) fulan.

Collective formula:
السَّلَامُ عَلَيْكَ يَا رَسُولَ اللهِ مِنْ جَمِيعِ مَنْ أَوْصَانِي بِالسَّلَامِ

Transliteration:
As-salamu alayka ya rasula Allahi min jamii man awsani bi s-salam.

Name examples:
Zayd ibn Ahmad (male), Zaynab bint Ahmad (female).

If Arabic is difficult, you may convey greetings in your own language with sincerity.`,
        },
      ],
    },
    {
      heading: 'Greeting Abu Bakr and Umar (Allah be pleased with them)',
      steps: [
        {
          step: 1,
          title: 'Move with the line and greet each respectfully',
          detail:
            'After greeting the Prophet ﷺ and making dua, take a step to the right so you are in line with Abu Bakr al-Siddiq, then another step right to greet Umar ibn al-Khattab (Allah be pleased with them).',
        },
        {
          step: 2,
          title: 'Greeting Abu Bakr al-Siddiq (Allah be pleased with him)',
          detail: `You may greet him with short or longer forms:

اَلسَّلَامُ عَلَيْكَ يَا أَبَا بَكْرٍ
اَلسَّلَامُ عَلَيْكَ يَا خَلِيفَةَ الْمُسْلِمِينَ أَبَا بَكْرِ الصِّدِّيقَ
اَلسَّلَامُ عَلَيْكَ يَا أَبَا بَكْرٍ صَفِيَّ رَسُولِ اللهِ وَثَانِيهِ فِي الْغَارِ
جَزَاكَ اللهُ عَنْ أُمَّةِ مُحَمَّدٍ خَيْرًا`,
        },
        {
          step: 3,
          title: 'Greeting Umar ibn al-Khattab (Allah be pleased with him)',
          detail: `You may greet him with short or longer forms:

اَلسَّلَامُ عَلَيْكَ يَا عُمَرُ
السَّلَامُ عَلَيْكَ يَا أَمِيْرَ الْمُؤْمِنِيْنَ عُمَرَ بْنِ الْخَطَّابِ
اَلسَّلَامُ عَلَيْكَ يَا عِزَّ الْإِسْلَامِ وَالْمُسْلِمِينَ عُمَرَ بْنِ الْخَطَّابِ الْفَارُوقَ
جَزَاكَ اللهُ عَنْ أُمَّةِ مُحَمَّدٍ خَيْرًا`,
        },
        {
          step: 4,
          title: 'Greeting the Shaykhayn together',
          detail: `You may then greet both companions together:

اَلسَّلَامُ عَلَيْكُمَا يَا ضَجِيعَيْ رَسُولِ اللهِ وَرَفِيقَيْهِ وَوَزِيرَيْهِ
وَجَزَاكُمَا اللهُ أَحْسَنَ الْجَزَاءِ`,
        },
        {
          step: 5,
          title: 'Conclude with gratitude and dua',
          detail:
            'Praise them, thank them, and make dua for yourself and the Ummah. Then move on gently so others can complete their greetings.',
        },
      ],
    },
    {
      heading: 'Tawassul and Shafaah: Sunni Adab',
      steps: [
        {
          step: 1,
          title: 'The legitimacy of tawassul in Sunni tradition',
          detail:
            'Tawassul means asking Allah through a wasilah (means). Mainstream Sunni scholarship permits asking Allah through the rank and honor of His righteous servants, especially the Prophet ﷺ, while affirming that Allah alone grants benefit and harm.',
        },
        {
          step: 2,
          title: 'Hadith evidence: the blind man taught a tawassul dua',
          detail: `In narrations found in al-Nasai and al-Tirmidhi, Uthman ibn Hunayf reports that a blind man asked the Prophet ﷺ for dua. The Prophet ﷺ taught:

اَللَّهُمَّ إِنِّي أَسْئَلُكَ وَأَتَوَجَّهُ إِلَيْكَ بِنَبِيِّكَ مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ نَبِيِّ الرَّحْمَةِ
يَا مُحَمَّدُ إِنِّي أَتَوَجَّهُ بِكَ إِلَى رَبِّي فِي حَاجَتِي لِيَقْضِي لِي
اَللَّهُمَّ شَفِّعْهُ فِيَّ

Transliteration:
Allahumma inni asaluka wa atawajjahu ilayka bi nabiyyika Muhammadin sallallahu alayhi wa sallama nabiyya r-rahmah.
Ya Muhammadu inni atawajjahu bika ila rabbi fi hajati liyaqdi li.
Allahumma shaffihu fiyya.

Translation:
O Allah, I ask You and turn to You through Your Prophet Muhammad, the Prophet of mercy.
O Muhammad, I turn through you to my Lord for my need, that He fulfills it.
O Allah, accept his intercession in my favor.

Many scholars mention this dua after presenting salam.`,
        },
        {
          step: 3,
          title: 'Classical report: Atabi and the Bedouin at Rawdah',
          detail: `A classical report attributed to Atabi describes a Bedouin at Rawdah reciting Quran 4:64 and asking for intercession.

Key wording:
السَّلَامُ عَلَيْكَ يَا رَسُولَ اللهِ ... وَقَدْ جِئْتُكَ مُسْتَغْفِرًا مِنْ ذَنْبِي مُسْتَشْفِعًا بِكَ إِلَى رَبِّي

He then recited:
يَا خَيْرَ مَنْ دُفِنَتْ بِالْقَاعِ أَعْظُمُهُ
فَطَابَ مِنْ طِيبِهِنَّ الْقَاعُ وَالْأَكَمُ
نَفْسِي الْفِدَاءُ لِقَبْرٍ أَنْتَ سَاكِنُهُ
فِيهِ الْعَفَافُ وَفِيهِ الْجُودُ وَالْكَرَمُ`,
        },
        {
          step: 4,
          title: 'Ask for intercession with humility and hope',
          detail:
            'After salam, plead for the Prophet\'s ﷺ intercession for yourself, parents, family, teachers, friends, and the Ummah. You may also ask in your own language for forgiveness, steadfastness, good ending, and nearness to Allah through love of His Messenger ﷺ.',
        },
        {
          step: 5,
          title: 'Keep tawhid clear and avoid excess claims',
          detail:
            'Maintain the creed that Allah alone is the One who grants. Tawassul is a means in dua, not independent divinity for creation. This preserves both love and doctrinal clarity.',
        },
        {
          step: 6,
          title: 'Avoid polemics and take the character of ziyarah home',
          detail:
            'Do not turn sacred spaces into arguments. Keep your focus on worship, repentance, mercy, and service. The fruit of accepted ziyarah is better prayer, better speech, and better character after return.',
        },
      ],
    },
    {
      heading: 'During Your Stay in Madinah',
      steps: [
        {
          step: 1,
          title: 'Prioritize five daily prayers in the mosque',
          detail:
            'Center your schedule around jamaah in Masjid al-Nabawi, Qur\'an recitation, Salawat, and quiet remembrance.',
        },
        {
          step: 2,
          title: 'Visit al-Baqi and make dua for the deceased',
          detail: `Visit Jannat al-Baqi with adab and recite the graveyard greeting.

Common wording:
السَّلَامُ عَلَيْكُمْ أَهْلَ الدِّيَارِ مِنَ الْمُؤْمِنِينَ وَالْمُسْلِمِينَ وَإِنَّا إِنْ شَاءَ اللهُ بِكُمْ لَلَاحِقُونَ

Transliteration:
As-salamu alaykum ahla d-diyari min al-muminina wa al-muslimin, wa inna in sha Allahu bikum la-lahiqun.

Translation:
Peace be upon you, O inhabitants of these dwellings, believers and Muslims. We will, if Allah wills, join you.

You may add:
اللَّهُمَّ اغْفِرْ لِأَهْلِ بَقِيعِ الْغَرْقَدِ
Allahumma-ghfir li-ahli baqi al-gharqad.
O Allah, forgive the people of Baqi al-Gharqad.`,
          images: [
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2020/12/baqi-aerial.jpg',
              caption: 'Aerial view of Jannat al-Baqi next to Masjid al-Nabawi.',
              source: BAQI_DETAILS_SOURCE,
            },
            {
              uri: 'https://takemetoumrah.com/wp-content/uploads/elementor/thumbs/View-of-Jannatul-Baqi-740x456-1-r76263lih0psbf2ccfgmfojvvvko96ydn7n3e65vns.webp',
              caption: 'Jannat al-Baqi view (alternate source image).',
              source: BAQI_ALT_SOURCE,
            },
          ],
        },
        {
          step: 3,
          title: 'Visit Quba and sites of Prophetic history',
          detail:
            'Visit Masjid Quba and other permitted historical locations respectfully. Avoid exaggerated claims from unverified tour commentary.',
        },
        {
          step: 4,
          title: 'Protect people from your inconvenience',
          detail:
            'Keep walkways open, obey security routing, and help elders. Sunni adab gives priority to not harming others while seeking personal devotion.',
        },
        {
          step: 5,
          title: 'Repeat salam when passing respectfully',
          detail:
            'If your route passes near the salam area or the chamber boundary from a permissible path, send salam briefly and continue without causing congestion.',
        },
        {
          step: 6,
          title: 'Keep your tongue and phone disciplined',
          detail:
            'Reduce idle talk, arguments, and excessive filming. Preserve private moments of worship and avoid turning sacred time into performance.',
        },
      ],
    },
    {
      heading: 'Jannat al-Baqi Map and Notable Graves',
      steps: [
        {
          step: 1,
          title: 'Use the map as an orientation aid, not exact plot proof',
          detail:
            'Use the attached-style map and the linked Baqi maps for broad orientation only. Most graves in al-Baqi are unmarked today, and exact plot attribution can differ between historical reports and modern guide maps.',
          images: [
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2020/12/jannat-al-baqi-map-scaled.jpg',
              caption: 'Jannat al-Baqi map overview matching common labeled layouts.',
              source: BAQI_MAP_SOURCE,
            },
          ],
        },
        {
          step: 2,
          title: 'Ahl al-Bayt area shown in common Baqi maps',
          detail:
            'Commonly listed in this zone: al-Hasan ibn Ali, Ali ibn Husayn Zayn al-Abidin, Muhammad al-Baqir, Jafar al-Sadiq, and al-Abbas ibn Abdul Muttalib. Many maps also mark Sayyidah Fatimah al-Zahra in this area, while scholars note that exact grave placement remains a historical discussion.',
          images: [
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2020/12/ahlul-bayt-baqi-2.jpg',
              caption: 'Ahl al-Bayt enclosure area in Baqi map guides.',
              source: BAQI_DETAILS_SOURCE,
            },
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2020/12/ahlul-bayt-baqi-numbered.jpg',
              caption: 'Numbered Ahl al-Bayt reference view used in map explanations.',
              source: BAQI_DETAILS_SOURCE,
            },
          ],
        },
        {
          step: 3,
          title: 'Daughters and wives of the Prophet ﷺ in Baqi labels',
          detail:
            'Daughters commonly listed: Ruqayyah, Umm Kulthum, and Zaynab (may Allah be pleased with them). Wives commonly listed in Baqi maps: Aisha, Sawda, Hafsa, Zaynab bint Khuzayma, Zaynab bint Jahsh, Umm Salama, Juwayriyya, Umm Habiba, and Safiyya (may Allah be pleased with them all).',
          images: [
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2017/03/daughters-prophet-grave.jpg',
              caption: 'Reference marker area for the daughters of the Prophet ﷺ.',
              source: BAQI_DETAILS_SOURCE,
            },
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2020/12/wives-graves.jpg',
              caption: 'Reference marker area for the wives of the Prophet ﷺ.',
              source: BAQI_DETAILS_SOURCE,
            },
          ],
        },
        {
          step: 4,
          title: 'Relatives and scholars often marked in map labels',
          detail:
            'Frequently labeled: Aqil ibn Abi Talib, Abdullah ibn Jafar, Imam Malik ibn Anas, and Imam Nafi ibn Abi Nuaym. Some maps also include Abu Sufyan ibn al-Harith in the same broader zone.',
          images: [
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2017/03/imam-malik-imam-nafi-grave.jpg',
              caption: 'Map-marker reference area for Imam Malik and Imam Nafi.',
              source: BAQI_DETAILS_SOURCE,
            },
          ],
        },
        {
          step: 5,
          title: 'Companions and other notable graves (expanded list)',
          detail:
            'Commonly labeled in your map and supporting guides: Uthman ibn Affan, Ibrahim ibn Muhammad (the Prophet\'s son), Sayyidah Halimah al-Sadiyyah, Sa\'d ibn Mu\'adh, Abu Sa\'id al-Khudri, the Martyrs of al-Harrah, Safiyyah bint Abdul Muttalib, Atika bint Abdul Muttalib, and Fatimah bint Asad. Additional widely cited historical burials in al-Baqi include Uthman ibn Mazun and Asad ibn Zurarah.',
          images: [
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2017/03/usman-ibn-affan-grave.jpg',
              caption: 'Reference marker area for Uthman ibn Affan in Baqi maps.',
              source: BAQI_DETAILS_SOURCE,
            },
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2017/03/grave-of-ibrahim.jpg',
              caption: 'Reference marker area for Ibrahim ibn Muhammad in map guides.',
              source: BAQI_DETAILS_SOURCE,
            },
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2017/03/halima-sadiyah-grave.jpg',
              caption: 'Reference marker area for Sayyidah Halimah al-Sadiyyah.',
              source: BAQI_DETAILS_SOURCE,
            },
            {
              uri: 'https://hajjumrahplanner.com/wp-content/uploads/2017/03/shuhada-harra-grave.jpg',
              caption: 'Reference marker area for the Martyrs of al-Harrah.',
              source: BAQI_DETAILS_SOURCE,
            },
          ],
        },
        {
          step: 6,
          title: 'Adab and access rules when visiting al-Baqi',
          detail:
            'Keep voice low, avoid stepping over graves, avoid crowd disruption, and make concise dua. Access times and entry rules are controlled by local authorities and may change; several guides report morning and post-Asr windows and restricted entry flows. Always follow current on-site instructions.',
        },
      ],
    },
    {
      heading: 'Farewell Visit and Departure',
      steps: [
        {
          step: 1,
          title: 'Make a final salam before leaving Madinah',
          detail:
            'Before departure, return for a final visit and salam if possible. Ask Allah to grant you return with adab, health, and accepted deeds.',
        },
        {
          step: 2,
          title: 'Make the farewell supplication',
          detail:
            'A commonly shared farewell request is: O Allah, let me die upon iman and Sunnah in the city of Madinah, and grant me burial in Jannat al-Baqi if You will.',
        },
        {
          step: 3,
          title: 'Leave with gratitude, not despair',
          detail:
            'Parting is emotional, but keep hopeful reliance on Allah. Continue Salawat on your journey home and preserve your prayers without decline.',
        },
        {
          step: 4,
          title: 'Carry Madinah etiquette back home',
          detail:
            'Measure acceptance by your post-trip character: better prayer, cleaner speech, honesty, gentleness, and service to family and community.',
        },
        {
          step: 5,
          title: 'Common mistakes to avoid',
          detail:
            'Avoid pushing crowds, shouting near the salam area, quarreling with staff, taking staged photos in blocked paths, and delaying obligatory prayers for optional acts.',
        },
        {
          step: 6,
          title: 'Safety and policy reminder',
          detail:
            'On-site management rules can change. Always prioritize official guidance, legal entry rules, and the safety of pilgrims over personal preference.',
        },
      ],
    },
  ],
};
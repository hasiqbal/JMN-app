/**
 * Generic local-image Mushaf viewer shared by Al-Kahf, Al-Mulk, Luqman, Imran, As-Sajdah.
 * Images are bundled via require() once uploaded to:
 *   assets/images/Quran 15 line indo-pak/{Kahf|Mulk|Luqman|Imran|Sajdah}/
 */
import React from 'react';
import { View, Text, TouchableOpacity, AppState, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { fetchChapterTranslationById, fetchTranslationResources, QuranTranslationResource } from '@/services/quranApiService';
import { SURAH_WAQIAH, SURAH_YASEEN } from '@/services/quranService';
import {
  IMRAN_PAGE_AYAT,
  KAHF_PAGE_AYAT,
  LUQMAN_PAGE_AYAT,
  MULK_PAGE_AYAT,
  SAJDAH_PAGE_AYAT,
  WAQIAH_PAGE_AYAT,
  YASEEN_PAGE_AYAT,
} from '@/constants/mushafPageAyat';

const URDU_TRANSLATOR_LABEL_OVERRIDES: Record<number, string> = {
  819: 'مولانا وحید الدین خان',
};

const DEFAULT_API_TRANSLATION_ID_BY_LANG: Record<'en' | 'ur', number> = {
  en: 131,
  ur: 54,
};
const DEFAULT_TRANSLATOR_LABEL_BY_LANG: Record<'en' | 'ur', string> = {
  en: 'Saheeh International',
  ur: 'اردو ترجمہ',
};

function buildVerseTranslationsByPage(
  ayatMap: Record<number, [number, number]>,
  verses: { ayah: number; translation: string; transliteration?: string }[],
): Record<number, VerseTranslation[]> {
  return Object.fromEntries(
    Object.entries(ayatMap).map(([pageNum, [startAyah, endAyah]]) => [
      Number(pageNum),
      verses
        .filter((verse) => verse.ayah >= startAyah && verse.ayah <= endAyah)
        .map((verse) => ({
          verse: verse.ayah,
          text: verse.translation,
          transliteration: verse.transliteration,
        })),
    ]),
  );
}

// ── Page lists & local asset maps ─────────────────────────────────────────
export const KAHF_PAGE_NUMS   = [293,294,295,296,297,298,299,300,301,302,303,304];
export const YASEEN_PAGE_NUMS = [440,441,442,443,444,445];
export const WAQIAH_PAGE_NUMS = [534,535,536,537];
export const MULK_PAGE_NUMS   = [562,563,564];
export const LUQMAN_PAGE_NUMS = [411,412,413,414];
export const IMRAN_PAGE_NUMS  = [75,76];
export const SAJDAH_PAGE_NUMS = [415,416,417];

export const KAHF_15LINE_LOCAL:   Partial<Record<number,any>> = {
  293: require('@/assets/images/Quran 15 line indo-pak/Kahf/293.jpg'),
  294: require('@/assets/images/Quran 15 line indo-pak/Kahf/294.jpg'),
  295: require('@/assets/images/Quran 15 line indo-pak/Kahf/295.jpg'),  
  296: require('@/assets/images/Quran 15 line indo-pak/Kahf/296.jpg'),
  297: require('@/assets/images/Quran 15 line indo-pak/Kahf/297.jpg'),
  298: require('@/assets/images/Quran 15 line indo-pak/Kahf/298.jpg'),
  299: require('@/assets/images/Quran 15 line indo-pak/Kahf/299.jpg'),
  300: require('@/assets/images/Quran 15 line indo-pak/Kahf/300.jpg'),
  301: require('@/assets/images/Quran 15 line indo-pak/Kahf/301.jpg'),
  302: require('@/assets/images/Quran 15 line indo-pak/Kahf/302.jpg'),
  303: require('@/assets/images/Quran 15 line indo-pak/Kahf/303.jpg'),
  304: require('@/assets/images/Quran 15 line indo-pak/Kahf/304.jpg')
};
export const KAHF_16LINE_LOCAL: Partial<Record<number,any>> = {};
export const YASEEN_15LINE_LOCAL: Partial<Record<number,any>> = {
  440: require('@/assets/images/Quran 15 line indo-pak/Yaseen/440.jpg'),
  441: require('@/assets/images/Quran 15 line indo-pak/Yaseen/441.jpg'),
  442: require('@/assets/images/Quran 15 line indo-pak/Yaseen/442.jpg'),
  443: require('@/assets/images/Quran 15 line indo-pak/Yaseen/443.jpg'),
  444: require('@/assets/images/Quran 15 line indo-pak/Yaseen/444.jpg'),
  445: require('@/assets/images/Quran 15 line indo-pak/Yaseen/445.jpg'),
};
export const YASEEN_16LINE_LOCAL: Partial<Record<number,any>> = {};
export const WAQIAH_15LINE_LOCAL: Partial<Record<number,any>> = {
  534: require('@/assets/images/Quran 15 line indo-pak/Waqiah/534.jpg'),
  535: require('@/assets/images/Quran 15 line indo-pak/Waqiah/535.jpg'),
  536: require('@/assets/images/Quran 15 line indo-pak/Waqiah/536.jpg'),
  537: require('@/assets/images/Quran 15 line indo-pak/Waqiah/537.jpg'),
};
export const WAQIAH_16LINE_LOCAL: Partial<Record<number,any>> = {};
export const MULK_15LINE_LOCAL:   Partial<Record<number,any>> = {
  562: require('@/assets/images/Quran 15 line indo-pak/Mulk/562.jpg'),
  563: require('@/assets/images/Quran 15 line indo-pak/Mulk/563.jpg'),
  564: require('@/assets/images/Quran 15 line indo-pak/Mulk/564.jpg'),
};
export const MULK_16LINE_LOCAL: Partial<Record<number,any>> = {};
export const LUQMAN_15LINE_LOCAL: Partial<Record<number,any>> = {
  411: require('@/assets/images/Quran 15 line indo-pak/Luqman/411.jpg'),
  412: require('@/assets/images/Quran 15 line indo-pak/Luqman/412.jpg'),
  413: require('@/assets/images/Quran 15 line indo-pak/Luqman/413.jpg'),
  414: require('@/assets/images/Quran 15 line indo-pak/Luqman/414.jpg'),
};
export const LUQMAN_16LINE_LOCAL: Partial<Record<number,any>> = {};
export const IMRAN_15LINE_LOCAL: Partial<Record<number,any>> = {
  75: require('@/assets/images/Quran 15 line indo-pak/Imran/75.jpg'),
  76: require('@/assets/images/Quran 15 line indo-pak/Imran/76.jpg'),
};
export const IMRAN_16LINE_LOCAL: Partial<Record<number,any>> = {};
export const SAJDAH_15LINE_LOCAL: Partial<Record<number,any>> = {
  415: require('@/assets/images/Quran 15 line indo-pak/Sajdah/415.jpg'),
  416: require('@/assets/images/Quran 15 line indo-pak/Sajdah/416.jpg'),
  417: require('@/assets/images/Quran 15 line indo-pak/Sajdah/417.jpg'),
};
export const SAJDAH_16LINE_LOCAL: Partial<Record<number,any>> = {};

// ── Translation type ──────────────────────────────────────────────────────
export interface VerseTranslation { verse: number; text: string; urduText?: string; transliteration?: string; }

const UNIFIED_MUSHAF_THEME = {
  accentDay: '#3FAE5A',
  accentNight: '#4FCB70',
  bgNight: '#0E1C12',
  hdrBgNight: '#13261A',
  hdrBorNight: '#2E6E40',
  bgDay: '#F7FAF8',
  hdrBgDay: '#E7F4EA',
  hdrBorDay: '#B7D9C0',
};

// ── Clear Quran Translation — Surah As-Sajdah ────────────────────────────
export const SAJDAH_TRANSLATIONS: Record<number, VerseTranslation[]> = {
  415: [
    { verse:1,  text: 'Alif, Lam, Meem.' },
    { verse:2,  text: 'The revelation of the Book, about which there is no doubt, is from the Lord of all worlds.' },
    { verse:3,  text: 'Or do they say, "He made it up"? No! It is the truth from your Lord in order for you to warn a people to whom no warner has come before you, so perhaps they will be ˹rightly˺ guided.' },
    { verse:4,  text: 'It is Allah Who created the heavens and the earth and everything in between in six Days, then established Himself on the Throne. You have no protector or intercessor besides Him. Will you not then be mindful?' },
    { verse:5,  text: 'He conducts every affair from the heavens to the earth, then it all ascends to Him on a Day whose measure is one thousand years by your counting.' },
    { verse:6,  text: 'That is the Knower of the seen and unseen — the Almighty, Most Merciful,' },
    { verse:7,  text: 'Who created everything perfectly, and began the creation of humans from clay,' },
    { verse:8,  text: 'then made their descendants from an extract of a humble fluid,' },
    { verse:9,  text: 'then He fashioned them and had a spirit of His Own ˹creation˺ breathed into them. And He gave you hearing, sight, and intellect. ˹Yet˺ you are hardly ever grateful.' },
    { verse:10, text: 'Still they ask ˹in mockery˺, "When we have ˹completely˺ vanished into the earth, will we really be raised in a new creation?" In fact, they are in denial of the meeting with their Lord.' },
    { verse:11, text: 'Say, "Your soul will be taken by the Angel of Death, who is in charge of you. Then to your Lord you will ˹all˺ be returned."' },
    { verse:12, text: 'If only you could see the wicked hanging their heads ˹in shame˺ before their Lord, ˹crying:˺ "Our Lord! We have now seen and heard, so send us back and we will do good. We truly have sure faith ˹now˺."' },
  ],
  416: [
    { verse:13, text: 'Had We willed, We could have given every soul its ˹own˺ guidance. But My Word will come to pass: I will surely fill Hell with jinn and humans all together.' },
    { verse:14, text: '˹Then it will be said to them,˺ "Taste ˹the punishment˺ for your forgetting the meeting of this Day of yours. We have ˹certainly˺ forgotten you. Taste the torment of eternity for what you used to do."' },
    { verse:15, text: 'Only those who believe in Our signs ˹truly˺ are those who, when they are reminded of them, fall down in prostration and glorify the praises of their Lord, and are not arrogant.' },
    { verse:16, text: 'Their sides leave their beds ˹in the night˺ to pray to their Lord with hope and fear, and donate from what We have provided for them.' },
    { verse:17, text: 'No soul can imagine what ˹blissful˺ delights are kept in store for them as a reward for what they used to do.' },
    { verse:18, text: 'Is the ˹true˺ believer equal to the rebellious? They are not equal.' },
    { verse:19, text: 'As for those who believe and do good, they will have the Gardens of ˹Eternal˺ Residence as accommodation, in return for what they used to do.' },
    { verse:20, text: 'And as for those who are rebellious, the Fire will be their home. Every time they try to escape from it, they will be pushed back into it, and will be told, "Taste the torment of the Fire, which you used to deny."' },
    { verse:21, text: 'We will certainly make them taste some of the minor torment ˹in this life˺ before the major torment ˹of the Hereafter˺, so perhaps they will return ˹to the right path˺.' },
    { verse:22, text: 'Who does more wrong than those who are reminded of their Lord\'s signs then turn away from them? We will certainly inflict punishment upon the wicked.' },
  ],
  417: [
    { verse:23, text: 'Indeed, We gave Moses the Scripture — so do not be in doubt about receiving ˹revelation˺ — and We made it a guide for the Children of Israel.' },
    { verse:24, text: 'We raised from among them leaders, guiding by Our command, when they were patient and firmly believed in Our signs.' },
    { verse:25, text: 'Surely your Lord will judge between them on the Day of Judgment regarding their differences.' },
    { verse:26, text: 'Has it not been a ˹sufficient˺ guide for them to see how many peoples We destroyed before them, whose ruins they still walk through? Surely in this are signs. Will they not then listen?' },
    { verse:27, text: 'Have they not seen how We drive rain to barren land, producing crops from which they and their livestock eat? Will they not then see?' },
    { verse:28, text: 'They ask ˹mockingly˺, "When will this ˹ultimate˺ decision come, if what you say is true?"' },
    { verse:29, text: 'Say, "On the Day of ˹that˺ Decision, the belief of the disbelievers will be of no benefit to them, nor will they be granted a delay."' },
    { verse:30, text: 'So turn away from them and wait. They too are waiting.' },
  ],
};

// ── Translation — Last Ayahs of Surah Al-Imran (3:190-200) ───────────────
export const IMRAN_LAST_AYAH_TRANSLATIONS: Record<number, VerseTranslation[]> = {
  75: [
    { verse: 190, text: 'Indeed, in the creation of the heavens and the earth and the alternation of the night and the day are signs for people of understanding.', urduText: 'بے شک آسمانوں اور زمین کی پیدائش اور رات اور دن کے بدلنے میں عقل والوں کے لیے نشانیاں ہیں۔', transliteration: 'Inna fi khalqi as-samawati wal-ardi wakhtilafi al-layli wan-nahari la-ayatin li-ulil-albab.' },
    { verse: 191, text: 'Those who remember Allah while standing, sitting, and lying on their sides, and reflect on the creation of the heavens and the earth, saying, "Our Lord, You did not create this in vain. Glory be to You, so protect us from the punishment of the Fire."', urduText: 'جو اللہ کو کھڑے، بیٹھے اور اپنے پہلوؤں پر لیٹے ہوئے یاد کرتے ہیں اور آسمانوں اور زمین کی پیدائش میں غور کرتے ہیں، کہتے ہیں: اے ہمارے رب! تو نے یہ سب بے مقصد نہیں بنایا، تو پاک ہے، پس ہمیں آگ کے عذاب سے بچا لے۔', transliteration: 'Alladhina yadhkuruna Allaha qiyaman waqu`udan wa`ala junubihim wa yatafakkaruna fi khalqi as-samawati wal-ard. Rabbana ma khalaqta hadha batilan, subhanaka faqina `adhaba an-nar.' },
    { verse: 192, text: 'Our Lord, indeed whoever You admit into the Fire, You have certainly disgraced him, and there are no helpers for the wrongdoers.', urduText: 'اے ہمارے رب! جسے تو نے آگ میں داخل کیا، یقیناً تو نے اسے رسوا کر دیا، اور ظالموں کا کوئی مددگار نہیں۔', transliteration: 'Rabbana innaka man tudkhili an-nara faqad akhzaytahu, wa ma liz-zalimina min ansar.' },
    { verse: 193, text: 'Our Lord, indeed we have heard a caller calling to faith, saying, "Believe in your Lord," and we have believed. Our Lord, forgive us our sins, remove from us our misdeeds, and cause us to die with the righteous.', urduText: 'اے ہمارے رب! ہم نے ایک پکارنے والے کو ایمان کی طرف بلاتے سنا کہ اپنے رب پر ایمان لاؤ، تو ہم ایمان لے آئے۔ اے ہمارے رب! ہمارے گناہ بخش دے، ہماری برائیاں ہم سے دور کر دے، اور ہمیں نیک لوگوں کے ساتھ وفات دے۔', transliteration: 'Rabbana innana sami`na munadiyan yunadi lil-imani an aminu birabbikum fa-amanna. Rabbana faghfir lana dhunubana wa kaffir `anna sayyiatina wa tawaffana ma`a al-abrar.' },
    { verse: 194, text: 'Our Lord, grant us what You have promised us through Your messengers and do not disgrace us on the Day of Resurrection. Indeed, You never fail in Your promise.', urduText: 'اے ہمارے رب! ہمیں وہ عطا فرما جس کا تو نے اپنے رسولوں کے ذریعے ہم سے وعدہ کیا ہے اور قیامت کے دن ہمیں رسوا نہ کرنا۔ بے شک تو وعدہ خلافی نہیں کرتا۔', transliteration: 'Rabbana wa atina ma wa`adtana `ala rusulika wa la tukhzina yawma al-qiyamah. Innaka la tukhlifu al-mi`ad.' },
  ],
  76: [
    { verse: 195, text: 'So their Lord answered them, "I never allow the work of any worker among you to be lost, whether male or female; you are of one another. So those who emigrated, were expelled from their homes, were harmed in My cause, fought, and were killed - I will surely remove from them their misdeeds and admit them to Gardens beneath which rivers flow as a reward from Allah. And with Allah is the best reward."', urduText: 'پس ان کے رب نے ان کی دعا قبول فرما لی کہ میں تم میں سے کسی عمل کرنے والے کا عمل ضائع نہیں کرتا، خواہ مرد ہو یا عورت، تم ایک دوسرے ہی سے ہو۔ پس جن لوگوں نے ہجرت کی، اپنے گھروں سے نکالے گئے، میری راہ میں ستائے گئے، لڑے اور قتل کیے گئے، میں ضرور ان کی برائیاں ان سے دور کر دوں گا اور انہیں ایسے باغات میں داخل کروں گا جن کے نیچے نہریں بہتی ہیں۔ یہ اللہ کے پاس سے بدلہ ہے، اور بہترین بدلہ اللہ ہی کے پاس ہے۔', transliteration: 'Fastajaba lahum rabbuhum anni la udi`u `amala `amilin minkum min dhakarin aw untha ba`dukum min ba`d. Falladhina hajaru wa ukhriju min diyarihim wa udhu fi sabili wa qatalu wa qutillu la-ukaffiranna `anhum sayyiatihim wa la-udkhilannahum jannatin tajri min tahtiha al-anhar thawaban min `indi Allah. Wa Allahu `indahu husnu ath-thawab.' },
    { verse: 196, text: 'Do not be deceived by the movement of the disbelievers throughout the land.', urduText: 'کافروں کا شہروں میں چلنا پھرنا تمہیں دھوکے میں نہ ڈالے۔', transliteration: 'La yaghurrannaka taqallubu alladhina kafaru fi al-bilad.' },
    { verse: 197, text: 'It is only a brief enjoyment, then their refuge is Hell - and what an evil resting place.', urduText: 'یہ تھوڑا سا فائدہ ہے، پھر ان کا ٹھکانا جہنم ہے، اور وہ بہت برا ٹھکانا ہے۔', transliteration: 'Mata`un qalilun thumma ma-wahum jahannam, wa bi-sa al-mihad.' },
    { verse: 198, text: 'But those who fear their Lord will have Gardens beneath which rivers flow, remaining in them forever, as a welcome from Allah. And what is with Allah is best for the righteous.', urduText: 'لیکن جو لوگ اپنے رب سے ڈرتے رہے، ان کے لیے ایسے باغات ہیں جن کے نیچے نہریں بہتی ہیں، وہ ان میں ہمیشہ رہیں گے، یہ اللہ کی طرف سے مہمانی ہے، اور جو کچھ اللہ کے پاس ہے وہ نیک لوگوں کے لیے بہتر ہے۔', transliteration: 'Lakini alladhina ittaqaw rabbahum lahum jannatun tajri min tahtiha al-anhar khalidina fiha nuzulan min `indi Allah. Wa ma `inda Allahi khayrun lil-abrar.' },
    { verse: 199, text: 'Indeed, among the People of the Scripture are those who believe in Allah and in what has been revealed to you and what has been revealed to them, humbling themselves before Allah. They do not exchange Allah\'s verses for a small price. Those will have their reward with their Lord. Indeed, Allah is swift in account.', urduText: 'اور یقیناً اہلِ کتاب میں کچھ ایسے بھی ہیں جو اللہ پر ایمان رکھتے ہیں اور اس پر بھی جو تمہاری طرف نازل کیا گیا اور اس پر بھی جو ان کی طرف نازل کیا گیا، اللہ کے آگے جھکنے والے ہیں۔ وہ اللہ کی آیات کے بدلے تھوڑی قیمت نہیں لیتے۔ یہی وہ لوگ ہیں جن کے لیے ان کے رب کے پاس اجر ہے۔ بے شک اللہ جلد حساب لینے والا ہے۔', transliteration: 'Wa inna min ahli al-kitabi laman yu-minu billahi wa ma unzila ilaykum wa ma unzila ilayhim khashi`ina lillah, la yashtaruna bi-ayati Allahi thamanan qalila. Ulaika lahum ajruhum `inda rabbihim. Inna Allaha sari`u al-hisab.' },
    { verse: 200, text: 'O you who believe, persevere and endure and remain stationed and fear Allah so that you may be successful.', urduText: 'اے ایمان والو! صبر کرو، ثابت قدم رہو، پہرہ دیتے رہو، اور اللہ سے ڈرتے رہو تاکہ تم کامیاب ہو جاؤ۔', transliteration: 'Ya ayyuha alladhina amanu isbiru wa sabiru wa rabitu wa ittaqu Allaha la`allakum tuflihun.' },
  ],
};

export const YASEEN_TRANSLATIONS = buildVerseTranslationsByPage(YASEEN_PAGE_AYAT, SURAH_YASEEN);
export const WAQIAH_TRANSLATIONS = buildVerseTranslationsByPage(WAQIAH_PAGE_AYAT, SURAH_WAQIAH);

// ── Shared internal viewer ───────────────────────────────────────────────
interface ViewerProps {
  nightMode: boolean;
  pageNums: number[];
  localPages: Partial<Record<number, any>>;
  localPages16?: Partial<Record<number, any>>;
  ayatMap: Record<number, [number,number]>;
  translations?: Record<number, VerseTranslation[]>;
  nameAr: string;
  nameEn: string;
  juz: string;
  accentDay: string;
  accentNight: string;
  bgNight: string; hdrBgNight: string; hdrBorNight: string;
  bgDay:  string; hdrBgDay:  string; hdrBorDay:  string;
  chapterNumber?: number;
  enableApiTranslationPicker?: boolean;
}

function MushafImageViewer({
  nightMode, pageNums, localPages, localPages16, ayatMap, translations,
  nameAr, nameEn, juz,
  accentDay, accentNight, bgNight, hdrBgNight, hdrBorNight, bgDay, hdrBgDay, hdrBorDay,
  chapterNumber, enableApiTranslationPicker,
}: ViewerProps) {
  const N = nightMode;
  const transScrollRef = React.useRef<ScrollView>(null);
  const [pi, setPi] = React.useState(0);
  const [rk, setRk] = React.useState(0);
  const [layoutStyle, setLayoutStyle] = React.useState<'15line' | '16line'>('15line');
  const [showTrans, setShowTrans] = React.useState(false);
  const [transLang, setTransLang] = React.useState<'en' | 'ur'>('en');
  const [showApiPicker, setShowApiPicker] = React.useState(false);
  const [apiOptionsByLang, setApiOptionsByLang] = React.useState<Record<'en' | 'ur', QuranTranslationResource[]>>({ en: [], ur: [] });
  const [selectedTranslationIdByLang, setSelectedTranslationIdByLang] = React.useState<Record<'en' | 'ur', number | null>>({ en: null, ur: null });
  const [apiMapByVerse, setApiMapByVerse] = React.useState<Record<number, string>>({});
  const [apiMapCache, setApiMapCache] = React.useState<Record<string, Record<number, string>>>({});
  const [isLoadingApiTrans, setIsLoadingApiTrans] = React.useState(false);
  const [showTranslit, setShowTranslit] = React.useState(false);
  const transLocale: 'en' | 'ur' = transLang === 'ur' ? 'ur' : 'en';
  const apiOptions = apiOptionsByLang[transLocale] ?? [];
  const selectedTranslationId = selectedTranslationIdByLang[transLocale] ?? null;

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') setTimeout(() => setRk(k => k + 1), 150);
    });
    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    if (!showTrans) return;
    transScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [pi, showTrans]);

  React.useEffect(() => {
    if (!showTrans || !enableApiTranslationPicker || !chapterNumber || apiOptions.length > 0) return;
    let cancelled = false;
    (async () => {
      const opts = await fetchTranslationResources(transLocale);
      if (cancelled) return;
      const requiredLang = transLocale === 'en' ? 'english' : 'urdu';
      const langFiltered = opts.filter((o) => {
        const languageOk = (o.languageName ?? '').toLowerCase().includes(requiredLang);
        const searchable = `${o.name} ${o.authorName ?? ''}`.toLowerCase();
        const isExcluded = /taqi\s*usmani|taqi\s*usman|maududi|tafhim|shaykh\s*al\s*hind|shaikh\s*al\s*hind|mahmud\s*al[-\s]*hasan|mahmood\s*al[-\s]*hasan|tafsir\s*e\s*usmani|tafsir[-\s]*usmani/.test(searchable);
        return languageOk && !isExcluded;
      });
      const preferred = transLocale === 'en' ? [131, 20, 85, 84, 22, 21] : [];
      const ordered = [
        ...preferred.map((id) => langFiltered.find((o) => o.id === id)).filter(Boolean) as QuranTranslationResource[],
        ...langFiltered.filter((o) => !preferred.includes(o.id)).slice(0, 24),
      ];
      setApiOptionsByLang((prev) => ({ ...prev, [transLocale]: ordered }));
    })();
    return () => { cancelled = true; };
  }, [showTrans, enableApiTranslationPicker, chapterNumber, apiOptions.length, transLocale]);

  const txX = useSharedValue(0);
  const sc   = useSharedValue(1);
  const svSc = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform:[{translateX:txX.value},{scale:sc.value}], flex:1, width:'100%' }));

  const BG=N?bgNight:bgDay, HDR_BG=N?hdrBgNight:hdrBgDay, HDR_BOR=N?hdrBorNight:hdrBorDay;
  const ACCENT=N?accentNight:accentDay, META=N?'#94A3B8':'#6B7280';
  const ACCENT_SOFT = ACCENT + '18';
  const ACCENT_BORDER = ACCENT + '32';
  const hasImages = Object.keys(localPages).length > 0;
  const has16LineImages = Object.keys(localPages16 ?? {}).length > 0;
  const pageNum = pageNums[pi];
  const pageAyahRange = ayatMap[pageNum];
  const hasTranslations = (!!translations && Object.keys(translations).length > 0) || (!!chapterNumber && !!pageAyahRange);
  const canChooseApiTranslation = !!enableApiTranslationPicker && !!chapterNumber;
  const hasUrduTranslations = (!!translations && Object.values(translations).some(list => list.some(v => !!v.urduText))) || canChooseApiTranslation;
  const src = layoutStyle === '15line'
    ? (localPages[pageNum] ?? null)
    : ((localPages16 ?? {})[pageNum] ?? null);
  const basePageVerses = translations?.[pageNum] ?? [];
  const derivedPageVerses: VerseTranslation[] = pageAyahRange
    ? Array.from({ length: pageAyahRange[1] - pageAyahRange[0] + 1 }, (_, index) => ({
        verse: pageAyahRange[0] + index,
        text: '',
      }))
    : [];
  const sourcePageVerses: VerseTranslation[] = basePageVerses.length > 0 ? basePageVerses : derivedPageVerses;
  const hasLocalCurrentLocaleText = sourcePageVerses.some((verse) => transLocale === 'ur' ? !!verse.urduText : !!verse.text);
  const effectiveTranslationId = chapterNumber
    ? (selectedTranslationId ?? (hasLocalCurrentLocaleText ? null : DEFAULT_API_TRANSLATION_ID_BY_LANG[transLocale]))
    : null;
  const pageVerses = sourcePageVerses.map((verse) => ({
    ...verse,
    text: effectiveTranslationId && apiMapByVerse[verse.verse]
      ? apiMapByVerse[verse.verse]
      : (transLocale === 'ur' ? (verse.urduText ?? '') : verse.text),
  }));
  const hasTransliteration = hasTranslations;
  const shouldExcludeTranslationOption = (option: QuranTranslationResource) => {
    const searchable = `${option.name} ${option.translatedName ?? ''} ${option.authorName ?? ''}`.toLowerCase();
    return /taqi\s*usmani|taqi\s*usman|maududi|tafhim|shaykh\s*al\s*hind|shaikh\s*al\s*hind|mahmud\s*al[-\s]*hasan|mahmood\s*al[-\s]*hasan|tafsir\s*e\s*usmani|tafsir[-\s]*usmani/.test(searchable);
  };
  const visibleApiOptions = apiOptions.filter((option) => !shouldExcludeTranslationOption(option));
  const getTranslationOptionLabel = (option: QuranTranslationResource) => transLocale === 'ur'
    ? (URDU_TRANSLATOR_LABEL_OVERRIDES[option.id] || option.translatedName || option.name)
    : option.name;
  const selectedApiOption = visibleApiOptions.find((o) => o.id === selectedTranslationId) ?? null;
  const useApiSelectedTranslation = selectedTranslationId !== null;
  const defaultTranslatorOpt = visibleApiOptions.find(o => o.id === DEFAULT_API_TRANSLATION_ID_BY_LANG[transLocale]);
  const activeTranslatorLabel = selectedApiOption
    ? getTranslationOptionLabel(selectedApiOption)
    : (defaultTranslatorOpt
      ? getTranslationOptionLabel(defaultTranslatorOpt)
      : DEFAULT_TRANSLATOR_LABEL_BY_LANG[transLocale]);
  const activeTranslatorCaption = transLocale === 'ur' ? 'منتخب مترجم' : 'Selected translator';

  React.useEffect(() => {
    if (!chapterNumber || !effectiveTranslationId) {
      setApiMapByVerse({});
      setIsLoadingApiTrans(false);
      return;
    }
    const cacheKey = `${transLocale}:${effectiveTranslationId}`;
    if (apiMapCache[cacheKey]) {
      setApiMapByVerse(apiMapCache[cacheKey]);
      setIsLoadingApiTrans(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoadingApiTrans(true);
      const map = await fetchChapterTranslationById(chapterNumber, effectiveTranslationId, transLocale);
      if (cancelled) return;
      setApiMapCache((prev) => ({ ...prev, [cacheKey]: map }));
      setApiMapByVerse(map);
      setIsLoadingApiTrans(false);
    })();
    return () => { cancelled = true; };
  }, [chapterNumber, effectiveTranslationId, apiMapCache, transLocale]);

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= pageNums.length) return;
    setPi(idx); setRk(k => k + 1); setShowTrans(false);
    setTransLang('en');
    setShowApiPicker(false);
    sc.value = withSpring(1, { damping:20, stiffness:300 }); svSc.value = 1;
  };

  const goToFromOverlay = (idx: number) => {
    if (idx < 0 || idx >= pageNums.length) return;
    setPi(idx); setRk(k => k + 1);
    setShowApiPicker(false);
  };

  const gest = Gesture.Simultaneous(
    Gesture.Pan().activeOffsetX([-12,12]).failOffsetY([-15,15])
      .onUpdate(e => { if (sc.value <= 1.05) txX.value = e.translationX * 0.25; })
      .onEnd(e => {
        txX.value = withSpring(0, { damping:20, stiffness:300 });
        if (sc.value <= 1.05) {
          if (e.translationX < -35 || e.velocityX < -400) runOnJS(goTo)(pi + 1);
          else if (e.translationX > 35 || e.velocityX > 400) runOnJS(goTo)(pi - 1);
        }
      })
      .onFinalize(() => { txX.value = withSpring(0, { damping:20, stiffness:300 }); }),
    Gesture.Race(
      Gesture.Pinch()
        .onUpdate(e => { sc.value = Math.max(1, Math.min(svSc.value * e.scale, 4)); })
        .onEnd(() => {
          if (sc.value < 1.1) { sc.value = withSpring(1, { damping:20, stiffness:300 }); svSc.value = 1; }
          else svSc.value = sc.value;
        }),
      Gesture.Tap().numberOfTaps(2).maxDuration(250).onEnd(() => {
        sc.value = withSpring(1, { damping:20, stiffness:300 }); svSc.value = 1;
      })
    )
  );

  return (
    <GestureHandlerRootView style={{ flex:1, backgroundColor:BG }}>
      <View style={{ flex:1, backgroundColor:BG }}>
        {/* Header */}
        <View style={[S.topBar, { backgroundColor:HDR_BG, borderBottomColor:HDR_BOR }]}>
          <TouchableOpacity
            style={[S.transBtn, { borderColor:ACCENT }, showTrans && { backgroundColor:ACCENT }]}
            onPress={() => {
              setShowTrans((prev) => {
                const next = !prev;
                if (next) {
                  setTransLang('en');
                  setShowTranslit(false);
                  setShowApiPicker(false);
                }
                return next;
              });
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="translate" size={14} color={showTrans ? '#fff' : ACCENT} />
            <Text style={[S.transBtnText, { color: showTrans ? '#fff' : ACCENT }]}>Translation <Text style={[S.transBtnTextUrdu, { color: showTrans ? '#fff' : ACCENT }]}>اردو ترجمہ</Text></Text>
          </TouchableOpacity>
          <View style={{ flex:1 }}/>
          <View style={[S.toggleGroup, { backgroundColor: ACCENT_SOFT, borderColor: ACCENT_BORDER }]}>
            <TouchableOpacity
              style={[S.toggleBtn, layoutStyle === '15line' && { backgroundColor: ACCENT }]}
              onPress={() => setLayoutStyle('15line')}
              activeOpacity={0.8}
            >
              <Text style={[S.toggleBtnText, { color: layoutStyle === '15line' ? '#fff' : META }]}>15L</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.toggleBtn, layoutStyle === '16line' && { backgroundColor: ACCENT }]}
              onPress={() => setLayoutStyle('16line')}
              activeOpacity={0.8}
            >
              <Text style={[S.toggleBtnText, { color: layoutStyle === '16line' ? '#fff' : META }]}>16L</Text>
            </TouchableOpacity>
          </View>
        </View>

        {layoutStyle === '16line' && !has16LineImages ? (
          <View style={[S.emptyBox, { backgroundColor:BG }]}>
            <MaterialIcons name="upload-file" size={48} color={ACCENT} style={{ opacity:0.5 }}/>
            <Text style={[S.emptyTitle, { color:ACCENT }]}>16-Line Images Not Yet Uploaded</Text>
            <Text style={[S.emptySub, { color:META }]}>
              {`Upload pages ${pageNums[0]}–${pageNums[pageNums.length-1]} of the\n16-line Indo-Pak Mushaf as image attachments.`}
            </Text>
            <TouchableOpacity style={[S.altBtn, { borderColor: ACCENT, backgroundColor: ACCENT + '18' }]} onPress={() => setLayoutStyle('15line')} activeOpacity={0.8}>
              <MaterialIcons name="menu-book" size={16} color={ACCENT} />
              <Text style={[S.altBtnText, { color: ACCENT }]}>Use 15-Line Instead</Text>
            </TouchableOpacity>
          </View>
        ) : !hasImages ? (
          <View style={[S.emptyBox, { backgroundColor:BG }]}>
            <MaterialIcons name="upload-file" size={48} color={ACCENT} style={{ opacity:0.5 }}/>
            <Text style={[S.emptyTitle, { color:ACCENT }]}>Images Coming Soon</Text>
            <Text style={[S.emptySub, { color:META }]}>
              {`Upload pages ${pageNums[0]}–${pageNums[pageNums.length-1]} of the\n15-line Indo-Pak Mushaf as image attachments.`}
            </Text>
          </View>
        ) : (
          <>
            <GestureDetector gesture={gest}>
              <Reanimated.View style={anim}>
                {src === null ? (
                  <View style={[S.emptyBox, { backgroundColor:BG }]}>
                    <Text style={[S.emptyTitle, { color:ACCENT, fontSize:14 }]}>Page {pageNum} not uploaded yet</Text>
                  </View>
                ) : (
                  <Image
                    key={`${pageNum}-${rk}`}
                    source={src}
                    style={{ flex:1, width:'100%' }}
                    contentFit="contain"
                    transition={0}
                  />
                )}
              </Reanimated.View>
            </GestureDetector>

            {/* Nav bar */}
            <View style={[S.navBar, { backgroundColor:HDR_BG, borderTopColor:HDR_BOR }]}>
              <TouchableOpacity style={[S.navBtn, pi===0&&{opacity:0.3}]} onPress={() => goTo(pi-1)} disabled={pi===0} activeOpacity={0.8}>
                <MaterialIcons name="chevron-left" size={26} color={ACCENT}/>
              </TouchableOpacity>
              <View style={{ alignItems:'center', gap:4 }}>
                <Text style={[S.pageNum, { color:ACCENT }]}>Page {pageNum}</Text>
                <Text style={{ fontSize:10, color:META, fontWeight:'500' }}>
                  {pi+1}/{pageNums.length}
                </Text>
                <View style={{ flexDirection:'row', gap:5 }}>
                  {pageNums.map((_, i) => (
                    <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={{ top:6, bottom:6, left:4, right:4 }}>
                      <View style={[S.dot, { backgroundColor: i===pi ? ACCENT : 'rgba(100,100,100,0.3)' }, i===pi && { width:16 }]}/>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity style={[S.navBtn, pi===pageNums.length-1&&{opacity:0.3}]} onPress={() => goTo(pi+1)} disabled={pi===pageNums.length-1} activeOpacity={0.8}>
                <MaterialIcons name="chevron-right" size={26} color={ACCENT}/>
              </TouchableOpacity>
            </View>

            {/* Translation layer (bottom sheet) */}
            {showTrans ? (
              <View style={S.transOverlay} pointerEvents="box-none">
                <TouchableOpacity
                  style={[S.transBackdrop, { backgroundColor: 'rgba(0,0,0,0.2)' }]}
                  activeOpacity={1}
                  onPress={() => setShowTrans(false)}
                />
                <View style={[S.transPanel, { backgroundColor: N ? 'rgba(10,8,8,0.98)' : '#FFFFFF', borderTopColor: N ? ACCENT_BORDER : ACCENT_SOFT }]}>
                  <View style={S.dragHandleWrap}>
                    <View style={[S.dragHandle, { backgroundColor: N ? ACCENT_BORDER : ACCENT_BORDER }]} />
                  </View>
                  <View style={[S.transOverlayHeader, { borderBottomColor: N ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}>
                    <View style={S.transHeaderTopRow}>
                      <MaterialIcons name="menu-book" size={15} color={ACCENT} />
                      <Text style={[S.transOverlayTitle, { color:ACCENT, flex:1 }]}>Translation</Text>
                      <View style={S.overlayNavGroup}>
                        <TouchableOpacity
                          style={[S.overlayNavBtn, { backgroundColor: ACCENT_SOFT }, pi === 0 && S.overlayNavBtnDisabled]}
                          onPress={() => goToFromOverlay(pi - 1)}
                          disabled={pi === 0}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="chevron-left" size={22} color={pi === 0 ? '#94A3B8' : ACCENT} />
                        </TouchableOpacity>
                        <Text style={[S.overlayPageText, { color: META }]}>{transLocale === 'ur' ? `صفحہ ${pi + 1}/${pageNums.length}` : `Page ${pi + 1}/${pageNums.length}`}</Text>
                        <TouchableOpacity
                          style={[S.overlayNavBtn, { backgroundColor: ACCENT_SOFT }, pi === pageNums.length - 1 && S.overlayNavBtnDisabled]}
                          onPress={() => goToFromOverlay(pi + 1)}
                          disabled={pi === pageNums.length - 1}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="chevron-right" size={22} color={pi === pageNums.length - 1 ? '#94A3B8' : ACCENT} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => setShowTrans(false)} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                        <MaterialIcons name="close" size={20} color={META} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={S.transHeaderControlsRow}
                    >
                      {canChooseApiTranslation ? (
                        <TouchableOpacity
                          style={[S.translatorSelectBtn, { borderColor: ACCENT }, showApiPicker && { backgroundColor: ACCENT }]}
                          onPress={() => setShowApiPicker(v => !v)}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons
                            name="arrow-drop-down-circle"
                            size={16}
                            color={showApiPicker ? '#fff' : ACCENT}
                          />
                          <Text
                            style={[
                              S.langBtnText,
                              { color: showApiPicker ? '#fff' : ACCENT },
                              transLocale === 'ur' && S.langBtnTextUrdu,
                            ]}
                            numberOfLines={1}
                          >
                            {transLocale === 'ur' ? 'مترجم منتخب کریں' : 'Select Translator'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {hasUrduTranslations ? (
                        <View style={S.langChoiceGroup}>
                          <TouchableOpacity
                            style={[S.langBtn, { borderColor: ACCENT }, transLang === 'en' && { backgroundColor: ACCENT }]}
                            onPress={() => {
                              setTransLang('en');
                              setShowApiPicker(false);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[S.langBtnText, { color: transLang === 'en' ? '#fff' : ACCENT }]}>English</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[S.langBtn, { borderColor: ACCENT }, transLang === 'ur' && { backgroundColor: ACCENT }]}
                            onPress={() => {
                              setTransLang('ur');
                              setShowApiPicker(false);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[S.langBtnText, S.langBtnTextUrdu, { color: transLang === 'ur' ? '#fff' : ACCENT }]}>اردو</Text>
                          </TouchableOpacity>
                          {hasTransliteration ? (
                            <TouchableOpacity
                              style={[S.langBtn, { borderColor: ACCENT }, showTranslit && { backgroundColor: ACCENT }]}
                              onPress={() => setShowTranslit(v => !v)}
                              activeOpacity={0.8}
                            >
                              <Text style={[S.langBtnText, { color: showTranslit ? '#fff' : ACCENT }]}>Translit</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      ) : null}
                    </ScrollView>
                  </View>
                  <View
                    style={[
                      S.activeTranslatorCard,
                      transLocale === 'ur' && S.activeTranslatorCardUrdu,
                      { backgroundColor: N ? ACCENT_SOFT : ACCENT + '12', borderColor: N ? ACCENT_BORDER : ACCENT + '28' },
                    ]}
                  >
                    <Text style={[S.activeTranslatorCaption, { color: META }, transLocale === 'ur' && S.activeTranslatorCaptionUrdu]} numberOfLines={1}>
                      {activeTranslatorCaption}
                    </Text>
                    <Text style={[S.activeTranslatorValue, { color: N ? '#F8FAFC' : '#0F172A' }, transLocale === 'ur' && S.activeTranslatorValueUrdu]} numberOfLines={1}>
                      {activeTranslatorLabel}
                    </Text>
                  </View>
                  {canChooseApiTranslation && showApiPicker ? (
                    <View style={[S.apiPickerWrap, { borderBottomColor: N ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }]}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.apiPickerContent}>
                        {visibleApiOptions.map((opt) => (
                          <TouchableOpacity
                            key={opt.id}
                            style={[S.apiChip, { borderColor: ACCENT }, selectedTranslationId === opt.id && { backgroundColor: ACCENT }]}
                            onPress={() => {
                              setSelectedTranslationIdByLang((prev) => ({ ...prev, [transLocale]: opt.id }));
                              setShowApiPicker(false);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[S.apiChipText, transLocale === 'ur' && S.apiChipTextUrdu, { color: selectedTranslationId === opt.id ? '#fff' : ACCENT }]}>{getTranslationOptionLabel(opt)}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                  <ScrollView ref={transScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:16, paddingHorizontal:16 }}>
                    {hasTranslations ? (
                      <>
                        {isLoadingApiTrans ? (
                          <View style={S.loadingTranslationBox}>
                            <ActivityIndicator size="small" color={ACCENT} />
                            <Text style={[S.loadingTranslationText, { color: META }]}>Loading selected translation...</Text>
                          </View>
                        ) : pageVerses.map(v => (
                          <View key={v.verse} style={[S.transVerseRow, { borderBottomColor: N ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                            <View style={[S.transVerseNum, { backgroundColor: ACCENT_SOFT }]}>
                              <Text style={[S.transVerseNumText, { color: ACCENT }]}>{v.verse}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  S.transVerseText,
                                  { color: N ? '#EEF3FC' : '#1F2937' },
                                  transLang === 'ur' && S.transVerseTextUrdu,
                                ]}
                              >
                                {transLang === 'ur' && !useApiSelectedTranslation && v.urduText ? v.urduText : v.text}
                              </Text>
                              {showTranslit && v.transliteration ? (
                                <Text style={[S.transVerseTranslit, { color: META }]}>{v.transliteration}</Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                        <Text style={[S.transSource, { color:META }]}>
                          {selectedApiOption
                            ? `Translation: ${getTranslationOptionLabel(selectedApiOption)}`
                            : transLang === 'ur'
                            ? 'ترجمہ: اردو'
                            : 'Translation: The Clear Quran — Dr. Mustafa Khattab'}
                        </Text>
                      </>
                    ) : (
                      <View style={[S.emptyBox, { paddingVertical: 28 }]}> 
                        <Text style={[S.emptyTitle, { color: ACCENT, fontSize: 14 }]}>Translation coming soon.</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

// ── Named Surah viewers ───────────────────────────────────────────────────
export function KahfMushafPlaceholder({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <MushafImageViewer
    nightMode={nightMode} pageNums={KAHF_PAGE_NUMS} localPages={KAHF_15LINE_LOCAL} localPages16={KAHF_16LINE_LOCAL} ayatMap={KAHF_PAGE_AYAT}
    chapterNumber={18} enableApiTranslationPicker
    nameAr={'سُورَةُ الْكَهْف'}
    nameEn="Surah Al-Kahf" juz="Juz 15–16 · 110 verses"
    accentDay={UNIFIED_MUSHAF_THEME.accentDay} accentNight={UNIFIED_MUSHAF_THEME.accentNight}
    bgNight={UNIFIED_MUSHAF_THEME.bgNight} hdrBgNight={UNIFIED_MUSHAF_THEME.hdrBgNight} hdrBorNight={UNIFIED_MUSHAF_THEME.hdrBorNight}
    bgDay={UNIFIED_MUSHAF_THEME.bgDay} hdrBgDay={UNIFIED_MUSHAF_THEME.hdrBgDay} hdrBorDay={UNIFIED_MUSHAF_THEME.hdrBorDay}
  />;
}

export function YaseenMushafPlaceholder({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <MushafImageViewer
    nightMode={nightMode} pageNums={YASEEN_PAGE_NUMS} localPages={YASEEN_15LINE_LOCAL} localPages16={YASEEN_16LINE_LOCAL}
    ayatMap={YASEEN_PAGE_AYAT} translations={YASEEN_TRANSLATIONS}
    chapterNumber={36} enableApiTranslationPicker
    nameAr={'سُورَةُ يس'}
    nameEn="Surah Yaseen" juz="Juz 22–23 · 83 verses"
    accentDay={UNIFIED_MUSHAF_THEME.accentDay} accentNight={UNIFIED_MUSHAF_THEME.accentNight}
    bgNight={UNIFIED_MUSHAF_THEME.bgNight} hdrBgNight={UNIFIED_MUSHAF_THEME.hdrBgNight} hdrBorNight={UNIFIED_MUSHAF_THEME.hdrBorNight}
    bgDay={UNIFIED_MUSHAF_THEME.bgDay} hdrBgDay={UNIFIED_MUSHAF_THEME.hdrBgDay} hdrBorDay={UNIFIED_MUSHAF_THEME.hdrBorDay}
  />;
}

export function WaqiahMushafPlaceholder({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <MushafImageViewer
    nightMode={nightMode} pageNums={WAQIAH_PAGE_NUMS} localPages={WAQIAH_15LINE_LOCAL} localPages16={WAQIAH_16LINE_LOCAL}
    ayatMap={WAQIAH_PAGE_AYAT} translations={WAQIAH_TRANSLATIONS}
    chapterNumber={56} enableApiTranslationPicker
    nameAr={'سُورَةُ الْوَاقِعَة'}
    nameEn="Surah Al-Waqiah" juz="Juz 27 · 96 verses"
    accentDay={UNIFIED_MUSHAF_THEME.accentDay} accentNight={UNIFIED_MUSHAF_THEME.accentNight}
    bgNight={UNIFIED_MUSHAF_THEME.bgNight} hdrBgNight={UNIFIED_MUSHAF_THEME.hdrBgNight} hdrBorNight={UNIFIED_MUSHAF_THEME.hdrBorNight}
    bgDay={UNIFIED_MUSHAF_THEME.bgDay} hdrBgDay={UNIFIED_MUSHAF_THEME.hdrBgDay} hdrBorDay={UNIFIED_MUSHAF_THEME.hdrBorDay}
  />;
}

export function MulkMushafPlaceholder({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <MushafImageViewer
    nightMode={nightMode} pageNums={MULK_PAGE_NUMS} localPages={MULK_15LINE_LOCAL} localPages16={MULK_16LINE_LOCAL} ayatMap={MULK_PAGE_AYAT}
    chapterNumber={67} enableApiTranslationPicker
    nameAr={'سُورَةُ الْمُلْك'}
    nameEn="Surah Al-Mulk" juz="Juz 29 · 30 verses"
    accentDay={UNIFIED_MUSHAF_THEME.accentDay} accentNight={UNIFIED_MUSHAF_THEME.accentNight}
    bgNight={UNIFIED_MUSHAF_THEME.bgNight} hdrBgNight={UNIFIED_MUSHAF_THEME.hdrBgNight} hdrBorNight={UNIFIED_MUSHAF_THEME.hdrBorNight}
    bgDay={UNIFIED_MUSHAF_THEME.bgDay} hdrBgDay={UNIFIED_MUSHAF_THEME.hdrBgDay} hdrBorDay={UNIFIED_MUSHAF_THEME.hdrBorDay}
  />;
}

export function LuqmanMushafPlaceholder({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <MushafImageViewer
    nightMode={nightMode} pageNums={LUQMAN_PAGE_NUMS} localPages={LUQMAN_15LINE_LOCAL} localPages16={LUQMAN_16LINE_LOCAL} ayatMap={LUQMAN_PAGE_AYAT}
    chapterNumber={31} enableApiTranslationPicker
    nameAr={'سُورَةُ لُقْمَان'}
    nameEn="Surah Luqman" juz="Juz 21 · 34 verses"
    accentDay={UNIFIED_MUSHAF_THEME.accentDay} accentNight={UNIFIED_MUSHAF_THEME.accentNight}
    bgNight={UNIFIED_MUSHAF_THEME.bgNight} hdrBgNight={UNIFIED_MUSHAF_THEME.hdrBgNight} hdrBorNight={UNIFIED_MUSHAF_THEME.hdrBorNight}
    bgDay={UNIFIED_MUSHAF_THEME.bgDay} hdrBgDay={UNIFIED_MUSHAF_THEME.hdrBgDay} hdrBorDay={UNIFIED_MUSHAF_THEME.hdrBorDay}
  />;
}

export function ImranMushafPlaceholder({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <MushafImageViewer
    nightMode={nightMode} pageNums={IMRAN_PAGE_NUMS} localPages={IMRAN_15LINE_LOCAL} localPages16={IMRAN_16LINE_LOCAL}
    ayatMap={IMRAN_PAGE_AYAT} translations={IMRAN_LAST_AYAH_TRANSLATIONS}
    chapterNumber={3} enableApiTranslationPicker
    nameAr={'سُورَةُ آلِ عِمْرَان'}
    nameEn="Surah Ali 'Imran"
    juz="Juz 3 · excerpt"
    accentDay={UNIFIED_MUSHAF_THEME.accentDay} accentNight={UNIFIED_MUSHAF_THEME.accentNight}
    bgNight={UNIFIED_MUSHAF_THEME.bgNight} hdrBgNight={UNIFIED_MUSHAF_THEME.hdrBgNight} hdrBorNight={UNIFIED_MUSHAF_THEME.hdrBorNight}
    bgDay={UNIFIED_MUSHAF_THEME.bgDay} hdrBgDay={UNIFIED_MUSHAF_THEME.hdrBgDay} hdrBorDay={UNIFIED_MUSHAF_THEME.hdrBorDay}
  />;
}

export function SajdahMushafPlaceholder({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <MushafImageViewer
    nightMode={nightMode} pageNums={SAJDAH_PAGE_NUMS} localPages={SAJDAH_15LINE_LOCAL} localPages16={SAJDAH_16LINE_LOCAL}
    ayatMap={SAJDAH_PAGE_AYAT} translations={SAJDAH_TRANSLATIONS}
    chapterNumber={32} enableApiTranslationPicker
    nameAr={'سُورَةُ السَّجْدَة'}
    nameEn="Surah As-Sajdah" juz="Juz 21 · 30 verses"
    accentDay={UNIFIED_MUSHAF_THEME.accentDay} accentNight={UNIFIED_MUSHAF_THEME.accentNight}
    bgNight={UNIFIED_MUSHAF_THEME.bgNight} hdrBgNight={UNIFIED_MUSHAF_THEME.hdrBgNight} hdrBorNight={UNIFIED_MUSHAF_THEME.hdrBorNight}
    bgDay={UNIFIED_MUSHAF_THEME.bgDay} hdrBgDay={UNIFIED_MUSHAF_THEME.hdrBgDay} hdrBorDay={UNIFIED_MUSHAF_THEME.hdrBorDay}
  />;
}

const S = StyleSheet.create({
  topBar:    { flexDirection:'row', alignItems:'center', paddingHorizontal:14, paddingVertical:9, borderBottomWidth:1 },
  surahName: { fontSize:18, fontWeight:'800' } as any,
  emptyBox:  { flex:1, alignItems:'center', justifyContent:'center', padding:32, gap:14 },
  emptyTitle:{ fontSize:16, fontWeight:'800', textAlign:'center' },
  emptySub:  { fontSize:13, lineHeight:20, textAlign:'center' },
  navBar:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:8, paddingVertical:6, borderTopWidth:1 },
  navBtn:    { width:44, height:44, alignItems:'center', justifyContent:'center' },
  pageNum:   { fontSize:14, fontWeight:'800', letterSpacing:0.3 },
  dot:       { width:6, height:6, borderRadius:3 },
  // Translation toggle
  transBtn:  { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:14, paddingVertical:8, borderRadius:999, borderWidth:1.5 },
  transBtnText: { fontSize:13, fontWeight:'800' },
  transBtnTextUrdu: { fontFamily:'UrduNastaliqBold', fontSize:16, lineHeight:24 } as any,
  toggleGroup: {
    flexDirection:'row',
    borderRadius:999,
    borderWidth:1,
    overflow:'hidden',
    padding:3,
    gap:2,
  },
  toggleBtn: {
    paddingHorizontal:16,
    paddingVertical:6,
    borderRadius:999,
  },
  toggleBtnText: { fontSize:12, fontWeight:'700' },
  altBtn: {
    flexDirection:'row',
    alignItems:'center',
    gap:8,
    paddingHorizontal:18,
    paddingVertical:10,
    borderRadius:999,
    borderWidth:1.5,
    marginTop:8,
  },
  altBtnText: { fontSize:13, fontWeight:'700' },
  // Translation overlay
  transOverlay: { position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:10, justifyContent:'flex-end' },
  transBackdrop: { position:'absolute', top:0, left:0, right:0, bottom:0 },
  transPanel: { maxHeight:'62%', borderTopWidth:1, borderTopLeftRadius:20, borderTopRightRadius:20, overflow:'hidden' },
  dragHandleWrap: { alignItems:'center', paddingTop:8, paddingBottom:4 },
  dragHandle: { width:40, height:4, borderRadius:2 },
  transOverlayHeader: { paddingHorizontal:16, paddingVertical:10, borderBottomWidth:1 },
  transHeaderTopRow: { flexDirection:'row', alignItems:'center', gap:8 },
  transHeaderControlsRow: { flexDirection:'row', alignItems:'center', gap:8, paddingTop:8, paddingBottom:8 },
  transOverlayTitle:  { fontSize:13, fontWeight:'800', letterSpacing:0.2 },
  overlayNavGroup: { flexDirection:'row', alignItems:'center', gap:8, marginRight:6 },
  overlayNavBtn: {
    width:34,
    height:34,
    borderRadius:17,
    alignItems:'center',
    justifyContent:'center',
    backgroundColor:'rgba(148,163,184,0.14)',
  },
  overlayNavBtnDisabled: { opacity:0.45 },
  overlayPageText: { fontSize:12, minWidth:72, textAlign:'center', fontWeight:'700' },
  apiPickerWrap: { borderBottomWidth:1 },
  apiPickerContent: { paddingHorizontal:16, paddingVertical:10, gap:8 },
  apiChip: { borderWidth:1.25, borderRadius:999, paddingHorizontal:10, paddingVertical:6 },
  apiChipText: { fontSize:11, fontWeight:'700' },
  apiChipTextUrdu: { fontFamily:'UrduNastaliqBold', fontSize:17, lineHeight:28 } as any,
  activeTranslatorCard: {
    marginHorizontal:16,
    marginTop:8,
    marginBottom:4,
    borderWidth:1,
    borderRadius:999,
    paddingHorizontal:12,
    paddingVertical:7,
    gap:8,
    flexDirection:'row',
    alignItems:'center',
  },
  activeTranslatorCardUrdu: { flexDirection:'row-reverse' },
  activeTranslatorCaption: { fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.4, flexShrink:0 },
  activeTranslatorCaptionUrdu: { fontFamily:'UrduNastaliqBold', fontSize:15, lineHeight:22, textTransform:'none', letterSpacing:0 },
  activeTranslatorValue: { fontSize:12, fontWeight:'700', flex:1 },
  activeTranslatorValueUrdu: { fontFamily:'UrduNastaliqBold', fontSize:18, lineHeight:26, flex:1, textAlign:'right' },
  langChoiceGroup: { flexDirection:'row', alignItems:'center', gap:8 },
  translatorSelectBtn: {
    flexDirection:'row',
    alignItems:'center',
    gap:6,
    borderWidth:1.25,
    borderRadius:999,
    paddingHorizontal:12,
    paddingVertical:6,
  },
  langBtn: { borderWidth:1.25, borderRadius:999, paddingHorizontal:10, paddingVertical:5 },
  langBtnText: { fontSize:11, fontWeight:'700' },
  langBtnTextUrdu: { fontFamily:'UrduNastaliqBold', fontSize:16, lineHeight:24 } as any,
  loadingTranslationBox: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:10 },
  loadingTranslationText: { fontSize:12, fontWeight:'500' },
  transVerseRow:      { flexDirection:'row', gap:10, paddingVertical:14, borderBottomWidth:1, alignItems:'flex-start' },
  transVerseNum:      { width:26, height:26, borderRadius:13, alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 },
  transVerseNumText:  { fontSize:12, fontWeight:'700' },
  transVerseText:     { flex:1, fontSize:13, lineHeight:21, fontWeight:'400' },
  transVerseTextUrdu: { writingDirection:'rtl', textAlign:'right', fontFamily:'UrduNastaliqBold', fontSize:22, lineHeight:40 } as any,
  transVerseTranslit: { fontSize:11, fontWeight:'400', fontStyle:'italic', lineHeight:17, marginTop:3, letterSpacing:0.2 },
  transSource:        { fontSize:10, textAlign:'center', fontStyle:'italic', paddingVertical:12, paddingHorizontal:16 },
});

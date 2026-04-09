/**
 * Generic local-image Mushaf viewer shared by Al-Kahf, Al-Mulk, Luqman, Imran, As-Sajdah.
 * Images are bundled via require() once uploaded to:
 *   assets/images/Quran 15 line indo-pak/{Kahf|Mulk|Luqman|Imran|Sajdah}/
 */
import React from 'react';
import { View, Text, TouchableOpacity, AppState, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import {
  IMRAN_PAGE_AYAT,
  KAHF_PAGE_AYAT,
  LUQMAN_PAGE_AYAT,
  MULK_PAGE_AYAT,
  SAJDAH_PAGE_AYAT,
} from '@/constants/mushafPageAyat';

// ── Page lists & local asset maps ─────────────────────────────────────────
export const KAHF_PAGE_NUMS   = [293,294,295,296,297,298,299,300,301,302,303,304];
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
export const MULK_15LINE_LOCAL:   Partial<Record<number,any>> = {
  562: require('@/assets/images/Quran 15 line indo-pak/Mulk/562.jpg'),
  563: require('@/assets/images/Quran 15 line indo-pak/Mulk/563.jpg'),
  564: require('@/assets/images/Quran 15 line indo-pak/Mulk/564.jpg'),
};
export const LUQMAN_15LINE_LOCAL: Partial<Record<number,any>> = {
  411: require('@/assets/images/Quran 15 line indo-pak/Luqman/411.jpg'),
  412: require('@/assets/images/Quran 15 line indo-pak/Luqman/412.jpg'),
  413: require('@/assets/images/Quran 15 line indo-pak/Luqman/413.jpg'),
  414: require('@/assets/images/Quran 15 line indo-pak/Luqman/414.jpg'),
};
export const IMRAN_15LINE_LOCAL: Partial<Record<number,any>> = {
  75: require('@/assets/images/Quran 15 line indo-pak/Imran/75.jpg'),
  76: require('@/assets/images/Quran 15 line indo-pak/Imran/76.jpg'),
};
export const SAJDAH_15LINE_LOCAL: Partial<Record<number,any>> = {
  415: require('@/assets/images/Quran 15 line indo-pak/Sajdah/415.jpg'),
  416: require('@/assets/images/Quran 15 line indo-pak/Sajdah/416.jpg'),
  417: require('@/assets/images/Quran 15 line indo-pak/Sajdah/417.jpg'),
};

// ── Translation type ──────────────────────────────────────────────────────
export interface VerseTranslation { verse: number; text: string; }

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

// ── Shared internal viewer ───────────────────────────────────────────────
interface ViewerProps {
  nightMode: boolean;
  pageNums: number[];
  localPages: Partial<Record<number, any>>;
  ayatMap: Record<number, [number,number]>;
  translations?: Record<number, VerseTranslation[]>;
  nameAr: string;
  nameEn: string;
  juz: string;
  accentDay: string;
  accentNight: string;
  bgNight: string; hdrBgNight: string; hdrBorNight: string;
  bgDay:  string; hdrBgDay:  string; hdrBorDay:  string;
}

function MushafImageViewer({
  nightMode, pageNums, localPages, ayatMap, translations,
  nameAr, nameEn, juz,
  accentDay, accentNight, bgNight, hdrBgNight, hdrBorNight, bgDay, hdrBgDay, hdrBorDay,
}: ViewerProps) {
  const N = nightMode;
  const [pi, setPi] = React.useState(0);
  const [rk, setRk] = React.useState(0);
  const [showTrans, setShowTrans] = React.useState(false);

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') setTimeout(() => setRk(k => k + 1), 150);
    });
    return () => sub.remove();
  }, []);

  const txX = useSharedValue(0);
  const sc   = useSharedValue(1);
  const svSc = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform:[{translateX:txX.value},{scale:sc.value}], flex:1, width:'100%' }));

  const BG=N?bgNight:bgDay, HDR_BG=N?hdrBgNight:hdrBgDay, HDR_BOR=N?hdrBorNight:hdrBorDay;
  const ACCENT=N?accentNight:accentDay, META=N?'#94A3B8':'#6B7280';
  const hasImages = Object.keys(localPages).length > 0;
  const hasTranslations = !!translations && Object.keys(translations).length > 0;
  const pageNum = pageNums[pi];
  const range   = ayatMap[pageNum];
  const src     = localPages[pageNum] ?? null;
  const pageVerses = translations?.[pageNum] ?? [];

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= pageNums.length) return;
    setPi(idx); setRk(k => k + 1); setShowTrans(false);
    sc.value = withSpring(1, { damping:20, stiffness:300 }); svSc.value = 1;
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
          <Text style={[S.surahName, { color:ACCENT }]}>{nameAr}</Text>
          <View style={{ flex:1 }}/>
          <Text style={{ fontSize:11, color:META, marginRight:8 }}>{nameEn} · {juz}</Text>
          {hasTranslations ? (
            <TouchableOpacity
              style={[S.transBtn, { borderColor:ACCENT }, showTrans && { backgroundColor:ACCENT }]}
              onPress={() => setShowTrans(v => !v)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="translate" size={13} color={showTrans ? '#fff' : ACCENT} />
              <Text style={[S.transBtnText, { color: showTrans ? '#fff' : ACCENT }]}>Trans</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!hasImages ? (
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
                  {pi+1}/{pageNums.length} · Ayat {range ? `${range[0]}–${range[1]}` : ''}
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

            {/* Translation overlay */}
            {showTrans && hasTranslations ? (
              <View style={[S.transOverlay, { backgroundColor: N ? 'rgba(10,8,8,0.97)' : 'rgba(255,248,248,0.97)' }]}>
                <View style={[S.transOverlayHeader, { borderBottomColor: HDR_BOR }]}>
                  <MaterialIcons name="menu-book" size={15} color={ACCENT} />
                  <Text style={[S.transOverlayTitle, { color:ACCENT, flex:1 }]}>
                    {range ? `Ayat ${range[0]}–${range[1]}` : ''} · Clear Quran Translation
                  </Text>
                  <TouchableOpacity onPress={() => setShowTrans(false)} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                    <MaterialIcons name="close" size={20} color={META} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:16 }}>
                  {pageVerses.map(v => (
                    <View key={v.verse} style={[S.transVerseRow, { borderBottomColor: HDR_BOR }]}>
                      <View style={[S.transVerseNum, { backgroundColor: ACCENT + '22' }]}>
                        <Text style={[S.transVerseNumText, { color:ACCENT }]}>{v.verse}</Text>
                      </View>
                      <Text style={[S.transVerseText, { color: N ? '#EEF3FC' : '#1F2937' }]}>{v.text}</Text>
                    </View>
                  ))}
                  <Text style={[S.transSource, { color:META }]}>Translation: The Clear Quran — Dr. Mustafa Khattab</Text>
                </ScrollView>
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
    nightMode={nightMode} pageNums={KAHF_PAGE_NUMS} localPages={KAHF_15LINE_LOCAL} ayatMap={KAHF_PAGE_AYAT}
    nameAr={'سُورَةُ الْكَهْف'}
    nameEn="Surah Al-Kahf" juz="Juz 15–16 · 110 verses"
    accentDay="#4FE948" accentNight="#4FE948"
    bgNight="#081408" hdrBgNight="#04080A" hdrBorNight="#1A4A25"
    bgDay="#F0FBF4" hdrBgDay="#E8F5EC" hdrBorDay="#5A9A6A"
  />;
}

export function MulkMushafPlaceholder({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <MushafImageViewer
    nightMode={nightMode} pageNums={MULK_PAGE_NUMS} localPages={MULK_15LINE_LOCAL} ayatMap={MULK_PAGE_AYAT}
    nameAr={'سُورَةُ الْمُلْك'}
    nameEn="Surah Al-Mulk" juz="Juz 29 · 30 verses"
    accentDay="#3730A3" accentNight="#818CF8"
    bgNight="#0A0F1A" hdrBgNight="#111827" hdrBorNight="#1F2D45"
    bgDay="#F5F0FF" hdrBgDay="#EEF0FF" hdrBorDay="#C4B5FD"
  />;
}

export function LuqmanMushafPlaceholder({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <MushafImageViewer
    nightMode={nightMode} pageNums={LUQMAN_PAGE_NUMS} localPages={LUQMAN_15LINE_LOCAL} ayatMap={LUQMAN_PAGE_AYAT}
    nameAr={'سُورَةُ لُقْمَان'}
    nameEn="Surah Luqman" juz="Juz 21 · 34 verses"
    accentDay="#B8860B" accentNight="#F9C74F"
    bgNight="#171106" hdrBgNight="#211606" hdrBorNight="#4A3510"
    bgDay="#FFF8EA" hdrBgDay="#FFF3D6" hdrBorDay="#D8BF7A"
  />;
}

export function ImranMushafPlaceholder({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <MushafImageViewer
    nightMode={nightMode} pageNums={IMRAN_PAGE_NUMS} localPages={IMRAN_15LINE_LOCAL} ayatMap={IMRAN_PAGE_AYAT}
    nameAr={'سُورَةُ آلِ عِمْرَان'}
    nameEn="Surah Ali 'Imran"
    juz="Juz 3 · excerpt"
    accentDay="#0F766E" accentNight="#5EEAD4"
    bgNight="#061615" hdrBgNight="#08201E" hdrBorNight="#134E4A"
    bgDay="#F0FDFA" hdrBgDay="#E6FFFA" hdrBorDay="#99F6E4"
  />;
}

export function SajdahMushafPlaceholder({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <MushafImageViewer
    nightMode={nightMode} pageNums={SAJDAH_PAGE_NUMS} localPages={SAJDAH_15LINE_LOCAL}
    ayatMap={SAJDAH_PAGE_AYAT} translations={SAJDAH_TRANSLATIONS}
    nameAr={'سُورَةُ السَّجْدَة'}
    nameEn="Surah As-Sajdah" juz="Juz 21 · 30 verses"
    accentDay="#B91C1C" accentNight="#F87171"
    bgNight="#0A0808" hdrBgNight="#140505" hdrBorNight="#3A1010"
    bgDay="#FFF8F8" hdrBgDay="#FFF0F0" hdrBorDay="#D4A0A0"
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
  transBtn:  { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:10, paddingVertical:5, borderRadius:999, borderWidth:1.5 },
  transBtnText: { fontSize:11, fontWeight:'700' },
  // Translation overlay
  transOverlay: { position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:10 },
  transOverlayHeader: { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingVertical:11, borderBottomWidth:1 },
  transOverlayTitle:  { fontSize:13, fontWeight:'800', letterSpacing:0.2 },
  transVerseRow:      { flexDirection:'row', gap:10, paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1, alignItems:'flex-start' },
  transVerseNum:      { width:26, height:26, borderRadius:13, alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 },
  transVerseNumText:  { fontSize:11, fontWeight:'800' },
  transVerseText:     { flex:1, fontSize:13, lineHeight:21, fontWeight:'400' },
  transSource:        { fontSize:10, textAlign:'center', fontStyle:'italic', paddingVertical:12, paddingHorizontal:16 },
});

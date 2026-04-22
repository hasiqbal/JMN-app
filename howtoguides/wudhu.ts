import { HowToGuide } from './types';

export const WUDHU_GUIDE: HowToGuide = {
  id: 'wudhu',
  parentGroup: 'Purification',
  title: 'Wudhu الوضوء (Wudu)',
  subtitle: 'Purification · Hanafi Method',
  icon: 'water-drop',
  color: '#00897B',
  intro: 'Wudhu is required for salah and other acts that require ritual purity. This guide keeps the Hanafi method, adab, disliked acts, and duas in a clearer reading format.',
  sections: [
    {
      heading: 'Fard (Obligatory) Acts of Wudhu',
      steps: [
        { step: 1, title: 'Wash face once', detail: 'Wash the entire face from hairline to chin and from ear to ear.' },
        { step: 2, title: 'Wash both arms including elbows', detail: 'Wash right arm then left arm at least once including elbows.' },
        { step: 3, title: 'Masah of one-quarter of head', detail: 'Wipe at least one-quarter of the head with wet hands once.' },
        { step: 4, title: 'Wash both feet including ankles', detail: 'Wash right foot then left foot including ankles at least once.' },
      ],
    },
    {
      heading: 'Sunnah Method (Recommended Flow)',
      steps: [
        {
          step: 1,
          title: 'Start with intention and Bismillah',
          detail: `Make niyyah in heart and begin with Bismillah.

Arabic: بِسْمِ اللّٰهِ
Transliteration: Bismillah
Translation: In the Name of Allah.`,
        },
        { step: 2, title: 'Wash hands, rinse mouth and nose', detail: 'Wash hands to wrists, rinse mouth three times, then rinse nose three times.' },
        { step: 3, title: 'Wash face and arms three times', detail: 'Wash each area thoroughly, beginning with the right side.' },
        { step: 4, title: 'Masah and ears', detail: 'Wipe head once, then wipe ears with the same moisture.' },
        { step: 5, title: 'Wash feet carefully', detail: 'Wash feet and between toes, beginning with the right foot.' },
      ],
    },
    {
      heading: 'Virtue After Wudhu',
      steps: [
        {
          step: 1,
          title: 'Eight portals of Paradise open',
          detail: `A sacred hadith states that if someone performs Wudhu correctly, then recites Kalimah Shahadah while looking toward the sky, all eight doors of Paradise are opened for him.

Source: Sunan Daarimi, vol. 1, p. 196, Hadith 716.`,
        },
        {
          step: 2,
          title: 'Recite this dua after Wudhu',
          detail: `Recite Salat alan Nabi once before and after this dua.

Arabic: اَللّٰهُمَّ اجْعَلْنِىْ مِنَ التَّوَّابِيْنَ وَاجْعَلْنِىْ مِنَ الْمُتَطَهِّرِيْنَ
Transliteration: Allahumma aj alni minat tawwabin waj alni minal mutatahhirin.
Translation: O Allah, make me among those who repent abundantly and make me among those who remain pure.

Source: Sunan ut Tirmizi, vol. 1, p. 121, Hadith 55.`,
        },
      ],
    },
    {
      heading: 'Fourteen Sunnahs of Wudhu',
      steps: [
        {
          step: 1,
          title: 'Core sunnahs to preserve',
          detail: `Further to the basic method, preserve these sunnahs:
1. Intention.
2. Reciting Bismillah before Wudhu.
3. Washing both hands to wrists three times.
4. Using Miswak three times.
5. Rinsing mouth three times.
6. Gargling when not fasting.
7. Sniffing water into nose three times.
8. Khilal of beard (when not in Ihram).
9. Khilal of fingers.
10. Khilal of toes.
11. Wiping whole head once.
12. Wiping ears.
13. Maintaining order of faraid.
14. Washing each part before the previous part dries.`,
        },
      ],
    },
    {
      heading: 'Mustahabbat (Desirable Acts) of Wudhu',
      steps: [
        {
          step: 1,
          title: 'Recommended adab and discipline',
          detail: `Among the desirables of Wudhu:
1. Face Qiblah.
2. Sit on an elevated place.
3. Perform Wudhu calmly.
4. Wipe hand over limbs while washing.
5. Moisten limbs before washing (especially in winter).
6. Avoid taking help without need.
7. Rinse mouth with right hand.
8. Sniff water into nose with right hand.
9. Clean nose with left hand.
10. Insert left little finger in nostrils when cleaning.
11. Moisten back of neck with backs of fingers.
12. Insert wet little fingers into ear openings during ear masah.
13. Move loose rings so water reaches beneath.
14. If ring is tight, moving it becomes mandatory.
15. Offer two rakah Tahiyyatul Wudhu when it is not a makruh time.
16. Renew Wudhu for each salah when possible.`,
        },
      ],
    },
    {
      heading: 'Makruhat (Disliked Acts) in Wudhu',
      steps: [
        {
          step: 1,
          title: 'Acts to avoid',
          detail: `Avoid these makruhat during Wudhu:
1. Sitting in an impure place.
2. Letting Wudhu water fall into impurity.
3. Letting droplets from limbs fall back into vessel unnecessarily.
4. Spitting toward Qiblah.
5. Unnecessary worldly talk.
6. Wasting water.
7. Using insufficient water so faraid are not fulfilled.
8. Washing face with only one hand.
9. Wiping the front of the neck.`,
        },
      ],
    },
    {
      heading: 'Duas During Wudhu',
      steps: [
        {
          step: 1,
          title: 'When looking at water',
          detail: `Arabic: بِسْمِ اللّٰهِ وَبِاللّٰهِ اَلْحَمْدُ لِلّٰهِ الَّذِىْ جَعَلَ الْمَاۤءَ طَهُوْرًا وَلَمْ يَجْعَلْهُ نَجِسًا
Transliteration: Bismillahi wa billahi wal hamdu lillahil lazi ja alal ma a tahura wa lam yaj alhu najisa.
Translation: I begin my ablution in the Name of Allah. All praise is due to Allah, Who made water purifying and not impure.`,
        },
        {
          step: 2,
          title: 'Before washing the hands',
          detail: `Arabic: اَللّٰهُمَّ اجْعَلْنِىْ مِنَ التَّوَّابِيْنَ وَاجْعَلْنِىْ مِنَ الْمُتَطَهِّرِيْنَ
Transliteration: Allahumma aj alni minat tawwabina waj alni minal mutatahhirin.
Translation: O Lord, make me of those who repent and purify themselves.`,
        },
        {
          step: 3,
          title: 'While rinsing the mouth',
          detail: `Arabic: اَللّٰهُمَّ لَقِّنِىْ حُجَّتِىْ يَوْمَ اَلْقَاكَ وَاَطْلِقْ لِسَانِىْ بِذِكْرَاكَ
Transliteration: Allahumma laqqini hujjati yawma alqaka wa atliq lisani bizikrika.
Translation: O Lord, grant me proof on the day I meet You and make my tongue fluent in Your remembrance.`,
        },
        {
          step: 4,
          title: 'While washing the nose',
          detail: `Arabic: اَللّٰهُمَّ لَا تُحَرِّمْ عَلَىَّ رِيْحَ الْجَنَّةِ وَاجْعَلْنِىْ مِمَّنْ يَشَمُّ رِيْحَهَا وَرَوْحَهَا وَطِيْبَهَا
Transliteration: Allahumma la tuharrim alayya rihal jannati waj alni mimman yashummu riha ha wa rawha ha wa tiba ha.
Translation: O Lord, do not deprive me of the fragrance of Paradise, and make me among those who smell its fragrance and perfume.`,
        },
        {
          step: 5,
          title: 'While washing the face',
          detail: `Arabic: اَللّٰهُمَّ بَيِّضْ وَجْهِىْ يَوْمَ تَسْوَدُّ الْوُجُوْهُ وَلَا تُسَوِّدْ وَجْهِىْ يَوْمَ تَبْيَضُّ الْوُجُوْهُ
Transliteration: Allahumma bayyid wajhi yawma taswaddu fihil wujuh wa la tusawwid wajhi yawma tabyaddu l wujuh.
Translation: O Lord, brighten my face on the day faces are darkened, and do not darken my face on the day faces are brightened.`,
        },
        {
          step: 6,
          title: 'While wiping the head',
          detail: `Arabic: اَللّٰهُمَّ غَشِّنِىْ رَحْمَتَكَ وَبَرَكَاتِكَ وَعَفْوِكَ
Transliteration: Allahumma ghashshini bi rahmatika wa barakatika wa afwika.
Translation: O Lord, cover me with Your mercy, blessings, and forgiveness.`,
        },
        {
          step: 7,
          title: 'While washing the feet',
          detail: `Arabic: اَللّٰهُمَّ ثَبِّتْنِىْ عَلَى الصِّرَاطِ يَوْمَ تَزِلُّ الْاَقْدَامُ وَاجْعَلْ سَعْيِىْ فِيْمَا يُرْضِيْكَ عَنِّىْ يَا ذَا الْجَلَالِ وَالْاِكْرَامِ
Transliteration: Allahumma thabbitni alas sirati yawma tazillu fihil aqdam waj al sayi fi ma yurdika anni ya dhal jalali wal ikram.
Translation: O Lord, keep me firm on the bridge on the day feet slip, and grant me deeds pleasing to You.`,
        },
      ],
    },
    {
      heading: 'What Breaks Wudhu',
      steps: [
        { step: 1, title: 'Anything exits from the two openings', detail: 'Urine, stool, wind, and similar discharge from the private parts invalidate Wudhu.' },
        { step: 2, title: 'Flowing filth from elsewhere', detail: 'Flowing blood or pus from a wound that spreads beyond its point invalidates Wudhu.' },
        { step: 3, title: 'Mouthful vomiting', detail: 'Vomiting a mouthful or more invalidates Wudhu in Hanafi fiqh.' },
        { step: 4, title: 'Sleep with full relaxation', detail: 'Sleep in a posture where the body is not firmly grounded invalidates Wudhu.' },
        { step: 5, title: 'Loss of consciousness', detail: 'Fainting, insanity, or intoxication invalidate Wudhu.' },
        { step: 6, title: 'Loud laughter inside salah', detail: 'For an adult, laughing out loud during salah invalidates Wudhu and salah.' },
      ],
    },
    {
      heading: 'When Wudhu Is Required or Recommended',
      steps: [
        {
          step: 1,
          title: 'Obligatory and mandatory cases',
          detail: `Wudhu is obligatory before salah, sajdah tilawah, and touching Quran text without a barrier.

Wudhu is mandatory before tawaf and touching books of tafsir according to the cited fiqh references.`,
        },
        {
          step: 2,
          title: 'Recommended renewal cases',
          detail: `Renewing Wudhu is recommended:
1. For another prayer.
2. Before sleep and after waking.
3. After sin (as repentance discipline).
4. To avoid differences of opinion in disputed cases.
5. Before touching books of fiqh out of reverence.`,
        },
      ],
    },
    {
      heading: 'Extra Reminder',
      steps: [
        {
          step: 1,
          title: 'Steady dhikr during Wudhu',
          detail: 'Reciting Surah al Qadr continuously during Wudhu was mentioned in your source notes as a beneficial dhikr practice.',
        },
      ],
    },
  ],
  notes: [
    'If water use is harmful due to illness or injury, consult qualified scholars regarding tayammum.',
    'Doubt after finishing Wudhu is ignored unless you are certain an invalidator occurred.',
  ],
};

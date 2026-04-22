import { HowToGuide } from './types';

export const HAJJ_HANAFI_GUIDE: HowToGuide = {
  id: 'hajj-hanafi',
  parentGroup: 'Hajj & Umrah',
  title: 'Hajj Guide (Hanafi) - Complete Practical Manual',
  subtitle:
    'Research-based Hanafi guide with day-by-day rites, Arabic adhkar/duas, and validity checks',
  icon: 'mosque',
  color: '#6D4C41',
  intro:
    'This guide consolidates the practical Hajj workflow in Hanafi fiqh, including obligation, conditions, Hajj types, route planning, day-by-day rites, detailed Sai method, core Arabic recitations, and penalty-aware validation points.',
  sections: [
    {
      heading: 'What Is Hajj and Why It Is Obligatory',
      steps: [
        {
          step: 1,
          title: 'Definition of Hajj in Sharia',
          detail: `Hajj is the pilgrimage to Makkah and nearby sacred sites (Mina, Arafat, Muzdalifah) at specific times, performing prescribed devotional rites.

Hajj months:
• Shawwal
• Dhul Qadah
• Dhul Hijjah (core rites from 8th to 13th)

It is one of the five pillars of Islam.`,
        },
        {
          step: 2,
          title: 'Quranic obligation with Arabic text',
          detail: `Allah says:
فِيهِ آيَاتٌ بَيِّنَاتٌ مَقَامُ إِبْرَاهِيمَ وَمَنْ دَخَلَهُ كَانَ آمِنًا وَلِلّٰهِ عَلَى النَّاسِ حِجُّ الْبَيْتِ مَنِ اسْتَطَاعَ إِلَيْهِ سَبِيلًا وَمَنْ كَفَرَ فَإِنَّ اللهَ غَنِيٌّ عَنِ الْعَالَمِينَ ❁

      Transliteration:
      Fihi ayatun bayyinatun maqamu Ibrahima wa man dakhala hu kana aminan wa liLlahi ala n-nasi hijju l-bayti mani stataa ilayhi sabila wa man kafara fa inna Llaha ghaniyyun ani l-alamin.

      Meaning:
      In it are clear signs, including the standing place of Ibrahim. Whoever enters it is safe. Pilgrimage to the House is due to Allah for those able to undertake the journey.

And:
وَأَتِمُّوا الْحَجَّ وَالْعُمْرَةَ لِلّٰهِ ❁

      Transliteration:
      Wa atimmu l-hajja wa l-umrata liLlah.

      Meaning:
      Complete Hajj and Umrah for Allah.

These verses establish the duty of pilgrimage for those able to undertake it.`,
        },
        {
          step: 3,
          title: 'Prophetic confirmation of obligation',
          detail: `The Messenger of Allah ﷺ said in meaning: Allah has made Hajj obligatory, so perform Hajj.

Another narration establishes deputized Hajj for someone physically unable (with proper conditions), showing that the obligation remains serious and structured.`,
        },
        {
          step: 4,
          title: 'Virtues of accepted Hajj',
          detail: `Major virtues include:
• Sins forgiven for the pilgrim who avoids obscenity and sin.
• No reward for Hajj Mabrur except Paradise.
• Arafat day is among the greatest days of divine forgiveness.
• Pilgrims of Hajj and Umrah are described in hadith as guests of Allah.

Difference often mentioned:
• Hajj Maqbul: validly performed.
• Hajj Mabrur: valid plus spiritually accepted and morally transformative.`,
        },
        {
          step: 5,
          title: 'Do not delay Hajj without reason',
          detail: `Once all obligation conditions are met, Hajj should not be delayed without valid reason. In majority fiqh discussions, unnecessary delay is sinful even though later performance can still discharge the obligation.`,
        },
      ],
    },
    {
      heading: 'Conditions of Hajj (Hanafi-Oriented)',
      steps: [
        {
          step: 1,
          title: 'Core legal conditions',
          detail: `Obligation conditions include:
• Islam
• Adulthood
• Sanity
• Capability (istitaah)

Children may be rewarded for Hajj but their Hajj does not replace obligatory adult Hajj.`,
        },
        {
          step: 2,
          title: 'Capability explained',
          detail: `Capability includes:
• Physical ability to travel and perform rites.
• Financial means for journey and return.
• Sufficient provision for dependents during absence.
• Safety of route and practical transport access.`,
        },
        {
          step: 3,
          title: 'Women-specific conditions in Hanafi fiqh',
          detail: `In Hanafi fiqh, a woman requires a valid Mahram for obligatory Hajj travel.

She must also be free from iddah restrictions at travel time.

If these conditions are absent, obligation may not attach for that period.`,
        },
        {
          step: 4,
          title: 'If physically unable but financially capable',
          detail: `For enduring inability (advanced age, chronic incapacity), deputized Hajj (Hajj al-Badal) may become the route to fulfill duty, with proper scholarly guidance and conditions.`,
        },
        {
          step: 5,
          title: 'Debt and rights of people',
          detail: `Settle debts and people's rights as far as possible before travel. Financial planning for family support is part of true readiness, not optional etiquette.`,
        },
      ],
    },
    {
      heading: 'Types of Hajj and Hanafi Preference',
      steps: [
        {
          step: 1,
          title: 'Three types and Hanafi ranking',
          detail: `Types:
• Tamattu
• Qiran
• Ifrad

Hanafi preference order:
• Qiran best
• Tamattu next
• Ifrad after

In modern logistics, Tamattu is often easiest for international pilgrims.`,
        },
        {
          step: 2,
          title: 'Hajj al-Tamattu (two intentions, two Ihram phases)',
          detail: `Method summary:
• Enter Ihram at Miqat for Umrah.
• Perform Tawaf al-Umrah, Sai, Halq/Taqsir, exit Ihram.
• On 8th Dhul Hijjah, enter new Ihram for Hajj from residence in Makkah/Aziziyah.

Hady is wajib in Tamattu.`,
        },
        {
          step: 3,
          title: 'Hajj al-Qiran (one intention, one Ihram)',
          detail: `Method summary:
• Enter Ihram at Miqat for combined Hajj and Umrah.
• Do Umrah-related rites without exiting Ihram.
• Continue in Ihram until Yawm al-Nahr sequence is completed.

Hady is wajib in Qiran.

Hanafi note: Sai handling in Qiran follows Hanafi sequencing rules and should be checked with your scholar/group protocol to preserve correctness of both Umrah and Hajj components.`,
        },
        {
          step: 4,
          title: 'Hajj al-Ifrad (Hajj only)',
          detail: `Method summary:
• Enter Ihram for Hajj only.
• Tawaf al-Qudum is performed.
• Sai can be done early or delayed until after Tawaf al-Ziyarah.
• Remain in Ihram until Yawm al-Nahr sequence point.

Hady is not obligatory in Ifrad, but sacrifice remains recommended.`,
        },
        {
          step: 5,
          title: 'Who typically does which type',
          detail: `General practical trend:
• International pilgrims: usually Tamattu.
• Residents and nearby frequent visitors: often Ifrad.
• Qiran remains highly meritorious in Hanafi ranking but logistically demanding due to prolonged Ihram restrictions.`,
        },
      ],
    },
    {
      heading: 'Preparation Before Departure',
      steps: [
        {
          step: 1,
          title: 'Documents, logistics, and legal checks',
          detail: `Finalize passport/visa, package documents, movement plan, emergency contacts, and camp allocation details for Mina/Arafat/Muzdalifah.`,
        },
        {
          step: 2,
          title: 'Hady arrangement before crowd peak',
          detail: `If you are Tamattu or Qiran, confirm exactly how Hady will be completed and how confirmation will reach you before Halq/Taqsir timing.`,
        },
        {
          step: 3,
          title: 'Physical preparation for long walking',
          detail: `Pilgrims often walk substantial distances during Hajj.

Approximate common walking ranges:
• Masjid al-Haram -> Mina: 8 km
• Mina -> Arafat: 13 km
• Arafat -> Muzdalifah: 8 km
• Muzdalifah -> Mina: 4-5 km

Train before travel to reduce breakdown risk during critical rites.`,
        },
        {
          step: 4,
          title: 'Spiritual preparation and dua planning',
          detail: `Prepare a dua list before travel: for yourself, family, teachers, deceased, and the Ummah. Repent deeply and restore rights before departure.`,
        },
        {
          step: 5,
          title: 'Pack a rites-focused kit',
          detail: `Carry essentials for ritual days:
• Unscented hygiene items
• Water and glucose/snacks
• Medical basics and blister care
• Pebble pouch
• Phone power and ID markers
• Light prayer/rest sheet for open-air stays`,
        },
      ],
    },
    {
      heading: 'Ihram and Miqat for Hajj',
      steps: [
        {
          step: 1,
          title: 'Do not cross Miqat without Ihram',
          detail: `Crossing Miqat while intending Hajj without Ihram is a major liability and generally requires Damm unless corrected by returning to Miqat and re-entering properly.`,
        },
        {
          step: 2,
          title: 'Pre-Ihram grooming and purity',
          detail: `Before Ihram: ghusl if possible, nail trimming, and other grooming before intention begins. Avoid scented products from Ihram onward.`,
        },
        {
          step: 3,
          title: 'Ihram clothing rules',
          detail: `Men:
• Two unstitched sheets.
• No fitted stitched garments.
• No head covering touching the head.

Women:
• Regular modest dress.
• Face and hands remain uncovered directly.
• Face screening may be used without cloth touching the face.`,
        },
        {
          step: 4,
          title: 'Niyyah and Talbiyah in Arabic',
          detail: `Niyyah:
اَللَّهُمَّ إِنِّي أُرِيدُ الْحَجَّ فَيَسِّرْهُ لِي وَتَقَبَّلْهُ مِنِّي

      Transliteration:
      Allahumma inni uridu l-hajja fa yassirhu li wa taqabbalhu minni.

      Meaning:
      O Allah, I intend Hajj, so make it easy for me and accept it from me.

Talbiyah:
      لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكُ لَا شَرِيكَ لَكَ

      Transliteration:
      Labbayka Allahumma labbayk, labbayka la sharika laka labbayk, inna l-hamda wa n-nimata laka wa l-mulk, la sharika lak.

      Meaning:
      Here I am, O Allah, here I am. You have no partner. Truly all praise, blessing, and sovereignty belong to You.`,
        },
        {
          step: 5,
          title: 'Maintain Talbiyah and adab',
          detail: `Continue Talbiyah frequently until Rami of Jamarah al-Aqaba begins on the 10th and first pebble lands. Guard tongue, temper, and harm to others.`,
        },
      ],
    },
    {
      heading: 'Day 1 (8th) Yawm al-Tarwiyah - Mina',
      steps: [
        {
          step: 1,
          title: 'Tamattu pilgrims re-enter Ihram',
          detail: `Tamattu pilgrims who already completed Umrah re-enter Ihram for Hajj on the 8th from residence in Makkah or Aziziyah. No external Miqat trip is required for this re-entry.`,
        },
        {
          step: 2,
          title: 'Move to Mina and settle camp logistics',
          detail: `Travel to Mina after sunrise, settle quickly, map your camp identity, and confirm reunion points with your group.`,
        },
        {
          step: 3,
          title: 'Prayers and overnight stay in Mina',
          detail: `Perform Dhuhr, Asr, Maghrib, Isha, and Fajr (next morning) while in Mina.

Staying in Mina this day is a major sunnah preparation for Arafat.`,
        },
        {
          step: 4,
          title: 'Use the day for dhikr and readiness',
          detail: `Recite Talbiyah, Quran, and dua. Preserve energy for the next day's pillar at Arafat.`,
        },
      ],
    },
    {
      heading: 'Day 2 (9th) Arafat - The Central Pillar Day',
      steps: [
        {
          step: 1,
          title: 'Takbir al-Tashriq begins after Fajr',
          detail: `From Fajr of the 9th until Asr of the 13th, recite Takbir al-Tashriq after each fard prayer.

Arabic:
اللّٰهُ أَكْبَرُ ❁ اللّٰهُ أَكْبَرُ ❁ لَا إِلٰهَ إِلَّا اللّٰهُ وَاللّٰهُ أَكْبَرُ ❁ اللّٰهُ أَكْبَرُ ❁ وَلِلّٰهِ الْحَمْدُ ❁

Transliteration:
Allahu akbar, Allahu akbar, la ilaha illa Allahu wa Allahu akbar, Allahu akbar, wa liLlahi l-hamd.

Meaning:
Allah is the Greatest. There is no deity except Allah. Allah is the Greatest, and all praise belongs to Allah.

Hanafi note: wajib for men and women (men audible, women softly).

Fasting note: for pilgrims present in Arafat, fasting this day is generally not recommended so strength is preserved for Wuquf.`,
        },
        {
          step: 2,
          title: 'Reach Arafat boundary in valid time',
          detail: `Wuquf validity window: after midday of the 9th until Fajr of the 10th.

You must be inside Arafat boundary in this window. Missing it invalidates Hajj.`,
        },
        {
          step: 3,
          title: 'Dhuhr and Asr in Hanafi framework',
          detail: `Two recognized Hanafi positions are followed in practice:
• Combine at Arafat setting with Imam context.
• Or perform according to valid Hanafi camp protocol linked to your scholar/group plan.

Stay consistent with one recognized path.`,
        },
        {
          step: 4,
          title: 'Wuquf with maximum dua and repentance',
          detail: `Arafat is the greatest standing station of Hajj.

A central supplication taught in this context:
لَا إِلٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ ❁ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ ❁ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ ❁

      Transliteration:
      La ilaha illa Allahu wahdahu la sharika lah, lahu l-mulk wa lahu l-hamd, wa huwa ala kulli shayin qadir.

      Meaning:
      There is no deity except Allah alone without partner. His is the dominion, His is all praise, and He has power over all things.

Fill the hours with tawbah, salawat, Quran, and dua for all believers.`,
        },
        {
          step: 5,
          title: 'Leave only after sunset',
          detail: `Leaving Arafat before sunset without valid return triggers Damm liability.

Maghrib is not prayed in Arafat; proceed to Muzdalifah and combine Maghrib with Isha there.`,
        },
      ],
    },
    {
      heading: 'Arafat Dhikr and Dua Pack (Arabic)',
      steps: [
        {
          step: 1,
          title: 'Most emphasized Arafat proclamation',
          detail: `Best-known proclamation for this day:
لَآ إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ ❁ لَهُ المُلْكُ وَلَهُ الْحَمْدُ ❁ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ ❁

      Transliteration:
      La ilaha illa Allahu wahdahu la sharika lah, lahu l-mulk wa lahu l-hamd, wa huwa ala kulli shayin qadir.

      Meaning:
      There is no deity except Allah alone without partner. His is the dominion, His is all praise, and He has power over all things.

Repeat abundantly with humility and presence of heart.`,
        },
        {
          step: 2,
          title: 'Short praise formulas',
          detail: `Recommended praise formulas include:
سُبْحَانَ اللهِ وَالْحَمْدُ لِلّٰهِ وَ لَا إِلَـٰهَ إِلَّا اللهُ وَاللهُ اَكْبَرُ ❁

      Transliteration:
      Subhana Llahi wa l-hamdu liLlahi wa la ilaha illa Allahu wa Allahu akbar.

      Meaning:
      Glory be to Allah, all praise is for Allah, there is no deity except Allah, and Allah is the Greatest.

سُبْحَانَ اللهِ وَبِحَمْدِهِ ❁ سُبْحَانَ اللهِ الْعَظِيم ❁

      Transliteration:
      Subhana Llahi wa bi hamdihi, subhana Llahi l-azim.

      Meaning:
      Glory be to Allah and praise be to Him; glory be to Allah the Magnificent.

Also continue frequent: SubhanAllah, Alhamdulillah, Allahu Akbar.`,
        },
        {
          step: 3,
          title: 'Istighfar formulas from Sunnah usage',
          detail: `Useful istighfar supplications:
رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ ❁

      Transliteration:
      Rabbi ghfir li wa tub alayya innaka anta t-tawwabu r-rahim.

      Meaning:
      My Lord, forgive me and accept my repentance. Surely You are the Accepter of repentance, the Most Merciful.

      أسْتَغْفِرُ اللهَ الَّذِي لا إلَهَ إلا هُوَ الحَيُّ القَيُومُ وَأتُوبُ إلَيهِ ❁

      Transliteration:
      Astaghfiru Llaha lladhi la ilaha illa huwa l-hayyu l-qayyumu wa atubu ilayh.

      Meaning:
      I seek forgiveness from Allah, besides Whom there is no deity, the Ever-Living, the Sustainer, and I repent to Him.`,
        },
        {
          step: 4,
          title: 'Salawat formula for long standing',
          detail: `A complete salawat formula:
اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ إنَّكَ حَمِيدٌ مَجِيدٌ وَعَلَيْنَا مَعَهُمْ ❁

      Transliteration:
      Allahumma salli ala Muhammadin kama sallayta ala Ibrahima wa ala ali Ibrahima innaka hamidun majidun wa alayna maahum.

      Meaning:
      O Allah, send blessings upon Muhammad as You sent blessings upon Ibrahim and the family of Ibrahim. You are Praiseworthy and Glorious, and include us with them.

Send salawat repeatedly throughout Wuquf, especially before personal dua requests.`,
        },
        {
          step: 5,
          title: 'Practical dua strategy for Arafat hours',
          detail: `Use a simple cycle:
• Quran recitation
• Arabic adhkar above
• Personal dua list (self, family, teachers, deceased, Ummah)
• Tawbah and tears

You may supplicate in any language; sincerity is the core.`,
        },
      ],
    },
    {
      heading: 'Night of 9th and Morning of 10th - Muzdalifah',
      steps: [
        {
          step: 1,
          title: 'Combine Maghrib and Isha at Isha time',
          detail: `At Muzdalifah, pray Maghrib then Isha in proper sequence at Isha time.`,
        },
        {
          step: 2,
          title: 'Collect pebbles for all Rami days',
          detail: `Minimum planning:
• 7 for 10th
• 21 for 11th
• 21 for 12th
• 21 for optional 13th

Carry spare pebbles (commonly around 10 extra) to account for misses.`,
        },
        {
          step: 3,
          title: 'Muzdalifah stay and worship/rest balance',
          detail: `Stay in Muzdalifah with awareness of boundary markers (commonly purple signage in field navigation references).

Rest is Sunnah-supported and helps preserve strength for Day 10 obligations.`,
        },
        {
          step: 4,
          title: 'Fajr and Wuquf before sunrise',
          detail: `Pray Fajr and make dua in Wuquf manner before sunrise.

Quranic reminder for this station:
فَإِذَا أَفَضْتُم مِّنْ عَرَفَاتٍ فَاذْكُرُوا اللهَ عِندَ الْمَشْعَرِ الْحَرَامِ ❁

Transliteration:
Fa idha afadtum min Arafatin fa dhkuru Llaha inda l-mashari l-haram.

Meaning:
When you depart from Arafat, remember Allah at al-Mashar al-Haram.

Leaving too early without valid excuse can lead to penalty liability.`,
        },
        {
          step: 5,
          title: 'Depart for Mina before sunrise',
          detail: `Proceed calmly with Talbiyah and discipline. Keep your pebbles and group linkage secure.`,
        },
      ],
    },
    {
      heading: 'Day 3 (10th) Yawm al-Nahr - Core Sequence',
      steps: [
        {
          step: 1,
          title: 'Sequence on Yawm al-Nahr',
          detail: `Core sequence (especially for Tamattu/Qiran):
• Rami of Jamarah al-Aqaba
• Hady
• Halq/Taqsir
• Tawaf al-Ziyarah
• Sai (where due)

Order integrity and timing windows matter for penalty avoidance.`,
        },
        {
          step: 2,
          title: 'Rami of only the big Jamarah today',
          detail: `On the 10th, pelt only Jamarah al-Aqaba (seven pebbles).

Timing outline:
• Before Fajr: invalid
• Fajr to sunrise: valid but makruh for men
• Sunrise onward: valid, with sunnah preference windows

Do not pelt the other two Jamarat on this day.

Recite with each throw:
اللّٰهُ أَكْبَرُ

Transliteration:
Allahu akbar.

Meaning:
Allah is the Greatest.

Talbiyah ends when first pebble lands at Jamarah al-Aqaba.`,
        },
        {
          step: 3,
          title: 'Hady rules and timing',
          detail: `Hady is wajib for Tamattu and Qiran, recommended for Ifrad.

Valid window generally extends from after relevant Day-10 start sequence until sunset of 12th.

Perform within valid Haram sacrifice zones.`,
        },
        {
          step: 4,
          title: 'Halq/Taqsir and release from most Ihram restrictions',
          detail: `Men: Halq is superior; valid Taqsir needs proper amount.
Women: fingertip-length trim from ends.

After valid haircut, most Ihram restrictions lift, but full spousal permissibility links to Tawaf al-Ziyarah completion.`,
        },
        {
          step: 5,
          title: 'Tawaf al-Ziyarah and Sai by Hajj type',
          detail: `Tawaf al-Ziyarah is a pillar.

Sai handling:
• Tamattu: Sai after Tawaf al-Ziyarah is required.
• Qiran/Ifrad: Sai may already be fulfilled depending on prior valid performance; otherwise complete at this stage.

No new haircut after this Sai.`,
        },
        {
          step: 6,
          title: 'Return to Mina for Tashreeq days',
          detail: `After Makkah rites, return to Mina unless a valid excuse prevents it. In Hanafi discussion, neglecting Mina nights without reason is discouraged.`,
        },
      ],
    },
    {
      heading: 'Tawaf al-Ziyarah (Detailed Hanafi Method with Arabic)',
      steps: [
        {
          step: 1,
          title: 'Status and timing window',
          detail: `Tawaf al-Ziyarah is a pillar of Hajj. It is ideally performed on the 10th and within its valid day sequence.

If delayed beyond the preferred period due necessity, it must still be completed.`,
        },
        {
          step: 2,
          title: 'Validity requirements (quick list)',
          detail: `Ensure:
• Wudhu and ritual purity
• Awrah covered
• Start at Hajar al-Aswad
• Seven full anti-clockwise circuits
• Kaaba on left
• Stay outside Hijr Ismail`,
        },
        {
          step: 3,
          title: 'Niyyah and Istilam wording',
          detail: `You may say:
اَللَّهُمَّ إِنِّي أُرِيدُ طَوَافَ بَيْتِكَ الْحَرَامِ فَيَسِّرْهُ لِي وَتَقَبَّلْهُ مِنِّي ❁

      Transliteration:
      Allahumma inni uridu tawafa baytika l-harami fa yassirhu li wa taqabbalhu minni.

      Meaning:
      O Allah, I intend Tawaf of Your Sacred House, so make it easy for me and accept it from me.

At Istilam, recite:
بِسْمِ اللّٰهِ وَاللّٰهُ أَكْبَرُ ❁

      Transliteration:
      Bismi Llahi wa Allahu akbar.

      Meaning:
      In the name of Allah, and Allah is the Greatest.

If reaching Hajar al-Aswad is unsafe, perform symbolic Istilam from distance and continue.`,
        },
        {
          step: 4,
          title: 'Key dua during circuits',
          detail: `Between Rukn al-Yamani and Hajar al-Aswad, recite:
رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ ❁

      Transliteration:
      Rabbana atina fi d-dunya hasanatan wa fi l-akhirati hasanatan wa qina adhaba n-nar.

      Meaning:
      Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.

Also recite Quran, salawat, and your personal duas throughout Tawaf.`,
        },
        {
          step: 5,
          title: 'After Tawaf: two rakah and verse of Maqam',
          detail: `Pray two rakah after Tawaf. While moving toward Maqam area (if feasible), recite:
وَاتَّخِذُوا مِنْ مَقَامِ إِبْرَاهِيمَ مُصَلًّى ❁

      Transliteration:
      Wa ttakhidhu min maqami Ibrahima musalla.

      Meaning:
      Take the standing place of Ibrahim as a place of prayer.

If crowded, pray in any suitable area of Masjid al-Haram.`,
        },
        {
          step: 6,
          title: 'Zamzam supplication and completion rule',
          detail: `After prayer, drink Zamzam and make dua.

Recommended dua:
اللّٰهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا ❁ وَرِزْقًا وَاسِعًا ❁ وَعَمَلًا مُتَقَبَّلًا ❁ وَشِفَاءً مِنْ كُلِّ دَاءٍ ❁

Transliteration:
Allahumma inni asaluka ilman nafian, wa rizqan wasian, wa amalan mutaqabbalan, wa shifaan min kulli da.

Meaning:
O Allah, I ask You for beneficial knowledge, abundant provision, accepted deeds, and healing from every illness.

Marital relations become fully lawful after Tawaf al-Ziyarah with earlier release conditions completed.`,
        },
      ],
    },
    {
      heading: 'Sai of Hajj (Detailed Method with Arabic)',
      steps: [
        {
          step: 1,
          title: 'When Sai is due in each Hajj type',
          detail: `Tamattu: Sai after Tawaf al-Ziyarah is required.

Qiran/Ifrad: Sai can be done in the recognized valid stage of your pathway; if already completed validly, it is not repeated.`,
        },
        {
          step: 2,
          title: 'How to begin and purity ruling',
          detail: `Sai is sunnah to begin soon after Tawaf.

Wudhu is sunnah, not strict validity condition. Sai remains valid in minor/major impurity states, including menstruation and post-natal bleeding cases where applicable.`,
        },
        {
          step: 3,
          title: 'Istilam before Sai (when applicable)',
          detail: `If Sai is directly after Tawaf, Istilam of Hajar al-Aswad before heading to Safa is sunnah.

If difficult due to crowd/fatigue, leave it; Sai remains valid.`,
        },
        {
          step: 4,
          title: 'Opening recitations at Safa',
          detail: `Recite once before Sai begins:
إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ الله ❁

      Transliteration:
      Inna s-safa wa l-marwata min shaairi Llah.

      Meaning:
      Surely Safa and Marwa are among the symbols of Allah.

Then:
أَبْدَأُ بِمَا بَدَأَ اللهُ بِهِ ❁

      Transliteration:
      Abdau bima badaa Llaha bih.

      Meaning:
      I begin with what Allah began with.

These opening recitations are once at start, not every lap.`,
        },
        {
          step: 5,
          title: 'Dua pattern at Safa and Marwa',
          detail: `At Safa and Marwa, face Kaaba and raise hands in dua.

Sunnah formulas include:
اللّٰهُ أَكْبَرُ ❁ اللّٰهُ أَكْبَرُ ❁ اللّٰهُ أَكْبَرُ ❁ وَلِلّٰهِ الْحَمْدُ ❁

      Transliteration:
      Allahu akbar, Allahu akbar, Allahu akbar, wa liLlahi l-hamd.

      Meaning:
      Allah is the Greatest, and all praise belongs to Allah.

لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لاَ شَرِيكَ لَهُ ❁ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ ❁ يُحْيِي وَيُمِيتُ ❁ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ ❁

      Transliteration:
      La ilaha illa Allahu wahdahu la sharika lah, lahu l-mulku wa lahu l-hamd, yuhyi wa yumit, wa huwa ala kulli shayin qadir.

      Meaning:
      There is no deity except Allah alone without partner. His is the dominion and praise. He gives life and causes death, and He has power over all things.

لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ ❁ أَنْجَزَ وَعْدَهُ وَنَصَرَ عَبْدَهُ وَهَزَمَ الْأَحْزَابَ وَحْدَهُ ❁

      Transliteration:
      La ilaha illa Allahu wahdah, anjaza wadah, wa nasara abdah, wa hazama l-ahzaba wahdah.

      Meaning:
      There is no deity except Allah alone. He fulfilled His promise, aided His servant, and defeated the confederates alone.

Repeat with personal duas between repetitions.`,
        },
        {
          step: 6,
          title: 'Exact lap counting and doubt rule',
          detail: `Sai starts at Safa and must end at Marwa on lap seven.

Lap map:
1. Safa -> Marwa
2. Marwa -> Safa
3. Safa -> Marwa
4. Marwa -> Safa
5. Safa -> Marwa
6. Marwa -> Safa
7. Safa -> Marwa

If doubt arises, act on the lower number you are sure of and continue.`,
        },
        {
          step: 7,
          title: 'Full distance requirement',
          detail: `Entire route must be covered each lap.

Approximate metrics:
• One lap: 450 meters (1,480 ft)
• Seven laps: about 3.15 km (1.96 miles)

Any missed segment leaves Sai incomplete until corrected.`,
        },
        {
          step: 8,
          title: 'Green marker rule and dhikr during walk',
          detail: `Between Milayn al-Akhdharayn (green mileposts):
• Men run at moderate pace
• Women walk normally

Commonly recited walking duas include:
رَبِّ اغْفِرْ وَارْحَمْ ❁ تَجَاوَزْ عَمَّا تَعْلَمْ ❁ إِنَّكَ أَنْتَ الْأَعَزُّ الْأَكْرَمُ ❁

      Transliteration:
      Rabbi ghfir warham, tajawaz amma talam, innaka anta l-azzu l-akram.

      Meaning:
      My Lord, forgive and have mercy, overlook what You know of my faults; You are the Most Mighty, the Most Generous.

and:
      رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ ❁

      Transliteration:
      Rabbana atina fi d-dunya hasanatan wa fi l-akhirati hasanatan wa qina adhaba n-nar.

      Meaning:
      Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.`,
        },
        {
          step: 9,
          title: 'Continuity, pauses, and completion',
          detail: `Continuity is recommended but not strict validity condition in necessity contexts.

If paused for prayer/need, resume where you stopped; if unsure, restart that lap.

After lap seven at Marwa, make final dua and pray two rakah nafl if possible.`,
        },
        {
          step: 10,
          title: 'Optional long narrated supplication',
          detail: `A reported supplication attributed to Abdullah ibn Umar includes:

اللّٰهُمَّ اعْصِمْنَا بِدِينِكَ وَطَوَاعِيَتِكَ وَطَوَاعِيَةِ رَسُولِكَ وَجَنِّبْنَا حُدُودَكَ ❁ اللّٰهُمَّ اجْعَلْنَا نُحِبُّكَ وَنُحِبُّ مَلَائِكَتَكَ ❁ وَأَنْبِيَاءَكَ وَرُسُلَكَ ❁ وَنُحِبُّ عِبَادَكَ الصَّالِحِينَ ❁ اللّٰهُمَّ حَبِّبْنَا إِلَيْكَ وَإِلَى مَلَائِكَتِكَ وَإِلَى أَنْبِيَائِكَ وَرُسُلِكَ ❁ وَإِلَى عِبَادِكَ الصَّالِحِينَ ❁ اللّٰهُمَّ يَسِّرْنَا لِلْيُسْرَى وَجَنِّبْنَا الْعُسْرَى وَاغْفِرْ لَنَا فِي الْآخِرَةِ وَالْأُولَى وَاجْعَلْنَا مِنْ أَئِمَّةِ الْمُتَّقِينَ ❁

Transliteration (opening):
Allahumma asimna bi dinika wa taatika wa taati rasulika wa jannibna hududak...

Meaning (summary):
O Allah, keep us firm upon Your religion and obedience, make us love You and Your righteous servants, make ease for us, forgive us in this life and the next, and make us among the God-fearing leaders.

You may use this, or make sincere dua in any language.`,
        },
        {
          step: 11,
          title: 'Jurisprudence quick map for Sai',
          detail: `Shuroot:
• Perform Sai yourself
• Valid Ihram state context
• Correct timing

Wajibat:
• Start Safa, end Marwa
• Seven laps
• Full route coverage
• Sai after Tawaf
• On foot unless valid excuse

Sunnan/Mustahabat:
• Istilam before Sai where applicable
• Dua at Safa/Marwa
• Men quicken pace only in green zone
• Wudhu and nafl after Sai are virtuous

Makruhat:
• Idle/worldly distraction
• Awrah negligence
• Running entire route instead of sunnah-marked segment behavior.`,
        },
      ],
    },
    {
      heading: 'Days 11-13 Ayyam al-Tashreeq and Rami',
      steps: [
        {
          step: 1,
          title: 'Day 11 pelting order and timing',
          detail: `Pelt all three Jamarat, seven each.

Sunnah order:
• Small -> dua
• Middle -> dua
• Big -> no standing dua after

For 11th/12th in Hanafi discussions, pre-zawal pelting is not valid.`,
        },
        {
          step: 2,
          title: 'Day 12 and departure decision',
          detail: `Repeat Rami for all three Jamarat.

If leaving Mina after Day-12 pelting, aim to depart before sunset. If still in Mina at Fajr of 13th, Day-13 Rami becomes wajib.`,
        },
        {
          step: 3,
          title: 'Day 13 timing and closure',
          detail: `If staying for Day 13:
• Perform required Rami within its valid window.
• Complete before sunset to avoid liability.

Then depart Mina toward Makkah.`,
        },
        {
          step: 4,
          title: 'Proxy pelting and valid excuses',
          detail: `Proxy is for genuine incapacity (old age, severe illness, advanced weakness, similar hardship).

Crowd fear alone, when safer valid timing exists, is not automatic legal excuse.`,
        },
        {
          step: 5,
          title: 'Rami adab and safety essentials',
          detail: `Do not push, throw dangerous objects, or reverse crowd flow.

If unsure of count, proceed by the lower certain number and complete carefully.

Avoid harming others; ritual validity never justifies unsafe aggression.`,
        },
        {
          step: 6,
          title: 'Rami method details and Takbir',
          detail: `For each pebble:
• Throw one by one (do not throw handfuls)
• Say: اللّٰهُ أَكْبَرُ (Allahu akbar - Allah is the Greatest)
• Ensure pebble lands in basin area

On days 11-13:
• Make dua after small Jamarah
• Make dua after middle Jamarah
• Do not stand for dua after big Jamarah`,
        },
      ],
    },
    {
      heading: 'Tawaf al-Wida and Departure',
      steps: [
        {
          step: 1,
          title: 'Who must perform Tawaf al-Wida',
          detail: `For non-resident Hajj pilgrims, Tawaf al-Wida is wajib in Hanafi fiqh.

Exemptions include women in menstruation/post-natal bleeding when departure cannot be delayed, and certain resident categories.`,
        },
        {
          step: 2,
          title: 'When to perform it',
          detail: `Perform Tawaf al-Wida close to departure from Makkah so it truly functions as farewell Tawaf.

Any final Tawaf after Tawaf al-Ziyarah can count, but delaying it to just before departure is the stronger practical approach.`,
        },
        {
          step: 3,
          title: 'Method with core Arabic reminders',
          detail: `Complete seven circuits and two rakah.

At Istilam points, recite:
بِسْمِ اللّٰهِ وَاللّٰهُ أَكْبَرُ ❁

Transliteration:
Bismi Llahi wa Allahu akbar.

Meaning:
In the name of Allah, and Allah is the Greatest.

Between Rukn al-Yamani and Hajar al-Aswad, recite:
رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ ❁

Transliteration:
Rabbana atina fi d-dunya hasanatan wa fi l-akhirati hasanatan wa qina adhaba n-nar.

Meaning:
Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.

No Sai follows Tawaf al-Wida, and no haircut follows it.

Raml and Idtiba are not practiced in Tawaf al-Wida.`,
        },
        {
          step: 4,
          title: 'If omitted without excuse',
          detail: `In Hanafi rulings, omission without valid excuse incurs liability. Corrective guidance should be sought immediately before departure if possible.`,
        },
        {
          step: 5,
          title: 'Farewell supplication and adab',
          detail: `Before leaving the Haram, make heartfelt acceptance dua for your entire Hajj.

A simple closing formula to repeat:
رَبَّنَا تَقَبَّلْ مِنَّا ❁ إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ ❁

      Transliteration:
      Rabbana taqabbal minna innaka anta s-samiu l-alim.

      Meaning:
      Our Lord, accept from us. Surely You are the All-Hearing, the All-Knowing.

Leave with humility, gratitude, and resolve to protect your Hajj from post-Hajj sins.`,
        },
      ],
    },
    {
      heading: 'Boundaries, Distances, and Route Awareness',
      steps: [
        {
          step: 1,
          title: 'Boundary awareness is rite-critical',
          detail: `You must remain within proper boundaries for validity at each site.

Common field signs often identify:
• Mina boundary (green markers)
• Arafat boundary (yellow markers)
• Muzdalifah boundary (purple markers)`,
        },
        {
          step: 2,
          title: 'Distance expectations for planning',
          detail: `Common approximate walking distances:
• Masjid al-Haram -> Mina: 8 km
• Mina -> Arafat: 13 km
• Arafat -> Muzdalifah: 8 km
• Muzdalifah -> Mina: 4-5 km
• Mina -> Jamarat: around 3 km`,
        },
        {
          step: 3,
          title: 'Transport can be slower than walking',
          detail: `Peak congestion can make buses extremely delayed. Always keep a walking contingency and hydration plan.`,
        },
        {
          step: 4,
          title: 'Group separation protocol',
          detail: `Set fixed reunion points for each transfer phase and share camp identifiers offline before movement starts.`,
        },
      ],
    },
    {
      heading: 'Hanafi Jurisprudence Summary of Hajj',
      steps: [
        {
          step: 1,
          title: 'Arkan (pillars)',
          detail: `Pillars that cannot be replaced by compensation:
• Wuquf at Arafat in valid time
• Tawaf al-Ziyarah`,
        },
        {
          step: 2,
          title: 'Core wajibat',
          detail: `Core necessary actions include:
• Sai
• Wuquf at Muzdalifah
• Rami
• Halq/Taqsir
• Tawaf al-Wida (for obligated pilgrims)`,
        },
        {
          step: 3,
          title: 'Fundamental sunnan',
          detail: `Examples:
• Tawaf al-Qudum (where due)
• Mina stay patterns by day sequence
• Rami order etiquette and dua positions
• Sunnah timings where feasible`,
        },
        {
          step: 4,
          title: 'If wajib is omitted',
          detail: `Omission of a wajib generally requires compensation unless omission is excused by valid legal reason.

Case specifics matter greatly: timing, quantity, order, duration, and correction attempts.`,
        },
        {
          step: 5,
          title: 'How to document mistakes for fatwa',
          detail: `Record immediately:
• Exact action
• Exact day/time
• Duration/amount
• Whether correction attempted

Then consult a qualified Hanafi scholar before departure.`,
        },
      ],
    },
    {
      heading: 'Safety, Adab, and Hajj Mabrur Mindset',
      steps: [
        {
          step: 1,
          title: 'Preserve life and avoid harm',
          detail: `Use safer valid windows where possible, avoid dangerous crowd surges, and never block movement lanes.`,
        },
        {
          step: 2,
          title: 'Control tongue and character',
          detail: `Avoid disputes, obscenity, insults, and arrogance. Accepted Hajj is built as much on adab as on route completion.`,
        },
        {
          step: 3,
          title: 'Serve others as worship',
          detail: `Helping the elderly, guiding the lost, and easing others in queues/camps are forms of devotion and signs of inward acceptance.`,
        },
        {
          step: 4,
          title: 'Keep making dua for the Ummah',
          detail: `Include parents, teachers, deceased, and suffering Muslims globally in your duas, especially at Arafat, Muzdalifah, and after major rites.`,
        },
        {
          step: 5,
          title: 'Finish with gratitude and humility',
          detail: `On completion, ask for acceptance repeatedly. Hajj is not only a completed itinerary; it is a covenant of changed conduct.`,
        },
      ],
    },
  ],
  notes: [
    'This is a Hanafi-oriented practical guide synthesized from the provided research source and pilgrimage workflow references.',
    'Arabic passages are included where central to legal or devotional practice; detailed commentary chains should be studied with qualified teachers.',
    'For complex or disputed cases, always prioritize on-site guidance from a qualified Hanafi scholar before leaving Makkah.',
  ],
};

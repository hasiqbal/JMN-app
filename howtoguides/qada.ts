import { HowToGuide } from './types';

export const QADA_GUIDE: HowToGuide = {
  id: 'qada',
  parentGroup: 'Salah',
  title: 'Salat al-Qada',
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
};

import { type HeroCountdownInfo } from '@/components/prayer/PrayerHeroCard';
import { PRAYER_BG_IMAGES } from '@/components/prayer/heroConfig';

type HeroKey = keyof typeof PRAYER_BG_IMAGES;

export type SharedPreviewScenario = {
  id: string;
  title: string;
  kicker: string;
  heroKey: HeroKey;
  countdownInfo: HeroCountdownInfo;
  progress: number;
  startLabel: string;
  startTime: string;
  endLabel: string;
  endTime: string;
  isForbidden?: boolean;
  forbiddenEndsAt?: string;
  isFridayJumuahHero?: boolean;
  isEidHero?: boolean;
  showJamaat?: boolean;
  jamaatValue?: string;
  nextPrayerJamaatValue?: string;
  j1?: string;
  j2?: string;
  timelinePoints?: { label: string; position: number }[];
  midLabel?: string;
  midTime?: string;
  midMarker?: number | null;
  eidJamaats?: string[];
};

export type FridayScenario = SharedPreviewScenario;
export type CombinedScenario = SharedPreviewScenario;

export const FRIDAY_J1 = '1:30';
export const FRIDAY_J2 = '2:30';
export const FRIDAY_FAJR = '05:00';
export const JUMUAH_TIMELINE = [
  { label: 'Athan', position: 0 },
  { label: 'J1', position: 0.24 },
  { label: 'J2', position: 0.48 },
  { label: 'Asr', position: 1 },
];

export const JUMMAH_NOTE = `Jummah Prayers: 1st: ${FRIDAY_J1} · 2nd: ${FRIDAY_J2}`;

export function toOrdinal(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

export function buildEidNote(jamaatTimes: string[]): string {
  return `Eid Prayers: ${jamaatTimes.map((time, index) => `${toOrdinal(index + 1)}: ${time}`).join(' · ')}`;
}

export const FRIDAY_SCENARIOS: FridayScenario[] = [
  {
    id: 'asr-thursday',
    title: 'Asr',
    kicker: 'Current Prayer',
    heroKey: 'Asr',
    countdownInfo: {
      label: 'Ends In',
      value: '00:28:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.42,
    startLabel: 'Start',
    startTime: '17:42',
    endLabel: 'Maghrib',
    endTime: '19:47',
    showJamaat: true,
    jamaatValue: '18:45',
    nextPrayerJamaatValue: '19:47',
  },
  {
    id: 'maghrib-thursday',
    title: 'Maghrib',
    kicker: 'Current Prayer',
    heroKey: 'Maghrib',
    countdownInfo: {
      label: 'Jamaat',
      value: '00:07:10',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.22,
    startLabel: 'Start',
    startTime: '19:48',
    endLabel: 'Isha',
    endTime: '21:20',
    showJamaat: true,
    jamaatValue: '19:58',
    nextPrayerJamaatValue: '21:45',
  },
  {
    id: 'isha-thursday',
    title: 'Isha',
    kicker: 'Current Prayer',
    heroKey: 'Isha',
    countdownInfo: {
      label: 'Until Fajr',
      value: '07:45:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.88,
    startLabel: 'Isha',
    startTime: '21:15',
    endLabel: 'Fajr',
    endTime: FRIDAY_FAJR,
    showJamaat: true,
    jamaatValue: '21:45',
    nextPrayerJamaatValue: '05:30',
  },
  {
    id: 'fajr-friday',
    title: 'Fajr',
    kicker: 'Current Prayer',
    heroKey: 'Fajr',
    countdownInfo: {
      label: 'Jamaat',
      value: '00:28:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.24,
    startLabel: 'Start',
    startTime: FRIDAY_FAJR,
    endLabel: 'Sunrise',
    endTime: '06:07',
    showJamaat: true,
    jamaatValue: '05:30',
    nextPrayerJamaatValue: '',
  },
  {
    id: 'sunrise-friday',
    title: 'Sunrise',
    kicker: 'Prayer Pause Window',
    isForbidden: true,
    forbiddenEndsAt: '06:27',
    heroKey: 'Sunrise',
    countdownInfo: {
      label: 'Until Ishraq',
      value: '00:14:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.55,
    startLabel: 'Sunrise',
    startTime: '06:07',
    endLabel: 'Ishraq',
    endTime: '06:27',
    showJamaat: false,
    nextPrayerJamaatValue: '',
  },
  {
    id: 'ishraq-friday',
    title: 'Ishraq',
    kicker: 'Up Next Prayer',
    heroKey: 'Ishraq',
    countdownInfo: {
      label: 'Until Zawaal',
      value: '03:12:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.35,
    startLabel: 'Ishraq',
    startTime: '06:27',
    endLabel: 'Zawaal',
    endTime: '12:40',
    showJamaat: false,
    nextPrayerJamaatValue: '',
  },
  {
    id: 'zawaal-friday',
    title: 'Zawaal',
    kicker: 'Prayer Pause Window',
    isForbidden: true,
    forbiddenEndsAt: '13:10',
    heroKey: 'Zawaal',
    countdownInfo: {
      label: 'Forbidden Window',
      value: '00:14:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.92,
    startLabel: 'Zawaal',
    startTime: '12:40',
    endLabel: 'Jummah Athan',
    endTime: '13:10',
    showJamaat: false,
    nextPrayerJamaatValue: '',
    timelinePoints: [{ label: 'Jummah', position: 1 }],
  },
  {
    id: 'jumuah-pre-j1',
    title: 'Jumuah',
    kicker: 'Current Prayer',
    isFridayJumuahHero: true,
    heroKey: 'Jumuah',
    countdownInfo: {
      label: '1st Jummah',
      value: '00:18:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.24,
    startLabel: 'First Athan',
    startTime: '13:10',
    endLabel: 'Asr Start',
    endTime: '17:56',
    showJamaat: false,
    nextPrayerJamaatValue: '18:25',
    j1: FRIDAY_J1,
    j2: FRIDAY_J2,
    timelinePoints: JUMUAH_TIMELINE,
  },
  {
    id: 'jumuah-between',
    title: 'Jumuah',
    kicker: 'Current Prayer',
    isFridayJumuahHero: true,
    heroKey: 'Jumuah',
    countdownInfo: {
      label: '2nd Jummah',
      value: '00:22:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.48,
    startLabel: 'First Athan',
    startTime: '13:10',
    endLabel: 'Asr Start',
    endTime: '17:56',
    showJamaat: false,
    nextPrayerJamaatValue: '18:25',
    j1: FRIDAY_J1,
    j2: FRIDAY_J2,
    timelinePoints: JUMUAH_TIMELINE,
  },
  {
    id: 'asr-friday',
    title: 'Asr',
    kicker: 'Current Prayer',
    heroKey: 'Asr',
    countdownInfo: {
      label: 'Ends In',
      value: '00:09:10',
      note: '',
      flash: false,
    },
    progress: 0.15,
    startLabel: 'Start',
    startTime: '17:56',
    endLabel: 'Maghrib',
    endTime: '19:48',
    showJamaat: true,
    jamaatValue: '18:25',
    nextPrayerJamaatValue: '19:58',
  },
];

export function buildFitrJumuahScenarios(eidJamaats: string[]): CombinedScenario[] {
  const resolvedEidJamaats = eidJamaats.length > 0 ? eidJamaats : ['07:00', '08:00'];
  const firstEidJamaat = resolvedEidJamaats[0] ?? '07:00';
  const eidNote = buildEidNote(resolvedEidJamaats);
  const jummahNote = `Jummah Prayers: 1st: ${FRIDAY_J1} · 2nd: ${FRIDAY_J2}`;
  const sharedNote = `${eidNote} · ${jummahNote}`;
  const eidTimelinePoints = [
    ...resolvedEidJamaats.map((time, index) => ({
      label: `J${index + 1}`,
      position: resolvedEidJamaats.length === 1 ? 0.2 : 0.12 + ((0.56 / Math.max(1, resolvedEidJamaats.length - 1)) * index),
    })),
    { label: 'Zawaal', position: 1 },
  ];

  const eidHeroScenarios: CombinedScenario[] = resolvedEidJamaats.map((time, index) => ({
    id: `eid-jamaat-${index + 1}`,
    title: 'Eid Prayer',
    kicker: 'Eid ul Fitr + Jummah',
    heroKey: 'Eid',
    isEidHero: true,
    countdownInfo: {
      label: `${toOrdinal(index + 1)} Eid`,
      value: index < resolvedEidJamaats.length - 1 ? '00:20:00' : '01:20:00',
      note: sharedNote,
      flash: false,
    },
    progress: Math.min(0.18 + (index * 0.18), 0.78),
    startLabel: `${toOrdinal(index + 1)} Eid`,
    startTime: time,
    endLabel: index < resolvedEidJamaats.length - 1 ? `${toOrdinal(index + 2)} Eid` : 'Zawaal',
    endTime: index < resolvedEidJamaats.length - 1 ? resolvedEidJamaats[index + 1] : '12:58',
    showJamaat: false,
    nextPrayerJamaatValue: '',
    eidJamaats: resolvedEidJamaats,
    timelinePoints: eidTimelinePoints,
  }));

  return [
    {
      id: 'maghrib-eve',
      title: 'Maghrib',
      kicker: 'Evening before Eid + Jummah',
      heroKey: 'Maghrib',
      countdownInfo: { label: 'Jamaat', value: '00:09:00', note: sharedNote, flash: false },
      progress: 0.22,
      startLabel: 'Start',
      startTime: '19:48',
      endLabel: 'Isha',
      endTime: '21:20',
      showJamaat: true,
      jamaatValue: '19:58',
      nextPrayerJamaatValue: '21:45',
    },
    {
      id: 'isha-eve',
      title: 'Isha',
      kicker: 'Night before Eid + Jummah',
      heroKey: 'Isha',
      countdownInfo: { label: 'Until Fajr', value: '07:45:00', note: sharedNote, flash: false },
      progress: 0.88,
      startLabel: 'Isha',
      startTime: '21:15',
      endLabel: 'Fajr',
      endTime: '05:00',
      showJamaat: true,
      jamaatValue: '21:45',
      nextPrayerJamaatValue: '05:30',
    },
    {
      id: 'sunrise-friday-eid',
      title: 'Sunrise',
      kicker: 'Eid Day + Friday',
      heroKey: 'Sunrise',
      isForbidden: true,
      forbiddenEndsAt: '06:27',
      countdownInfo: { label: 'Until Eid', value: '00:38:00', note: sharedNote, flash: false },
      progress: 0.55,
      startLabel: 'Sunrise',
      startTime: '06:07',
      endLabel: 'Eid Prayer',
      endTime: firstEidJamaat,
      showJamaat: false,
      nextPrayerJamaatValue: '',
      timelinePoints: [{ label: 'Eid', position: 1 }],
    },
    ...eidHeroScenarios,
    {
      id: 'zawaal-friday',
      title: 'Zawaal',
      kicker: 'Forbidden prayer window',
      heroKey: 'Zawaal',
      isForbidden: true,
      forbiddenEndsAt: '13:10',
      countdownInfo: {
        label: 'Until Jummah',
        value: '00:12:00',
        note: `The final eid prayer has been · ${jummahNote}`,
        flash: false,
      },
      progress: 0.93,
      startLabel: 'Start',
      startTime: '12:58',
      endLabel: 'Jummah Athan',
      endTime: '13:10',
      showJamaat: false,
      nextPrayerJamaatValue: '',
      timelinePoints: [{ label: 'Jummah', position: 1 }],
    },
    {
      id: 'jumuah-pre-j1',
      title: 'Jumuah',
      kicker: 'After Eid on Friday',
      heroKey: 'Jumuah',
      isFridayJumuahHero: true,
      countdownInfo: { label: '1st Jummah', value: '00:18:00', note: jummahNote, flash: false },
      progress: 0.24,
      startLabel: 'First Athan',
      startTime: '13:10',
      endLabel: 'Asr Start',
      endTime: '17:56',
      showJamaat: false,
      nextPrayerJamaatValue: '18:25',
      j1: FRIDAY_J1,
      j2: FRIDAY_J2,
      timelinePoints: JUMUAH_TIMELINE,
    },
    {
      id: 'jumuah-between',
      title: 'Jumuah',
      kicker: 'After Eid on Friday',
      heroKey: 'Jumuah',
      isFridayJumuahHero: true,
      countdownInfo: { label: '2nd Jummah', value: '00:22:00', note: jummahNote, flash: false },
      progress: 0.48,
      startLabel: 'First Athan',
      startTime: '13:10',
      endLabel: 'Asr Start',
      endTime: '17:56',
      showJamaat: false,
      nextPrayerJamaatValue: '18:25',
      j1: FRIDAY_J1,
      j2: FRIDAY_J2,
      timelinePoints: JUMUAH_TIMELINE,
    },
  ];
}

export function buildAdhaScenarios(eidJamaats: string[]): CombinedScenario[] {
  const resolvedEidJamaats = eidJamaats.length > 0 ? eidJamaats : ['06:40', '07:10'];
  const firstEidJamaat = resolvedEidJamaats[0] ?? '06:40';
  const eidNote = buildEidNote(resolvedEidJamaats);
  const eidTimelinePoints = [
    ...resolvedEidJamaats.map((time, index) => ({
      label: `J${index + 1}`,
      position: resolvedEidJamaats.length === 1 ? 0.2 : 0.12 + ((0.56 / Math.max(1, resolvedEidJamaats.length - 1)) * index),
    })),
    { label: 'Zawaal', position: 1 },
  ];

  const eidHeroScenarios: CombinedScenario[] = resolvedEidJamaats.map((time, index) => ({
    id: `eid-adha-jamaat-${index + 1}`,
    title: 'Eid Prayer',
    kicker: 'Eid ul Adha',
    heroKey: 'EidAdha',
    isEidHero: true,
    countdownInfo: {
      label: `${toOrdinal(index + 1)} Eid`,
      value: index < resolvedEidJamaats.length - 1 ? '00:20:00' : '01:20:00',
      note: eidNote,
      flash: false,
    },
    progress: Math.min(0.18 + (index * 0.18), 0.78),
    startLabel: `${toOrdinal(index + 1)} Eid`,
    startTime: time,
    endLabel: index < resolvedEidJamaats.length - 1 ? `${toOrdinal(index + 2)} Eid` : 'Zawaal',
    endTime: index < resolvedEidJamaats.length - 1 ? resolvedEidJamaats[index + 1] : '12:58',
    showJamaat: false,
    nextPrayerJamaatValue: '',
    eidJamaats: resolvedEidJamaats,
    timelinePoints: eidTimelinePoints,
  }));

  return [
    {
      id: 'maghrib-eve',
      title: 'Maghrib',
      kicker: 'Evening before Eid ul Adha',
      heroKey: 'Maghrib',
      countdownInfo: { label: 'Until Eid', value: '11:30:00', note: eidNote, flash: false },
      progress: 0.22,
      startLabel: 'Start',
      startTime: '19:48',
      endLabel: 'Isha',
      endTime: '21:20',
      showJamaat: true,
      jamaatValue: '19:58',
      nextPrayerJamaatValue: '21:45',
    },
    {
      id: 'isha-eve',
      title: 'Isha',
      kicker: 'Night before Eid ul Adha',
      heroKey: 'Isha',
      countdownInfo: { label: 'Until Fajr', value: '07:45:00', note: eidNote, flash: false },
      progress: 0.88,
      startLabel: 'Isha',
      startTime: '21:15',
      endLabel: 'Fajr',
      endTime: '05:00',
      showJamaat: true,
      jamaatValue: '21:45',
      nextPrayerJamaatValue: '05:30',
    },
    {
      id: 'sunrise-eid-adha-day',
      title: 'Sunrise',
      kicker: 'Eid ul Adha Day',
      heroKey: 'Sunrise',
      isForbidden: true,
      forbiddenEndsAt: '06:27',
      countdownInfo: { label: 'Until Eid', value: '00:38:00', note: eidNote, flash: false },
      progress: 0.55,
      startLabel: 'Sunrise',
      startTime: '06:07',
      endLabel: 'Eid Prayer',
      endTime: firstEidJamaat,
      showJamaat: false,
      nextPrayerJamaatValue: '',
      timelinePoints: [{ label: 'Eid', position: 1 }],
    },
    ...eidHeroScenarios,
    {
      id: 'zawaal-after-final-eid-adha-jamaat',
      title: 'Zawaal',
      kicker: 'Prayer Pause Window',
      heroKey: 'Zawaal',
      isForbidden: true,
      forbiddenEndsAt: '12:58',
      countdownInfo: {
        label: 'Until Zawaal',
        value: '00:45:00',
        note: 'The final eid prayer has been',
        flash: false,
      },
      progress: 0.94,
      startLabel: `${toOrdinal(resolvedEidJamaats.length)} Jamaat`,
      startTime: resolvedEidJamaats[resolvedEidJamaats.length - 1] ?? '07:40',
      endLabel: 'Zawaal',
      endTime: '12:58',
      showJamaat: false,
      nextPrayerJamaatValue: '',
      timelinePoints: eidTimelinePoints,
    },
    {
      id: 'dhuhr-after-eid',
      title: 'Dhuhr',
      kicker: 'Current Prayer',
      heroKey: 'Dhuhr',
      countdownInfo: { label: 'Jamaat', value: '00:50:00', note: '', flash: false },
      progress: 0.36,
      startLabel: 'Start',
      startTime: '13:10',
      endLabel: 'Asr',
      endTime: '17:56',
      showJamaat: true,
      jamaatValue: '14:00',
      nextPrayerJamaatValue: '18:25',
      timelinePoints: [
        { label: 'Jamaat', position: 0.22 },
        { label: 'Asr', position: 1 },
      ],
    },
  ];
}

export function buildAdhaJumuahScenarios(eidJamaats: string[]): CombinedScenario[] {
  const resolvedEidJamaats = eidJamaats.length > 0 ? eidJamaats : ['06:40', '07:10'];
  const firstEidJamaat = resolvedEidJamaats[0] ?? '06:40';
  const eidNote = buildEidNote(resolvedEidJamaats);
  const jummahNote = `Jummah Prayers: 1st: ${FRIDAY_J1} · 2nd: ${FRIDAY_J2}`;
  const sharedNote = `${eidNote} · ${jummahNote}`;
  const eidTimelinePoints = [
    ...resolvedEidJamaats.map((time, index) => ({
      label: `J${index + 1}`,
      position: resolvedEidJamaats.length === 1 ? 0.2 : 0.12 + ((0.56 / Math.max(1, resolvedEidJamaats.length - 1)) * index),
    })),
    { label: 'Zawaal', position: 1 },
  ];

  const eidHeroScenarios: CombinedScenario[] = resolvedEidJamaats.map((time, index) => ({
    id: `eid-adha-jamaat-${index + 1}`,
    title: 'Eid Prayer',
    kicker: 'Eid ul Adha + Jummah',
    heroKey: 'EidAdha',
    isEidHero: true,
    countdownInfo: {
      label: `${toOrdinal(index + 1)} Eid`,
      value: index < resolvedEidJamaats.length - 1 ? '00:20:00' : '01:20:00',
      note: sharedNote,
      flash: false,
    },
    progress: Math.min(0.18 + (index * 0.18), 0.78),
    startLabel: `${toOrdinal(index + 1)} Eid`,
    startTime: time,
    endLabel: index < resolvedEidJamaats.length - 1 ? `${toOrdinal(index + 2)} Eid` : 'Zawaal',
    endTime: index < resolvedEidJamaats.length - 1 ? resolvedEidJamaats[index + 1] : '12:58',
    showJamaat: false,
    nextPrayerJamaatValue: '',
    eidJamaats: resolvedEidJamaats,
    timelinePoints: eidTimelinePoints,
  }));

  return [
    {
      id: 'maghrib-eve',
      title: 'Maghrib',
      kicker: 'Evening before Eid + Jummah',
      heroKey: 'Maghrib',
      countdownInfo: { label: 'Jamaat', value: '00:09:00', note: sharedNote, flash: false },
      progress: 0.22,
      startLabel: 'Start',
      startTime: '19:48',
      endLabel: 'Isha',
      endTime: '21:20',
      showJamaat: true,
      jamaatValue: '19:58',
      nextPrayerJamaatValue: '21:45',
    },
    {
      id: 'isha-eve',
      title: 'Isha',
      kicker: 'Night before Eid + Jummah',
      heroKey: 'Isha',
      countdownInfo: { label: 'Until Fajr', value: '07:45:00', note: sharedNote, flash: false },
      progress: 0.88,
      startLabel: 'Isha',
      startTime: '21:15',
      endLabel: 'Fajr',
      endTime: '05:00',
      showJamaat: true,
      jamaatValue: '21:45',
      nextPrayerJamaatValue: '05:30',
    },
    {
      id: 'sunrise-friday-eid-adha',
      title: 'Sunrise',
      kicker: 'Eid Day + Friday',
      heroKey: 'Sunrise',
      isForbidden: true,
      forbiddenEndsAt: '06:27',
      countdownInfo: { label: 'Until Eid', value: '00:38:00', note: sharedNote, flash: false },
      progress: 0.55,
      startLabel: 'Sunrise',
      startTime: '06:07',
      endLabel: 'Eid Prayer',
      endTime: firstEidJamaat,
      showJamaat: false,
      nextPrayerJamaatValue: '',
      timelinePoints: [{ label: 'Eid', position: 1 }],
    },
    ...eidHeroScenarios,
    {
      id: 'zawaal-friday',
      title: 'Zawaal',
      kicker: 'Forbidden prayer window',
      heroKey: 'Zawaal',
      isForbidden: true,
      forbiddenEndsAt: '13:10',
      countdownInfo: {
        label: 'Until Jummah',
        value: '00:12:00',
        note: `The final eid prayer has been · ${jummahNote}`,
        flash: false,
      },
      progress: 0.93,
      startLabel: 'Start',
      startTime: '12:58',
      endLabel: 'Jummah Athan',
      endTime: '13:10',
      showJamaat: false,
      nextPrayerJamaatValue: '',
      timelinePoints: [{ label: 'Jummah', position: 1 }],
    },
    {
      id: 'jumuah-pre-j1',
      title: 'Jumuah',
      kicker: 'After Eid on Friday',
      heroKey: 'Jumuah',
      isFridayJumuahHero: true,
      countdownInfo: { label: '1st Jummah', value: '00:18:00', note: jummahNote, flash: false },
      progress: 0.24,
      startLabel: 'First Athan',
      startTime: '13:10',
      endLabel: 'Asr Start',
      endTime: '17:56',
      showJamaat: false,
      nextPrayerJamaatValue: '18:25',
      j1: FRIDAY_J1,
      j2: FRIDAY_J2,
      timelinePoints: JUMUAH_TIMELINE,
    },
    {
      id: 'jumuah-between',
      title: 'Jumuah',
      kicker: 'After Eid on Friday',
      heroKey: 'Jumuah',
      isFridayJumuahHero: true,
      countdownInfo: { label: '2nd Jummah', value: '00:22:00', note: jummahNote, flash: false },
      progress: 0.48,
      startLabel: 'First Athan',
      startTime: '13:10',
      endLabel: 'Asr Start',
      endTime: '17:56',
      showJamaat: false,
      nextPrayerJamaatValue: '18:25',
      j1: FRIDAY_J1,
      j2: FRIDAY_J2,
      timelinePoints: JUMUAH_TIMELINE,
    },
  ];
}
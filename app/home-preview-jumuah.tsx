import React, { useMemo } from 'react';
import HomePreviewScaffold, { type HomePreviewScenario } from '@/components/prayer/HomePreviewScaffold';
import { FRIDAY_SCENARIOS } from '@/components/prayer/previewScenarios';

const PREVIEW_TIME_BY_ID: Record<string, string> = {
  'asr-thursday': '18:03',
  'maghrib-thursday': '19:51',
  'isha-thursday': '21:34',
  'fajr-friday': '05:04',
  'sunrise-friday': '06:13',
  'ishraq-friday': '08:41',
  'zawaal-friday': '12:56',
  'jumuah-pre-j1': '13:12',
  'jumuah-between': '13:54',
  'asr-friday': '18:06',
};

const DAY_META_BY_ID: Record<string, { dayName: string; dateShort: string; hijriLabel: string; previewLabel: string }> = {
  'asr-thursday': { dayName: 'Thursday', dateShort: '02 Apr 2026', hijriLabel: '14 Shawwal 1447 AH', previewLabel: 'Thursday Asr' },
  'maghrib-thursday': { dayName: 'Thursday', dateShort: '02 Apr 2026', hijriLabel: '14 Shawwal 1447 AH', previewLabel: 'Thursday Maghrib' },
  'isha-thursday': { dayName: 'Thursday', dateShort: '02 Apr 2026', hijriLabel: '14 Shawwal 1447 AH', previewLabel: 'Thursday Isha' },
  'fajr-friday': { dayName: 'Friday', dateShort: '03 Apr 2026', hijriLabel: '15 Shawwal 1447 AH', previewLabel: 'Friday Fajr' },
  'sunrise-friday': { dayName: 'Friday', dateShort: '03 Apr 2026', hijriLabel: '15 Shawwal 1447 AH', previewLabel: 'Friday Sunrise' },
  'ishraq-friday': { dayName: 'Friday', dateShort: '03 Apr 2026', hijriLabel: '15 Shawwal 1447 AH', previewLabel: 'Friday Ishraq' },
  'zawaal-friday': { dayName: 'Friday', dateShort: '03 Apr 2026', hijriLabel: '15 Shawwal 1447 AH', previewLabel: 'Friday Zawaal' },
  'jumuah-pre-j1': { dayName: 'Friday', dateShort: '03 Apr 2026', hijriLabel: '15 Shawwal 1447 AH', previewLabel: 'Friday Jummah Before 1st' },
  'jumuah-between': { dayName: 'Friday', dateShort: '03 Apr 2026', hijriLabel: '15 Shawwal 1447 AH', previewLabel: 'Friday Between Jummahs' },
  'asr-friday': { dayName: 'Friday', dateShort: '03 Apr 2026', hijriLabel: '15 Shawwal 1447 AH', previewLabel: 'Friday Asr' },
};

export default function HomePreviewJumuahScreen() {
  const scenarios = useMemo<HomePreviewScenario[]>(() => (
    FRIDAY_SCENARIOS.map((scenario) => ({
      ...scenario,
      mode: 'jumuah',
      previewTime: PREVIEW_TIME_BY_ID[scenario.id] ?? scenario.startTime,
      ...DAY_META_BY_ID[scenario.id],
    }))
  ), []);

  return (
    <HomePreviewScaffold
      title="Homepage Preview: Jummah Only"
      subtitle="Thursday Asr through Friday Asr, rendered as full homepage states instead of hero-only cards."
      scenarios={scenarios}
    />
  );
}
import React, { useEffect, useMemo, useState } from 'react';
import HomePreviewScaffold, { type HomePreviewScenario } from '@/components/prayer/HomePreviewScaffold';
import { buildFitrJumuahScenarios } from '@/components/prayer/previewScenarios';
import { fetchEidUlFitr } from '@/services/eidService';

const PREVIEW_META_BY_ID: Record<string, { previewTime: string; dayName: string; dateShort: string; hijriLabel: string; previewLabel: string }> = {
  'maghrib-eve': { previewTime: '19:52', dayName: 'Thursday', dateShort: '19 Mar 2026', hijriLabel: '29 Ramadan 1447 AH', previewLabel: 'Eid Eve Maghrib' },
  'isha-eve': { previewTime: '21:33', dayName: 'Thursday', dateShort: '19 Mar 2026', hijriLabel: '29 Ramadan 1447 AH', previewLabel: 'Eid Eve Isha' },
  'sunrise-friday-eid': { previewTime: '06:15', dayName: 'Friday', dateShort: '20 Mar 2026', hijriLabel: '1 Shawwal 1447 AH', previewLabel: 'Eid Morning Sunrise' },
  'zawaal-friday': { previewTime: '12:56', dayName: 'Friday', dateShort: '20 Mar 2026', hijriLabel: '1 Shawwal 1447 AH', previewLabel: 'Eid Day Zawaal' },
  'jumuah-pre-j1': { previewTime: '13:13', dayName: 'Friday', dateShort: '20 Mar 2026', hijriLabel: '1 Shawwal 1447 AH', previewLabel: 'After Eid Before 1st Jummah' },
  'jumuah-between': { previewTime: '13:56', dayName: 'Friday', dateShort: '20 Mar 2026', hijriLabel: '1 Shawwal 1447 AH', previewLabel: 'After Eid Between Jummahs' },
};

function getDynamicMeta(id: string, index: number) {
  if (!id.startsWith('eid-jamaat-')) return null;
  return {
    previewTime: index === 0 ? '07:08' : index === 1 ? '08:05' : '09:05',
    dayName: 'Friday',
    dateShort: '20 Mar 2026',
    hijriLabel: '1 Shawwal 1447 AH',
    previewLabel: `Eid Prayer ${index + 1}`,
  };
}

export default function HomePreviewEidJumuahScreen() {
  const [eidJamaats, setEidJamaats] = useState<string[]>(['07:00', '08:00', '09:00']);

  useEffect(() => {
    const load = async () => {
      const eidData = await fetchEidUlFitr();
      const times = eidData?.jamaats?.map((entry) => entry.time).filter((time): time is string => !!time) ?? [];
      if (times.length > 0) setEidJamaats(times);
    };
    void load();
  }, []);

  const scenarios = useMemo<HomePreviewScenario[]>(() => (
    buildFitrJumuahScenarios(eidJamaats).map((scenario, index) => ({
      ...scenario,
      mode: 'eid-fitr-jumuah',
      ...(PREVIEW_META_BY_ID[scenario.id] ?? getDynamicMeta(scenario.id, index) ?? {
        previewTime: scenario.startTime,
        dayName: 'Friday',
        dateShort: '20 Mar 2026',
        hijriLabel: '1 Shawwal 1447 AH',
        previewLabel: scenario.title,
      }),
    }))
  ), [eidJamaats]);

  return (
    <HomePreviewScaffold
      title="Homepage Preview: Eid ul Fitr + Jummah"
      subtitle="Full homepage states for the same-day Eid ul Fitr and Friday flow, from the eve through Jummah."
      scenarios={scenarios}
    />
  );
}
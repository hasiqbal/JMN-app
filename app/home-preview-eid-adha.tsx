import React, { useEffect, useMemo, useState } from 'react';
import HomePreviewScaffold, { type HomePreviewScenario } from '@/components/prayer/HomePreviewScaffold';
import { buildAdhaScenarios } from '@/components/prayer/previewScenarios';
import { fetchEidUlAdha } from '@/services/eidService';

const PREVIEW_META_BY_ID: Record<string, { previewTime: string; dayName: string; dateShort: string; hijriLabel: string; previewLabel: string }> = {
  'maghrib-eve': { previewTime: '20:13', dayName: 'Thursday', dateShort: '28 May 2026', hijriLabel: '9 Dhul Hijjah 1447 AH', previewLabel: 'Eid Eve Maghrib' },
  'isha-eve': { previewTime: '21:52', dayName: 'Thursday', dateShort: '28 May 2026', hijriLabel: '9 Dhul Hijjah 1447 AH', previewLabel: 'Eid Eve Isha' },
  'sunrise-eid-adha-day': { previewTime: '06:16', dayName: 'Friday', dateShort: '29 May 2026', hijriLabel: '10 Dhul Hijjah 1447 AH', previewLabel: 'Eid Morning Sunrise' },
  'zawaal-after-final-eid-adha-jamaat': { previewTime: '12:55', dayName: 'Friday', dateShort: '29 May 2026', hijriLabel: '10 Dhul Hijjah 1447 AH', previewLabel: 'After Final Eid Jamaat' },
  'dhuhr-after-eid': { previewTime: '13:16', dayName: 'Friday', dateShort: '29 May 2026', hijriLabel: '10 Dhul Hijjah 1447 AH', previewLabel: 'Post-Eid Dhuhr Window' },
};

function getDynamicMeta(id: string, index: number) {
  if (!id.startsWith('eid-adha-jamaat-')) return null;
  return {
    previewTime: index === 0 ? '06:45' : index === 1 ? '07:12' : '07:42',
    dayName: 'Friday',
    dateShort: '29 May 2026',
    hijriLabel: '10 Dhul Hijjah 1447 AH',
    previewLabel: `Eid Prayer ${index + 1}`,
  };
}

export default function HomePreviewEidAdhaScreen() {
  const [eidJamaats, setEidJamaats] = useState<string[]>(['06:40', '07:10', '07:40']);

  useEffect(() => {
    const load = async () => {
      const eidData = await fetchEidUlAdha();
      const times = eidData?.jamaats?.map((entry) => entry.time).filter((time): time is string => !!time) ?? [];
      if (times.length > 0) setEidJamaats(times);
    };
    void load();
  }, []);

  const scenarios = useMemo<HomePreviewScenario[]>(() => (
    buildAdhaScenarios(eidJamaats).map((scenario, index) => ({
      ...scenario,
      mode: 'eid-adha',
      ...(PREVIEW_META_BY_ID[scenario.id] ?? getDynamicMeta(scenario.id, index) ?? {
        previewTime: scenario.startTime,
        dayName: 'Friday',
        dateShort: '29 May 2026',
        hijriLabel: '10 Dhul Hijjah 1447 AH',
        previewLabel: scenario.title,
      }),
    }))
  ), [eidJamaats]);

  return (
    <HomePreviewScaffold
      title="Homepage Preview: Eid ul Adha"
      subtitle="Full homepage states for Eid ul Adha day flow from the eve through post-Eid Dhuhr."
      scenarios={scenarios}
    />
  );
}

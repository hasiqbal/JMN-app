import React from 'react';
import HomeScreen from './(tabs)/index';

export default function LiveHomePreviewEidJumuahScreen() {
  return (
    <HomeScreen
      previewOverride={{
        scenario: 'eid-fitr-jumuah',
        nowIso: '2026-03-20T08:05:00',
        hijriLabel: '1 Shawwal 1447 AH',
        eidJamaats: ['07:00', '08:00', '09:00'],
      }}
    />
  );
}
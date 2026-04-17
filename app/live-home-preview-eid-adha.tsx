import React from 'react';
import HomeScreen from './(tabs)/index';

export default function LiveHomePreviewEidAdhaScreen() {
  return (
    <HomeScreen
      previewOverride={{
        scenario: 'eid-adha',
        nowIso: '2026-04-17T07:05:00',
        hijriLabel: '10 Dhul Hijjah 1447 AH',
        eidJamaats: ['06:40', '07:10', '07:40'],
      }}
    />
  );
}
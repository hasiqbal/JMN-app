import React from 'react';
import { SajdahMushafPlaceholder } from '@/components/MushafimageViewer';

function SurahSajdahScreen({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <SajdahMushafPlaceholder nightMode={nightMode} onBack={onBack} />;
}

export default SurahSajdahScreen;
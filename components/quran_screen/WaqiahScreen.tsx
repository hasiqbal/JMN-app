import React from 'react';
import { WaqiahMushafPlaceholder } from '@/components/MushafimageViewer';

function SurahWaqiahMushafScreen({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <WaqiahMushafPlaceholder nightMode={nightMode} onBack={onBack} />;
}

export default SurahWaqiahMushafScreen;

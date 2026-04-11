import React from 'react';
import { YaseenMushafPlaceholder } from '@/components/MushafimageViewer';

function SurahYaseenScreen({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <YaseenMushafPlaceholder nightMode={nightMode} onBack={onBack} />;
}

export default SurahYaseenScreen;
import React from 'react';
import { KahfMushafPlaceholder } from '@/components/MushafimageViewer';

function SurahKahfScreen({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <KahfMushafPlaceholder nightMode={nightMode} onBack={onBack} />;
}

export default SurahKahfScreen;

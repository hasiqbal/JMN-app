// Shared guide content system for the How-To tab.
// Every guide step should render its content through these components so the
// reading hierarchy — what to do / what to say / how to pronounce / what it means
// / important note — stays consistent across all guides.
export { GuideBlockList } from './GuideBlockList';
export { GuideStepCard } from './GuideStepCard';
export { GuideSectionHeading } from './GuideSectionHeading';
export { RecitationBlock } from './RecitationBlock';
export { GuideNote } from './GuideNote';
export { GuideActionBlock } from './GuideActionBlock';
export { GuideBodyText, InlineArabicText } from './GuideBodyText';
export { parseDetailToBlocks } from './parseDetail';
export {
  ARABIC_CHAR_REGEX,
  ARABIC_SEGMENT_REGEX,
  ARABIC_SEGMENT_MATCH_REGEX,
  hasArabic,
  transliterationFromText,
  shouldRenderAutoTransliteration,
} from './arabic';
export { pickPalette, GuideType, GUIDE_NIGHT_PALETTE, GUIDE_LIGHT_PALETTE } from './palette';

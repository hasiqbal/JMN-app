import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { GuideBlock } from '@/howtoguides/types';
import { RecitationBlock } from './RecitationBlock';
import { GuideNote } from './GuideNote';
import { GuideActionBlock } from './GuideActionBlock';
import { GuideBodyText } from './GuideBodyText';
import { parseDetailToBlocks } from './parseDetail';

type GuideLearningMode = 'default' | 'salah-pilot';

interface GuideBlockListProps {
  /** Explicit typed blocks, takes precedence over `detail`. */
  blocks?: GuideBlock[];
  /** Raw detail string. Parsed into blocks automatically when `blocks` isn't provided. */
  detail?: string;
  nightMode: boolean;
  contentLanguage?: 'en' | 'ur';
  learningMode?: GuideLearningMode;
}

/**
 * Render an array of GuideBlock (or a raw detail string) through the shared component set.
 * This is the single entry point every guide step should use for its content.
 */
export function GuideBlockList({
  blocks,
  detail,
  nightMode,
  contentLanguage = 'en',
  learningMode = 'default',
}: GuideBlockListProps) {
  const resolved = blocks ?? (detail ? parseDetailToBlocks(detail) : []);
  if (resolved.length === 0) return null;
  const autoTransliteration = contentLanguage !== 'ur';

  return (
    <View style={styles.stack}>
      {resolved.map((block, idx) => {
        switch (block.kind) {
          case 'recitation':
            return (
              <RecitationBlock
                key={`recitation-${idx}`}
                label={block.label}
                intro={block.intro}
                arabic={block.arabic}
                transliteration={block.transliteration}
                meaning={block.meaning}
                repeat={block.repeat}
                source={block.source}
                flags={block.flags}
                nightMode={nightMode}
                autoTransliteration={autoTransliteration}
                learningMode={learningMode}
              />
            );
          case 'note':
            return (
              <GuideNote
                key={`note-${idx}`}
                variant={block.variant}
                text={block.text}
                nightMode={nightMode}
                learningMode={learningMode}
              />
            );
          case 'action':
            return (
              <GuideActionBlock
                key={`action-${idx}`}
                label={block.label}
                text={block.text}
                nightMode={nightMode}
                learningMode={learningMode}
              />
            );
          case 'text':
          default:
            return (
              <GuideBodyText
                key={`text-${idx}`}
                text={block.text}
                nightMode={nightMode}
                autoTransliteration={autoTransliteration}
                learningMode={learningMode}
              />
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
});

GuideBlockList.displayName = 'GuideBlockList';

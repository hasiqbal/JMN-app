import type {
  GuideBlock,
  GuideNoteVariant,
  RecitationBlockData,
} from '@/howtoguides/types';
import { ARABIC_SEGMENT_MATCH_REGEX, hasArabic } from './arabic';

const GUIDANCE_PREFIX_REGEX = /^(Note|Tip|Important|Reminder|Safety|Warning|Hanafi note|Fasting note|Key reminder)\s*:\s*/i;

const variantFor = (rawLabel: string): GuideNoteVariant => {
  const lower = rawLabel.toLowerCase();
  if (lower.startsWith('hanafi')) return 'hanafi';
  if (lower.startsWith('fasting')) return 'fasting';
  if (lower.startsWith('key')) return 'key';
  if (lower === 'warning') return 'warning';
  if (lower === 'safety') return 'safety';
  if (lower === 'important') return 'important';
  if (lower === 'reminder') return 'reminder';
  if (lower === 'tip') return 'tip';
  return 'note';
};

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

interface LabeledSections {
  intro: string;
  arabic: string;
  transliteration: string;
  translation: string;
}

const splitLabeledSections = (text: string): LabeledSections => {
  const normalized = text.replace(/\r/g, '');
  const matcher = /(^|\n)\s*(Dua|Arabic|Transliteration|Translation)\s*:\s*/gi;
  const markers: { label: string; start: number; contentStart: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(normalized)) !== null) {
    const label = (match[2] ?? '').toLowerCase();
    const start = (match.index ?? 0) + (match[1]?.length ?? 0);
    markers.push({
      label,
      start,
      contentStart: matcher.lastIndex,
    });
  }

  if (markers.length === 0) {
    return { intro: normalized.trim(), arabic: '', transliteration: '', translation: '' };
  }

  const sections: LabeledSections = {
    intro: normalized.slice(0, markers[0].start).trim(),
    arabic: '',
    transliteration: '',
    translation: '',
  };

  for (let i = 0; i < markers.length; i += 1) {
    const current = markers[i];
    const next = markers[i + 1];
    const body = normalized.slice(current.contentStart, next ? next.start : normalized.length).trim();
    if (current.label === 'dua' || current.label === 'arabic') {
      sections.arabic = body;
    } else if (current.label === 'transliteration') {
      sections.transliteration = body;
    } else if (current.label === 'translation') {
      sections.translation = body;
    }
  }

  return sections;
};

/**
 * Derive a short instruction label from the intro prose.
 * "At Istilam, recite:" → label="At Istilam, recite", body=""
 * "Face the Ka'bah. You may say:" → label="You may say", body="Face the Ka'bah."
 */
const deriveLabel = (intro: string): { label: string | null; body: string } => {
  const trimmed = intro.trim();
  if (!trimmed) return { label: null, body: '' };

  if (/[:：]$/.test(trimmed) && trimmed.length <= 80 && !/\n/.test(trimmed)) {
    return { label: trimmed.replace(/[:：]\s*$/, '').trim(), body: '' };
  }

  const match = trimmed.match(/^([\s\S]*?)(?:(?:^|\n|\.\s+)([^\n.]{1,70}):)\s*$/);
  if (match) {
    const body = match[1].trim();
    const label = match[2].trim();
    if (label) return { label, body };
  }

  return { label: null, body: trimmed };
};

const buildRecitationFromLabeled = (text: string): RecitationBlockData | null => {
  const sections = splitLabeledSections(text);
  if (!sections.arabic || (!sections.translation && !sections.transliteration)) return null;

  const arabic = splitLines(sections.arabic);
  if (arabic.length === 0) return null;

  const transliteration = splitLines(sections.transliteration);
  const meaning = splitLines(sections.translation);
  const { label, body } = deriveLabel(sections.intro);

  return {
    kind: 'recitation',
    label: label ?? undefined,
    intro: body || undefined,
    arabic,
    transliteration: transliteration.length > 0 ? transliteration : undefined,
    meaning: meaning.length > 0 ? meaning : undefined,
  };
};

const buildRecitationFromFenced = (content: string): RecitationBlockData => ({
  kind: 'recitation',
  arabic: splitLines(content),
});

/**
 * Detect the "intro text followed by a long Arabic-only run" pattern:
 *   "Then say: اللهم صل على محمد …"
 */
const buildRecitationFromTrailingArabic = (text: string): {
  block: RecitationBlockData;
  leadingText?: string;
} | null => {
  const match = text.match(/^([\s\S]*?:)\s*([\s\S]+)$/);
  if (!match) return null;
  const [, leading, tail] = match;
  if (!hasArabic(tail)) return null;
  if (/[A-Za-z]/.test(tail)) return null;
  if (tail.length <= 34) return null;

  const { label, body } = deriveLabel(leading);

  return {
    block: {
      kind: 'recitation',
      label: label ?? undefined,
      arabic: splitLines(tail),
    },
    leadingText: body || undefined,
  };
};

/**
 * Detect short inline recitation cues used heavily in prayer guides:
 *   "Say exactly: الله أكبر."
 *   "Recite: بِسْمِ اللَّهِ ..."
 */
const buildRecitationFromInlineCue = (text: string): {
  block: RecitationBlockData;
  leadingText?: string;
} | null => {
  if (!hasArabic(text)) return null;
  if (!/:/.test(text)) return null;
  if (!/(say|recite|read|dhikr|dua|du'a|tasbih|takbir|tasmiyah)/i.test(text)) return null;

  const segments = text.match(ARABIC_SEGMENT_MATCH_REGEX)?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (segments.length === 0) return null;

  const arabicChars = segments.join('').replace(/\s+/g, '').length;
  if (arabicChars < 6) return null;

  const firstSegment = segments[0];
  const firstIndex = text.indexOf(firstSegment);
  if (firstIndex <= 0) return null;

  const leading = text.slice(0, firstIndex).trim();
  const { label, body } = deriveLabel(leading);

  // Keep this rule scoped to one-line cue style content to avoid grabbing rich paragraphs.
  if (text.length > 260 || /\n\s*\n/.test(text)) return null;

  return {
    block: {
      kind: 'recitation',
      label: label ?? undefined,
      arabic: segments,
    },
    leadingText: body || undefined,
  };
};

/** Parse a raw `detail` string into a typed block array. */
export const parseDetailToBlocks = (detail: string): GuideBlock[] => {
  const blocks: GuideBlock[] = [];
  const pieces = detail.split(/```([\s\S]*?)```/g);

  pieces.forEach((piece, idx) => {
    const isFenced = idx % 2 === 1;
    if (isFenced) {
      if (piece.trim()) blocks.push(buildRecitationFromFenced(piece));
      return;
    }

    const text = piece.trim();
    if (!text) return;

    // Guidance callout as a whole piece (e.g. "Note: …").
    const guidanceMatch = text.match(GUIDANCE_PREFIX_REGEX);
    if (guidanceMatch && !/\n\s*\n/.test(text)) {
      const label = guidanceMatch[1];
      const body = text.slice(guidanceMatch[0].length).trim();
      if (body) {
        blocks.push({ kind: 'note', variant: variantFor(label), text: body });
        return;
      }
    }

    // Structured recitation (Dua:/Arabic:/Transliteration:/Translation:).
    const labeled = buildRecitationFromLabeled(text);
    if (labeled) {
      blocks.push(labeled);
      return;
    }

    // "Intro: …long arabic run…" shorthand.
    const trailing = buildRecitationFromTrailingArabic(text);
    if (trailing) {
      if (trailing.leadingText) blocks.push({ kind: 'text', text: trailing.leadingText });
      blocks.push(trailing.block);
      return;
    }

    // "Say/Recite: <short Arabic>" one-line cue shorthand.
    const inlineCue = buildRecitationFromInlineCue(text);
    if (inlineCue) {
      if (inlineCue.leadingText) blocks.push({ kind: 'text', text: inlineCue.leadingText });
      blocks.push(inlineCue.block);
      return;
    }

    // Multi-paragraph: lift any paragraph that starts with a guidance prefix.
    const paragraphs = text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length > 1) {
      paragraphs.forEach((para) => {
        const gm = para.match(GUIDANCE_PREFIX_REGEX);
        if (gm) {
          const label = gm[1];
          const body = para.slice(gm[0].length).trim();
          if (body) {
            blocks.push({ kind: 'note', variant: variantFor(label), text: body });
            return;
          }
        }
        blocks.push({ kind: 'text', text: para });
      });
      return;
    }

    blocks.push({ kind: 'text', text });
  });

  return blocks;
};

export interface HowToStepImage {
  uri: string;
  caption: string;
  source?: string;
}

/**
 * Typed content primitives that make up a guide step.
 * Authors may supply `blocks` directly on a step for precise control, or rely on
 * `detail: string` which is parsed into blocks automatically at render time.
 */
export type GuideNoteVariant =
  | 'note'
  | 'tip'
  | 'important'
  | 'reminder'
  | 'safety'
  | 'warning'
  | 'hanafi'
  | 'fasting'
  | 'key';

export interface RecitationBlockData {
  kind: 'recitation';
  /** Short instruction label shown above the Arabic, e.g. "Recite:", "You may say:", "At Istilam, recite:" */
  label?: string;
  /** Optional prose shown above the label (e.g. context). */
  intro?: string;
  /** One or more Arabic lines (honored center of the block). */
  arabic: string[];
  /** Matching transliteration lines. Omit to fall back to automatic transliteration. */
  transliteration?: string[];
  /** Translation / meaning lines. */
  meaning?: string[];
  /** Optional repeat count hint, e.g. "×3" or "once at the start, not every lap". */
  repeat?: string;
  /** Optional source tag shown in a quiet footer. */
  source?: string;
  /** Optional jurisprudence/priority flags (e.g. Wajib, Fardh, Sunnah). */
  flags?: string[];
}

export interface ActionBlockData {
  kind: 'action';
  /** Optional short label such as "Action", "Do this", "Next". */
  label?: string;
  /** The instruction text (what to do, not what to say). */
  text: string;
}

export interface NoteBlockData {
  kind: 'note';
  variant: GuideNoteVariant;
  text: string;
}

/** Plain instructional prose that is neither recitation, action, nor highlighted note. */
export interface TextBlockData {
  kind: 'text';
  text: string;
}

export type GuideBlock = RecitationBlockData | ActionBlockData | NoteBlockData | TextBlockData;

export interface HowToStep {
  step: number;
  title: string;
  /**
   * Backwards-compatible freeform detail string. Conventions understood by the parser:
   *   - `Dua:` / `Arabic:` / `Transliteration:` / `Translation:` label blocks → RecitationBlock
   *   - ```...``` fenced blocks → Arabic-only RecitationBlock
   *   - lines prefixed with `Note:`, `Tip:`, `Important:`, `Reminder:`, `Safety:`, `Warning:`,
   *     `Hanafi note:`, `Fasting note:`, `Key reminder:` → NoteBlock
   *   - anything else → TextBlock
   */
  detail: string;
  /** Optional explicit structured blocks. When present, takes precedence over `detail` parsing. */
  blocks?: GuideBlock[];
  note?: string;
  images?: HowToStepImage[];
}

export interface HowToSection {
  heading: string;
  steps: HowToStep[];
}

export interface HowToGuide {
  id: string;
  language?: 'en' | 'ur';
  parentGroup?: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  intro: string;
  sections: HowToSection[];
  notes?: string[];
}

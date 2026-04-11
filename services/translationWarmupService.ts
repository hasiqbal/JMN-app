import {
  fetchAllActiveAdhkarGroupsForWarmup,
  fetchAllAdhkar,
  prewarmAdhkarUrduTranslationCache,
} from '@/services/contentService';
import {
  prewarmQuranChapterTranslations,
  resolveDefaultQuranTranslationId,
} from '@/services/quranApiService';

let warmupInFlight: Promise<void> | null = null;

const QURAN_CHAPTERS_FALLBACK = [18, 36, 56, 67, 31, 3, 32];

function chapterFromText(source: string): number | null {
  const text = source
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim();

  const surahNum = text.match(/surah\s*(\d{1,3})/);
  if (surahNum) {
    const n = Number(surahNum[1]);
    if (Number.isFinite(n) && n >= 1 && n <= 114) return n;
  }

  if (/(kahf|الكهف)/.test(text)) return 18;
  if (/(yaseen|yasin|يس)/.test(text)) return 36;
  if (/(waqiah|waqia|waqea|waqeah|الواقعة)/.test(text)) return 56;
  if (/(mulk|الملك)/.test(text)) return 67;
  if (/(luqman|luqmaan|لقمان)/.test(text)) return 31;
  if (/(sajdah|sajda|sajadah|السجدة)/.test(text)) return 32;
  if (/(ali\s*imran|aal\s*imran|al\s*imran|عمران)/.test(text)) return 3;

  return null;
}

function chapterFromContentKey(contentKey: string | null | undefined): number | null {
  if (!contentKey) return null;
  const key = contentKey.trim().toLowerCase();
  const numMatch = key.match(/(?:surah|chapter)[-_\s]?(\d{1,3})/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (Number.isFinite(n) && n >= 1 && n <= 114) return n;
  }
  return chapterFromText(key);
}

async function discoverQuranChaptersForWarmup(): Promise<number[]> {
  const chapters = new Set<number>(QURAN_CHAPTERS_FALLBACK);

  const [adhkarRows, groupRows] = await Promise.all([
    fetchAllAdhkar(),
    fetchAllActiveAdhkarGroupsForWarmup(),
  ]);

  for (const row of adhkarRows) {
    if (row.content_type === 'quran') {
      const chapterFromKey = chapterFromContentKey(row.content_key);
      if (chapterFromKey) chapters.add(chapterFromKey);
    }

    const inferred = chapterFromText(
      [row.title, row.group_name, row.reference, row.content_key].filter(Boolean).join(' '),
    );
    if (inferred) chapters.add(inferred);
  }

  for (const row of groupRows) {
    if (row.content_type === 'quran') {
      const chapterFromKey = chapterFromContentKey(row.content_key);
      if (chapterFromKey) chapters.add(chapterFromKey);
    }

    const inferred = chapterFromText(
      [row.group_name, row.name, row.card_subtitle, row.description, row.arabic_title, row.content_key]
        .filter(Boolean)
        .join(' '),
    );
    if (inferred) chapters.add(inferred);
  }

  return Array.from(chapters).sort((a, b) => a - b);
}

export async function runInitialTranslationWarmup(): Promise<void> {
  if (warmupInFlight) return warmupInFlight;

  warmupInFlight = (async () => {
    try {
      const [enDefaultId, urDefaultId, chapters] = await Promise.all([
        resolveDefaultQuranTranslationId('en'),
        resolveDefaultQuranTranslationId('ur'),
        discoverQuranChaptersForWarmup(),
      ]);

      await Promise.all([
        prewarmQuranChapterTranslations(chapters, {
          en: enDefaultId,
          ur: urDefaultId,
        }),
        prewarmQuranChapterTranslations(chapters, {
          en: 131,
          ur: 819,
        }),
        prewarmAdhkarUrduTranslationCache(),
      ]);
    } catch {
      // keep silent; warmup is best-effort and should not affect app startup
    }
  })().finally(() => {
    warmupInFlight = null;
  });

  return warmupInFlight;
}
